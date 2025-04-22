import { 
  Politician, InsertPolitician, 
  Vote, InsertVote, 
  Contribution, InsertContribution, 
  StockTransaction, InsertStockTransaction 
} from "@shared/schema";

export interface IStorage {
  // Politician methods
  getPoliticians(): Promise<Politician[]>;
  getPolitician(id: number): Promise<Politician | undefined>;
  createPolitician(politician: InsertPolitician): Promise<Politician>;

  // Vote methods
  getVotes(): Promise<Vote[]>;
  getVotesByPolitician(politicianId: number): Promise<Vote[]>;
  getVotesByBill(billName: string): Promise<Vote[]>;
  createVote(vote: InsertVote): Promise<Vote>;

  // Contribution methods
  getContributions(): Promise<Contribution[]>;
  getContributionsByPolitician(politicianId: number): Promise<Contribution[]>;
  getContributionsByOrganization(organization: string): Promise<Contribution[]>;
  createContribution(contribution: InsertContribution): Promise<Contribution>;

  // Stock transaction methods
  getStockTransactions(): Promise<StockTransaction[]>;
  getStockTransactionsByPolitician(politicianId: number): Promise<StockTransaction[]>;
  getStockTransactionsByStock(stockName: string): Promise<StockTransaction[]>;
  createStockTransaction(transaction: InsertStockTransaction): Promise<StockTransaction>;
}

export class MemStorage implements IStorage {
  private politicians: Map<number, Politician>;
  private votes: Map<number, Vote>;
  private contributions: Map<number, Contribution>;
  private stockTransactions: Map<number, StockTransaction>;
  private politicianId: number;
  private voteId: number;
  private contributionId: number;
  private stockTransactionId: number;

  constructor() {
    this.politicians = new Map();
    this.votes = new Map();
    this.contributions = new Map();
    this.stockTransactions = new Map();
    this.politicianId = 1;
    this.voteId = 1;
    this.contributionId = 1;
    this.stockTransactionId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  // Politician methods
  async getPoliticians(): Promise<Politician[]> {
    return Array.from(this.politicians.values());
  }

  async getPolitician(id: number): Promise<Politician | undefined> {
    return this.politicians.get(id);
  }

  async createPolitician(insertPolitician: InsertPolitician): Promise<Politician> {
    const id = this.politicianId++;
    const politician: Politician = { id, ...insertPolitician };
    this.politicians.set(id, politician);
    return politician;
  }

  // Vote methods
  async getVotes(): Promise<Vote[]> {
    return Array.from(this.votes.values());
  }

  async getVotesByPolitician(politicianId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.politicianId === politicianId
    );
  }

  async getVotesByBill(billName: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.billName.includes(billName)
    );
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.voteId++;
    const vote: Vote = { id, ...insertVote };
    this.votes.set(id, vote);
    return vote;
  }

  // Contribution methods
  async getContributions(): Promise<Contribution[]> {
    return Array.from(this.contributions.values());
  }

  async getContributionsByPolitician(politicianId: number): Promise<Contribution[]> {
    return Array.from(this.contributions.values()).filter(
      (contribution) => contribution.politicianId === politicianId
    );
  }

  async getContributionsByOrganization(organization: string): Promise<Contribution[]> {
    return Array.from(this.contributions.values()).filter(
      (contribution) => contribution.organization.includes(organization)
    );
  }

  async createContribution(insertContribution: InsertContribution): Promise<Contribution> {
    const id = this.contributionId++;
    const contribution: Contribution = { id, ...insertContribution };
    this.contributions.set(id, contribution);
    return contribution;
  }

  // Stock transaction methods
  async getStockTransactions(): Promise<StockTransaction[]> {
    return Array.from(this.stockTransactions.values());
  }

  async getStockTransactionsByPolitician(politicianId: number): Promise<StockTransaction[]> {
    return Array.from(this.stockTransactions.values()).filter(
      (transaction) => transaction.politicianId === politicianId
    );
  }

  async getStockTransactionsByStock(stockName: string): Promise<StockTransaction[]> {
    return Array.from(this.stockTransactions.values()).filter(
      (transaction) => transaction.stockName.includes(stockName)
    );
  }

  async createStockTransaction(insertTransaction: InsertStockTransaction): Promise<StockTransaction> {
    const id = this.stockTransactionId++;
    const transaction: StockTransaction = { id, ...insertTransaction };
    this.stockTransactions.set(id, transaction);
    return transaction;
  }

  // Sample data initialization
  private async initializeSampleData() {
    // Create politicians
    const janeSmith = await this.createPolitician({
      firstName: "Jane",
      lastName: "Smith",
      state: "California",
      party: "Democrat",
      profileImage: "https://randomuser.me/api/portraits/women/2.jpg"
    });

    const johnDavis = await this.createPolitician({
      firstName: "John",
      lastName: "Davis",
      state: "Texas",
      party: "Republican",
      profileImage: "https://randomuser.me/api/portraits/men/4.jpg"
    });

    const maryWilson = await this.createPolitician({
      firstName: "Mary",
      lastName: "Wilson",
      state: "New York",
      party: "Democrat",
      profileImage: "https://randomuser.me/api/portraits/women/8.jpg"
    });

    const robertJohnson = await this.createPolitician({
      firstName: "Robert",
      lastName: "Johnson",
      state: "Vermont",
      party: "Independent",
      profileImage: "https://randomuser.me/api/portraits/men/10.jpg"
    });

    // Create votes
    await this.createVote({
      politicianId: janeSmith.id,
      billName: "Tech Regulation Act (H.R. 1234)",
      billDescription: "A bill to regulate technology companies and protect user data",
      voteDate: new Date("2023-08-15"),
      voteResult: "YES"
    });

    await this.createVote({
      politicianId: johnDavis.id,
      billName: "Energy Policy Act (H.R. 567)",
      billDescription: "A bill to establish a comprehensive national energy policy",
      voteDate: new Date("2023-07-25"),
      voteResult: "NO"
    });

    await this.createVote({
      politicianId: maryWilson.id,
      billName: "Healthcare Reform Bill (S. 789)",
      billDescription: "A bill to reform the healthcare system",
      voteDate: new Date("2023-09-10"),
      voteResult: "YES"
    });

    await this.createVote({
      politicianId: robertJohnson.id,
      billName: "Tech Regulation Act (H.R. 1234)",
      billDescription: "A bill to regulate technology companies and protect user data",
      voteDate: new Date("2023-08-15"),
      voteResult: "NO"
    });

    // Create contributions
    await this.createContribution({
      politicianId: janeSmith.id,
      organization: "TechGiant Inc.",
      amount: 350000,
      contributionDate: new Date("2023-05-15"),
      industry: "Technology"
    });

    await this.createContribution({
      politicianId: janeSmith.id,
      organization: "National Healthcare Association",
      amount: 275000,
      contributionDate: new Date("2023-04-20"),
      industry: "Healthcare"
    });

    await this.createContribution({
      politicianId: johnDavis.id,
      organization: "EnergyFuture Ltd.",
      amount: 310000,
      contributionDate: new Date("2023-06-05"),
      industry: "Energy"
    });

    await this.createContribution({
      politicianId: maryWilson.id,
      organization: "West Coast Financial Group",
      amount: 225000,
      contributionDate: new Date("2023-03-12"),
      industry: "Finance"
    });

    await this.createContribution({
      politicianId: robertJohnson.id,
      organization: "Clean Energy Coalition",
      amount: 180000,
      contributionDate: new Date("2023-05-30"),
      industry: "Energy"
    });

    // Create stock transactions
    await this.createStockTransaction({
      politicianId: janeSmith.id,
      stockName: "TechGiant Inc.",
      tradeDate: new Date("2023-08-12"),
      tradeType: "BUY",
      amount: 75000,
      relatedBill: "Tech Regulation Act (H.R. 1234)",
      potentialConflict: true
    });

    await this.createStockTransaction({
      politicianId: johnDavis.id,
      stockName: "EnergyFuture Ltd.",
      tradeDate: new Date("2023-07-28"),
      tradeType: "SELL",
      amount: 175000,
      relatedBill: "Energy Policy Act (H.R. 567)",
      potentialConflict: true
    });

    await this.createStockTransaction({
      politicianId: maryWilson.id,
      stockName: "PharmaPlus Corp.",
      tradeDate: new Date("2023-09-05"),
      tradeType: "BUY",
      amount: 375000,
      relatedBill: "Healthcare Reform Bill (S. 789)",
      potentialConflict: false
    });

    await this.createStockTransaction({
      politicianId: johnDavis.id,
      stockName: "DefenseTech Inc.",
      tradeDate: new Date("2023-10-18"),
      tradeType: "BUY",
      amount: 32500,
      relatedBill: "Defense Appropriations (S. 231)",
      potentialConflict: false
    });

    await this.createStockTransaction({
      politicianId: robertJohnson.id,
      stockName: "TechGiant Inc.",
      tradeDate: new Date("2023-11-03"),
      tradeType: "SELL",
      amount: 75000,
      relatedBill: "Tech Regulation Act (H.R. 1234)",
      potentialConflict: false
    });
  }
}

export const storage = new MemStorage();
