import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Plus, Settings, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PayoutRule {
  id: string;
  type: 'fixed' | 'percentage';
  event: string;
  amount: string;
  duplicatePayouts: 'disable' | 'enable' | 'time_limit';
  payoutHours: boolean;
  limitPayout: boolean;
  revshareLimit: boolean;
  filters: string[];
}

interface RingbaPayoutSettingsProps {
  campaignId: string;
  currentPayout?: string;
  currentModel?: string;
}

export default function RingbaPayoutSettings({ campaignId, currentPayout = "5.00", currentModel = "per_call" }: RingbaPayoutSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRule[]>([
    {
      id: '1',
      type: 'fixed',
      event: 'incoming_call',
      amount: currentPayout,
      duplicatePayouts: 'disable',
      payoutHours: false,
      limitPayout: false,
      revshareLimit: false,
      filters: []
    }
  ]);
  
  const [newPayout, setNewPayout] = useState<Partial<PayoutRule>>({
    type: 'fixed',
    event: '',
    amount: '',
    duplicatePayouts: 'disable',
    payoutHours: false,
    limitPayout: false,
    revshareLimit: false,
    filters: []
  });

  const eventTypes = [
    { value: 'incoming_call', label: 'Incoming Call' },
    { value: 'answered_call', label: 'Answered Call' },
    { value: 'converted_call', label: 'Converted Call' },
    { value: 'qualified_call', label: 'Qualified Call' },
    { value: 'per_minute', label: 'Per Minute' },
    { value: 'call_duration', label: 'Call Duration' }
  ];

  const handleAddPayout = () => {
    if (newPayout.event && newPayout.amount) {
      const payout: PayoutRule = {
        id: Date.now().toString(),
        type: newPayout.type || 'fixed',
        event: newPayout.event,
        amount: newPayout.amount,
        duplicatePayouts: newPayout.duplicatePayouts || 'disable',
        payoutHours: newPayout.payoutHours || false,
        limitPayout: newPayout.limitPayout || false,
        revshareLimit: newPayout.revshareLimit || false,
        filters: newPayout.filters || []
      };
      
      setPayouts([...payouts, payout]);
      setNewPayout({
        type: 'fixed',
        event: '',
        amount: '',
        duplicatePayouts: 'disable',
        payoutHours: false,
        limitPayout: false,
        revshareLimit: false,
        filters: []
      });
      setIsOpen(false);
    }
  };

  const removePayout = (id: string) => {
    setPayouts(payouts.filter(p => p.id !== id));
  };

  const formatPayoutDisplay = (payout: PayoutRule) => {
    const eventLabel = eventTypes.find(e => e.value === payout.event)?.label || payout.event;
    return payout.type === 'percentage' 
      ? `${payout.amount}% ${eventLabel}`
      : `$${payout.amount} on ${eventLabel}`;
  };

  return (
    <div className="space-y-4">
      {/* Current Payout Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Active Payout Rules</h4>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Payout Rule
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[600px] bg-gray-900 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Default Payout Settings</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Payout Setting Section */}
                <div className="space-y-4 border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-medium">Payout Setting</h3>
                  
                  {/* Payout Type Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">Payout Type</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose between fixed dollar amount or percentage-based payouts</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-0 bg-gray-800 rounded-md p-1">
                      <Button
                        type="button"
                        variant={newPayout.type === 'fixed' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.type === 'fixed' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, type: 'fixed' })}
                      >
                        Fixed Amount
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.type === 'percentage' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.type === 'percentage' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, type: 'percentage' })}
                      >
                        Revshare Percentage
                      </Button>
                    </div>
                  </div>

                  {/* Payout On Event */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">Payout On</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select when the payout should be triggered</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select onValueChange={(value) => setNewPayout({ ...newPayout, event: value })}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Choose Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {eventTypes.map((event) => (
                          <SelectItem key={event.value} value={event.value} className="text-white hover:bg-gray-700">
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payout Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">
                        {newPayout.type === 'percentage' ? 'Payout Percentage' : 'Payout Amount'}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{newPayout.type === 'percentage' ? 'Enter percentage (0-100%)' : 'Enter dollar amount'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative">
                      {newPayout.type === 'percentage' ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-gray-800 border-gray-600 text-white pr-8"
                            value={newPayout.amount || ''}
                            onChange={(e) => setNewPayout({ ...newPayout, amount: e.target.value })}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        </>
                      ) : (
                        <>
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-gray-800 border-gray-600 text-white pl-8"
                            value={newPayout.amount || ''}
                            onChange={(e) => setNewPayout({ ...newPayout, amount: e.target.value })}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Revshare Limits (only for percentage) */}
                  {newPayout.type === 'percentage' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-300">Set Revshare Payout Limits</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set minimum and maximum payout limits for percentage-based payouts</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Switch
                        checked={newPayout.revshareLimit}
                        onCheckedChange={(checked) => setNewPayout({ ...newPayout, revshareLimit: checked })}
                      />
                    </div>
                  )}

                  {/* Duplicate Payouts */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">Duplicate Payouts</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Control how duplicate payouts are handled</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-0 bg-gray-800 rounded-md p-1">
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'disable' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'disable' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'disable' })}
                      >
                        Disable
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'enable' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'enable' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'enable' })}
                      >
                        Enable
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'time_limit' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'time_limit' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'time_limit' })}
                      >
                        Time Limit
                      </Button>
                    </div>
                  </div>

                  {/* Payout Hours */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">Payout Hours</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Restrict payouts to specific hours</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newPayout.payoutHours}
                        onCheckedChange={(checked) => setNewPayout({ ...newPayout, payoutHours: checked })}
                      />
                      <span className="text-sm text-gray-400">Always Open</span>
                    </div>
                  </div>

                  {/* Limit Payout */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300">Limit Payout</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set daily or total payout limits</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Switch
                      checked={newPayout.limitPayout}
                      onCheckedChange={(checked) => setNewPayout({ ...newPayout, limitPayout: checked })}
                    />
                  </div>
                </div>

                {/* Tag Filters Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Tag Filters for Payout</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add filters to control when this payout rule applies</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Button type="button" variant="outline" size="sm" className="gap-2 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
                    <Plus className="h-4 w-4" />
                    ADD FILTER
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleAddPayout}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!newPayout.event || !newPayout.amount}
                  >
                    ADD PAYOUT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    CANCEL
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payout Rules List */}
        {payouts.length > 0 ? (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card key={payout.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatPayoutDisplay(payout)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {payout.duplicatePayouts !== 'disable' && (
                          <Badge variant="secondary" className="mr-2">
                            Duplicates: {payout.duplicatePayouts}
                          </Badge>
                        )}
                        {payout.payoutHours && (
                          <Badge variant="secondary" className="mr-2">
                            Time Restricted
                          </Badge>
                        )}
                        {payout.limitPayout && (
                          <Badge variant="secondary" className="mr-2">
                            Limited
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayout(payout.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payout rules configured</p>
            <p className="text-sm">Add a payout rule to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}