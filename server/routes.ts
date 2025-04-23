import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertPoliticianSchema,
  insertVoteSchema,
  insertContributionSchema,
  insertStockTransactionSchema
} from "@shared/schema";
import * as fecApi from "./api/fec-api";
import * as dataSync from "./api/data-sync";
import * as networkUtils from "./api/network-utils";
import * as openSecretsApi from "./api/opensecrets-api";
import * as congressApi from "./api/congress-api";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoints
  
  // Politicians endpoints
  app.get("/api/politicians", async (req, res) => {
    try {
      const politicians = await storage.getPoliticians();
      res.json(politicians);
    } catch (error) {
      console.error("Error fetching politicians:", error);
      res.status(500).json({ message: "Failed to fetch politicians" });
    }
  });

  app.get("/api/politicians/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      res.json(politician);
    } catch (error) {
      console.error(`Error fetching politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch politician" });
    }
  });

  // Get politician with detailed stats
  app.get("/api/politicians/:id/details", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Get politician basic info
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }

      // Get contributions for this politician
      const contributions = await storage.getContributionsByPolitician(id);
      
      // Calculate total contributions
      const totalContributions = contributions.reduce((total, contribution) => {
        const amount = typeof contribution.amount === 'string' 
          ? parseFloat(contribution.amount) 
          : Number(contribution.amount);
        return total + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Count stock transactions
      const stockTransactions = await storage.getStockTransactionsByPolitician(id);
      
      // Count votes
      const votes = await storage.getVotesByPolitician(id);
      
      // Find top industry by contribution amount
      const industryTotals: Record<string, number> = {};
      contributions.forEach(contribution => {
        if (!contribution.industry) return;
        
        const amount = typeof contribution.amount === 'string' 
          ? parseFloat(contribution.amount) 
          : Number(contribution.amount);
          
        if (isNaN(amount)) return;
        
        const industry = contribution.industry;
        industryTotals[industry] = (industryTotals[industry] || 0) + amount;
      });
      
      let topIndustry = '';
      let topIndustryAmount = 0;
      
      Object.entries(industryTotals).forEach(([industry, amount]) => {
        if (amount > topIndustryAmount) {
          topIndustry = industry;
          topIndustryAmount = amount;
        }
      });
      
      // Return combined data
      res.json({
        ...politician,
        totalContributions,
        stockTransactionsCount: stockTransactions.length,
        keyVotesCount: votes.length,
        topIndustry: topIndustry || null,
        topIndustryAmount: topIndustryAmount || null
      });
    } catch (error) {
      console.error(`Error fetching politician details with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch politician details" });
    }
  });

  app.post("/api/politicians", async (req, res) => {
    try {
      const validatedData = insertPoliticianSchema.parse(req.body);
      const politician = await storage.createPolitician(validatedData);
      res.status(201).json(politician);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid politician data", errors: error.errors });
      }
      console.error("Error creating politician:", error);
      res.status(500).json({ message: "Failed to create politician" });
    }
  });

  // Votes endpoints
  app.get("/api/votes", async (req, res) => {
    try {
      const votes = await storage.getVotes();
      res.json(votes);
    } catch (error) {
      console.error("Error fetching votes:", error);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  app.get("/api/politicians/:id/votes", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      const votes = await storage.getVotesByPolitician(politicianId);
      res.json(votes);
    } catch (error) {
      console.error(`Error fetching votes for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  app.post("/api/votes", async (req, res) => {
    try {
      const validatedData = insertVoteSchema.parse(req.body);
      const vote = await storage.createVote(validatedData);
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Contributions endpoints
  app.get("/api/contributions", async (req, res) => {
    try {
      const contributions = await storage.getContributions();
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching contributions:", error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.get("/api/politicians/:id/contributions", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      const contributions = await storage.getContributionsByPolitician(politicianId);
      res.json(contributions);
    } catch (error) {
      console.error(`Error fetching contributions for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.post("/api/contributions", async (req, res) => {
    try {
      const validatedData = insertContributionSchema.parse(req.body);
      const contribution = await storage.createContribution(validatedData);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contribution data", errors: error.errors });
      }
      console.error("Error creating contribution:", error);
      res.status(500).json({ message: "Failed to create contribution" });
    }
  });

  // Stock transactions endpoints
  app.get("/api/stock-transactions", async (req, res) => {
    try {
      const transactions = await storage.getStockTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching stock transactions:", error);
      res.status(500).json({ message: "Failed to fetch stock transactions" });
    }
  });

  app.get("/api/politicians/:id/stock-transactions", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      const transactions = await storage.getStockTransactionsByPolitician(politicianId);
      res.json(transactions);
    } catch (error) {
      console.error(`Error fetching stock transactions for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch stock transactions" });
    }
  });

  app.post("/api/stock-transactions", async (req, res) => {
    try {
      const validatedData = insertStockTransactionSchema.parse(req.body);
      const transaction = await storage.createStockTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stock transaction data", errors: error.errors });
      }
      console.error("Error creating stock transaction:", error);
      res.status(500).json({ message: "Failed to create stock transaction" });
    }
  });

  // FEC API endpoints
  app.get("/api/fec/test-connection", async (req, res) => {
    try {
      const result = await fecApi.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing FEC API connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test FEC API connection",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/fec/candidates/search", async (req, res) => {
    try {
      const { name, office, election_year, state, party, page, per_page } = req.query;
      
      const params: any = {};
      if (name) params.name = String(name);
      if (office) params.office = String(office);
      if (election_year) params.election_year = Number(election_year);
      if (state) params.state = String(state);
      if (party) params.party = String(party);
      if (page) params.page = Number(page);
      if (per_page) params.per_page = Number(per_page);
      
      const result = await fecApi.searchCandidates(params);
      res.json(result);
    } catch (error) {
      console.error("Error searching FEC candidates:", error);
      res.status(500).json({ message: "Failed to search FEC candidates" });
    }
  });

  app.get("/api/fec/candidates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await fecApi.getCandidateById(id);
      res.json(result);
    } catch (error) {
      console.error(`Error fetching FEC candidate with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch FEC candidate" });
    }
  });

  app.get("/api/fec/candidates/:id/committees", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await fecApi.getCandidateCommittees(id);
      res.json(result);
    } catch (error) {
      console.error(`Error fetching committees for FEC candidate with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch FEC candidate committees" });
    }
  });

  app.get("/api/fec/candidates/:id/financials", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await fecApi.getCandidateFinancials(id);
      res.json(result);
    } catch (error) {
      console.error(`Error fetching financials for FEC candidate with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch FEC candidate financials" });
    }
  });

  app.get("/api/fec/committees/search", async (req, res) => {
    try {
      const { name, committee_type, state, party, page, per_page } = req.query;
      
      const params: any = {};
      if (name) params.name = String(name);
      if (committee_type) params.committee_type = String(committee_type);
      if (state) params.state = String(state);
      if (party) params.party = String(party);
      if (page) params.page = Number(page);
      if (per_page) params.per_page = Number(per_page);
      
      const result = await fecApi.searchCommittees(params);
      res.json(result);
    } catch (error) {
      console.error("Error searching FEC committees:", error);
      res.status(500).json({ message: "Failed to search FEC committees" });
    }
  });

  app.get("/api/fec/committees/:id/contributions", async (req, res) => {
    try {
      const { id } = req.params;
      const { min_amount, max_amount, two_year_transaction_period, page, per_page } = req.query;
      
      const params: any = {};
      if (min_amount) params.min_amount = Number(min_amount);
      if (max_amount) params.max_amount = Number(max_amount);
      if (two_year_transaction_period) params.two_year_transaction_period = Number(two_year_transaction_period);
      if (page) params.page = Number(page);
      if (per_page) params.per_page = Number(per_page);
      
      const result = await fecApi.getCommitteeContributions(id as string, params);
      res.json(result);
    } catch (error) {
      console.error(`Error fetching contributions for FEC committee with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch FEC committee contributions" });
    }
  });

  app.get("/api/fec/committees/:id/disbursements", async (req, res) => {
    try {
      const { id } = req.params;
      const { min_amount, max_amount, two_year_transaction_period, page, per_page } = req.query;
      
      const params: any = {};
      if (min_amount) params.min_amount = Number(min_amount);
      if (max_amount) params.max_amount = Number(max_amount);
      if (two_year_transaction_period) params.two_year_transaction_period = Number(two_year_transaction_period);
      if (page) params.page = Number(page);
      if (per_page) params.per_page = Number(per_page);
      
      const result = await fecApi.getCommitteeDisbursements(id as string, params);
      res.json(result);
    } catch (error) {
      console.error(`Error fetching disbursements for FEC committee with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch FEC committee disbursements" });
    }
  });

  // Data import endpoints
  app.post("/api/import/fec/politician/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dataSync.importPoliticianFromFEC(id);
      res.json({
        success: true,
        message: "Successfully imported politician from FEC",
        data: result
      });
    } catch (error) {
      console.error(`Error importing politician with ID ${req.params.id} from FEC:`, error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to import politician from FEC",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Generate sample data for existing politician
  app.post("/api/politicians/:id/generate-data", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Check if politician exists
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Generate sample data
      await storage.createSampleDataForPolitician(id);
      
      res.json({
        success: true,
        message: `Successfully generated sample data for ${politician.firstName} ${politician.lastName}`,
        politicianId: id
      });
    } catch (error) {
      console.error(`Error generating sample data for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate sample data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/import/fec/politicians/search", async (req, res) => {
    try {
      const { name, office, election_year, state, party, limit } = req.body;
      
      const params: any = {};
      if (name) params.name = name;
      if (office) params.office = office;
      if (election_year) params.election_year = election_year;
      if (state) params.state = state;
      if (party) params.party = party;
      if (limit) params.limit = limit;
      
      const result = await dataSync.importPoliticiansFromSearch(params);
      res.json({
        success: true,
        message: "Successfully imported politicians from FEC search",
        data: result
      });
    } catch (error) {
      console.error("Error importing politicians from FEC search:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to import politicians from FEC search",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // OpenSecrets API endpoints
  app.get("/api/opensecrets/test-connection", async (req, res) => {
    try {
      const result = await openSecretsApi.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing OpenSecrets API connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test OpenSecrets API connection",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/import/opensecrets/contributions", async (req, res) => {
    try {
      const { politicianId, cid } = req.body;
      
      if (!politicianId || !cid) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters: politicianId and cid"
        });
      }
      
      const result = await dataSync.importContributionsFromOpenSecrets(politicianId, cid);
      res.json(result);
    } catch (error) {
      console.error("Error importing contributions from OpenSecrets:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to import contributions from OpenSecrets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Congress.gov API endpoints
  app.get("/api/congress/test-connection", async (req, res) => {
    try {
      const result = await congressApi.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Congress API connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test Congress API connection",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/import/congress/votes", async (req, res) => {
    try {
      const { politicianId, memberId, congress } = req.body;
      
      if (!politicianId || !memberId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters: politicianId and memberId"
        });
      }
      
      const result = await dataSync.importVotesForPolitician(politicianId, memberId, congress);
      res.json(result);
    } catch (error) {
      console.error("Error importing votes from Congress API:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to import votes from Congress API",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Bulk data processing
  app.post("/api/import/bulk", async (req, res) => {
    try {
      const { filePath, source, dataType } = req.body;
      
      if (!filePath || !source || !dataType) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters: filePath, source, and dataType"
        });
      }
      
      const result = await dataSync.processBulkDataFile(filePath, source, dataType);
      res.json(result);
    } catch (error) {
      console.error("Error processing bulk data:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process bulk data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Test all API connections
  app.get("/api/test-connections", async (req, res) => {
    try {
      const result = await dataSync.testAPIConnections();
      res.json(result);
    } catch (error) {
      console.error("Error testing API connections:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test API connections",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Network visualization endpoints
  app.get("/api/network", async (req, res) => {
    try {
      const { politician_ids, include_contributions, include_stocks, max_nodes } = req.query;
      
      // Parse query parameters
      const politicianIds = politician_ids ? String(politician_ids).split(',').map(id => parseInt(id)) : [];
      const includeContributions = include_contributions === undefined ? true : include_contributions === 'true';
      const includeStocks = include_stocks === undefined ? true : include_stocks === 'true';
      const maxNodes = max_nodes ? parseInt(String(max_nodes)) : 100;
      
      // Generate network data
      const networkData = await networkUtils.generateNetworkData({
        politicianIds: politicianIds.filter(id => !isNaN(id)),
        includeContributions,
        includeStocks,
        maxNodes
      });
      
      res.json(networkData);
    } catch (error) {
      console.error("Error generating network data:", error);
      res.status(500).json({ message: "Failed to generate network data" });
    }
  });
  
  app.get("/api/politicians/:id/network", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Check if politician exists
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Generate network data for this politician
      const networkData = await networkUtils.generateNetworkData({
        politicianIds: [id],
        includeContributions: true,
        includeStocks: true
      });
      
      res.json(networkData);
    } catch (error) {
      console.error(`Error generating network data for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to generate network data" });
    }
  });
  
  app.get("/api/politicians/:id/top-contributors", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Check if politician exists
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
      
      // Get top contributors by industry
      const topContributors = await networkUtils.getTopContributorsByIndustry(id, limit);
      
      res.json(topContributors);
    } catch (error) {
      console.error(`Error getting top contributors for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to get top contributors" });
    }
  });
  
  // Timeline endpoint - aggregates votes, contributions, and stock transactions by date
  app.get("/api/politicians/:id/timeline", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Check if politician exists
      const politician = await storage.getPolitician(id);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Get data for timeline
      const votes = await storage.getVotesByPolitician(id);
      const contributions = await storage.getContributionsByPolitician(id);
      const stockTransactions = await storage.getStockTransactionsByPolitician(id);
      
      // Transform each data type to a common timeline event format
      const timelineEvents = [
        // Map votes to timeline events
        ...votes.map(vote => ({
          type: 'vote',
          date: vote.voteDate,
          politician: {
            id: politician.id,
            firstName: politician.firstName,
            lastName: politician.lastName,
            party: politician.party,
            state: politician.state
          },
          data: {
            billName: vote.billName,
            billDescription: vote.billDescription,
            voteResult: vote.voteResult
          }
        })),
        
        // Map contributions to timeline events
        ...contributions.map(contribution => ({
          type: 'contribution',
          date: contribution.contributionDate,
          politician: {
            id: politician.id,
            firstName: politician.firstName,
            lastName: politician.lastName,
            party: politician.party,
            state: politician.state
          },
          data: {
            organization: contribution.organization,
            amount: contribution.amount,
            industry: contribution.industry
          }
        })),
        
        // Map stock transactions to timeline events
        ...stockTransactions.map(transaction => ({
          type: 'stock_transaction',
          date: transaction.tradeDate,
          politician: {
            id: politician.id,
            firstName: politician.firstName,
            lastName: politician.lastName,
            party: politician.party,
            state: politician.state
          },
          data: {
            stockName: transaction.stockName,
            tradeType: transaction.tradeType,
            amount: transaction.amount,
            relatedBill: transaction.relatedBill,
            potentialConflict: transaction.potentialConflict
          }
        }))
      ];
      
      // Sort timeline events by date (newest first by default)
      const sortDirection = req.query.sort === 'asc' ? 1 : -1;
      timelineEvents.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection * (dateB - dateA);
      });
      
      // Apply pagination if requested
      const page = req.query.page ? parseInt(String(req.query.page)) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      
      // Prepare pagination metadata
      const paginationMeta = {
        totalItems: timelineEvents.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(timelineEvents.length / limit)
      };
      
      // Return paginated results
      const paginatedEvents = timelineEvents.slice(startIndex, endIndex);
      
      res.json({
        politician: {
          id: politician.id,
          firstName: politician.firstName,
          lastName: politician.lastName,
          party: politician.party,
          state: politician.state
        },
        timeline: paginatedEvents,
        pagination: paginationMeta,
        summary: {
          totalVotes: votes.length,
          totalContributions: contributions.length,
          totalStockTransactions: stockTransactions.length
        }
      });
    } catch (error) {
      console.error(`Error fetching timeline for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch timeline data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
