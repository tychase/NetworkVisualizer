import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { DollarSign, Vote, TrendingUp, AlertCircle } from 'lucide-react';

// Define interface for timeline event
interface TimelineEvent {
  uid: string;
  type: 'vote' | 'contribution' | 'stock_transaction';
  data: any;
  date: string;
  amount: number | null;
}

// Interface for conflict data
interface Conflict {
  trade_id: number;
  bill_id: number;
  delta_days: number;
  amount: number;
  symbol: string;
}

interface TimelineRowProps {
  ev: TimelineEvent;
  conflicts?: Conflict[];
}

export default function TimelineRow({ ev, conflicts = [] }: TimelineRowProps) {
  // Find if this event has any conflicts
  const hasConflict = 
    ev.type === 'vote' && 
    conflicts.some(c => c.bill_id === ev.data.id) ||
    ev.type === 'stock_transaction' && 
    conflicts.some(c => c.trade_id === ev.data.id);

  // Format the date
  const formattedDate = format(new Date(ev.date), 'MMM d, yyyy');
  
  // Format amount if present
  const formattedAmount = ev.amount ? 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ev.amount) : 
    null;

  return (
    <Card className={`relative ${hasConflict ? 'border-red-500' : ''}`}>
      {hasConflict && (
        <div className="absolute -top-2 -right-2">
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive">
                <AlertCircle className="h-4 w-4 mr-1" />
                Potential Conflict
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This activity is temporally linked to a potential conflict of interest</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <CardContent className="p-4 flex items-start">
        <div className="mr-4 mt-1">
          {ev.type === 'vote' && (
            <div className="p-2 rounded-full bg-blue-100">
              <Vote className="h-5 w-5 text-blue-600" />
            </div>
          )}
          {ev.type === 'contribution' && (
            <div className="p-2 rounded-full bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          )}
          {ev.type === 'stock_transaction' && (
            <div className="p-2 rounded-full bg-amber-100">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          )}
        </div>

        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">
                {ev.type === 'vote' && `Vote on ${ev.data.billName}`}
                {ev.type === 'contribution' && `Contribution from ${ev.data.organization}`}
                {ev.type === 'stock_transaction' && `${ev.data.tradeType} of ${ev.data.stockName}`}
              </h3>
              <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
            {formattedAmount && (
              <Badge variant={ev.type === 'contribution' ? 'default' : 'outline'} className="ml-2">
                {formattedAmount}
              </Badge>
            )}
          </div>

          <div className="mt-2">
            {ev.type === 'vote' && (
              <p className="text-sm">
                <Badge variant={ev.data.voteResult === 'Yes' ? 'default' : 'destructive'}>
                  {ev.data.voteResult}
                </Badge>
                {ev.data.billDescription && (
                  <span className="ml-2">{ev.data.billDescription}</span>
                )}
              </p>
            )}
            {ev.type === 'contribution' && (
              <p className="text-sm">
                {ev.data.industry && (
                  <Badge variant="outline">{ev.data.industry}</Badge>
                )}
              </p>
            )}
            {ev.type === 'stock_transaction' && (
              <p className="text-sm">
                {ev.data.relatedBill && (
                  <div className="mt-1">
                    <Badge variant="outline">Related to bill: {ev.data.relatedBill}</Badge>
                  </div>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}