import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, TrendingUp, Settings, BarChart, Target, Zap, AlertCircle, Info } from "lucide-react";

const advancedBiddingSchema = z.object({
  bidStrategy: z.enum(["fixed", "percentage", "dynamic", "auto"]),
  bidFloor: z.number().min(0, "Bid floor cannot be negative").optional(),
  bidCeiling: z.number().min(0, "Bid ceiling cannot be negative").optional(),
  geoBidMultipliers: z.record(z.string(), z.number().min(0.1).max(10)).optional(),
  performanceBidAdjustment: z.boolean(),
  targetConversionRate: z.number().min(0).max(100).optional(),
  maxCostPerAcquisition: z.number().min(0).optional(),
  bidAdjustmentFrequency: z.number().min(300).max(86400),
  enableAutoBidding: z.boolean(),
});

type AdvancedBiddingFormData = z.infer<typeof advancedBiddingSchema>;

interface Phase1AdvancedBiddingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: any;
  onSave: (data: AdvancedBiddingFormData) => void;
}

export function Phase1AdvancedBiddingDialog({ 
  open, 
  onOpenChange, 
  target,
  onSave 
}: Phase1AdvancedBiddingDialogProps) {
  const [geoMultipliers, setGeoMultipliers] = useState<Record<string, number>>(
    target?.geoBidMultipliers || {}
  );

  const form = useForm<AdvancedBiddingFormData>({
    resolver: zodResolver(advancedBiddingSchema),
    defaultValues: {
      bidStrategy: target?.bidStrategy || "fixed",
      bidFloor: target?.bidFloor || 0,
      bidCeiling: target?.bidCeiling || 0,
      geoBidMultipliers: target?.geoBidMultipliers || {},
      performanceBidAdjustment: target?.performanceBidAdjustment || false,
      targetConversionRate: target?.targetConversionRate || 0,
      maxCostPerAcquisition: target?.maxCostPerAcquisition || 0,
      bidAdjustmentFrequency: target?.bidAdjustmentFrequency || 3600,
      enableAutoBidding: target?.enableAutoBidding || false,
    },
  });

  const handleSubmit = (data: AdvancedBiddingFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  const addGeoMultiplier = (state: string, multiplier: number) => {
    const newMultipliers = { ...geoMultipliers, [state]: multiplier };
    setGeoMultipliers(newMultipliers);
    form.setValue('geoBidMultipliers', newMultipliers);
  };

  const removeGeoMultiplier = (state: string) => {
    const newMultipliers = { ...geoMultipliers };
    delete newMultipliers[state];
    setGeoMultipliers(newMultipliers);
    form.setValue('geoBidMultipliers', newMultipliers);
  };

  const bidStrategy = form.watch('bidStrategy');
  const enableAutoBidding = form.watch('enableAutoBidding');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Phase 1: Advanced Bidding Configuration
          </DialogTitle>
          <DialogDescription>
            Configure advanced bidding strategies, geographic multipliers, and performance-based adjustments to match enterprise RTB platforms like Ringba.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="strategy" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="strategy">Bidding Strategy</TabsTrigger>
                <TabsTrigger value="geographic">Geographic Targeting</TabsTrigger>
                <TabsTrigger value="performance">Performance Optimization</TabsTrigger>
                <TabsTrigger value="automation">Auto-Bidding</TabsTrigger>
              </TabsList>

              <TabsContent value="strategy" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Bidding Strategy Configuration
                    </CardTitle>
                    <CardDescription>
                      Choose how your target should calculate and submit bids
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="bidStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bidding Strategy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select bidding strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Bid Amount</SelectItem>
                              <SelectItem value="percentage">Percentage of Revenue</SelectItem>
                              <SelectItem value="dynamic">Dynamic Market-Based</SelectItem>
                              <SelectItem value="auto">Auto-Optimization</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bidFloor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bid Floor ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00"
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bidCeiling"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bid Ceiling ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00"
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {bidStrategy === "percentage" && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Percentage Bidding</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Bids will be calculated as a percentage of expected revenue. Min/Max bid amounts will be used as percentage values (e.g., 15% = 15.00).
                        </p>
                      </div>
                    )}

                    {bidStrategy === "dynamic" && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Dynamic Bidding</span>
                        </div>
                        <p className="text-sm text-green-700">
                          Bids will automatically adjust based on market conditions, competitor activity, and real-time performance metrics.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="geographic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="w-4 h-4" />
                      Geographic Bid Multipliers
                    </CardTitle>
                    <CardDescription>
                      Adjust bid amounts based on caller location (state-level targeting)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {Object.entries(geoMultipliers).map(([state, multiplier]) => (
                        <div key={state} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <Badge variant="outline">{state}</Badge>
                            <span className="ml-2 text-sm">
                              {multiplier}x multiplier
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGeoMultiplier(state)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Select onValueChange={(state) => {
                        const multiplier = 1.0;
                        addGeoMultiplier(state, multiplier);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="IL">Illinois</SelectItem>
                          <SelectItem value="PA">Pennsylvania</SelectItem>
                          <SelectItem value="OH">Ohio</SelectItem>
                          <SelectItem value="GA">Georgia</SelectItem>
                          <SelectItem value="NC">North Carolina</SelectItem>
                          <SelectItem value="MI">Michigan</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        placeholder="Multiplier"
                        defaultValue="1.0"
                      />
                      <Button type="button" variant="outline" size="sm">
                        Add
                      </Button>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">Geographic Targeting</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Multipliers above 1.0 increase bids for that state, while multipliers below 1.0 decrease bids. 
                        For example, CA: 1.5x means 50% higher bids for California callers.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Performance-Based Bidding
                    </CardTitle>
                    <CardDescription>
                      Automatically adjust bids based on conversion performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="performanceBidAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Performance Adjustments
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Automatically adjust bids based on conversion rates and performance metrics
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="targetConversionRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Conversion Rate (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0"
                                max="100"
                                placeholder="0.0"
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxCostPerAcquisition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Cost Per Acquisition ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                placeholder="0.00"
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bidAdjustmentFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bid Adjustment Frequency (seconds)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="300">5 minutes</SelectItem>
                              <SelectItem value="900">15 minutes</SelectItem>
                              <SelectItem value="1800">30 minutes</SelectItem>
                              <SelectItem value="3600">1 hour</SelectItem>
                              <SelectItem value="7200">2 hours</SelectItem>
                              <SelectItem value="14400">4 hours</SelectItem>
                              <SelectItem value="28800">8 hours</SelectItem>
                              <SelectItem value="86400">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="automation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Auto-Bidding Configuration
                    </CardTitle>
                    <CardDescription>
                      Let the system automatically optimize bids for maximum ROI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="enableAutoBidding"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Auto-Bidding
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              System will automatically optimize bids using machine learning algorithms
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {enableAutoBidding && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Auto-Bidding Active</span>
                        </div>
                        <p className="text-sm text-green-700">
                          The system will continuously analyze performance data and adjust bids to maximize ROI while staying within your floor and ceiling limits.
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Auto-Bidding Features</span>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Real-time performance monitoring</li>
                        <li>• Competitive bid analysis</li>
                        <li>• Conversion rate optimization</li>
                        <li>• Cost per acquisition control</li>
                        <li>• Geographic performance weighting</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Advanced Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}