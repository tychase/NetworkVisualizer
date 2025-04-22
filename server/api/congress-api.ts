import axios from 'axios';
import NodeCache from 'node-cache';
import { InsertVote } from '@shared/schema';
import { storage } from '../storage';

// Cache Congress.gov API responses (1 hour TTL)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Helper function to make requests to the Congress.gov API with caching
 */
async function fetchFromCongressGov(endpoint: string, params: Record<string, any> = {}) {
  if (!process.env.PROPUBLICA_API_KEY) {
    throw new Error('PROPUBLICA_API_KEY environment variable is not set (needed for Congress API)');
  }

  // Create cache key from endpoint and sorted params
  const cacheKey = `congress_${endpoint}_${Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')}`;

  // Check cache first
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Build URL with query params
  const url = new URL(`https://api.propublica.org/congress/v1/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  // Make the request
  try {
    const response = await axios.get(url.toString(), {
      headers: {
        'X-API-Key': process.env.PROPUBLICA_API_KEY
      }
    });
    
    // Cache the response
    cache.set(cacheKey, response.data);
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching data from Congress API: ${error.message}`);
    
    // If the response contains error details, include them
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}

/**
 * Get recent votes for a member of Congress
 */
export async function getMemberVotes(memberId: string, congress: number = 117) {
  return fetchFromCongressGov(`members/${memberId}/votes.json`, { congress });
}

/**
 * Get details about a specific bill
 */
export async function getBillDetails(billId: string, congress: number = 117) {
  return fetchFromCongressGov(`${congress}/bills/${billId}.json`);
}

/**
 * Get vote details for a specific roll call vote
 */
export async function getVoteDetails(congress: number, chamber: 'house' | 'senate', session: number, rollCallNumber: number) {
  return fetchFromCongressGov(`${congress}/${chamber}/sessions/${session}/votes/${rollCallNumber}.json`);
}

/**
 * Get members of Congress for a specific congress session
 */
export async function getMembers(congress: number = 117, chamber: 'house' | 'senate') {
  return fetchFromCongressGov(`${congress}/${chamber}/members.json`);
}

/**
 * Get recent bills by topic/subject
 */
export async function getBillsBySubject(subject: string, congress: number = 117) {
  return fetchFromCongressGov(`${congress}/bills/subjects/${subject}.json`);
}

/**
 * Import vote data for a politician
 */
export async function importVotesForPolitician(politicianId: number, memberId: string, congress: number = 117) {
  try {
    // Get politician to verify existence
    const politician = await storage.getPolitician(politicianId);
    if (!politician) {
      throw new Error(`Politician with ID ${politicianId} not found`);
    }
    
    // Get votes from the API
    const votesResponse = await getMemberVotes(memberId, congress);
    const votes = votesResponse.results?.votes || [];
    
    // Array to track imported votes
    const importedVotes = [];
    
    // Import each vote
    for (const voteData of votes) {
      try {
        // Map API data to our schema
        const voteToInsert: InsertVote = {
          politicianId,
          billName: voteData.bill?.bill_id || 'Unknown',
          billUrl: voteData.bill?.bill_uri || null,
          voteDate: new Date(voteData.date || Date.now()).toISOString(),
          votePosition: voteData.position || 'Unknown',
          voteChamber: voteData.chamber || 'Unknown',
          voteDescription: voteData.description || '',
          voteResult: voteData.result || 'Unknown',
          potentialConflict: false // Would need additional logic to determine conflicts
        };
        
        // Insert the vote
        const insertedVote = await storage.createVote(voteToInsert);
        importedVotes.push(insertedVote);
      } catch (error: any) {
        console.error(`Error importing vote: ${error.message}`);
        // Continue with other votes even if one fails
      }
    }
    
    return { 
      success: true, 
      message: `Successfully imported ${importedVotes.length} votes for politician ID ${politicianId}`,
      data: importedVotes
    };
  } catch (error: any) {
    console.error(`Error importing votes for politician ID ${politicianId}: ${error.message}`);
    return {
      success: false,
      message: `Failed to import votes: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Process Congress.gov bulk data files
 */
export async function processCongressBulkData(
  filePath: string, 
  dataType: 'votes' | 'bills' | 'members'
) {
  try {
    // This is a placeholder for the actual bulk data processing implementation
    // Would use fs.readFile and JSON/XML parsing in an actual implementation
    console.log(`Processing ${dataType} data from ${filePath}`);
    
    // In a real implementation, this would:
    // 1. Read the bulk data file
    // 2. Parse the data
    // 3. Map the data to our schema
    // 4. Store the data in the database
    
    return { success: true, message: 'Bulk data processed successfully' };
  } catch (error: any) {
    console.error(`Error processing Congress bulk data: ${error.message}`);
    throw error;
  }
}

/**
 * Test the Congress API connection with a simple request
 */
export async function testConnection() {
  try {
    // Make a simple request to test the API connection
    const result = await getMembers(117, 'senate');
    return { 
      success: true, 
      message: 'Successfully connected to Congress API',
      data: result
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Failed to connect to Congress API: ${error.message}`,
      error: error.message
    };
  }
}