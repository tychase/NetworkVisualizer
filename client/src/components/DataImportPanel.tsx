import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Download, Database, FileText, RefreshCw } from 'lucide-react';

/**
 * Panel to trigger data imports from various sources
 */
export function DataImportPanel() {
  const [activeTab, setActiveTab] = useState('fec');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  // Trigger data pipeline import
  const startImport = async (pipeline: string) => {
    try {
      setImportStatus({});
      setIsImporting(true);
      
      const response = await apiRequest(
        'POST',
        `/api/pipelines/${pipeline}`
      );
      
      setImportStatus({
        success: true,
        message: `Successfully started ${pipeline} import pipeline. Data will be imported in the background.`
      });
    } catch (error) {
      console.error(`Error triggering ${pipeline} pipeline:`, error);
      setImportStatus({
        success: false,
        message: `Failed to start ${pipeline} import. Please try again later.`
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Real Data</CardTitle>
        <CardDescription>
          Import real politicians' data from official government sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fec">FEC Data</TabsTrigger>
            <TabsTrigger value="congress">Congress Votes</TabsTrigger>
            <TabsTrigger value="stock">Stock Trades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fec" className="space-y-4 mt-4">
            <div className="flex items-start space-x-2">
              <Database className="h-5 w-5 mt-0.5 text-blue-500" />
              <div>
                <h4 className="font-semibold">Federal Election Commission (FEC) Data</h4>
                <p className="text-sm text-gray-500">
                  Import politicians, candidates, and campaign finance data from the FEC. 
                  This will download and process the official bulk data files.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => startImport('fec')} 
              disabled={isImporting}
              className="w-full mt-2"
            >
              {isImporting && activeTab === 'fec' ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Importing FEC Data...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import FEC Data
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="congress" className="space-y-4 mt-4">
            <div className="flex items-start space-x-2">
              <FileText className="h-5 w-5 mt-0.5 text-indigo-500" />
              <div>
                <h4 className="font-semibold">Congressional Voting Records</h4>
                <p className="text-sm text-gray-500">
                  Import voting records from Congress.gov. This will fetch and process
                  bill and voting data from the official Congressional record.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => startImport('congress')} 
              disabled={isImporting}
              className="w-full mt-2"
            >
              {isImporting && activeTab === 'congress' ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Importing Congressional Data...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Congressional Votes
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="stock" className="space-y-4 mt-4">
            <div className="flex items-start space-x-2">
              <RefreshCw className="h-5 w-5 mt-0.5 text-green-500" />
              <div>
                <h4 className="font-semibold">Stock Transaction Disclosures</h4>
                <p className="text-sm text-gray-500">
                  Import stock transaction disclosures filed by politicians under the STOCK Act.
                  This will download and process the official disclosure forms.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => startImport('stock')} 
              disabled={isImporting}
              className="w-full mt-2"
            >
              {isImporting && activeTab === 'stock' ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Importing Stock Transactions...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Stock Transactions
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
        
        {importStatus.message && (
          <Alert className={`mt-4 ${importStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {importStatus.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>
              {importStatus.success ? 'Import Started' : 'Import Failed'}
            </AlertTitle>
            <AlertDescription>
              {importStatus.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        The import process runs in the background and may take several minutes depending on data volume.
      </CardFooter>
    </Card>
  );
}