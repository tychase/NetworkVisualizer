import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MoneyTimeline } from "@/components/MoneyTimeline";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

// Helper function from utils
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Container component inline since there might be issues importing it
function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("container mx-auto px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

// Define politician type
interface Politician {
  id: number;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  profileImage?: string;
}

export default function PoliticianTimeline() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  // Default to 1 if no ID is provided to prevent NaN issues
  const politicianId = params && params.id ? parseInt(params.id) : 1;

  // Fetch politician details
  const { data: politician, isLoading, error } = useQuery<Politician>({
    queryKey: ['/api/politicians', politicianId],
    enabled: !!politicianId && !isNaN(politicianId),
  });

  // Handle back navigation
  const handleBack = () => {
    setLocation('/politicians');
  };

  // Show loading state
  if (isLoading) {
    return (
      <Container>
        <div className="py-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Politicians
          </Button>
          
          <Card className="w-full mb-6">
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardContent>
          </Card>
          
          <Skeleton className="h-[600px] w-full" />
        </div>
      </Container>
    );
  }

  // Show error state
  if (error || !politician) {
    return (
      <Container>
        <div className="py-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Politicians
          </Button>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Error Loading Politician</CardTitle>
              <CardDescription>
                We couldn't find this politician in our database or an error occurred while fetching their data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBack}>Return to Politicians List</Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Politicians
        </Button>
        
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>{politician.firstName} {politician.lastName}</CardTitle>
            <CardDescription>
              {politician.party}-{politician.state}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {politician.profileImage ? (
              <img 
                src={politician.profileImage} 
                alt={`${politician.firstName} ${politician.lastName}`} 
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                {politician.firstName && politician.firstName.length > 0 ? politician.firstName[0] : ''}
                {politician.lastName && politician.lastName.length > 0 ? politician.lastName[0] : ''}
              </div>
            )}
            <div>
              <p><strong>Party:</strong> {politician.party}</p>
              <p><strong>State:</strong> {politician.state}</p>
            </div>
          </CardContent>
        </Card>
        
        <MoneyTimeline politicianId={politician.id} />
      </div>
    </Container>
  );
}