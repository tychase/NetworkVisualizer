import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Vote, TrendingUp, Calendar, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// Event type definitions
interface Politician {
  id: number;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
}

interface TimelineEvent {
  type: 'vote' | 'contribution' | 'stock_transaction';
  date: string;
  politician: Politician;
  data: any;
}

interface TimelineResponse {
  politician: Politician;
  timeline: TimelineEvent[];
  pagination: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
  summary: {
    totalVotes: number;
    totalContributions: number;
    totalStockTransactions: number;
  };
}

interface MoneyTimelineProps {
  politicianId: number;
}

export function MoneyTimeline({ politicianId }: MoneyTimelineProps) {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);

  // Reset expanded events when politician changes
  useEffect(() => {
    setExpandedEvents({});
    setPage(1);
  }, [politicianId]);

  // Fetch timeline data
  const { data, isLoading, error } = useQuery<TimelineResponse>({
    queryKey: [`/api/politicians/${politicianId}/timeline`, { page, sort: sortOrder }],
    enabled: !!politicianId,
    retry: 1, // Limit retries to avoid excessive API calls if the endpoint is failing
    refetchOnWindowFocus: false, // Don't refetch when window regains focus to reduce unnecessary API calls
  });

  // Toggle expanded state for an event
  const toggleEventExpanded = (eventIndex: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventIndex]: !prev[eventIndex]
    }));
  };

  // Toggle event type filter
  const toggleEventTypeFilter = (eventType: string) => {
    setEventTypeFilter(prev => {
      if (prev.includes(eventType)) {
        return prev.filter(type => type !== eventType);
      } else {
        return [...prev, eventType];
      }
    });
  };

  // Format currency amount
  const formatCurrency = (amount: number | string) => {
    // Convert to number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Return 0 if invalid number
    if (isNaN(numericAmount)) return '$0';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  };

  // Filter events by type if filters are applied
  const filteredEvents = data?.timeline.filter(event => {
    if (eventTypeFilter.length === 0) return true;
    return eventTypeFilter.includes(event.type);
  }) || [];

  // Render event icon based on type
  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'vote':
        return <Vote className="h-5 w-5 text-blue-500" />;
      case 'contribution':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'stock_transaction':
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  // Render event title based on type
  const renderEventTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'vote':
        return `Voted on ${event.data.billName}`;
      case 'contribution':
        return `Received ${formatCurrency(event.data.amount)} from ${event.data.organization}`;
      case 'stock_transaction':
        return `${event.data.tradeType} of ${event.data.stockName} (${formatCurrency(event.data.amount)})`;
      default:
        return 'Unknown event';
    }
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-3 w-1/4" />
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error Loading Timeline</CardTitle>
          <CardDescription>
            There was a problem loading the timeline data. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Render empty state
  if (!data || data.timeline.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Timeline Data</CardTitle>
          <CardDescription>
            No activity data available for this politician.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Money & Activity Timeline</CardTitle>
            <CardDescription>
              Showing {data.politician.firstName} {data.politician.lastName}'s ({data.politician.party}-{data.politician.state}) activity
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <div className="absolute right-0 top-10 z-10 bg-white border rounded-lg p-2 shadow-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filter-votes"
                      checked={eventTypeFilter.length === 0 || eventTypeFilter.includes('vote')}
                      onChange={() => toggleEventTypeFilter('vote')}
                    />
                    <label htmlFor="filter-votes" className="text-sm flex items-center gap-1">
                      <Vote className="h-3 w-3 text-blue-500" /> Votes
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filter-contributions"
                      checked={eventTypeFilter.length === 0 || eventTypeFilter.includes('contribution')}
                      onChange={() => toggleEventTypeFilter('contribution')}
                    />
                    <label htmlFor="filter-contributions" className="text-sm flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-500" /> Contributions
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filter-stocks"
                      checked={eventTypeFilter.length === 0 || eventTypeFilter.includes('stock_transaction')}
                      onChange={() => toggleEventTypeFilter('stock_transaction')}
                    />
                    <label htmlFor="filter-stocks" className="text-sm flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-purple-500" /> Stock Transactions
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Vote className="h-3 w-3 text-blue-500" /> {data.summary.totalVotes} Votes
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-500" /> {data.summary.totalContributions} Contributions
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-purple-500" /> {data.summary.totalStockTransactions} Stock Transactions
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {filteredEvents.map((event, index) => (
            <motion.div 
              key={`${event.type}-${event.date}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {renderEventIcon(event.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{renderEventTitle(event)}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.date), 'PPP')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEventExpanded(index)}
                      className="mt-0 p-0 h-6 w-6"
                    >
                      {expandedEvents[index] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {expandedEvents[index] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-sm bg-gray-50 p-3 rounded-md">
                          {event.type === 'vote' && (
                            <div>
                              <p className="font-semibold">Bill: {event.data.billName}</p>
                              {event.data.billDescription && (
                                <p className="mt-1">{event.data.billDescription}</p>
                              )}
                              <p className="mt-1">Vote Result: <Badge>{event.data.voteResult}</Badge></p>
                            </div>
                          )}

                          {event.type === 'contribution' && (
                            <div>
                              <p className="font-semibold">From: {event.data.organization}</p>
                              <p className="mt-1">Amount: {formatCurrency(event.data.amount)}</p>
                              {event.data.industry && (
                                <p className="mt-1">Industry: {event.data.industry}</p>
                              )}
                            </div>
                          )}

                          {event.type === 'stock_transaction' && (
                            <div>
                              <p className="font-semibold">Stock: {event.data.stockName}</p>
                              <p className="mt-1">Transaction: {event.data.tradeType}</p>
                              <p className="mt-1">Amount: {formatCurrency(event.data.amount)}</p>
                              {event.data.relatedBill && (
                                <p className="mt-1">Related Bill: {event.data.relatedBill}</p>
                              )}
                              {event.data.potentialConflict && (
                                <Badge variant="destructive" className="mt-1">Potential Conflict of Interest</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <Separator className="mt-4" />
            </motion.div>
          ))}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Button 
                variant="outline" 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setPage(prev => Math.min(data.pagination.totalPages, prev + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}