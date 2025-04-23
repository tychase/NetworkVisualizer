import React from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Politician } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { RefreshCw, Database, FileText, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PoliticiansTableProps {
  politicians: Politician[];
  isLoading?: boolean;
}

export function PoliticiansTable({ politicians, isLoading }: PoliticiansTableProps) {
  const queryClient = useQueryClient();
  
  // Get party color
  const getPartyColor = (party: string) => {
    const normalizedParty = party.toLowerCase();
    if (normalizedParty.includes('democrat')) return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    if (normalizedParty.includes('republican')) return 'bg-red-100 text-red-800 hover:bg-red-200';
    if (normalizedParty.includes('independent')) return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };
  
  // Generate initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  // Handle refreshing politician data from external sources
  const handleRefreshPolitician = async (politicianId: number) => {
    try {
      // This is just a placeholder - actual implementation would depend on API endpoints
      await apiRequest(
        'POST',
        `/api/politicians/${politicianId}/refresh`
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/politicians'] });
      queryClient.invalidateQueries({ queryKey: [`/api/politicians/${politicianId}`] });
    } catch (error) {
      console.error(`Error refreshing politician ${politicianId}:`, error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (politicians.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 mb-4">No politicians in the database yet.</p>
        <p className="text-gray-500">Use the data import options above to import real politician data.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>List of politicians in the database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Politician</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {politicians.map((politician) => (
            <TableRow key={politician.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={politician.profileImage || ''} alt={`${politician.firstName} ${politician.lastName}`} />
                    <AvatarFallback>{getInitials(politician.firstName, politician.lastName)}</AvatarFallback>
                  </Avatar>
                  <Link href={`/politicians/${politician.id}`}>
                    <a className="hover:underline">
                      {politician.firstName} {politician.lastName}
                    </a>
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getPartyColor(politician.party)}>
                  {politician.party}
                </Badge>
              </TableCell>
              <TableCell>{politician.state}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/politicians/${politician.id}/votes`}>
                      <a title="View Votes">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/politicians/${politician.id}/finances`}>
                      <a title="View Financial Data">
                        <BarChart3 className="h-4 w-4" />
                      </a>
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleRefreshPolitician(politician.id)}
                    title="Refresh Data"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}