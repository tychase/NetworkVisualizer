import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import TimelineRow from './TimelineRow';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';
import axios from '../api';

interface TimelineProps {
  politicianId: number;
}

interface TimelineResponse {
  items: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  next_page: number | null;
}

interface Conflict {
  trade_id: number;
  bill_id: number;
  delta_days: number;
  amount: number;
  symbol: string;
}

export function MoneyTimeline({ politicianId }: TimelineProps) {
  // Fetch timeline data with infinite query support for pagination
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<TimelineResponse>({
    queryKey: [`/api/politicians/${politicianId}/timeline`],
    queryFn: ({ pageParam = 1 }) => 
      axios.get(`/api/politicians/${politicianId}/timeline?page=${pageParam}&page_size=10`)
        .then(response => response.data),
    getNextPageParam: (lastPage: TimelineResponse) => lastPage.next_page || undefined,
    initialPageParam: 1,
    enabled: !!politicianId
  });

  // Fetch potential conflicts
  const { data: conflicts = [] } = useQuery<Conflict[]>({
    queryKey: [`/api/politicians/${politicianId}/conflicts`],
    enabled: !!politicianId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading timeline data: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  // Extract timeline items from all pages
  const timelineItems = data?.pages.flatMap(page => page.items) || [];

  if (timelineItems.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No timeline data found for this politician.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Activity Timeline</h2>
      
      {timelineItems.map((event) => (
        <TimelineRow key={event.uid} ev={event} conflicts={conflicts} />
      ))}
      
      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={() => fetchNextPage()} 
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}