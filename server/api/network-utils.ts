import { Politician, Contribution, StockTransaction } from '@shared/schema';
import { storage } from '../storage';

// Define network data types
interface NetworkNode {
  id: string;
  name: string;
  type: 'politician' | 'organization';
  group: string;
  amount?: number;
  image?: string | null;
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;
  type: 'contribution' | 'conflict';
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

/**
 * Generate a network visualization data structure showing connections
 * between politicians and their funding sources/stock transactions
 */
export async function generateNetworkData(options: {
  politicianIds?: number[];
  includeContributions?: boolean;
  includeStocks?: boolean;
  maxNodes?: number;
}): Promise<NetworkData> {
  const {
    politicianIds = [],
    includeContributions = true,
    includeStocks = true,
    maxNodes = 100
  } = options;

  // Initialize network data structure
  const networkData: NetworkData = {
    nodes: [] as NetworkNode[],
    links: [] as NetworkLink[]
  };

  // Track nodes to avoid duplicates
  const nodeIds = new Set<string>();
  
  // If specific politicians are requested, fetch only those, otherwise fetch all
  let politicians: Politician[] = [];
  if (politicianIds.length > 0) {
    politicians = await Promise.all(
      politicianIds.map(id => storage.getPolitician(id))
    );
    politicians = politicians.filter(p => p !== undefined) as Politician[];
  } else {
    politicians = await storage.getPoliticians();
  }

  // Add politicians as nodes
  for (const politician of politicians) {
    const nodeId = `politician-${politician.id}`;
    if (!nodeIds.has(nodeId)) {
      const node: NetworkNode = {
        id: nodeId,
        name: `${politician.firstName} ${politician.lastName}`,
        type: 'politician',
        group: politician.party,
        image: politician.profileImage || null
      };
      networkData.nodes.push(node);
      nodeIds.add(nodeId);
    }
  }

  // If we need to include contribution data
  if (includeContributions) {
    // Get all contributions for the requested politicians
    const allContributions: Contribution[] = [];
    for (const politician of politicians) {
      const contributions = await storage.getContributionsByPolitician(politician.id);
      allContributions.push(...contributions);
    }

    // Group contributions by organization
    const organizationContributions: { [key: string]: { politician: Politician, contribution: Contribution }[] } = {};
    
    for (const contribution of allContributions) {
      const politician = politicians.find(p => p.id === contribution.politicianId);
      if (!politician) continue;
      
      const org = contribution.organization;
      if (!organizationContributions[org]) {
        organizationContributions[org] = [];
      }
      
      organizationContributions[org].push({ politician, contribution });
    }

    // Add organizations as nodes and create links
    for (const [organization, contributions] of Object.entries(organizationContributions)) {
      // Skip if we've reached the max number of nodes
      if (networkData.nodes.length >= maxNodes) break;
      
      // Determine the industry for this organization
      const industries = contributions.map(c => c.contribution.industry).filter(Boolean);
      const industry = industries.length > 0 
        ? industries.sort((a, b) => 
            industries.filter(i => i === a).length - industries.filter(i => i === b).length
          )[0] 
        : 'Unknown';
      
      // Calculate total contributions from this organization
      const totalAmount = contributions.reduce((sum, { contribution }) => {
        const amount = typeof contribution.amount === 'string'
          ? parseFloat(contribution.amount)
          : Number(contribution.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Create organization node
      const nodeId = `organization-${organization.replace(/\s+/g, '-')}`;
      if (!nodeIds.has(nodeId)) {
        const node: NetworkNode = {
          id: nodeId,
          name: organization,
          type: 'organization',
          group: industry || 'Unknown',
          amount: totalAmount
        };
        networkData.nodes.push(node);
        nodeIds.add(nodeId);
      }
      
      // Create links between politicians and this organization
      for (const { politician, contribution } of contributions) {
        const politicianNodeId = `politician-${politician.id}`;
        const amount = typeof contribution.amount === 'string'
          ? parseFloat(contribution.amount)
          : Number(contribution.amount);
          
        if (isNaN(amount)) continue;
        
        networkData.links.push({
          source: nodeId,
          target: politicianNodeId,
          value: amount,
          type: 'contribution'
        });
      }
    }
  }

  // If we need to include stock transaction data
  if (includeStocks) {
    // Get all stock transactions for the requested politicians
    const allTransactions: StockTransaction[] = [];
    for (const politician of politicians) {
      const transactions = await storage.getStockTransactionsByPolitician(politician.id);
      allTransactions.push(...transactions);
    }
    
    // Group transactions by stock name
    const stockTransactions: { [key: string]: { politician: Politician, transaction: StockTransaction }[] } = {};
    
    for (const transaction of allTransactions) {
      const politician = politicians.find(p => p.id === transaction.politicianId);
      if (!politician) continue;
      
      const stock = transaction.stockName;
      if (!stockTransactions[stock]) {
        stockTransactions[stock] = [];
      }
      
      stockTransactions[stock].push({ politician, transaction });
    }
    
    // Add stocks as nodes and create links
    for (const [stockName, transactions] of Object.entries(stockTransactions)) {
      // Skip if we've reached the max number of nodes
      if (networkData.nodes.length >= maxNodes) break;
      
      // Calculate total transaction value
      const totalAmount = transactions.reduce((sum, { transaction }) => {
        const amount = typeof transaction.amount === 'string'
          ? parseFloat(transaction.amount)
          : Number(transaction.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Create stock node
      const nodeId = `stock-${stockName.replace(/\s+/g, '-')}`;
      if (!nodeIds.has(nodeId)) {
        networkData.nodes.push({
          id: nodeId,
          name: stockName,
          type: 'organization',
          group: 'Stock',
          amount: totalAmount
        });
        nodeIds.add(nodeId);
      }
      
      // Create links between politicians and this stock
      for (const { politician, transaction } of transactions) {
        const politicianNodeId = `politician-${politician.id}`;
        const amount = typeof transaction.amount === 'string'
          ? parseFloat(transaction.amount)
          : Number(transaction.amount);
          
        if (isNaN(amount)) continue;
        
        const linkType = transaction.potentialConflict ? 'conflict' : 'contribution';
        
        networkData.links.push({
          source: nodeId,
          target: politicianNodeId,
          value: amount,
          type: linkType
        });
      }
    }
  }

  return networkData;
}

/**
 * Get summary data on top contributors by industry
 */
export async function getTopContributorsByIndustry(politicianId: number, limit = 10) {
  const contributions = await storage.getContributionsByPolitician(politicianId);
  
  // Group by industry and sum amounts
  const industryTotals: Record<string, number> = {};
  
  for (const contribution of contributions) {
    if (!contribution.industry) continue;
    
    const amount = typeof contribution.amount === 'string'
      ? parseFloat(contribution.amount)
      : Number(contribution.amount);
      
    if (isNaN(amount)) continue;
    
    const industry = contribution.industry;
    industryTotals[industry] = (industryTotals[industry] || 0) + amount;
  }
  
  // Convert to array and sort by amount
  const result = Object.entries(industryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
    
  return result;
}