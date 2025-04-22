import { Politician, Vote, Contribution, StockTransaction } from "@shared/schema";

export interface PoliticianWithDetails extends Politician {
  totalContributions?: number;
  stockTransactionsCount?: number;
  keyVotesCount?: number;
  topIndustry?: string;
}

export interface StockTransactionWithPolitician extends StockTransaction {
  politician?: Politician;
}

export interface VoteWithPolitician extends Vote {
  politician?: Politician;
}

export interface ContributionWithPolitician extends Contribution {
  politician?: Politician;
}

export interface MoneyMapFilters {
  politician: string;
  industry: string;
  dateRange: string;
}

export interface StockTransactionFilters {
  politician: string;
  stockName: string;
  relatedBill: string;
  tradeType: string;
}

export type DateRange = '12m' | '24m' | '5y' | 'custom';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'politician' | 'organization';
  group: string;
  amount?: number;
  image?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  value: number;
  type: 'contribution' | 'conflict';
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface TopContributor {
  name: string;
  value: number;
}
