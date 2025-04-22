import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PoliticianCard from '@/components/PoliticianCard';
import PoliticianProfile from '@/components/PoliticianProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Politician } from '@shared/schema';

const Politicians = () => {
  const [selectedPolitician, setSelectedPolitician] = useState<Politician | null>(null);

  // Fetch all politicians
  const { data: politicians, isLoading: loadingPoliticians } = useQuery({
    queryKey: ['/api/politicians'],
  });

  // Fetch all contributions for summary data
  const { data: allContributions, isLoading: loadingContributions } = useQuery({
    queryKey: ['/api/contributions'],
  });

  // Fetch all stock transactions for summary data
  const { data: allStockTransactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['/api/stock-transactions'],
  });

  // Calculate contributions per politician
  const contributionsByPolitician = new Map<number, number>();
  const politicianTopIndustries = new Map<number, string[]>();

  if (allContributions && !loadingContributions) {
    for (const contribution of allContributions) {
      const total = contributionsByPolitician.get(contribution.politicianId) || 0;
      contributionsByPolitician.set(contribution.politicianId, total + Number(contribution.amount));

      // Track industries
      const industries = politicianTopIndustries.get(contribution.politicianId) || [];
      if (contribution.industry && !industries.includes(contribution.industry)) {
        industries.push(contribution.industry);
        politicianTopIndustries.set(contribution.politicianId, industries);
      }
    }
  }

  // Calculate stock transactions per politician
  const stockTradesByPolitician = new Map<number, number>();

  if (allStockTransactions && !loadingTransactions) {
    for (const transaction of allStockTransactions) {
      const count = stockTradesByPolitician.get(transaction.politicianId) || 0;
      stockTradesByPolitician.set(transaction.politicianId, count + 1);
    }
  }

  const handlePoliticianClick = (politician: Politician) => {
    setSelectedPolitician(politician);
    // Scroll to profile section
    document.getElementById('politician-profile')?.scrollIntoView({ behavior: 'smooth' });
  };

  const isLoading = loadingPoliticians || loadingContributions || loadingTransactions;

  return (
    <section id="politicians" className="py-16 bg-light-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-900 sm:text-4xl">
            Politician Profiles
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Explore detailed profiles with voting records, donations, and stock transactions
          </p>
        </div>

        {/* Profile Selection Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-12">
          {isLoading ? (
            // Loading skeletons
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-white overflow-hidden shadow rounded-lg p-4">
                <div className="flex items-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ))
          ) : politicians && politicians.length > 0 ? (
            politicians.map(politician => (
              <PoliticianCard 
                key={politician.id}
                politician={politician}
                contributions={contributionsByPolitician.get(politician.id) || 0}
                stockTrades={stockTradesByPolitician.get(politician.id) || 0}
                topIndustries={politicianTopIndustries.get(politician.id) || []}
                onClick={() => handlePoliticianClick(politician)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No politicians found</p>
            </div>
          )}
        </div>

        {/* Selected Politician Detailed Profile */}
        <div id="politician-profile">
          {selectedPolitician ? (
            <PoliticianProfile politician={selectedPolitician} />
          ) : (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium text-gray-700">
                Select a politician from above to view their detailed profile
              </h3>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Politicians;
