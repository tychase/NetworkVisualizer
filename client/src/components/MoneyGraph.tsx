import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Filter } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import axios from '../api';

interface MoneyGraphProps {
  politicianId: number;
}

interface NetworkNode {
  id: string;
  type: 'politician' | 'organization';
  label: string;
  party?: string;
  state?: string;
}

interface NetworkLink {
  source: string;
  target: string;
  weight: number;
  kind: string;
  date: string;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export default function MoneyGraph({ politicianId }: MoneyGraphProps) {
  const graphRef = useRef<any>();
  const [timePeriod, setTimePeriod] = useState('365'); // 1 year default

  // Fetch network data
  const { 
    data: networkData, 
    isLoading, 
    isError, 
    error 
  } = useQuery<NetworkData>({
    queryKey: [`/api/politicians/${politicianId}/network`, { n_days: timePeriod }],
    enabled: !!politicianId
  });

  useEffect(() => {
    // Zoom to fit when data changes
    if (graphRef.current && networkData) {
      // Give the graph time to process the data
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [networkData]);

  const handleTimeFilterChange = (value: string) => {
    setTimePeriod(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Money Network</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Money Network</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading network data: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!networkData || networkData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Money Network</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No network data found for this time period.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Money Network</CardTitle>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time Period:</span>
          <Select value={timePeriod} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
              <SelectItem value="730">Last 2 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full border rounded-md overflow-hidden">
          <ForceGraph2D
            ref={graphRef}
            graphData={networkData}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const { id, label, type } = node as NetworkNode;
              const fontSize = 14 / globalScale;
              const nodeR = type === 'politician' ? 8 : 6;
              
              // Node color based on type
              ctx.fillStyle = type === 'politician' ? '#2563eb' : '#f59e0b';
              ctx.beginPath();
              ctx.arc(0, 0, nodeR, 0, 2 * Math.PI);
              ctx.fill();
              
              // Only render labels if zoom is sufficient
              if (globalScale >= 0.6) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'black';
                ctx.fillText(label, 0, nodeR + fontSize);
              }
            }}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={d => {
              const link = d as unknown as NetworkLink;
              return link.weight / 10000;
            }}
            linkWidth={d => {
              const link = d as unknown as NetworkLink;
              return Math.min(5, Math.sqrt(link.weight) / 1000) + 1;
            }}
            linkDirectionalParticleWidth={d => {
              const link = d as unknown as NetworkLink;
              return Math.min(5, Math.sqrt(link.weight) / 1000) + 1;
            }}
            cooldownTicks={100}
            onEngineStop={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(400, 50);
              }
            }}
          />
        </div>
        <div className="flex justify-between mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#2563eb]"></div>
            <span className="text-sm">Politicians</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
            <span className="text-sm">Organizations</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(400);
              }
            }}
          >
            Reset View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}