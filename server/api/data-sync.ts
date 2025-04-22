import * as fecApi from './fec-api';
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