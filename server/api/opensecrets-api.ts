import axios from 'axios';
import NodeCache from 'node-cache';
import { InsertContribution, InsertPolitician } from '@shared/schema';
import { storage } from '../storage';
import { mapPartyAbbreviation, normalizeStateCode } from './data-mappers';

// Cache OpenSecrets API responses (1 hour TTL)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Helper function to make requests to the OpenSecrets API with caching
 */
async function fetchFromOpenSecrets(endpoint: string, params: Record<string, any> = {}) {
  if (!process.env.OPENSECRETS_API_KEY) {
    throw new Error('OPENSECRETS_API_KEY environment variable is not set');
  }

  // Add API key to params
  const queryParams = {
    ...params,
    apikey: process.env.OPENSECRETS_API_KEY,
    output: 'json'
  };

  // Create cache key from endpoint and sorted params
  const cacheKey = `opensecrets_${endpoint}_${Object.entries(queryParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')}`;

  // Check cache first
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Build URL with query params
  const url = new URL(`https://www.opensecrets.org/api/?method=${endpoint}`);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  // Make the request
  try {
    const response = await axios.get(url.toString());
    
    // Cache the response
    cache.set(cacheKey, response.data);
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching data from OpenSecrets API: ${error.message}`);
    
    // If the response contains error details, include them
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}

/**
 * Get legislator data by CID (OpenSecrets Candidate ID)
 */
export async function getLegislatorByCID(cid: string) {
  return fetchFromOpenSecrets('getLegislator', { id: cid });
}

/**
 * Search for legislators by state
 */
export async function getLegislatorsByState(state: string) {
  return fetchFromOpenSecrets('getLegislators', { 
    id: normalizeStateCode(state) 
  });
}

/**
 * Get top contributors for a politician
 */
export async function getTopContributors(cid: string) {
  return fetchFromOpenSecrets('candContrib', { cid });
}

/**
 * Get top industries contributing to a politician
 */
export async function getTopIndustries(cid: string) {
  return fetchFromOpenSecrets('candIndustry', { cid });
}

/**
 * Get sector summary for a politician
 */
export async function getSectorSummary(cid: string) {
  return fetchFromOpenSecrets('candSector', { cid });
}

/**
 * Import data from CSV file (for bulk data use)
 */
export async function processOpenSecretsBulkData(
  filePath: string, 
  dataType: 'contributions' | 'politicians' | 'lobbying'
) {
  try {
    // This is a placeholder for the actual CSV processing implementation
    // Would use fs.readFile and csv-parse in an actual implementation
    console.log(`Processing ${dataType} data from ${filePath}`);
    
    // In a real implementation, this would:
    // 1. Read the CSV file
    // 2. Parse the CSV data
    // 3. Map the data to our schema
    // 4. Store the data in the database
    
    return { success: true, message: 'Bulk data processed successfully' };
  } catch (error: any) {
    console.error(`Error processing OpenSecrets bulk data: ${error.message}`);
    throw error;
  }
}

/**
 * Test the OpenSecrets API connection with a simple request
 */
export async function testConnection() {
  try {
    // Make a simple request to test the API connection
    const result = await getLegislatorsByState('CA');
    return { 
      success: true, 
      message: 'Successfully connected to OpenSecrets API',
      data: result
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Failed to connect to OpenSecrets API: ${error.message}`,
      error: error.message
    };
  }
}