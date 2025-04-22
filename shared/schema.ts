import { pgTable, text, serial, integer, date, decimal, varchar, boolean } from "drizzle-orm/pg-core";
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
});

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

export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({
  id: true,
});

// Export types
export type Politician = typeof politicians.$inferSelect;
export type InsertPolitician = z.infer<typeof insertPoliticianSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type Contribution = typeof contributions.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;
