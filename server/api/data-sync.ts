import * as fecApi from './fec-api';
import * as openSecretsApi from './opensecrets-api';
import * as congressApi from './congress-api';
import { storage } from '../storage';
import { mapFecCandidateToPolitician, mapFecDonationToContribution, detectPotentialConflict } from './data-mappers';

/**
 * Import a specific politician from FEC by candidate ID
 */
export async function importPoliticianFromFEC(candidateId: string) {
  try {
    // Get candidate data from the FEC API
    const candidateData = await fecApi.getCandidateById(candidateId);
    if (!candidateData || !candidateData.results || candidateData.results.length === 0) {
      throw new Error(`No candidate found with ID: ${candidateId}`);
    }
    
    const fecCandidate = candidateData.results[0];
    
    // Map FEC candidate data to our politician model
    const politicianData = mapFecCandidateToPolitician(fecCandidate);
    
    // Save to database
    const politician = await storage.createPolitician(politicianData);
    
    // Get committees for the candidate
    const committeesData = await fecApi.getCandidateCommittees(candidateId);
    const committees = committeesData?.results || [];
    
    // We'll track imported contributions
    const importedContributions = [];
    
    // If the candidate has committees, import their contributions
    for (const committee of committees) {
      // Skip if no committee ID
      if (!committee.committee_id) continue;
      
      try {
        // Get contributions for the committee
        const contributionsData = await fecApi.getCommitteeContributions(
          committee.committee_id, 
          { 
            min_amount: 10000, // Only import contributions of $10k or more
            per_page: 20 // Limit to 20 contributions per committee
          }
        );
        
        const contributions = contributionsData?.results || [];
        
        // Import each contribution
        for (const contribution of contributions) {
          // Skip if missing key data
          if (!contribution.contributor_name) continue;
          
          try {
            // Map FEC donation to our contribution model
            const contributionData = mapFecDonationToContribution(contribution, politician.id);
            
            // Save to database
            const savedContribution = await storage.createContribution(contributionData);
            importedContributions.push(savedContribution);
          } catch (contribError) {
            console.error(`Error importing contribution for committee ${committee.committee_id}:`, contribError);
          }
        }
      } catch (committeeError) {
        console.error(`Error importing data for committee ${committee.committee_id}:`, committeeError);
      }
    }
    
    return {
      politician,
      contributionsCount: importedContributions.length
    };
  } catch (error) {
    console.error(`Error importing politician with ID ${candidateId}:`, error);
    throw error;
  }
}

/**
 * Import multiple politicians via FEC search
 */
export async function importPoliticiansFromSearch(searchParams: any) {
  try {
    // Search for candidates with given params
    const searchResults = await fecApi.searchCandidates({
      ...searchParams,
      per_page: searchParams.limit || 10
    });
    
    const results = [];
    
    // Import each candidate found
    for (const candidate of searchResults.results || []) {
      try {
        const result = await importPoliticianFromFEC(candidate.candidate_id);
        results.push({
          candidateId: candidate.candidate_id,
          name: candidate.name,
          ...result
        });
      } catch (candError) {
        console.error(`Error importing candidate ${candidate.candidate_id}:`, candError);
        results.push({
          candidateId: candidate.candidate_id,
          name: candidate.name,
          error: candError instanceof Error ? candError.message : 'Unknown error'
        });
      }
    }
    
    return {
      totalFound: searchResults.pagination?.count || 0,
      imported: results
    };
  } catch (error) {
    console.error(`Error in bulk import:`, error);
    throw error;
  }
}

/**
 * Import votes for a politician using Congress.gov API via ProPublica
 */
export async function importVotesForPolitician(politicianId: number, memberId: string, congress: number = 117) {
  try {
    // Verify politician exists
    const politician = await storage.getPolitician(politicianId);
    if (!politician) {
      throw new Error(`Politician with ID ${politicianId} not found`);
    }
    
    // Get votes from the API
    const votesResponse = await congressApi.getMemberVotes(memberId, congress);
    const votes = votesResponse.results?.votes || [];
    
    // Array to track imported votes
    const importedVotes = [];
    
    // Import each vote
    for (const voteData of votes) {
      try {
        // Map API data to our schema
        const voteToInsert = {
          politicianId,
          billName: voteData.bill?.bill_id || 'Unknown',
          billDescription: voteData.description || '',
          voteDate: new Date(voteData.date || Date.now()).toISOString(),
          voteResult: voteData.position || 'Unknown'
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
 * Import contribution data for a politician from OpenSecrets
 */
export async function importContributionsFromOpenSecrets(politicianId: number, cid: string) {
  try {
    // Verify politician exists
    const politician = await storage.getPolitician(politicianId);
    if (!politician) {
      throw new Error(`Politician with ID ${politicianId} not found`);
    }
    
    // Get top contributors from OpenSecrets
    const contributorsResponse = await openSecretsApi.getTopContributors(cid);
    const contributors = contributorsResponse.response?.contributors?.contributor || [];
    
    // Import each contribution
    const importedContributions = [];
    
    for (const contributor of Array.isArray(contributors) ? contributors : [contributors]) {
      try {
        // Map data to our contribution model
        const contribution = {
          politicianId,
          organization: contributor['@attributes']?.org_name || 'Unknown',
          amount: String(parseInt(contributor['@attributes']?.total || '0')),
          contributionDate: new Date().toISOString(),
          industry: contributor['@attributes']?.indus || 'Unknown'
        };
        
        // Insert into database
        const insertedContribution = await storage.createContribution(contribution);
        importedContributions.push(insertedContribution);
      } catch (error) {
        console.error(`Error importing contribution from ${contributor['@attributes']?.org_name}:`, error);
        // Continue with other contributions even if one fails
      }
    }
    
    // Get top industries data
    const industriesResponse = await openSecretsApi.getTopIndustries(cid);
    const industries = industriesResponse.response?.industries?.industry || [];
    
    // Import industry totals as contributions
    for (const industry of Array.isArray(industries) ? industries : [industries]) {
      try {
        // Map data to our contribution model
        const contribution = {
          politicianId,
          organization: `${industry['@attributes']?.industry_name} (Industry Total)`,
          amount: String(parseInt(industry['@attributes']?.total || '0')),
          contributionDate: new Date().toISOString(),
          industry: industry['@attributes']?.industry_code || 'Unknown'
        };
        
        // Insert into database
        const insertedContribution = await storage.createContribution(contribution);
        importedContributions.push(insertedContribution);
      } catch (error) {
        console.error(`Error importing industry contribution from ${industry['@attributes']?.industry_name}:`, error);
        // Continue with other contributions even if one fails
      }
    }
    
    return { 
      success: true, 
      message: `Successfully imported ${importedContributions.length} contributions for politician ID ${politicianId}`,
      data: importedContributions
    };
  } catch (error: any) {
    console.error(`Error importing contributions for politician ID ${politicianId}:`, error);
    return {
      success: false,
      message: `Failed to import contributions: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Process bulk data files
 */
export async function processBulkDataFile(
  filePath: string,
  source: 'opensecrets' | 'congress',
  dataType: string
) {
  try {
    if (source === 'opensecrets') {
      return await openSecretsApi.processOpenSecretsBulkData(
        filePath, 
        dataType as 'contributions' | 'politicians' | 'lobbying'
      );
    } else if (source === 'congress') {
      return await congressApi.processCongressBulkData(
        filePath,
        dataType as 'votes' | 'bills' | 'members'
      );
    } else {
      throw new Error(`Unknown source: ${source}`);
    }
  } catch (error: any) {
    console.error(`Error processing bulk data file:`, error);
    return {
      success: false,
      message: `Failed to process bulk data: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Test API connections
 */
export async function testAPIConnections() {
  const results = {
    fec: await fecApi.testConnection(),
    opensecrets: await openSecretsApi.testConnection(),
    congress: await congressApi.testConnection()
  };
  
  return {
    success: results.fec.success || results.opensecrets.success || results.congress.success,
    message: 'API connection test results',
    data: results
  };
}