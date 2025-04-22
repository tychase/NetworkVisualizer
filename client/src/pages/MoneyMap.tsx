import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import { Politician } from '@shared/schema';
import { NetworkNode, NetworkData, MoneyMapFilters } from '@/lib/api-types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MoneyMap = () => {
  const [filters, setFilters] = useState<MoneyMapFilters>({
    politician: 'all',
    industry: 'all',
    dateRange: '12m'
  });

  const [selectedEntity, setSelectedEntity] = useState<NetworkNode | null>(null);

  // Fetch data
  const { data: politicians, isLoading: loadingPoliticians } = useQuery({
    queryKey: ['/api/politicians'],
  });

  const { data: contributions, isLoading: loadingContributions } = useQuery({
    queryKey: ['/api/contributions'],
  });

  const { data: networkData, isLoading: loadingNetwork } = useQuery<NetworkData>({
    queryKey: ['/api/money-network', filters],
    enabled: !!politicians && !!contributions,
    queryFn: async () => {
      // Create the network data from politicians and contributions
      if (!politicians || !contributions) {
        return { nodes: [], links: [] };
      }

      // Filter data based on current filters
      let filteredPoliticians = [...politicians] as Politician[];
      let filteredContributions = [...contributions];

      if (filters.politician !== 'all') {
        const politicianId = parseInt(filters.politician);
        filteredPoliticians = filteredPoliticians.filter(p => p.id === politicianId);
        filteredContributions = filteredContributions.filter(c => c.politicianId === politicianId);
      }

      if (filters.industry !== 'all') {
        filteredContributions = filteredContributions.filter(c => c.industry === filters.industry);
        // Only keep politicians who have contributions from this industry
        const relevantPoliticianIds = new Set(filteredContributions.map(c => c.politicianId));
        filteredPoliticians = filteredPoliticians.filter(p => relevantPoliticianIds.has(p.id));
      }

      // Create nodes for politicians and organizations
      const nodes: NetworkNode[] = [];
      const organizations = new Set(filteredContributions.map(c => c.organization));

      // Add politician nodes
      filteredPoliticians.forEach(p => {
        nodes.push({
          id: `p-${p.id}`,
          name: `${p.firstName} ${p.lastName}`,
          type: 'politician',
          group: p.party,
          image: p.profileImage
        });
      });

      // Add organization nodes
      organizations.forEach(org => {
        const industry = filteredContributions.find(c => c.organization === org)?.industry || 'Unknown';
        nodes.push({
          id: `o-${org}`,
          name: org,
          type: 'organization',
          group: industry
        });
      });

      // Create links
      const links = filteredContributions.map(c => {
        return {
          source: `o-${c.organization}`,
          target: `p-${c.politicianId}`,
          value: Number(c.amount),
          type: 'contribution' as const
        };
      });

      return { nodes, links };
    }
  });

  // Get unique industries from contributions
  const industries = contributions 
    ? Array.from(new Set(contributions.map(c => c.industry)))
        .filter(Boolean)
        .sort()
    : [];

  const handleFilterChange = (key: keyof MoneyMapFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // The filter changes already update the filters state
    // Query will automatically re-fetch with new filters
  };

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedEntity(node);
  };

  // Get contribution details for selected entity
  const selectedContributions = selectedEntity && contributions ? (
    selectedEntity.type === 'politician'
      ? contributions.filter(c => `p-${c.politicianId}` === selectedEntity.id)
      : contributions.filter(c => `o-${c.organization}` === selectedEntity.id)
  ) : [];

  // Find politician data for selected entity
  const selectedPolitician = selectedEntity?.type === 'politician' && politicians 
    ? politicians.find(p => `p-${p.id}` === selectedEntity.id)
    : null;

  const isLoading = loadingPoliticians || loadingContributions || loadingNetwork;

  return (
    <section id="money-map" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-900 sm:text-4xl">
            Interactive Money Map
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Visualize the connections between politicians, their donors, and voting records
          </p>
        </div>

        <div className="bg-light-100 p-4 rounded-lg shadow-lg">
          {/* Filter Controls */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <label htmlFor="politician-filter" className="block text-sm font-medium text-gray-700 mb-1">Politician</label>
              <Select 
                value={filters.politician} 
                onValueChange={(value) => handleFilterChange('politician', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Politicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Politicians</SelectItem>
                  {politicians?.map(politician => (
                    <SelectItem key={politician.id} value={politician.id.toString()}>
                      {politician.firstName} {politician.lastName} ({politician.party}-{politician.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto">
              <label htmlFor="industry-filter" className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <Select 
                value={filters.industry} 
                onValueChange={(value) => handleFilterChange('industry', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto">
              <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => handleFilterChange('dateRange', value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Last 12 Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                  <SelectItem value="24m">Last 24 Months</SelectItem>
                  <SelectItem value="5y">Last 5 Years</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-auto flex items-end">
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Network Visualization */}
          <div className="bg-white rounded-lg shadow-inner p-4 h-[500px] relative overflow-hidden">
            <ForceDirectedGraph 
              data={networkData || null}
              loading={isLoading}
              width={800}
              height={500}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center">
                <div className="h-4 w-4 rounded-full bg-primary"></div>
                <span className="ml-2 text-sm text-gray-700">Politicians</span>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 rounded-full bg-secondary"></div>
                <span className="ml-2 text-sm text-gray-700">Organizations</span>
              </div>
              <div className="flex items-center">
                <div className="h-1 w-8 bg-accent rounded"></div>
                <span className="ml-2 text-sm text-gray-700">Contributions</span>
              </div>
              <div className="flex items-center">
                <div className="h-1 w-8 bg-danger rounded"></div>
                <span className="ml-2 text-sm text-gray-700">Potential Conflicts</span>
              </div>
            </div>
          </div>

          {/* Selected Entity Details */}
          <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-dark-900 mb-2">Selected Details</h3>
            {!selectedEntity ? (
              <p className="text-gray-500 text-sm italic">Click on a node in the visualization to see detailed information</p>
            ) : selectedEntity.type === 'politician' && selectedPolitician ? (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="md:grid md:grid-cols-3 md:gap-6">
                  <div className="md:col-span-1">
                    <div className="flex items-center">
                      <img 
                        src={selectedPolitician.profileImage || `https://randomuser.me/api/portraits/lego/${selectedPolitician.id % 8}.jpg`} 
                        alt={`${selectedPolitician.firstName} ${selectedPolitician.lastName}`} 
                        className="h-16 w-16 rounded-full object-cover" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://randomuser.me/api/portraits/lego/${selectedPolitician.id % 8}.jpg`;
                        }}
                      />
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-dark-900">
                          {selectedPolitician.firstName} {selectedPolitician.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {selectedPolitician.party} - {selectedPolitician.state}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 md:mt-0 md:col-span-2">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Total Contributions</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          ${selectedContributions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Top Industry</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          {industries.length > 0 
                            ? industries[0] 
                            : 'None'}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Contributing Organizations</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          {selectedContributions.length} organizations
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Average Contribution</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          ${selectedContributions.length > 0 
                            ? Math.round(selectedContributions.reduce((sum, c) => sum + Number(c.amount), 0) / selectedContributions.length).toLocaleString() 
                            : 0}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="md:grid md:grid-cols-3 md:gap-6">
                  <div className="md:col-span-1">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-white">
                        <i className="fas fa-building text-2xl"></i>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-dark-900">
                          {selectedEntity.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {selectedEntity.group}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 md:mt-0 md:col-span-2">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Total Contributions</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          ${selectedContributions.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Industry</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          {selectedEntity.group}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Politicians Supported</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          {new Set(selectedContributions.map(c => c.politicianId)).size} politicians
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Average Contribution</dt>
                        <dd className="mt-1 text-sm text-dark-900">
                          ${selectedContributions.length > 0 
                            ? Math.round(selectedContributions.reduce((sum, c) => sum + Number(c.amount), 0) / selectedContributions.length).toLocaleString() 
                            : 0}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MoneyMap;
