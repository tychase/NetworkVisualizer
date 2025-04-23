import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import TimelineRow from './TimelineRow';
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import axios from '../api';

interface TimelineProps {
  politicianId: number;
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
  } = useInfiniteQuery({
    queryKey: [`/api/politicians/${politicianId}/timeline`],
    queryFn: ({ pageParam = 1 }) => 
      axios.get(`/api/politicians/${politicianId}/timeline?page=${pageParam}&page_size=10`)
        .then(response => response.data),
    getNextPageParam: (lastPage) => lastPage.next_page || undefined,
    enabled: !!politicianId
  });

  // Fetch potential conflicts
  const { data: conflicts } = useQuery({
    queryKey: [`/api/politicians/${politicianId}/conflicts`],
    enabled: !!politicianId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
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
        <TimelineRow key={event.uid} ev={event} conflicts={conflicts || []} />
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
                <Spinner className="mr-2 h-4 w-4" />
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