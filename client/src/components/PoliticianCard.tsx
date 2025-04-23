import { Politician } from '@shared/schema';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface PoliticianCardProps {
  politician: Politician;
  contributions?: number;
  stockTrades?: number;
  topIndustries?: string[];
  onClick?: () => void;
}

const PoliticianCard: React.FC<PoliticianCardProps> = ({
  politician,
  contributions = 0,
  stockTrades = 0,
  topIndustries = [],
  onClick
}) => {
  const partyColors: Record<string, string> = {
    'Democrat': 'bg-blue-100 text-blue-800',
    'Republican': 'bg-red-100 text-red-800',
    'Independent': 'bg-green-100 text-green-800'
  };

  const industryColors: Record<string, string> = {
    'Technology': 'bg-blue-100 text-blue-800',
    'Healthcare': 'bg-green-100 text-green-800',
    'Energy': 'bg-red-100 text-red-800',
    'Finance': 'bg-purple-100 text-purple-800',
    'Defense': 'bg-gray-100 text-gray-800',
    'Education': 'bg-yellow-100 text-yellow-800'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Prevent event bubbling when clicking the timeline link
  const handleTimelineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleClick}
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <img 
            src={politician.profileImage || `https://randomuser.me/api/portraits/${politician.gender === 'female' ? 'women' : 'men'}/${politician.id % 100}.jpg`} 
            alt={`${politician.firstName} ${politician.lastName}`} 
            className="h-16 w-16 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://randomuser.me/api/portraits/lego/${politician.id % 8}.jpg`;
            }}
          />
          <div className="ml-4">
            <h3 className="text-lg font-medium text-dark-900">
              {politician.title || ''} {politician.firstName} {politician.lastName}
            </h3>
            <p className="text-sm text-gray-500">
              {politician.party} - {politician.state}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Contributions</span>
            <span className="text-dark-900 font-medium">
              ${(contributions / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>Stock Trades</span>
            <span className="text-dark-900 font-medium">{stockTrades}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topIndustries.slice(0, 2).map((industry, index) => (
            <Badge key={index} variant="outline" className={industryColors[industry] || 'bg-gray-100 text-gray-800'}>
              {industry}
            </Badge>
          ))}
        </div>
        
        {/* Timeline Button */}
        <div className="mt-4 border-t pt-4">
          <Link href={`/politicians/${politician.id}/timeline`} onClick={handleTimelineClick}>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 text-primary hover:text-primary"
            >
              <Calendar className="h-4 w-4" />
              <span>View Money Timeline</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PoliticianCard;
