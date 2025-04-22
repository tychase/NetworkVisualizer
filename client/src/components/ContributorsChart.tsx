import { useRef, useEffect, useState } from 'react';
import { createHorizontalBarChart } from '@/lib/d3-utils';
import { TopContributor } from '@/lib/api-types';

interface ContributorsChartProps {
  data: TopContributor[];
}

const ContributorsChart: React.FC<ContributorsChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !chartRef.current || !data || data.length === 0) return;

    const width = chartRef.current.clientWidth;
    const height = 240;

    createHorizontalBarChart(
      chartRef.current,
      data,
      width,
      height
    );
  }, [data, isClient]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-60">
        <p className="text-gray-500">No contribution data available</p>
      </div>
    );
  }

  return (
    <div 
      ref={chartRef} 
      className="w-full h-60"
      aria-label="Bar chart showing top contributors"
    />
  );
};

export default ContributorsChart;
