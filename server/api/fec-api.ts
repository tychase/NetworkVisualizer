/**
 * FEC API Client
 * 
 * This module provides functions to interact with the Federal Election Commission (FEC) API
 * to retrieve information about candidates, committees, and contributions.
 * 
 * API Documentation: https://api.open.fec.gov/developers/
 */

import axios from 'axios';
import { db } from '../db';
import { politicians, politicianAliases, contributions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// FEC API Configuration
const FEC_API_BASE_URL = 'https://api.open.fec.gov/v1';
const FEC_API_KEY = process.env.FEC_API_KEY;

// Check if FEC_API_KEY is available
if (!FEC_API_KEY) {
  console.error('FEC_API_KEY environment variable is not set. FEC API functionality will be limited.');
}

/**
 * Create an axios instance for FEC API requests with the API key
 */
const fecApiClient = axios.create({
  baseURL: FEC_API_BASE_URL,
  params: {
    api_key: FEC_API_KEY
  }
});

/**
 * Get candidates from the FEC API
 * @param params Query parameters to filter candidates
 * @returns Promise with candidate data
 */
export async function getCandidates(params: any = {}) {
  try {
    // Default parameters to get recent federal candidates
    const defaultParams = {
      sort_null_only: false,
      has_raised_funds: true,
      federal_funds_flag: false,
      per_page: 100,
      sort: '-last_file_date',
      candidate_status: 'C', // C for active candidates
      ...params
    };

    const response = await fecApiClient.get('/candidates/search', {
      params: defaultParams
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching candidates from FEC API:', error);
    throw error;
  }
}

/**
 * Get current members of Congress (House and Senate)
 * @returns Promise with combined list of House and Senate members
 */
export async function getCurrentCongressMembers() {
  try {
    // Get current House members (H for House)
    const houseResponse = await fecApiClient.get('/candidates/search', {
      params: {
        office: 'H',
        candidate_status: 'C',
        election_year: [2022, 2024],
        per_page: 100,
        sort: 'name'
      }
    });

    // Get current Senate members (S for Senate)
    const senateResponse = await fecApiClient.get('/candidates/search', {
      params: {
        office: 'S',
        candidate_status: 'C',
        election_year: [2020, 2022, 2024],
        per_page: 100,
        sort: 'name'
      }
    });

    // Combine results
    const allMembers = [
      ...houseResponse.data.results,
      ...senateResponse.data.results
    ];

    return {
      count: allMembers.length,
      results: allMembers
    };
  } catch (error) {
    console.error('Error fetching Congress members from FEC API:', error);
    throw error;
  }
}

/**
 * Get contributions for a candidate
 * @param candidateId FEC candidate ID
 * @param params Additional query parameters
 * @returns Promise with contribution data
 */
export async function getCandidateContributions(candidateId: string, params: any = {}) {
  try {
    // Get all committees associated with the candidate
    const committeesResponse = await fecApiClient.get(`/candidate/${candidateId}/committees`, {
      params: {
        per_page: 100
      }
    });

    const committeeIds = committeesResponse.data.results.map((committee: any) => committee.committee_id);

    if (committeeIds.length === 0) {
      return { results: [] };
    }

    // Get contributions for each committee
    const contributionsPromises = committeeIds.map(async (committeeId: string) => {
      const contribResponse = await fecApiClient.get(`/committee/${committeeId}/schedules/schedule_a/`, {
        params: {
          per_page: 100,
          sort: '-contribution_receipt_amount',
          ...params
        }
      });
      return contribResponse.data.results;
    });

    const contributionsArrays = await Promise.all(contributionsPromises);
    
    // Flatten the arrays and combine results
    const allContributions = contributionsArrays.flat();

    return {
      count: allContributions.length,
      results: allContributions
    };
  } catch (error) {
    console.error(`Error fetching contributions for candidate ${candidateId}:`, error);
    throw error;
  }
}

/**
 * Import politicians from FEC API and save to database
 * @returns Promise with import results
 */
export async function importPoliticiansFromFec() {
  try {
    console.log('Starting FEC politician import...');
    const congressMembers = await getCurrentCongressMembers();
    
    console.log(`Found ${congressMembers.count} Congress members to import`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each member
    for (const member of congressMembers.results) {
      try {
        // Extract relevant data from the FEC API response
        const firstName = member.name.split(',')[1]?.trim() || '';
        const lastName = member.name.split(',')[0]?.trim() || '';
        const party = member.party_full || member.party || '';
        const state = member.state || '';
        
        // Check if politician already exists by FEC ID alias
        const existingAlias = await db.query.politicianAliases.findFirst({
          where: and(
            eq(politicianAliases.source, 'fec'),
            eq(politicianAliases.externalId, member.candidate_id)
          )
        });

        if (existingAlias) {
          // Update existing politician
          await db.update(politicians)
            .set({
              firstName,
              lastName,
              party,
              state,
              fecCandidateId: member.candidate_id
            })
            .where(eq(politicians.id, existingAlias.politicianId));
            
          updatedCount++;
        } else {
          // Create new politician
          const newPolitician = await db.insert(politicians)
            .values({
              firstName,
              lastName,
              party,
              state,
              fecCandidateId: member.candidate_id
            })
            .returning();

          if (newPolitician && newPolitician[0]) {
            // Add FEC ID alias
            await db.insert(politicianAliases)
              .values({
                politicianId: newPolitician[0].id,
                source: 'fec',
                externalId: member.candidate_id
              });
            
            importedCount++;
          }
        }
      } catch (err) {
        console.error(`Error processing politician ${member.name}:`, err);
        errorCount++;
      }
    }
    
    return {
      success: true,
      importedCount,
      updatedCount,
      errorCount,
      totalProcessed: congressMembers.count
    };
  } catch (error) {
    console.error('Error in FEC politician import:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Import contributions for a politician from FEC API
 * @param politicianId Internal politician ID
 * @returns Promise with import results
 */
export async function importContributionsForPolitician(politicianId: number) {
  try {
    // Find the FEC ID for this politician
    const alias = await db.query.politicianAliases.findFirst({
      where: and(
        eq(politicianAliases.politicianId, politicianId),
        eq(politicianAliases.source, 'fec')
      )
    });

    if (!alias) {
      return {
        success: false,
        message: `No FEC ID found for politician with ID ${politicianId}`
      };
    }

    // Get contributions from FEC API
    const candidateContributions = await getCandidateContributions(alias.externalId);
    
    console.log(`Found ${candidateContributions.results.length} contributions for politician ID ${politicianId}`);
    
    let importedCount = 0;
    let errorCount = 0;
    
    // Process each contribution
    for (const contribution of candidateContributions.results) {
      try {
        // Extract relevant data
        const organization = contribution.contributor_employer || 'Individual';
        const amount = parseFloat(contribution.contribution_receipt_amount) || 0;
        const contributionDate = contribution.contribution_receipt_date
          ? new Date(contribution.contribution_receipt_date)
          : new Date();
        const industry = contribution.contributor_occupation || '';
        
        // Add contribution to database - using proper column field names
        // The values MUST use the camelCase version of the field names, not the snake_case database version
        await db.insert(contributions)
          .values({
            politicianId: politicianId,
            organization: organization,
            amount: amount.toString(),
            contributionDate: contributionDate,
            industry: industry
          });
          
        importedCount++;
      } catch (err) {
        console.error(`Error processing contribution:`, err);
        errorCount++;
      }
    }
    
    return {
      success: true,
      politicianId,
      importedCount,
      errorCount,
      totalProcessed: candidateContributions.results.length
    };
  } catch (error) {
    console.error(`Error importing contributions for politician ${politicianId}:`, error);
    return {
      success: false,
      politicianId,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Import all FEC data (politicians and their contributions)
 * @param skipContributions Whether to skip importing contributions
 * @returns Promise with import results
 */
export async function importAllFecData(skipContributions = false) {
  try {
    // First import politicians
    const politiciansResult = await importPoliticiansFromFec();
    
    if (!politiciansResult.success) {
      return politiciansResult;
    }
    
    // Skip contributions if requested
    if (skipContributions) {
      return politiciansResult;
    }
    
    // Get all politicians
    const allPoliticians = await db.query.politicians.findMany();
    
    let contributionsResults = [];
    
    // Import contributions for each politician
    for (const politician of allPoliticians) {
      const contribResult = await importContributionsForPolitician(politician.id);
      contributionsResults.push(contribResult);
    }
    
    // Count successful contribution imports
    const successfulContribImports = contributionsResults.filter(r => r.success).length;
    
    return {
      success: true,
      politiciansImported: politiciansResult.importedCount,
      politiciansUpdated: politiciansResult.updatedCount,
      politiciansWithContributions: successfulContribImports,
      totalPoliticians: allPoliticians.length
    };
  } catch (error) {
    console.error('Error in FEC data import:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}