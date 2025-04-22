import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import TimelineVisualization from '@/components/TimelineVisualization';
import StockTransactionsTable from '@/components/StockTransactionsTable';
import { StockTransactionFilters } from '@/lib/api-types';

const StockTrades = () => {
  const [filters, setFilters] = useState<StockTransactionFilters>({
    politician: 'all',
    stockName: 'all',
    relatedBill: 'all',
    tradeType: 'all'
  });

  // Fetch all politicians
  const { data: politicians, isLoading: loadingPoliticians } = useQuery({
    queryKey: ['/api/politicians'],
  });

  // Fetch all stock transactions
  const { data: allTransactions, isLoading: loadingAllTransactions } = useQuery({
    queryKey: ['/api/stock-transactions'],
  });

  // Fetch all votes
  const { data: allVotes, isLoading: loadingAllVotes } = useQuery({
    queryKey: ['/api/votes'],
  });

  // Filtered transactions based on current filters
  const { data: filteredTransactions, isLoading: loadingFilteredTransactions } = useQuery({
    queryKey: ['/api/stock-transactions/filtered', filters],
    enabled: !!allTransactions && !!politicians,
    queryFn: async () => {
      if (!allTransactions || !politicians) return [];

      let filtered = [...allTransactions];

      if (filters.politician !== 'all') {
        const politicianId = parseInt(filters.politician);
        filtered = filtered.filter(t => t.politicianId === politicianId);
      }

      if (filters.stockName !== 'all') {
        filtered = filtered.filter(t => t.stockName === filters.stockName);
      }

      if (filters.relatedBill !== 'all') {
        filtered = filtered.filter(t => t.relatedBill === filters.relatedBill);
      }

      if (filters.tradeType !== 'all') {
        filtered = filtered.filter(t => t.tradeType === filters.tradeType);
      }

      // Enrich with politician data
      return filtered.map(transaction => {
        const politician = politicians.find(p => p.id === transaction.politicianId);
        return {
          ...transaction,
          politician
        };
      });
    }
  });

  // Processed votes with politician data
  const { data: enrichedVotes, isLoading: loadingEnrichedVotes } = useQuery({
    queryKey: ['/api/votes/enriched', filters],
    enabled: !!allVotes && !!politicians,
    queryFn: async () => {
      if (!allVotes || !politicians) return [];

      let filtered = [...allVotes];

      if (filters.politician !== 'all') {
        const politicianId = parseInt(filters.politician);
        filtered = filtered.filter(v => v.politicianId === politicianId);
      }

      if (filters.relatedBill !== 'all') {
        filtered = filtered.filter(v => v.billName === filters.relatedBill);
      }

      // Enrich with politician data
      return filtered.map(vote => {
        const politician = politicians.find(p => p.id === vote.politicianId);
        return {
          ...vote,
          politician
        };
      });
    }
  });

  // Extract unique stock names, bills, and transaction types
  const stockNames = allTransactions 
    ? Array.from(new Set(allTransactions.map(t => t.stockName))).sort()
    : [];

  const relatedBills = allTransactions
    ? Array.from(new Set(allTransactions.map(t => t.relatedBill).filter(Boolean))).sort()
    : [];

  const handleFilterChange = (key: keyof StockTransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // Filters are already applied via state changes
  };

  const isLoading = 
    loadingPoliticians || 
    loadingAllTransactions || 
    loadingAllVotes || 
    loadingFilteredTransactions || 
    loadingEnrichedVotes;

  return (
    <section id="stock-trades" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-900 sm:text-4xl">
            Stock Transactions & Vote Timing
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Explore the relationship between stock trades and legislative votes
          </p>
        </div>

        {/* Filters */}
        <div className="bg-light-100 p-4 rounded-lg shadow-lg mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <label htmlFor="politician-stock-filter" className="block text-sm font-medium text-gray-700 mb-1">Politician</label>
              <Select 
                value={filters.politician} 
                onValueChange={(value) => handleFilterChange('politician', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]" id="politician-stock-filter">
                  <SelectValue placeholder="All Politicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Politicians</SelectItem>
                  {politicians?.map(politician => (
                    <SelectItem key={politician.id} value={politician.id.toString()}>
                      {politician.firstName} {politician.lastName} ({politician.party}-{politician.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto">
              <label htmlFor="stock-filter" className="block text-sm font-medium text-gray-700 mb-1">Stock/Company</label>
              <Select 
                value={filters.stockName} 
                onValueChange={(value) => handleFilterChange('stockName', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]" id="stock-filter">
                  <SelectValue placeholder="All Stocks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stocks</SelectItem>
                  {stockNames.map(stock => (
                    <SelectItem key={stock} value={stock}>
                      {stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto">
              <label htmlFor="bill-filter" className="block text-sm font-medium text-gray-700 mb-1">Related Bill</label>
              <Select 
                value={filters.relatedBill} 
                onValueChange={(value) => handleFilterChange('relatedBill', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]" id="bill-filter">
                  <SelectValue placeholder="All Bills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bills</SelectItem>
                  {relatedBills.map(bill => (
                    <SelectItem key={bill} value={bill}>
                      {bill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto">
              <label htmlFor="transaction-type" className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <Select 
                value={filters.tradeType} 
                onValueChange={(value) => handleFilterChange('tradeType', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]" id="transaction-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUY">Purchase</SelectItem>
                  <SelectItem value="SELL">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto flex items-end">
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h3 className="text-lg font-medium text-dark-900 mb-4">Stock Transactions & Vote Timeline</h3>
          <TimelineVisualization 
            transactions={filteredTransactions || null}
            votes={enrichedVotes || null}
            loading={isLoading}
          />
        </div>

        {/* Notable Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-medium text-dark-900 mb-4">Notable Transactions</h3>
          <StockTransactionsTable 
            transactions={filteredTransactions || null} 
            loading={isLoading}
          />
        </div>
      </div>
    </section>
  );
};

export default StockTrades;
