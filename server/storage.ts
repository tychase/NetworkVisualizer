import { 
  Politician, InsertPolitician, 
  Vote, InsertVote, 
  Contribution, InsertContribution, 
  StockTransaction, InsertStockTransaction,
  politicians, votes, contributions, stockTransactions
} from "@shared/schema";
import { db } from "./db";
import { eq, like } from "drizzle-orm";

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
  
  // Data initialization and enrichment
  initializeSampleData(): Promise<void>;
  createSampleDataForPolitician(politicianId: number): Promise<void>;
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // Politician methods
  async getPoliticians(): Promise<Politician[]> {
    return await db.select().from(politicians);
  }

  async getPolitician(id: number): Promise<Politician | undefined> {
    const [politician] = await db.select().from(politicians).where(eq(politicians.id, id));
    return politician;
  }

  async createPolitician(insertPolitician: InsertPolitician): Promise<Politician> {
    const [politician] = await db.insert(politicians).values(insertPolitician).returning();
    return politician;
  }

  // Vote methods
  async getVotes(): Promise<Vote[]> {
    return await db.select().from(votes);
  }

  async getVotesByPolitician(politicianId: number): Promise<Vote[]> {
    return await db.select().from(votes).where(eq(votes.politicianId, politicianId));
  }

  async getVotesByBill(billName: string): Promise<Vote[]> {
    return await db.select().from(votes).where(like(votes.billName, `%${billName}%`));
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    return vote;
  }

  // Contribution methods
  async getContributions(): Promise<Contribution[]> {
    return await db.select().from(contributions);
  }

  async getContributionsByPolitician(politicianId: number): Promise<Contribution[]> {
    return await db.select().from(contributions).where(eq(contributions.politicianId, politicianId));
  }

  async getContributionsByOrganization(organization: string): Promise<Contribution[]> {
    return await db.select().from(contributions).where(like(contributions.organization, `%${organization}%`));
  }

  async createContribution(insertContribution: InsertContribution): Promise<Contribution> {
    const [contribution] = await db.insert(contributions).values(insertContribution).returning();
    return contribution;
  }

  // Stock transaction methods
  async getStockTransactions(): Promise<StockTransaction[]> {
    return await db.select().from(stockTransactions);
  }

  async getStockTransactionsByPolitician(politicianId: number): Promise<StockTransaction[]> {
    return await db.select().from(stockTransactions).where(eq(stockTransactions.politicianId, politicianId));
  }

  async getStockTransactionsByStock(stockName: string): Promise<StockTransaction[]> {
    return await db.select().from(stockTransactions).where(like(stockTransactions.stockName, `%${stockName}%`));
  }

  async createStockTransaction(insertTransaction: InsertStockTransaction): Promise<StockTransaction> {
    const [transaction] = await db.insert(stockTransactions).values(insertTransaction).returning();
    return transaction;
  }

  // Sample data initialization - this will be called once to seed the database
  async initializeSampleData(): Promise<void> {
    // Check if we already have data
    const existingPoliticians = await this.getPoliticians();
    
    if (existingPoliticians.length > 0) {
      console.log("Database already contains data, skipping initialization");
      return;
    }
    
    console.log("Initializing database with sample data");
    
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
      voteDate: "2023-08-15", // String format for date
      voteResult: "YES"
    });

    await this.createVote({
      politicianId: johnDavis.id,
      billName: "Energy Policy Act (H.R. 567)",
      billDescription: "A bill to establish a comprehensive national energy policy",
      voteDate: "2023-07-25", // String format for date
      voteResult: "NO"
    });

    await this.createVote({
      politicianId: maryWilson.id,
      billName: "Healthcare Reform Bill (S. 789)",
      billDescription: "A bill to reform the healthcare system",
      voteDate: "2023-09-10", // String format for date
      voteResult: "YES"
    });

    await this.createVote({
      politicianId: robertJohnson.id,
      billName: "Tech Regulation Act (H.R. 1234)",
      billDescription: "A bill to regulate technology companies and protect user data",
      voteDate: "2023-08-15", // String format for date
      voteResult: "NO"
    });

    // Create contributions
    await this.createContribution({
      politicianId: janeSmith.id,
      organization: "TechGiant Inc.",
      amount: "350000",
      contributionDate: "2023-05-15", // String format for date
      industry: "Technology"
    });

    await this.createContribution({
      politicianId: janeSmith.id,
      organization: "National Healthcare Association",
      amount: "275000",
      contributionDate: "2023-04-20", // String format for date
      industry: "Healthcare"
    });

    await this.createContribution({
      politicianId: johnDavis.id,
      organization: "EnergyFuture Ltd.",
      amount: "310000",
      contributionDate: "2023-06-05", // String format for date
      industry: "Energy"
    });

    await this.createContribution({
      politicianId: maryWilson.id,
      organization: "West Coast Financial Group",
      amount: "225000",
      contributionDate: "2023-03-12", // String format for date
      industry: "Finance"
    });

    await this.createContribution({
      politicianId: robertJohnson.id,
      organization: "Clean Energy Coalition",
      amount: "180000",
      contributionDate: "2023-05-30", // String format for date
      industry: "Energy"
    });

    // Create stock transactions
    await this.createStockTransaction({
      politicianId: janeSmith.id,
      stockName: "TechGiant Inc.",
      tradeDate: "2023-08-12", // String format for date
      tradeType: "BUY",
      amount: "75000",
      relatedBill: "Tech Regulation Act (H.R. 1234)",
      potentialConflict: true
    });

    await this.createStockTransaction({
      politicianId: johnDavis.id,
      stockName: "EnergyFuture Ltd.",
      tradeDate: "2023-07-28", // String format for date
      tradeType: "SELL",
      amount: "175000",
      relatedBill: "Energy Policy Act (H.R. 567)",
      potentialConflict: true
    });

    await this.createStockTransaction({
      politicianId: maryWilson.id,
      stockName: "PharmaPlus Corp.",
      tradeDate: "2023-09-05", // String format for date
      tradeType: "BUY",
      amount: "375000",
      relatedBill: "Healthcare Reform Bill (S. 789)",
      potentialConflict: false
    });

    await this.createStockTransaction({
      politicianId: johnDavis.id,
      stockName: "DefenseTech Inc.",
      tradeDate: "2023-10-18", // String format for date
      tradeType: "BUY",
      amount: "32500",
      relatedBill: "Defense Appropriations (S. 231)",
      potentialConflict: false
    });

    await this.createStockTransaction({
      politicianId: robertJohnson.id,
      stockName: "TechGiant Inc.",
      tradeDate: "2023-11-03", // String format for date
      tradeType: "SELL",
      amount: "75000",
      relatedBill: "Tech Regulation Act (H.R. 1234)",
      potentialConflict: false
    });
    
    console.log("Sample data initialization complete");
  }

  // Create sample data specifically for a politician
  async createSampleDataForPolitician(politicianId: number): Promise<void> {
    // First check if the politician exists
    const politician = await this.getPolitician(politicianId);
    if (!politician) {
      throw new Error(`Politician with ID ${politicianId} not found`);
    }

    console.log(`Creating sample data for ${politician.firstName} ${politician.lastName}`);
    
    // Generate relevant industry based on politician's party
    let industries = [];
    if (politician.party === 'Democrat') {
      industries = ['Technology', 'Healthcare', 'Education', 'Entertainment', 'Renewable Energy'];
    } else if (politician.party === 'Republican') {
      industries = ['Energy', 'Finance', 'Agriculture', 'Defense', 'Manufacturing'];
    } else {
      industries = ['Technology', 'Healthcare', 'Energy', 'Finance', 'Agriculture'];
    }
    
    // Generate organizations based on industries
    const organizationsByIndustry: Record<string, string[]> = {
      'Technology': ['TechGiant Inc.', 'Software Solutions LLC', 'Digital Innovations', 'NetWorks Global'],
      'Healthcare': ['National Healthcare Association', 'MediCorp Inc.', 'Health Systems Alliance', 'PharmaPlus Corp.'],
      'Education': ['Education Reform Now', 'National Teachers Association', 'University Alliance', 'Academic Future Fund'],
      'Entertainment': ['Media Conglomerate Inc.', 'Entertainment Alliance', 'Studio Networks', 'Digital Content Creators'],
      'Renewable Energy': ['Clean Energy Coalition', 'Solar Future Inc.', 'Green Power Alliance', 'Sustainable Energy Group'],
      'Energy': ['EnergyFuture Ltd.', 'National Petroleum Association', 'Power Systems Inc.', 'Global Resources Corp.'],
      'Finance': ['West Coast Financial Group', 'National Banking Association', 'Investment Trust LLC', 'Financial Services Alliance'],
      'Agriculture': ['National Farmers Association', 'Agricultural Industries', 'Farm Policy Alliance', 'Rural Development Corp.'],
      'Defense': ['DefenseTech Inc.', 'Aerospace Alliance', 'National Security Association', 'Military Contractors Group'],
      'Manufacturing': ['Manufacturing Alliance', 'Industrial Solutions Inc.', 'Production Systems Corp.', 'American Manufacturers Association']
    };
    
    // Create 5 contributions for this politician
    for (let i = 0; i < 5; i++) {
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const organizations = organizationsByIndustry[industry] || ['Generic Organization'];
      const organization = organizations[Math.floor(Math.random() * organizations.length)];
      
      // Generate a random amount between $10,000 and $500,000
      const amount = Math.floor(Math.random() * 490000 + 10000).toString();
      
      // Generate a date from the last 2 years
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setMonth(pastDate.getMonth() - Math.floor(Math.random() * 24));
      const contributionDate = pastDate.toISOString().split('T')[0];
      
      await this.createContribution({
        politicianId,
        organization,
        amount,
        contributionDate,
        industry
      });
    }
    
    // Create 3 votes
    const bills = [
      {
        name: 'Tech Regulation Act (H.R. 1234)',
        description: 'A bill to regulate technology companies and protect user data'
      },
      {
        name: 'Energy Policy Act (H.R. 567)',
        description: 'A bill to establish a comprehensive national energy policy'
      },
      {
        name: 'Healthcare Reform Bill (S. 789)',
        description: 'A bill to reform the healthcare system'
      },
      {
        name: 'Defense Appropriations (S. 231)',
        description: 'A bill to fund defense programs'
      },
      {
        name: 'Infrastructure Investment Act (H.R. 345)',
        description: 'A bill to invest in national infrastructure'
      }
    ];
    
    const voteResults = ['YES', 'NO', 'ABSTAIN'];
    
    for (let i = 0; i < 3; i++) {
      const bill = bills[Math.floor(Math.random() * bills.length)];
      const voteResult = voteResults[Math.floor(Math.random() * voteResults.length)];
      
      // Generate a date from the last year
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setMonth(pastDate.getMonth() - Math.floor(Math.random() * 12));
      const voteDate = pastDate.toISOString().split('T')[0];
      
      await this.createVote({
        politicianId,
        billName: bill.name,
        billDescription: bill.description,
        voteDate,
        voteResult
      });
    }
    
    // Create 2 stock transactions
    const stocks = [
      'TechGiant Inc.',
      'EnergyFuture Ltd.',
      'PharmaPlus Corp.',
      'DefenseTech Inc.',
      'Financial Services Group',
      'Agriculture Corp.',
      'Manufacturing Solutions'
    ];
    
    const tradeTypes = ['BUY', 'SELL'];
    
    for (let i = 0; i < 2; i++) {
      const stockName = stocks[Math.floor(Math.random() * stocks.length)];
      const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
      
      // Generate a random amount between $15,000 and $300,000
      const amount = Math.floor(Math.random() * 285000 + 15000).toString();
      
      // Generate a date from the last 18 months
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setMonth(pastDate.getMonth() - Math.floor(Math.random() * 18));
      const tradeDate = pastDate.toISOString().split('T')[0];
      
      // Potentially link to a related bill
      const relatedBill = Math.random() > 0.5 
        ? bills[Math.floor(Math.random() * bills.length)].name
        : null;
        
      // Determine if there's a potential conflict
      const potentialConflict = relatedBill !== null && Math.random() > 0.6;
      
      await this.createStockTransaction({
        politicianId,
        stockName,
        tradeDate,
        tradeType,
        amount,
        relatedBill,
        potentialConflict
      });
    }
    
    console.log(`Created sample data for politician ID ${politicianId}`);
  }
}

// Export a database storage instance
export const storage = new DatabaseStorage();
