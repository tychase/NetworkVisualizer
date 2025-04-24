import { Express, Request, Response, NextFunction } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { createServer } from "http";
import {
  insertPoliticianSchema,
  insertVoteSchema,
  insertContributionSchema,
  insertStockTransactionSchema,
} from "@shared/schema";
import pipelineRoutes from "./routes/pipeline-routes";
import { updatePhotoUrls } from "./api/update-photo-urls";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Register pipeline routes
  app.use('/api/pipelines', pipelineRoutes);

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
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      const politician = await storage.getPolitician(politicianId);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      res.json(politician);
    } catch (error) {
      console.error(`Error fetching politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch politician" });
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
      const stockTransactions = await storage.getStockTransactions();
      res.json(stockTransactions);
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
      
      const stockTransactions = await storage.getStockTransactionsByPolitician(politicianId);
      res.json(stockTransactions);
    } catch (error) {
      console.error(`Error fetching stock transactions for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch stock transactions" });
    }
  });

  app.post("/api/stock-transactions", async (req, res) => {
    try {
      const validatedData = insertStockTransactionSchema.parse(req.body);
      const stockTransaction = await storage.createStockTransaction(validatedData);
      res.status(201).json(stockTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stock transaction data", errors: error.errors });
      }
      console.error("Error creating stock transaction:", error);
      res.status(500).json({ message: "Failed to create stock transaction" });
    }
  });

  // Timeline endpoint for politician
  app.get("/api/politicians/:id/timeline", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 10;
      
      // Check if politician exists
      const politician = await storage.getPolitician(politicianId);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Get all data for this politician
      const votes = await storage.getVotesByPolitician(politicianId);
      const contributions = await storage.getContributionsByPolitician(politicianId);
      const stockTransactions = await storage.getStockTransactionsByPolitician(politicianId);
      
      // Combine into a single timeline
      const timelineItems = [
        ...votes.map(vote => ({
          uid: `vote_${vote.id}`,
          type: 'vote',
          data: vote,
          date: vote.voteDate,
          amount: null
        })),
        ...contributions.map(contribution => ({
          uid: `contribution_${contribution.id}`,
          type: 'contribution',
          data: contribution,
          date: contribution.contributionDate,
          amount: contribution.amount
        })),
        ...stockTransactions.map(transaction => ({
          uid: `transaction_${transaction.id}`,
          type: 'stock_transaction',
          data: transaction,
          date: transaction.tradeDate,
          amount: transaction.amount
        }))
      ];
      
      // Sort by date descending
      timelineItems.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = timelineItems.slice(startIndex, endIndex);
      
      // Calculate if there's another page
      const hasNextPage = endIndex < timelineItems.length;
      
      res.json({
        items: paginatedItems,
        total: timelineItems.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(timelineItems.length / pageSize),
        next_page: hasNextPage ? page + 1 : null
      });
    } catch (error) {
      console.error(`Error fetching timeline for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  // Network endpoint for money map
  app.get("/api/politicians/:id/network", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Get days filter parameter
      const nDays = parseInt(req.query.n_days as string) || 365;
      
      // Check if politician exists
      const politician = await storage.getPolitician(politicianId);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - nDays);
      
      // Get contributions for this politician
      const contributions = await storage.getContributionsByPolitician(politicianId);
      
      // Filter contributions by date
      const recentContributions = contributions.filter(contrib => {
        const contributionDate = new Date(contrib.contributionDate);
        return contributionDate >= cutoffDate;
      });
      
      // Build network graph
      const nodes = [
        {
          id: `p${politician.id}`,
          type: 'politician',
          label: `${politician.firstName} ${politician.lastName}`,
          party: politician.party,
          state: politician.state
        }
      ];
      
      // Add organization nodes from contributions
      const organizations = new Set<string>();
      recentContributions.forEach(contrib => {
        organizations.add(contrib.organization);
      });
      
      organizations.forEach(org => {
        nodes.push({
          id: `org_${org.replace(/\s+/g, '_')}`,
          type: 'organization',
          label: org
        });
      });
      
      // Create links from contributions
      const links = recentContributions.map(contrib => {
        const orgId = `org_${contrib.organization.replace(/\s+/g, '_')}`;
        const amount = typeof contrib.amount === 'string' 
          ? parseFloat(contrib.amount) 
          : Number(contrib.amount);
          
        return {
          source: orgId,
          target: `p${politician.id}`,
          weight: amount,
          kind: 'contribution',
          date: contrib.contributionDate
        };
      });
      
      res.json({
        nodes,
        links
      });
    } catch (error) {
      console.error(`Error fetching network for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch network" });
    }
  });

  // Conflicts endpoint for potential conflicts of interest
  app.get("/api/politicians/:id/conflicts", async (req, res) => {
    try {
      const politicianId = parseInt(req.params.id);
      if (isNaN(politicianId)) {
        return res.status(400).json({ message: "Invalid politician ID" });
      }
      
      // Get days filter parameter
      const days = parseInt(req.query.days as string) || 30;
      
      // Check if politician exists
      const politician = await storage.getPolitician(politicianId);
      if (!politician) {
        return res.status(404).json({ message: "Politician not found" });
      }
      
      // Get stock transactions and votes for this politician
      const transactions = await storage.getStockTransactionsByPolitician(politicianId);
      const votes = await storage.getVotesByPolitician(politicianId);
      
      // Find potential conflicts
      const conflicts = [];
      
      for (const transaction of transactions) {
        // Skip transactions without related bills
        if (!transaction.relatedBill) continue;
        
        // Find votes on the same bill
        const relatedVotes = votes.filter(vote => vote.billName === transaction.relatedBill);
        
        for (const vote of relatedVotes) {
          const transactionDate = new Date(transaction.tradeDate);
          const voteDate = new Date(vote.voteDate);
          
          // Calculate absolute difference in days
          const diffTime = Math.abs(voteDate.getTime() - transactionDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Add to conflicts if within specified days range
          if (diffDays <= days) {
            conflicts.push({
              trade_id: transaction.id,
              bill_id: vote.id,
              delta_days: diffDays,
              amount: transaction.amount,
              symbol: transaction.stockName,
              vote_date: vote.voteDate,
              trade_date: transaction.tradeDate,
              trade_type: transaction.tradeType,
              vote_result: vote.voteResult,
              bill_name: vote.billName,
              bill_description: vote.billDescription
            });
          }
        }
      }
      
      res.json(conflicts);
    } catch (error) {
      console.error(`Error fetching conflicts for politician with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch conflicts" });
    }
  });

  // API Version check
  app.get("/api/version", (req, res) => {
    res.json({ version: "1.0.0", environment: process.env.NODE_ENV });
  });
  
  // Update photo URLs
  app.post("/api/update-photo-urls", updatePhotoUrls);

  // Sample data generator endpoint
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

  return server;
}