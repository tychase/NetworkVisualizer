import { pgTable, text, serial, integer, date, decimal, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Politicians table
export const politicians = pgTable("politicians", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  state: text("state").notNull(),
  party: text("party").notNull(),
  profileImage: text("profile_image"),
  // Add canonical IDs from external data sources
  fecCandidateId: text("fec_candidate_id"),
  bioguideId: text("bioguide_id"), // Congress API canonical ID
});

// Note: We'll define politician relations after all tables are defined to avoid circular references

export const insertPoliticianSchema = createInsertSchema(politicians).omit({
  id: true,
});

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id),
  billName: text("bill_name").notNull(),
  billDescription: text("bill_description"),
  voteDate: date("vote_date").notNull(),
  voteResult: text("vote_result").notNull(), // YES, NO, ABSTAIN
});

// Define vote relations
export const votesRelations = relations(votes, ({ one }) => ({
  politician: one(politicians, {
    fields: [votes.politicianId],
    references: [politicians.id],
  }),
}));

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
});

// Contributions table
export const contributions = pgTable("contributions", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id),
  organization: text("organization").notNull(),
  amount: decimal("amount").notNull(),
  contributionDate: date("contribution_date").notNull(),
  industry: text("industry"),
});

// Define contribution relations
export const contributionsRelations = relations(contributions, ({ one }) => ({
  politician: one(politicians, {
    fields: [contributions.politicianId],
    references: [politicians.id],
  }),
}));

export const insertContributionSchema = createInsertSchema(contributions).omit({
  id: true,
});

// Stock transactions table
export const stockTransactions = pgTable("stock_transactions", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id),
  stockName: text("stock_name").notNull(),
  tradeDate: date("trade_date").notNull(),
  tradeType: text("trade_type").notNull(), // BUY, SELL
  amount: decimal("amount").notNull(),
  relatedBill: text("related_bill"),
  potentialConflict: boolean("potential_conflict").default(false),
});

// Define stock transaction relations
export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
  politician: one(politicians, {
    fields: [stockTransactions.politicianId],
    references: [politicians.id],
  }),
}));

export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({
  id: true,
});

// Pipeline runs table to track the status of data pipeline runs
export const pipelineRuns = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  pipelineName: text("pipeline_name").notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  status: text("status").notNull(), // running, completed, error
  rowsProcessed: integer("rows_processed").default(0),
  rowsInserted: integer("rows_inserted").default(0),
  notes: text("notes"),
  logUrl: text("log_url"), // URL to log file or cloud logging service
});

export const insertPipelineRunSchema = createInsertSchema(pipelineRuns).omit({
  id: true,
});

// Politician alias table to handle different name formats across data sources
export const politicianAliases = pgTable("politician_aliases", {
  id: serial("id").primaryKey(),
  politicianId: integer("politician_id").references(() => politicians.id).notNull(),
  aliasName: text("alias_name").notNull(),
  source: text("source").notNull(), // fec, congress, stockact, etc.
});

export const insertPoliticianAliasSchema = createInsertSchema(politicianAliases).omit({
  id: true,
});

// Define politician alias relations
export const politicianAliasesRelations = relations(politicianAliases, ({ one }) => ({
  politician: one(politicians, {
    fields: [politicianAliases.politicianId],
    references: [politicians.id],
  }),
}));

// Export types
export type Politician = typeof politicians.$inferSelect;
export type InsertPolitician = z.infer<typeof insertPoliticianSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type InsertPipelineRun = z.infer<typeof insertPipelineRunSchema>;

export type PoliticianAlias = typeof politicianAliases.$inferSelect;
export type InsertPoliticianAlias = z.infer<typeof insertPoliticianAliasSchema>;

// Now define politician relations after all tables are defined
export const politiciansRelations = relations(politicians, ({ many }) => ({
  votes: many(votes),
  contributions: many(contributions),
  stockTransactions: many(stockTransactions),
  aliases: many(politicianAliases),
}));
