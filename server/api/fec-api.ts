import axios from 'axios';
import NodeCache from 'node-cache';

// Base URL for FEC API
const FEC_API_BASE_URL = 'https://api.open.fec.gov/v1';
const FEC_API_KEY = process.env.FEC_API_KEY;

// Cache configuration (30 minute TTL)
const cache = new NodeCache({ stdTTL: 1800 });

// Helper function to make API requests with caching
async function fetchFromFEC(endpoint: string, params: Record<string, any> = {}) {
  // Create cache key from endpoint and params
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  
  // Check if we have a cached response
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for ${cacheKey}`);
    return cachedData;
  }
  
  // Add API key to params
  const requestParams = { 
    ...params,
    api_key: FEC_API_KEY
  };
  
  try {
    console.log(`Fetching data from FEC API: ${endpoint}`);
    const response = await axios.get(`${FEC_API_BASE_URL}${endpoint}`, {
      params: requestParams
    });
    
    // Cache the response data
    cache.set(cacheKey, response.data);
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('FEC API Error:', error.response?.data || error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// Functions to interact with specific FEC API endpoints

/**
 * Get information about a candidate by their FEC ID
 */
export async function getCandidateById(candidateId: string) {
  return fetchFromFEC(`/candidate/${candidateId}`);
}

/**
 * Search for candidates by name, office, election year, etc.
 */
export async function searchCandidates(params: {
  name?: string;
  office?: 'H' | 'S' | 'P'; // House, Senate, President
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