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

  const httpServer = createServer(app);

  return httpServer;
}
