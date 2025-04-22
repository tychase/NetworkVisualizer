import { useRef, useEffect, useState } from 'react';
import { createForceDirectedGraph } from '@/lib/d3-utils';
import { NetworkNode, NetworkData } from '@/lib/api-types';
import { Skeleton } from '@/components/ui/skeleton';

interface ForceDirectedGraphProps {
  data: NetworkData | null;
  loading: boolean;
  width: number;
  height: number;
  onNodeClick: (node: NetworkNode) => void;
}

const ForceDirectedGraph: React.FC<ForceDirectedGraphProps> = ({ 
  data, 
  loading, 
  width, 
  height, 
  onNodeClick 
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !graphRef.current || !data || loading) return;

    createForceDirectedGraph(
      graphRef.current,
      data,
      width,
      height,
      onNodeClick
    );
  }, [data, width, height, loading, isClient, onNodeClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white rounded-lg shadow-inner p-4">
        <div className="text-center space-y-4">
          <Skeleton className="h-40 w-40 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg shadow-inner p-4">
        <div className="h-24 w-24 text-primary">
          <i className="fas fa-project-diagram text-8xl"></i>
        </div>
        <div className="text-center max-w-md px-4">
          <h3 className="mt-2 text-lg font-medium text-dark-900">Interactive Money Network</h3>
          <p className="mt-1 text-sm text-gray-500">
            This visualization shows connections between politicians and their funding sources. Lines represent financial contributions, with thickness indicating amount.
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
      ref={graphRef} 
      className="h-full w-full bg-white rounded-lg shadow-inner p-4 overflow-hidden"
      aria-label="Interactive network visualization of politicians and their funding sources"
    />
  );
};

export default ForceDirectedGraph;
