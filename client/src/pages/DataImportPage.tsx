import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataImportPanel } from '@/components/DataImportPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PoliticiansTable } from '@/components/PoliticiansTable';
import { useQuery } from '@tanstack/react-query';

export function DataImportPage() {
  // Fetch politicians to display current data
  const { data: politicians = [], isLoading } = useQuery({
    queryKey: ['/api/politicians'],
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <PageHeader 
        title="Data Management" 
        description="Import and manage real politician data from official sources" 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DataImportPanel />
        
        <Card>
          <CardHeader>
            <CardTitle>About Real Data Import</CardTitle>
            <CardDescription>
              How data is sourced and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">FEC Data</h3>
              <p className="text-sm text-gray-600">
                Campaign finance data is sourced directly from the Federal Election Commission's 
                official bulk data files. This includes politician information, committee details, 
                and campaign contributions.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold">Congressional Voting Records</h3>
              <p className="text-sm text-gray-600">
                Voting records are obtained from Congress.gov's official API and bulk data. 
                This includes bills, votes, and voting positions for each politician.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold">Stock Transactions</h3>
              <p className="text-sm text-gray-600">
                Stock transactions are gathered from official STOCK Act disclosures filed 
                by members of Congress, as required by law. These documents reveal what 
                stocks politicians are buying and selling.
              </p>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> All data processing happens in the background. You can 
                continue using the application while imports run. Refresh the page to see 
                newly imported data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Politicians</CardTitle>
          <CardDescription>
            Politicians currently in the database ({politicians.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PoliticiansTable politicians={politicians} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}