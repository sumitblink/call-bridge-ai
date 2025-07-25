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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Mutation to update campaign with new payout
  const updateCampaignMutation = useMutation({
    mutationFn: async (data: { defaultPayout: string; payoutModel: string }) => {
      return apiRequest(`/api/campaigns/${campaignId}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      toast({
        title: "Success",
        description: "Payout settings updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payout settings",
        variant: "destructive",
      });
    },
  });
  
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
      
      // Update local state
      setPayouts([...payouts, payout]);
      
      // Update campaign in database
      const payoutModel = newPayout.type === 'percentage' ? 'profit_share_percent' : 'per_call';
      updateCampaignMutation.mutate({
        defaultPayout: newPayout.amount,
        payoutModel: payoutModel
      });
      
      // Reset form
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
    const updatedPayouts = payouts.filter(p => p.id !== id);
    setPayouts(updatedPayouts);
    
    // If removing the last payout, reset to default
    if (updatedPayouts.length === 0) {
      updateCampaignMutation.mutate({
        defaultPayout: "0.00",
        payoutModel: "per_call"
      });
    } else {
      // Update with the remaining first payout rule
      const firstPayout = updatedPayouts[0];
      const payoutModel = firstPayout.type === 'percentage' ? 'profit_share_percent' : 'per_call';
      updateCampaignMutation.mutate({
        defaultPayout: firstPayout.amount,
        payoutModel: payoutModel
      });
    }
  };

  const formatPayoutDisplay = (payout: PayoutRule) => {
    const eventLabel = eventTypes.find(e => e.value === payout.event)?.label || payout.event;
    return payout.type === 'percentage' 
      ? `${payout.amount}% ${eventLabel}`
      : `$${payout.amount} on ${eventLabel}`;
  };

  return (
    <div className="space-y-2">
      {/* Current Payout Rules */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Payout Rules</h4>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs px-2 py-1 h-7">
                <Plus className="h-3 w-3" />
                Add Payout Rule
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Default Payout Settings</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Payout Setting Section */}
                <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payout Setting</h3>
                  
                  {/* Payout Type Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-700 dark:text-gray-300">Payout Type</Label>
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
                    <div className="flex gap-0 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                      <Button
                        type="button"
                        variant={newPayout.type === 'fixed' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.type === 'fixed' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, type: 'fixed' })}
                      >
                        Fixed Amount
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.type === 'percentage' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.type === 'percentage' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, type: 'percentage' })}
                      >
                        Revshare Percentage
                      </Button>
                    </div>
                  </div>

                  {/* Payout On Event */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-700 dark:text-gray-300">Payout On</Label>
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
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Choose Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        {eventTypes.map((event) => (
                          <SelectItem key={event.value} value={event.value} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payout Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-700 dark:text-gray-300">
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
                            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white pr-8"
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
                            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white pl-8"
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
                        <Label className="text-gray-700 dark:text-gray-300">Set Revshare Payout Limits</Label>
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
                      <Label className="text-gray-700 dark:text-gray-300">Duplicate Payouts</Label>
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
                    <div className="flex gap-0 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'disable' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'disable' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'disable' })}
                      >
                        Disable
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'enable' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'enable' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'enable' })}
                      >
                        Enable
                      </Button>
                      <Button
                        type="button"
                        variant={newPayout.duplicatePayouts === 'time_limit' ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${newPayout.duplicatePayouts === 'time_limit' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setNewPayout({ ...newPayout, duplicatePayouts: 'time_limit' })}
                      >
                        Time Limit
                      </Button>
                    </div>
                  </div>

                  {/* Payout Hours */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-700 dark:text-gray-300">Payout Hours</Label>
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
                      <Label className="text-gray-700 dark:text-gray-300">Limit Payout</Label>
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tag Filters for Payout</h3>
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
                  
                  <Button type="button" variant="outline" size="sm" className="gap-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">
                    <Plus className="h-4 w-4" />
                    ADD FILTER
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleAddPayout}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={!newPayout.event || !newPayout.amount || updateCampaignMutation.isPending}
                  >
                    {updateCampaignMutation.isPending ? "SAVING..." : "ADD PAYOUT"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
          <div className="space-y-1">
            {payouts.map((payout) => (
              <Card key={payout.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-2 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatPayoutDisplay(payout)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-1">
                        {payout.duplicatePayouts !== 'disable' && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                            Duplicates: {payout.duplicatePayouts}
                          </Badge>
                        )}
                        {payout.payoutHours && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                            Time Restricted
                          </Badge>
                        )}
                        {payout.limitPayout && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                            Limited
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayout(payout.id)}
                      className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 text-gray-500 dark:text-gray-400">
            <Settings className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No payout rules configured</p>
          </div>
        )}
      </div>
    </div>
  );
}