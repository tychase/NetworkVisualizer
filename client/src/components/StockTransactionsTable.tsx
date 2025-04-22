import { StockTransactionWithPolitician } from '@/lib/api-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface StockTransactionsTableProps {
  transactions: StockTransactionWithPolitician[] | null;
  loading: boolean;
}

const StockTransactionsTable: React.FC<StockTransactionsTableProps> = ({ 
  transactions, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Politician</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Transaction</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Related Bill</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="ml-2 h-4 w-24" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Skeleton className="h-6 w-36" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No stock transactions match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Politician</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Transaction</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Related Bill</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    <div className="flex items-center">
                      <img 
                        src={transaction.politician?.profileImage || `https://randomuser.me/api/portraits/lego/${transaction.politician?.id || 0 % 8}.jpg`} 
                        alt={transaction.politician ? `${transaction.politician.firstName} ${transaction.politician.lastName}` : 'Politician'} 
                        className="h-8 w-8 rounded-full object-cover" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://randomuser.me/api/portraits/lego/${transaction.politician?.id || 0 % 8}.jpg`;
                        }}
                      />
                      <span className="ml-2">
                        {transaction.politician?.firstName} {transaction.politician?.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {transaction.stockName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <Badge 
                      className={transaction.tradeType === 'BUY' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                      }
                    >
                      {transaction.tradeType}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    ${Number(transaction.amount).toLocaleString()} - ${(Number(transaction.amount) * 2).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(transaction.tradeDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {transaction.relatedBill || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {transaction.potentialConflict ? (
                      <Badge className="bg-red-100 text-red-800">
                        <i className="fas fa-exclamation-circle mr-1"></i> Potential Conflict
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        <i className="fas fa-check-circle mr-1"></i> No Issues Found
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockTransactionsTable;
