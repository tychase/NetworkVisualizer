import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Politician } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import ContributorsChart from './ContributorsChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface PoliticianProfileProps {
  politician: Politician;
}

const PoliticianProfile: React.FC<PoliticianProfileProps> = ({ politician }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch politician's contributions
  const { data: contributions, isLoading: loadingContributions } = useQuery({
    queryKey: [`/api/politicians/${politician.id}/contributions`],
    enabled: !!politician.id,
  });

  // Fetch politician's votes
  const { data: votes, isLoading: loadingVotes } = useQuery({
    queryKey: [`/api/politicians/${politician.id}/votes`],
    enabled: !!politician.id && activeTab === 'voting',
  });

  // Fetch politician's stock transactions
  const { data: stockTransactions, isLoading: loadingTransactions } = useQuery({
    queryKey: [`/api/politicians/${politician.id}/stock-transactions`],
    enabled: !!politician.id && activeTab === 'stocks',
  });

  // Calculate top contributors
  const topContributors = contributions 
    ? Array.from(contributions)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(c => ({
        name: c.organization,
        value: Number(c.amount)
      }))
    : [];

  // Calculate total contributions
  const totalContributions = contributions
    ? contributions.reduce((sum, curr) => sum + Number(curr.amount), 0)
    : 0;

  // Estimate portfolio value (for demo purposes)
  const portfolioValue = 1730000;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-primary text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={politician.photoUrl || politician.profileImage || `https://www.congress.gov/img/member/${politician.bioguideId}.jpg`}
              alt={`${politician.firstName} ${politician.lastName}`} 
              className="h-12 w-12 rounded-full object-cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Use a simple default avatar if the image fails to load
                target.src = "https://www.congress.gov/img/member/default.jpg";
              }}
            />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-white">
                {politician.firstName} {politician.lastName}
              </h3>
              <p className="text-sm text-blue-100">
                {politician.party} - {politician.state}
              </p>
            </div>
          </div>
          <div>
            <Badge className="bg-blue-700 text-white">
              Since 2016
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voting">Voting Record</TabsTrigger>
          <TabsTrigger value="stocks">Stock Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <Link href={`/politicians/${politician.id}/timeline`}>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 text-primary hover:text-primary"
              >
                <Calendar className="h-4 w-4" />
                <span>View Complete Money Timeline</span>
              </Button>
            </Link>
          </div>
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-dark-900">Financial Summary</h3>
              <div className="mt-4 space-y-4">
                <div className="bg-light-100 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500">Total Contributions</h4>
                  {loadingContributions ? (
                    <Skeleton className="h-8 w-36 mt-1" />
                  ) : (
                    <>
                      <p className="mt-1 text-2xl font-semibold text-dark-900">
                        ${(totalContributions).toLocaleString()}
                      </p>
                      <div className="mt-1 text-sm text-gray-500">
                        <span className="text-secondary">↑ 12% from previous cycle</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-light-100 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500">Stock Portfolio Value</h4>
                  <p className="mt-1 text-2xl font-semibold text-dark-900">
                    ${portfolioValue.toLocaleString()}
                  </p>
                  <div className="mt-1 text-sm text-gray-500">
                    <span className="text-secondary">↑ 8% this year</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <h3 className="text-lg font-medium leading-6 text-dark-900 mb-4">Top Contributors</h3>
              <div className="bg-light-100 p-4 rounded-lg">
                {/* Top contributors chart */}
                <div className="h-60">
                  {loadingContributions ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-48 w-full" />
                    </div>
                  ) : (
                    <ContributorsChart data={topContributors} />
                  )}
                </div>

                {/* Contributors table */}
                <div className="mt-4 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingContributions ? (
                        Array(5).fill(0).map((_, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Skeleton className="h-4 w-20 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : (
                        topContributors.map((contributor, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-900">
                              {contributor.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              ${contributor.value.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="voting" className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-dark-900 mb-4">Voting History</h3>
          <div className="bg-light-100 p-4 rounded-lg">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingVotes ? (
                    Array(5).fill(0).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-48" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-16" />
                        </td>
                      </tr>
                    ))
                  ) : votes && votes.length > 0 ? (
                    votes.map((vote, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm font-medium text-dark-900">
                          {vote.billName}
                          <p className="text-xs text-gray-500 mt-1">{vote.billDescription}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(vote.voteDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={vote.voteResult === 'YES' 
                              ? 'bg-green-100 text-green-800' 
                              : vote.voteResult === 'NO' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {vote.voteResult}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No voting records available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stocks" className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-dark-900 mb-4">Stock Transactions</h3>
          <div className="bg-light-100 p-4 rounded-lg">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTransactions ? (
                    Array(5).fill(0).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-16" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-28" />
                        </td>
                      </tr>
                    ))
                  ) : stockTransactions && stockTransactions.length > 0 ? (
                    stockTransactions.map((transaction, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm font-medium text-dark-900">
                          {transaction.stockName}
                          {transaction.relatedBill && (
                            <p className="text-xs text-gray-500 mt-1">Related: {transaction.relatedBill}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.tradeDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={transaction.tradeType === 'BUY' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }
                          >
                            {transaction.tradeType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${Number(transaction.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No stock transactions available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PoliticianProfile;
