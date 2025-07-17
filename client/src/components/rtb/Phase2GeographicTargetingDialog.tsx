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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Globe, Target, Shield, AlertTriangle, Info, Plus, X } from "lucide-react";

const geographicTargetingSchema = z.object({
  allowedStates: z.array(z.string().length(2)).optional(),
  blockedStates: z.array(z.string().length(2)).optional(),
  allowedZipCodes: z.array(z.string().min(5).max(10)).optional(),
  blockedZipCodes: z.array(z.string().min(5).max(10)).optional(),
  allowedAreaCodes: z.array(z.string().length(3)).optional(),
  blockedAreaCodes: z.array(z.string().length(3)).optional(),
  geoRadius: z.number().min(1).max(1000).optional(),
  geoCenter: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
  }).optional(),
  enableGeoTargeting: z.boolean(),
  geoTargetingMode: z.enum(["inclusive", "exclusive"]),
});

type GeographicTargetingFormData = z.infer<typeof geographicTargetingSchema>;

interface Phase2GeographicTargetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: any;
  onSave: (data: GeographicTargetingFormData) => void;
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export function Phase2GeographicTargetingDialog({ 
  open, 
  onOpenChange, 
  target,
  onSave 
}: Phase2GeographicTargetingDialogProps) {
  const [newState, setNewState] = useState("");
  const [newZipCode, setNewZipCode] = useState("");
  const [newAreaCode, setNewAreaCode] = useState("");

  const form = useForm<GeographicTargetingFormData>({
    resolver: zodResolver(geographicTargetingSchema),
    defaultValues: {
      allowedStates: target?.allowedStates || [],
      blockedStates: target?.blockedStates || [],
      allowedZipCodes: target?.allowedZipCodes || [],
      blockedZipCodes: target?.blockedZipCodes || [],
      allowedAreaCodes: target?.allowedAreaCodes || [],
      blockedAreaCodes: target?.blockedAreaCodes || [],
      geoRadius: target?.geoRadius || 50,
      geoCenter: target?.geoCenter || {
        lat: 39.8283,
        lng: -98.5795,
        city: "Geographic Center",
        state: "US",
      },
      enableGeoTargeting: target?.enableGeoTargeting || false,
      geoTargetingMode: target?.geoTargetingMode || "inclusive",
    },
  });

  const handleSubmit = (data: GeographicTargetingFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  const addToList = (listName: keyof GeographicTargetingFormData, value: string) => {
    const currentList = form.getValues(listName) as string[] || [];
    if (!currentList.includes(value)) {
      form.setValue(listName, [...currentList, value] as any);
    }
  };

  const removeFromList = (listName: keyof GeographicTargetingFormData, value: string) => {
    const currentList = form.getValues(listName) as string[] || [];
    form.setValue(listName, currentList.filter(item => item !== value) as any);
  };

  const enableGeoTargeting = form.watch('enableGeoTargeting');
  const geoTargetingMode = form.watch('geoTargetingMode');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Phase 2: Geographic Targeting Configuration
          </DialogTitle>
          <DialogDescription>
            Configure location-based targeting to control which geographic regions can participate in bidding for your RTB target.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="enableGeoTargeting"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Geographic Targeting
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Restrict bidding based on caller location (state, zip code, area code)
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

              {enableGeoTargeting && (
                <FormField
                  control={form.control}
                  name="geoTargetingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Targeting Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select targeting mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inclusive">Inclusive (Allow listed locations)</SelectItem>
                          <SelectItem value="exclusive">Exclusive (Block listed locations)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {enableGeoTargeting && (
              <Tabs defaultValue="states" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="states">States</TabsTrigger>
                  <TabsTrigger value="zipcodes">Zip Codes</TabsTrigger>
                  <TabsTrigger value="areacodes">Area Codes</TabsTrigger>
                  <TabsTrigger value="radius">Radius Targeting</TabsTrigger>
                </TabsList>

                <TabsContent value="states" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        State-Level Targeting
                      </CardTitle>
                      <CardDescription>
                        {geoTargetingMode === "inclusive" 
                          ? "Allow bidding only from these states"
                          : "Block bidding from these states"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Select value={newState} onValueChange={setNewState}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select state to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map(state => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name} ({state.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          onClick={() => {
                            if (newState) {
                              const listName = geoTargetingMode === "inclusive" ? "allowedStates" : "blockedStates";
                              addToList(listName, newState);
                              setNewState("");
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">
                          {geoTargetingMode === "inclusive" ? "Allowed States" : "Blocked States"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(geoTargetingMode === "inclusive" 
                            ? form.watch('allowedStates') 
                            : form.watch('blockedStates')
                          )?.map(stateCode => {
                            const state = US_STATES.find(s => s.code === stateCode);
                            return (
                              <Badge key={stateCode} variant="secondary" className="flex items-center gap-1">
                                {state?.name} ({stateCode})
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-1"
                                  onClick={() => {
                                    const listName = geoTargetingMode === "inclusive" ? "allowedStates" : "blockedStates";
                                    removeFromList(listName, stateCode);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">State Targeting</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          {geoTargetingMode === "inclusive" 
                            ? "Calls will only be routed to this target if they originate from the selected states."
                            : "Calls from the selected states will be blocked from this target."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="zipcodes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Zip Code Targeting
                      </CardTitle>
                      <CardDescription>
                        Precise targeting based on 5-digit zip codes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter zip code (e.g., 90210)"
                          value={newZipCode}
                          onChange={(e) => setNewZipCode(e.target.value)}
                          maxLength={10}
                        />
                        <Button 
                          type="button" 
                          onClick={() => {
                            if (newZipCode && newZipCode.length >= 5) {
                              const listName = geoTargetingMode === "inclusive" ? "allowedZipCodes" : "blockedZipCodes";
                              addToList(listName, newZipCode);
                              setNewZipCode("");
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">
                          {geoTargetingMode === "inclusive" ? "Allowed Zip Codes" : "Blocked Zip Codes"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(geoTargetingMode === "inclusive" 
                            ? form.watch('allowedZipCodes') 
                            : form.watch('blockedZipCodes')
                          )?.map(zipCode => (
                            <Badge key={zipCode} variant="secondary" className="flex items-center gap-1">
                              {zipCode}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1"
                                onClick={() => {
                                  const listName = geoTargetingMode === "inclusive" ? "allowedZipCodes" : "blockedZipCodes";
                                  removeFromList(listName, zipCode);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="areacodes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Area Code Targeting
                      </CardTitle>
                      <CardDescription>
                        Target or block specific 3-digit area codes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter area code (e.g., 213)"
                          value={newAreaCode}
                          onChange={(e) => setNewAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          maxLength={3}
                        />
                        <Button 
                          type="button" 
                          onClick={() => {
                            if (newAreaCode && newAreaCode.length === 3) {
                              const listName = geoTargetingMode === "inclusive" ? "allowedAreaCodes" : "blockedAreaCodes";
                              addToList(listName, newAreaCode);
                              setNewAreaCode("");
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">
                          {geoTargetingMode === "inclusive" ? "Allowed Area Codes" : "Blocked Area Codes"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(geoTargetingMode === "inclusive" 
                            ? form.watch('allowedAreaCodes') 
                            : form.watch('blockedAreaCodes')
                          )?.map(areaCode => (
                            <Badge key={areaCode} variant="secondary" className="flex items-center gap-1">
                              ({areaCode})
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1"
                                onClick={() => {
                                  const listName = geoTargetingMode === "inclusive" ? "allowedAreaCodes" : "blockedAreaCodes";
                                  removeFromList(listName, areaCode);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="radius" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Radius Targeting
                      </CardTitle>
                      <CardDescription>
                        Target calls within a specific radius from a center point
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="geoRadius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Radius (miles)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="1000"
                                  placeholder="50"
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="geoCenter.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Center City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="New York"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="geoCenter.lat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latitude</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.000001"
                                  min="-90" 
                                  max="90"
                                  placeholder="40.7128"
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
                          name="geoCenter.lng"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitude</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.000001"
                                  min="-180" 
                                  max="180"
                                  placeholder="-74.0060"
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
                          name="geoCenter.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {US_STATES.map(state => (
                                    <SelectItem key={state.code} value={state.code}>
                                      {state.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Radius Targeting</span>
                        </div>
                        <p className="text-sm text-green-700">
                          Calls will be {geoTargetingMode === "inclusive" ? "allowed" : "blocked"} within {form.watch('geoRadius') || 50} miles of the specified center point. This provides precise geographic control for local business targeting.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {!enableGeoTargeting && (
              <div className="p-6 bg-gray-50 rounded-lg text-center">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Geographic Targeting Disabled</h3>
                <p className="text-sm text-gray-600">
                  Enable geographic targeting to restrict bidding based on caller location. This helps ensure calls come from your target markets.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Geographic Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}