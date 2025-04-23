import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Container } from '@/components/Container';
import { DataImportPanel } from '@/components/DataImportPanel';
import { PoliticiansTable } from '@/components/PoliticiansTable';
import { Button } from '@/components/ui/button';
import { DatabaseIcon, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Politician } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export function DataImportPage() {
  const queryClient = useQueryClient();
  
  // Fetch all politicians
  const {
    data: politicians,
    isLoading,
    isError,
    error
  } = useQuery<Politician[]>({
    queryKey: ['/api/politicians'],
  });
  
  // Check backend status
  const {
    data: backendStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery<{status: string; message: string}>({
    queryKey: ['/api/pipelines/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1, // Only retry once
  });
  
  // Backend status component
  const renderBackendStatus = () => {
    if (isLoadingStatus) {
      return (
        <div className="flex items-center text-sm text-gray-500">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Checking pipeline backend status...
        </div>
      );
    }
    
    if (backendStatus?.status === 'ok') {
      return (
        <div className="flex items-center text-sm text-green-600">
          <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
          Pipeline backend is online
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-sm text-orange-600">
        <div className="h-2 w-2 bg-orange-500 rounded-full mr-2"></div>
        Pipeline backend is offline
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2 h-6 text-xs" 
          onClick={() => refetchStatus()}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  };
  
  return (
    <Container>
      <PageHeader
        title="Data Management"
        description="Import and manage real-world politician data"
        actions={
          <div className="flex items-center">
            {renderBackendStatus()}
          </div>
        }
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <DataImportPanel />
        </div>
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Politicians Database</h2>
            <PoliticiansTable politicians={politicians as Politician[]} isLoading={isLoading} />
          </Card>
        </div>
      </div>
    </Container>
  );
}