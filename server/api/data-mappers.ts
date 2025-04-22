import { InsertPolitician, InsertContribution } from '@shared/schema';

/**
 * Map FEC candidate data to our politician model
 */
export function mapFecCandidateToPolitician(fecCandidate: any): InsertPolitician {
  const nameParts = fecCandidate.name.split(', ');
  
  return {
    firstName: nameParts.length > 1 ? nameParts[1] : '',
    lastName: nameParts[0] || '',
    state: fecCandidate.state || '',
    party: mapPartyAbbreviation(fecCandidate.party || ''),
    profileImage: null // FEC API doesn't provide images
  };
}

/**
 * Map FEC donation data to our contribution model
 */
export function mapFecDonationToContribution(fecDonation: any, politicianId: number): InsertContribution {
  return {
    politicianId,
    organization: fecDonation.contributor_name || '',
    amount: String(fecDonation.contribution_receipt_amount || '0'),
    contributionDate: fecDonation.contribution_receipt_date || new Date().toISOString().split('T')[0],
    industry: fecDonation.contributor_occupation || ''
  };
}

/**
 * Convert party abbreviations to full party names
 */
export function mapPartyAbbreviation(partyCode: string): string {
  const partyMap: Record<string, string> = {
    'DEM': 'Democrat',
    'REP': 'Republican',
    'IND': 'Independent',
    'LIB': 'Libertarian',
    'GRE': 'Green',
    'CON': 'Constitution',
    'D': 'Democrat',
    'R': 'Republican',
    'I': 'Independent',
    'L': 'Libertarian',
    'G': 'Green'
  };
  
  return partyMap[partyCode] || partyCode;
}

/**
 * Normalize state codes
 */
export function normalizeStateCode(stateCode: string): string {
  const stateMap: Record<string, string> = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'District of Columbia'
  };
  
  return stateMap[stateCode] || stateCode;
}

/**
 * Format currency amount (in cents) to dollars string
 */
export function formatCurrency(amount: number): string {
  return (amount / 100).toFixed(2);
}

/**
 * Determine if a contribution might be a conflict of interest
 * based on industry and amount
 */
export function detectPotentialConflict(contribution: any, politicianVotes: any[]): boolean {
  // This is a simplified example - real implementation would need
  // more sophisticated logic based on specific bills and industries
  
  // For now, just flag large contributions over $100,000
  if (parseFloat(contribution.amount) > 100000) {
    return true;
  }
  
  // Check if the politician has voted on bills related to the contributor's industry
  const industry = contribution.industry?.toLowerCase() || '';
  
  for (const vote of politicianVotes) {
    const billName = vote.billName?.toLowerCase() || '';
    const billDesc = vote.billDescription?.toLowerCase() || '';
    
    if (
      (industry.includes('energy') && (billName.includes('energy') || billDesc.includes('energy'))) ||
      (industry.includes('health') && (billName.includes('health') || billDesc.includes('health'))) ||
      (industry.includes('tech') && (billName.includes('tech') || billDesc.includes('tech'))) ||
      (industry.includes('finance') && (billName.includes('finance') || billDesc.includes('finance')))
    ) {
      return true;
    }
  }
  
  return false;
}