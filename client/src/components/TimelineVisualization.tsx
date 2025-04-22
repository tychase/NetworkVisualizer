import { useRef, useEffect, useState } from 'react';
import { createTimelineVisualization } from '@/lib/d3-utils';
import { StockTransactionWithPolitician, VoteWithPolitician } from '@/lib/api-types';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineVisualizationProps {
  transactions: StockTransactionWithPolitician[] | null;
  votes: VoteWithPolitician[] | null;
  loading: boolean;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ 
  transactions, 
  votes, 
  loading 
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !timelineRef.current || loading || !transactions || !votes) return;

    // Combine transactions and votes into a single timeline
    const timelineData = [
      ...transactions.map(t => ({
        id: t.id,
        date: new Date(t.tradeDate),
        type: 'transaction' as const,
        description: `${t.tradeType} of ${t.stockName}`,
        politician: `${t.politician?.firstName} ${t.politician?.lastName}`,
        amount: Number(t.amount),
        tradeType: t.tradeType as 'BUY' | 'SELL',
        billName: t.relatedBill,
        potentialConflict: t.potentialConflict
      })),
      ...votes.map(v => ({
        id: v.id,
        date: new Date(v.voteDate),
        type: 'vote' as const,
        description: `Voted ${v.voteResult} on ${v.billName}`,
        politician: `${v.politician?.firstName} ${v.politician?.lastName}`,
        billName: v.billName
      }))
    ];

    const width = timelineRef.current.clientWidth;
    const height = 320;

    createTimelineVisualization(
      timelineRef.current,
      timelineData,
      width,
      height
    );
  }, [transactions, votes, loading, isClient]);

  if (loading) {
    return (
      <div className="bg-light-100 p-4 rounded-lg h-80 relative">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!transactions || !votes || (transactions.length === 0 && votes.length === 0)) {
    return (
      <div className="bg-light-100 p-4 rounded-lg h-80 relative flex flex-col items-center justify-center">
        <div className="h-24 w-24 text-primary">
          <i className="fas fa-chart-line text-8xl"></i>
        </div>
        <div className="text-center max-w-md px-4">
          <h3 className="mt-2 text-lg font-medium text-dark-900">Interactive Timeline</h3>
          <p className="mt-1 text-sm text-gray-500">
            This timeline visualization shows the relationship between stock transactions (buy/sell) and key legislative votes. Notice patterns where trades happen before or after votes on related bills.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            No data available for the current selection. Try adjusting your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={timelineRef} 
      className="bg-light-100 p-4 rounded-lg h-80 relative"
      aria-label="Timeline visualization of stock transactions and legislative votes"
    />
  );
};

export default TimelineVisualization;
