import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MoneyTimeline } from "@/components/MoneyTimeline";
import MoneyGraph from "@/components/MoneyGraph";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [activeTab, setActiveTab] = useState("timeline");

  // Fetch politician details
  const { data: politician, isLoading, error } = useQuery<Politician>({
    queryKey: ['/api/politicians', politicianId],
    enabled: !!politicianId && !isNaN(politicianId),
  });
  
  // Fetch potential conflicts
  const { data: conflicts } = useQuery<any[]>({
    queryKey: [`/api/politicians/${politicianId}/conflicts`],
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

  // Make sure we have politician data before rendering
  if (!politician) {
    return (
      <Container>
        <div className="py-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Politicians
          </Button>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Politician Not Found</CardTitle>
              <CardDescription>
                We couldn't find this politician in our database.
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
  
  // Check if conflicts exist
  const hasConflicts = conflicts && conflicts.length > 0;
  
  return (
    <Container>
      <div className="py-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Politicians
        </Button>
        
        <Card className="w-full mb-6">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{politician.firstName} {politician.lastName}</CardTitle>
              <CardDescription>
                {politician.party}-{politician.state}
              </CardDescription>
            </div>
            {hasConflicts && (
              <Alert variant="destructive" className="w-auto p-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {conflicts!.length} potential conflict{conflicts!.length !== 1 ? 's' : ''} detected
                </AlertDescription>
              </Alert>
            )}
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
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
            <TabsTrigger value="network">Money Network</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <MoneyTimeline politicianId={politician.id} />
          </TabsContent>
          <TabsContent value="network" className="mt-4">
            <MoneyGraph politicianId={politician.id} />
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}