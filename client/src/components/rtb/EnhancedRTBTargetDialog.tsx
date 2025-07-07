import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Globe, Clock, Shield, DollarSign, Target, TestTube, Phone, AlertTriangle } from "lucide-react";

const enhancedRTBTargetSchema = z.object({
  // Basic Configuration
  name: z.string().min(1, "Target name is required"),
  subId: z.string().optional(),
  buyerId: z.number().min(1, "Buyer is required"),
  
  // Toggle Settings
  enableDynamicNumber: z.boolean(),
  rtbShareableTags: z.boolean(),
  
  // Type Selection
  type: z.enum(["Number", "SIP"]),
  number: z.string().optional(),
  
  // Bid Amount Settings (moved to Basic tab)
  minBidAmount: z.number().min(0, "Minimum bid amount must be positive"),
  maxBidAmount: z.number().min(0, "Maximum bid amount must be positive"),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
  
  // Connection Settings
  connectionTimeout: z.number().min(1000, "Connection timeout must be at least 1000ms").max(30000, "Connection timeout cannot exceed 30000ms"),
  
  // IVR Settings
  dialIvrOptions: z.string().optional(),
  
  // Recording Settings
  disableRecordings: z.boolean(),
  
  // Timezone
  timezone: z.string(),
  
  // Cap Settings
  capOn: z.enum(["Conversion", "Call", "Revenue"]),
  globalCallCap: z.number().min(0).optional(),
  monthlyCap: z.number().min(0).optional(),
  dailyCap: z.number().min(0).optional(),
  hourlyCap: z.number().min(0).optional(),
  
  // Concurrency Settings
  maxConcurrency: z.number().min(0).optional(),
  hourlyConcurrency: z.number().min(0).optional(),
  
  // Duplicate Call Settings
  restrictDuplicates: z.enum(["Buyer Settings (Do not Restrict)", "Block", "Route to Fallback"]),
  
  // Predictive Routing Settings
  estimatedRevenue: z.enum(["Use Campaign Setting", "Use Estimated Revenue"]),
  priorityBump: z.number().min(-10).max(10).default(0),
  
  // Request Settings
  endpointUrl: z.string().url("Valid endpoint URL is required"),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH"]),
  contentType: z.enum(["application/json", "application/x-www-form-urlencoded", "text/plain", "application/xml"]),
  requestBody: z.string().optional(),
  authentication: z.enum(["Choose Authentication", "API Key", "Bearer Token", "Basic Auth"]),
  authToken: z.string().optional(),
  
  // Acceptance Parsing
  acceptanceParsing: z.enum(["Choose Property", "price", "accepted", "duration"]),
  acceptanceOperator: z.enum(["Equals", "Greater Than", "Less Than", "Not Equals"]),
  acceptanceValue: z.string().optional(),
});

interface EnhancedRTBTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  buyers: any[];
  editingTarget?: any;
}

export function EnhancedRTBTargetDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  buyers,
  editingTarget 
}: EnhancedRTBTargetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof enhancedRTBTargetSchema>>({
    resolver: zodResolver(enhancedRTBTargetSchema),
    defaultValues: {
      name: "",
      subId: "",
      buyerId: 0,
      enableDynamicNumber: false,
      rtbShareableTags: false,
      type: "Number",
      number: "",
      minBidAmount: 0,
      maxBidAmount: 100,
      currency: "USD",
      connectionTimeout: 5000,
      dialIvrOptions: editingTarget?.dialIvrOptions || "",
      disableRecordings: editingTarget?.disableRecordings || false,
      timezone: editingTarget?.timezone || "UTC",
      capOn: editingTarget?.capOn || "Conversion",
      globalCallCap: editingTarget?.globalCallCap || 0,
      monthlyCap: editingTarget?.monthlyCap || 0,
      dailyCap: editingTarget?.dailyCap || 0,
      hourlyCap: editingTarget?.hourlyCap || 0,
      maxConcurrency: editingTarget?.maxConcurrency || 0,
      hourlyConcurrency: editingTarget?.hourlyConcurrency || 0,
      restrictDuplicates: editingTarget?.restrictDuplicates || "Buyer Settings (Do not Restrict)",
      estimatedRevenue: editingTarget?.estimatedRevenue || "Use Campaign Setting",
      priorityBump: editingTarget?.priorityBump || 0,
      endpointUrl: editingTarget?.endpointUrl || "",
      httpMethod: editingTarget?.httpMethod || "GET",
      contentType: editingTarget?.contentType || "application/json",
      requestBody: editingTarget?.requestBody || "",
      authentication: editingTarget?.authentication || "Choose Authentication",
      authToken: editingTarget?.authToken || "",
      acceptanceParsing: editingTarget?.acceptanceParsing || "Choose Property",
      acceptanceOperator: editingTarget?.acceptanceOperator || "Equals",
      acceptanceValue: editingTarget?.acceptanceValue || "",
    },
  });

  const priorityBumpValue = form.watch("priorityBump");
  const capOn = form.watch("capOn");
  const estimatedRevenue = form.watch("estimatedRevenue");

  // Reset form when editingTarget changes
  useEffect(() => {
    if (editingTarget) {
      form.reset({
        name: editingTarget.name || "",
        subId: editingTarget.subId || "",
        buyerId: editingTarget.buyerId || 0,
        enableDynamicNumber: editingTarget.enableDynamicNumber || false,
        rtbShareableTags: editingTarget.rtbShareableTags || false,
        type: "Number",
        number: buyers.find(b => b.id === editingTarget.buyerId)?.phoneNumber || "",
        minBidAmount: editingTarget.minBidAmount || 0,
        maxBidAmount: editingTarget.maxBidAmount || 100,
        currency: editingTarget.currency || "USD",
        connectionTimeout: editingTarget.connectionTimeout || 5000,
        dialIvrOptions: editingTarget.dialIvrOptions || "",
        disableRecordings: editingTarget.disableRecordings || false,
        timezone: editingTarget.timezone || "UTC",
        capOn: "Conversion",
        globalCallCap: editingTarget.globalCallCap || 0,
        monthlyCap: editingTarget.monthlyCap || 0,
        dailyCap: editingTarget.dailyCap || 0,
        hourlyCap: editingTarget.hourlyCap || 0,
        maxConcurrency: editingTarget.maxConcurrentCalls || 0,
        hourlyConcurrency: editingTarget.hourlyConcurrency || 0,
        restrictDuplicates: "Buyer Settings (Do not Restrict)",
        estimatedRevenue: "Use Campaign Setting",
        priorityBump: 0,
        endpointUrl: editingTarget.endpointUrl || "",
        httpMethod: "GET",
        contentType: editingTarget.contentType || "application/json",
        requestBody: editingTarget.requestBody || "",
        authentication: editingTarget.authMethod === "choose_authentication" ? "Choose Authentication" : editingTarget.authMethod || "Choose Authentication",
        authToken: editingTarget.authToken || "",
        acceptanceParsing: "Choose Property",
        acceptanceOperator: "Equals",
        acceptanceValue: "",
      });
    } else {
      form.reset({
        name: "",
        subId: "",
        buyerId: 0,
        enableDynamicNumber: false,
        rtbShareableTags: false,
        type: "Number",
        number: "",
        minBidAmount: 0,
        maxBidAmount: 100,
        currency: "USD",
        connectionTimeout: 5000,
        dialIvrOptions: "",
        disableRecordings: false,
        timezone: "UTC",
        capOn: "Conversion",
        globalCallCap: 0,
        monthlyCap: 0,
        dailyCap: 0,
        hourlyCap: 0,
        maxConcurrency: 0,
        hourlyConcurrency: 0,
        restrictDuplicates: "Buyer Settings (Do not Restrict)",
        estimatedRevenue: "Use Campaign Setting",
        priorityBump: 0,
        endpointUrl: "",
        httpMethod: "GET",
        contentType: "application/json",
        requestBody: "",
        authentication: "Choose Authentication",
        authToken: "",
        acceptanceParsing: "Choose Property",
        acceptanceOperator: "Equals",
        acceptanceValue: "",
      });
    }
  }, [editingTarget, form]);

  const handleSubmit = async (data: z.infer<typeof enhancedRTBTargetSchema>) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...data,
        // Convert form data to backend format
        isActive: true,
        timeoutMs: data.connectionTimeout,
        authMethod: data.authentication.toLowerCase().replace(" ", "_"),
        maxConcurrentCalls: data.maxConcurrency,
        globalCallCap: data.globalCallCap,
        monthlyCap: data.monthlyCap,
        dailyCap: data.dailyCap,
        hourlyCap: data.hourlyCap,
        hourlyConcurrency: data.hourlyConcurrency,
        enableDynamicNumber: data.enableDynamicNumber,
        rtbShareableTags: data.rtbShareableTags,
        // Include bid amount fields
        minBidAmount: data.minBidAmount,
        maxBidAmount: data.maxBidAmount,
        currency: data.currency,
        restrictDuplicates: data.restrictDuplicates !== "Buyer Settings (Do not Restrict)",
        disableRecordings: data.disableRecordings,
        priorityBumpValue: data.priorityBump,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {editingTarget ? "Edit RTB Target" : "Create RTB Target"}
          </DialogTitle>
          <DialogDescription>
            Configure your RTB target with enterprise-level controls and settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="caps">Cap Settings</TabsTrigger>
                <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
                <TabsTrigger value="routing">Routing</TabsTrigger>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="parsing">Parsing</TabsTrigger>
              </TabsList>

              {/* Basic Settings Tab */}
              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Basic Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Enter target name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="subId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional sub ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="buyerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={(value) => {
                            const buyerId = parseInt(value);
                            field.onChange(buyerId);
                            
                            // Auto-populate phone number from selected buyer
                            const selectedBuyer = buyers.find(buyer => buyer.id === buyerId);
                            if (selectedBuyer?.phoneNumber) {
                              form.setValue('number', selectedBuyer.phoneNumber);
                            }
                          }}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Buyer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buyers.map((buyer) => (
                                <SelectItem key={buyer.id} value={buyer.id.toString()}>
                                  {buyer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="enableDynamicNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dynamic Number/SIP</FormLabel>
                            <FormControl>
                              <ToggleSwitch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                label="Enable Dynamic Routing"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rtbShareableTags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RTB Shareable Tags</FormLabel>
                            <FormControl>
                              <ToggleSwitch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                label="Enable Tag Sharing"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Number">Number</SelectItem>
                                <SelectItem value="SIP">SIP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="connectionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Connection Timeout (ms)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1000"
                              max="30000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dialIvrOptions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dial IVR Options</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Ex: www.wwww123.123.wwww123{tag:gather,zipcode}
Please add tags with numerical values only."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="disableRecordings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disable Recordings</FormLabel>
                          <FormControl>
                            <ToggleSwitch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              label="Disable call recordings"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Zone <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Search Timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="America/New_York">America/New_York</SelectItem>
                              <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bid Amount Settings */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <h4 className="text-sm font-medium">Bid Amount Settings</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="minBidAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Bid Amount <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxBidAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Bid Amount <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  placeholder="100.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency <span className="text-red-500">*</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cap Settings Tab */}
              <TabsContent value="caps" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cap Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="capOn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cap On</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Conversion">Conversion</SelectItem>
                              <SelectItem value="Call">Call</SelectItem>
                              <SelectItem value="Revenue">Revenue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="globalCallCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Global Call Cap</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 1000 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="monthlyCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Cap</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 1000 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dailyCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Daily Cap</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 100 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hourlyCap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Cap</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 10 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Concurrency Settings Tab */}
              <TabsContent value="concurrency" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Concurrency Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxConcurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Concurrency</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 10 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hourlyConcurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Concurrency</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ToggleSwitch 
                                  checked={field.value !== 0}
                                  onCheckedChange={(checked) => field.onChange(checked ? 5 : 0)}
                                  size="sm"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {field.value === 0 ? "None" : field.value}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-2">Restrict Duplicate Calls Settings</h4>
                      <FormField
                        control={form.control}
                        name="restrictDuplicates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Restrict Duplicate</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Buyer Settings (Do not Restrict)">Buyer Settings (Do not Restrict)</SelectItem>
                                <SelectItem value="Block">Block</SelectItem>
                                <SelectItem value="Route to Fallback">Route to Fallback</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Predictive Routing Tab */}
              <TabsContent value="routing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Predictive Routing Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="estimatedRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Revenue</FormLabel>
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant={field.value === "Use Campaign Setting" ? "default" : "outline"}
                              onClick={() => field.onChange("Use Campaign Setting")}
                            >
                              Use Campaign Setting
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "Use Estimated Revenue" ? "default" : "outline"}
                              onClick={() => field.onChange("Use Estimated Revenue")}
                            >
                              Use Estimated Revenue
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityBump"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Bump</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>-10</span>
                                <span className="font-medium">Default</span>
                                <span>+10</span>
                              </div>
                              <Slider
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                min={-10}
                                max={10}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-center">
                                <Badge variant="secondary">
                                  {field.value === 0 ? "Default" : field.value > 0 ? `+${field.value}` : `${field.value}`}
                                </Badge>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Request Settings Tab */}
              <TabsContent value="request" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Request Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="endpointUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="https://ringba.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="httpMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="application/json">application/json</SelectItem>
                              <SelectItem value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</SelectItem>
                              <SelectItem value="text/plain">text/plain</SelectItem>
                              <SelectItem value="application/xml">application/xml</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requestBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Body</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter request body content (for POST/PUT/PATCH requests)"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The request body will be sent with POST, PUT, and PATCH requests. Leave empty for GET requests.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="authentication"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Authentication</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Choose Authentication">Choose Authentication</SelectItem>
                              <SelectItem value="API Key">API Key</SelectItem>
                              <SelectItem value="Bearer Token">Bearer Token</SelectItem>
                              <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Headers</label>
                        <div className="flex space-x-2">
                          <Button type="button" variant="outline" size="sm">TOKEN</Button>
                          <Button type="button" variant="outline" size="sm">ADD</Button>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Input placeholder="key" className="flex-1" />
                        <span className="flex items-center px-2">:</span>
                        <Input placeholder="value" className="flex-1" />
                      </div>
                      <p className="text-sm text-muted-foreground">No Headers</p>
                    </div>

                    <div className="mt-4">
                      <Button type="button" variant="outline" className="w-full">
                        <TestTube className="h-4 w-4 mr-2" />
                        RUN REQUEST
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Acceptance Parsing Tab */}
              <TabsContent value="parsing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Acceptance Parsing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="acceptanceParsing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Choose Property</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Choose Property">Choose Property</SelectItem>
                                <SelectItem value="price">price</SelectItem>
                                <SelectItem value="accepted">accepted</SelectItem>
                                <SelectItem value="duration">duration</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="acceptanceOperator"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operator</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Equals">Equals</SelectItem>
                                <SelectItem value="Greater Than">Greater Than</SelectItem>
                                <SelectItem value="Less Than">Less Than</SelectItem>
                                <SelectItem value="Not Equals">Not Equals</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="acceptanceValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl>
                              <Input placeholder="Required" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? "Creating..." 
                  : editingTarget ? "Update Target" : "Create Target"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}