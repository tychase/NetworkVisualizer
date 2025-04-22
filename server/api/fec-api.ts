import axios from 'axios';
import NodeCache from 'node-cache';

// Cache responses for 1 hour to avoid hitting rate limits
const cache = new NodeCache({ stdTTL: 3600 });

// Base URL for the FEC API
const FEC_API_BASE_URL = 'https://api.open.fec.gov/v1';

// Check if API key is available
if (!process.env.FEC_API_KEY) {
  console.warn('FEC_API_KEY is not set. API requests will fail.');
}

/**
 * Helper function to make requests to the FEC API with caching
 */
async function fetchFromFEC(endpoint: string, params: Record<string, any> = {}) {
  // Include API key in all requests
  const apiKey = process.env.FEC_API_KEY;
  
  // Construct full URL and add API key
  const fullParams = { ...params, api_key: apiKey };
  
  // Create cache key based on endpoint and params
  const cacheKey = `${endpoint}:${JSON.stringify(fullParams)}`;
  
  // Check if response is in cache
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Log the request being made (without API key)
  console.log(`Fetching data from FEC API: ${endpoint}`);
  
  try {
    // Make the request
    const response = await axios.get(`${FEC_API_BASE_URL}${endpoint}`, {
      params: fullParams
    });
    
    // Cache the response
    cache.set(cacheKey, response.data);
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from FEC API:`, error);
    throw error;
  }
}

/**
 * Get details for a specific candidate by ID
 */
export async function getCandidateById(candidateId: string) {
  return fetchFromFEC(`/candidate/${candidateId}`);
}

/**
 * Search for candidates by name, office, election year, etc.
 */
export async function searchCandidates(params: {
  name?: string;
  office?: string;
  election_year?: number;
  state?: string;
  party?: string;
  page?: number;
  per_page?: number;
}) {
  return fetchFromFEC('/candidates/search', params);
}

/**
 * Get financial data for a specific candidate
 */
export async function getCandidateFinancials(candidateId: string) {
  return fetchFromFEC(`/candidate/${candidateId}/totals`);
}

/**
 * Get committees associated with a candidate
 */
export async function getCandidateCommittees(candidateId: string) {
  return fetchFromFEC(`/candidate/${candidateId}/committees`);
}

/**
 * Get contribution data for a committee
 */
export async function getCommitteeContributions(committeeId: string, params: {
  min_amount?: number;
  max_amount?: number;
  two_year_transaction_period?: number;
  page?: number;
  per_page?: number;
}) {
  return fetchFromFEC(`/committee/${committeeId}/schedules/schedule_a`, params);
}

/**
 * Get disbursement data for a committee
 */
export async function getCommitteeDisbursements(committeeId: string, params: {
  min_amount?: number;
  max_amount?: number;
  two_year_transaction_period?: number;
  page?: number;
  per_page?: number;
}) {
  return fetchFromFEC(`/committee/${committeeId}/schedules/schedule_b`, params);
}

/**
 * Search for committees by various parameters
 */
export async function searchCommittees(params: {
  name?: string;
  committee_type?: string;
  state?: string;
  party?: string;
  page?: number;
  per_page?: number;
}) {
  return fetchFromFEC('/committees', params);
}

/**
 * Get filing information for a committee
 */
export async function getCommitteeFilings(committeeId: string) {
  return fetchFromFEC(`/committee/${committeeId}/filings`);
}

/**
 * Test the FEC API connection with a simple request
 */
export async function testConnection() {
  try {
    const response = await fetchFromFEC('/candidates', { per_page: 1 });
    return {
      success: true,
      message: 'Successfully connected to FEC API',
      data: response
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to FEC API',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}