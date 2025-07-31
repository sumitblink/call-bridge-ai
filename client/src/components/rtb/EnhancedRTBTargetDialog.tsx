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
import { Settings, Globe, Clock, Shield, DollarSign, Target, TestTube, Phone, AlertTriangle, Info, Plus, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

const enhancedRTBTargetSchema = z.object({
  // Basic Configuration
  name: z.string().min(1, "Target name is required"),
  subId: z.string().optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  
  // Toggle Settings
  enableDynamicNumber: z.boolean(),
  rtbShareableTags: z.boolean(),
  shareInboundCallId: z.boolean().optional(),
  exposeCallerId: z.boolean().optional(),
  rtbId: z.string().optional(),
  
  // Dynamic Number/SIP conditional fields
  dynamicNumberType: z.enum(["Number", "SIP"]).optional(),
  dynamicNumber: z.string().optional(),
  sipEndpoint: z.string().optional(),
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),
  

  
  // Connection Settings
  connectionTimeout: z.number().min(1000, "Connection timeout must be at least 1000ms").max(30000, "Connection timeout cannot exceed 30000ms"),
  
  // IVR Settings
  dialIvrOptions: z.string().optional(),
  
  // Recording Settings
  disableRecordings: z.boolean(),
  
  // Timezone
  timezone: z.string(),
  
  // Revenue Settings
  conversionSettings: z.enum(["use_ring_tree", "override"]).default("use_ring_tree"),
  minimumRevenueSettings: z.enum(["use_ring_tree", "override"]).default("use_ring_tree"),
  revenueType: z.enum(["dynamic", "static"]).optional(),
  staticRevenueAmount: z.coerce.number().min(0).default(0),
  failureRevenueAmount: z.coerce.number().min(0).default(0),
  convertOn: z.enum(["Call Successfully Connected", "Call Length", "Postback/Webhook", "Dialed"]).optional(),
  startCallLengthOn: z.enum(["Incoming", "Dial", "Connect"]).optional(),
  minimumRevenueAmount: z.coerce.number().min(0).default(20),
  
  // Cap Settings
  capOn: z.enum(["Conversion", "Call", "Revenue"]),
  globalCallCap: z.number().min(0).optional(),
  monthlyCap: z.number().min(0).optional(),
  dailyCap: z.number().min(0).optional(),
  hourlyCap: z.number().min(0).optional(),
  
  // Concurrency Settings
  maxConcurrency: z.number().min(0).optional(),
  hourlyConcurrency: z.number().min(0).optional(),
  predictiveRoutingConfigId: z.number().optional(),
  
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
  
  // Advanced Response Parsing
  bidAmountPath: z.string().optional(),
  destinationNumberPath: z.string().optional(),
  acceptancePath: z.string().optional(),
  acceptanceParsing: z.string().optional(),
  currencyPath: z.string().optional(),
  durationPath: z.string().optional(),
  
  // JavaScript Response Parser
  responseParserType: z.enum(["json_path", "javascript"]).optional(),
  dynamicBidParser: z.string().optional(),
  javascriptParser: z.string().optional(),
  dynamicNumberParser: z.string().optional(),
  
  // Call Length Configuration
  callLengthValueType: z.enum(["Dynamic", "Static"]).optional(),
  maxDynamicDuration: z.number().min(0).nullable().optional(),
  staticCallLength: z.number().min(1).optional(),
}).refine(
  (data) => {
    // When conversion settings is override, revenue type must be selected
    if (data.conversionSettings === "override" && !data.revenueType) {
      return false;
    }
    return true;
  },
  {
    message: "Revenue type is required when using override conversion settings",
    path: ["revenueType"], // This will show the error on the revenueType field
  }
);

interface EnhancedRTBTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  editingTarget?: any;
}

export function EnhancedRTBTargetDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingTarget 
}: EnhancedRTBTargetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPredictiveRoutingSettings, setShowPredictiveRoutingSettings] = useState(false);

  // Fetch predictive routing configurations
  const { data: predictiveRoutingConfigs = [], refetch: refetchPredictiveConfigs, isLoading: loadingConfigs } = useQuery<any[]>({
    queryKey: ['/api/settings/predictive-routing'],
    enabled: open,
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Fetch buyers for Company dropdown
  const { data: buyers = [], isLoading: loadingBuyers } = useQuery<any[]>({
    queryKey: ['/api/buyers'],
    enabled: open,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });

  // Refetch configurations when dialog opens
  useEffect(() => {
    if (open) {
      refetchPredictiveConfigs();
    }
  }, [open, refetchPredictiveConfigs]);
  const form = useForm<z.infer<typeof enhancedRTBTargetSchema>>({
    resolver: zodResolver(enhancedRTBTargetSchema),
    defaultValues: {
      name: "",
      subId: "",
      companyName: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      enableDynamicNumber: false,
      rtbShareableTags: false,
      shareInboundCallId: false,
      exposeCallerId: false,
      rtbId: "",
      dynamicNumberType: "Number",
      dynamicNumber: "",
      sipEndpoint: "",
      sipUsername: "",
      sipPassword: "",

      connectionTimeout: editingTarget?.connectionTimeout || 5000,
      dialIvrOptions: editingTarget?.dialIvrOptions || "",
      disableRecordings: editingTarget?.disableRecordings || false,
      timezone: editingTarget?.timezone || "UTC+00:00",
      conversionSettings: editingTarget?.conversionSettings || "use_ring_tree",
      minimumRevenueSettings: editingTarget?.minimumRevenueSettings || "use_ring_tree",
      revenueType: editingTarget?.revenueType || "dynamic",
      staticRevenueAmount: editingTarget?.staticRevenueAmount ?? 0,
      failureRevenueAmount: editingTarget?.failureRevenueAmount ?? 0,
      convertOn: editingTarget?.convertOn || "Call Successfully Connected",
      startCallLengthOn: editingTarget?.startCallLengthOn || "Incoming",
      callLengthValueType: editingTarget?.callLengthValueType || "Dynamic",
      maxDynamicDuration: editingTarget?.maxDynamicDuration || null,
      staticCallLength: editingTarget?.staticCallLength || 30,
      minimumRevenueAmount: editingTarget?.minimumRevenueAmount ?? 20,
      capOn: editingTarget?.capOn || "Conversion",
      globalCallCap: editingTarget?.globalCallCap || 0,
      monthlyCap: editingTarget?.monthlyCap || 0,
      dailyCap: editingTarget?.dailyCap || 0,
      hourlyCap: editingTarget?.hourlyCap || 0,
      maxConcurrency: editingTarget?.maxConcurrency || 0,
      hourlyConcurrency: editingTarget?.hourlyConcurrency || 0,
      predictiveRoutingConfigId: editingTarget?.predictiveRoutingConfigId || undefined,
      restrictDuplicates: editingTarget?.restrictDuplicates || "Buyer Settings (Do not Restrict)",
      estimatedRevenue: editingTarget?.estimatedRevenue || "Use Campaign Setting",
      priorityBump: editingTarget?.priorityBump || 0,
      endpointUrl: editingTarget?.endpointUrl || "",
      httpMethod: editingTarget?.httpMethod || "GET",
      contentType: editingTarget?.contentType || "application/json",
      requestBody: editingTarget?.requestBody || "",
      authentication: editingTarget?.authentication || "Choose Authentication",
      authToken: editingTarget?.authToken || "",
      bidAmountPath: editingTarget?.bidAmountPath || "",
      destinationNumberPath: editingTarget?.destinationNumberPath || "",
      acceptancePath: editingTarget?.acceptancePath || "",
      acceptanceParsing: editingTarget?.acceptanceParsing || "",
      currencyPath: editingTarget?.currencyPath || "",
      durationPath: editingTarget?.durationPath || "",
      responseParserType: editingTarget?.responseParserType || "json_path",
      dynamicBidParser: editingTarget?.dynamicBidParser || "",
      javascriptParser: editingTarget?.javascriptParser || "",
      dynamicNumberParser: editingTarget?.dynamicNumberParser || "",
    },
  });

  const priorityBumpValue = form.watch("priorityBump");
  const capOn = form.watch("capOn");
  const estimatedRevenue = form.watch("estimatedRevenue");
  const enableDynamicNumber = form.watch("enableDynamicNumber");
  const dynamicNumberType = form.watch("dynamicNumberType");

  // Reset form when editingTarget changes
  useEffect(() => {
    if (editingTarget) {
      form.reset({
        name: editingTarget.name || "",
        subId: editingTarget.subId || "",
        companyName: editingTarget.companyName || "",
        contactPerson: editingTarget.contactPerson || "",
        contactEmail: editingTarget.contactEmail || "",
        contactPhone: editingTarget.contactPhone || "",
        enableDynamicNumber: editingTarget.enableDynamicNumber || false,
        rtbShareableTags: editingTarget.rtbShareableTags || false,
        shareInboundCallId: editingTarget.shareInboundCallId || false,
        exposeCallerId: editingTarget.exposeCallerId || false,
        rtbId: editingTarget.rtbId || "",
        dynamicNumberType: editingTarget.dynamicNumberType || "Number",
        dynamicNumber: editingTarget.dynamicNumber || "",
        sipEndpoint: editingTarget.sipEndpoint || "",
        sipUsername: editingTarget.sipUsername || "",
        sipPassword: editingTarget.sipPassword || "",

        connectionTimeout: editingTarget.connectionTimeout || 5000,
        dialIvrOptions: editingTarget.dialIvrOptions || "",
        disableRecordings: editingTarget.disableRecordings || false,
        timezone: editingTarget.timezone || "UTC+00:00",
        conversionSettings: editingTarget.conversionSettings || "use_ring_tree",
        minimumRevenueSettings: editingTarget.minimumRevenueSettings || "use_ring_tree",
        revenueType: editingTarget.revenueType || "dynamic",
        staticRevenueAmount: editingTarget.staticRevenueAmount || 0,
        failureRevenueAmount: editingTarget.failureRevenueAmount || 0,
        convertOn: editingTarget.convertOn || "Call Successfully Connected",
        startCallLengthOn: editingTarget.startCallLengthOn || "Incoming",
        callLengthValueType: editingTarget.callLengthValueType || "Dynamic",
        maxDynamicDuration: editingTarget.maxDynamicDuration || 0,
        minimumRevenueAmount: editingTarget.minimumRevenueAmount || 20,
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
        httpMethod: editingTarget.httpMethod || "POST",
        contentType: editingTarget.contentType || "application/json",
        requestBody: editingTarget.requestBody || "",
        authentication: editingTarget.authMethod === "choose_authentication" ? "Choose Authentication" : editingTarget.authMethod || "Choose Authentication",
        authToken: editingTarget.authToken || "",
        bidAmountPath: editingTarget.bidAmountPath || "",
        destinationNumberPath: editingTarget.destinationNumberPath || "",
        acceptancePath: editingTarget.acceptancePath || "",
        currencyPath: editingTarget.currencyPath || "",
        durationPath: editingTarget.durationPath || "",
        acceptanceParsing: "Choose Property",
        responseParserType: editingTarget.responseParserType || "json_path",
        javascriptParser: editingTarget.javascriptParser || "",
        dynamicNumberParser: editingTarget.dynamicNumberParser || "",
      });
    } else {
      form.reset({
        name: "",
        subId: "",
        companyName: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        enableDynamicNumber: false,
        rtbShareableTags: false,
        shareInboundCallId: false,
        exposeCallerId: false,
        rtbId: "",
        dynamicNumberType: "Number",
        dynamicNumber: "",
        sipEndpoint: "",
        sipUsername: "",
        sipPassword: "",

        connectionTimeout: 5000,
        dialIvrOptions: "",
        disableRecordings: false,
        timezone: "UTC",
        
        // Revenue Settings - Default values
        conversionSettings: "use_ring_tree",
        minimumRevenueSettings: "use_ring_tree", 
        revenueType: "dynamic",
        staticRevenueAmount: 0,
        failureRevenueAmount: 0,
        convertOn: "Call Successfully Connected",
        startCallLengthOn: "Incoming",
        callLengthValueType: "Dynamic",
        maxDynamicDuration: 0,
        minimumRevenueAmount: 20,
        
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
        httpMethod: "POST",
        contentType: "application/json",
        requestBody: "",
        authentication: "Choose Authentication",
        authToken: "",
        bidAmountPath: "",
        destinationNumberPath: "",
        acceptancePath: "",
        acceptanceParsing: "",
        currencyPath: "",
        durationPath: "",
        responseParserType: "json_path",
        javascriptParser: "",
        dynamicNumberParser: "",
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

        restrictDuplicates: data.restrictDuplicates !== "Buyer Settings (Do not Restrict)",
        disableRecordings: data.disableRecordings,
        priorityBumpValue: data.priorityBump,
      });
    } catch (error) {

      // Error handling is done by the parent component's mutation
      // This catch prevents unhandled promise rejections
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible">
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
              <TabsList className={`grid w-full ${form.watch("rtbShareableTags") ? 'grid-cols-6' : 'grid-cols-7'}`}>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="caps">Cap Settings</TabsTrigger>
                <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
                <TabsTrigger value="routing">Routing</TabsTrigger>
                <TabsTrigger value="revenue">Revenue Settings</TabsTrigger>
                {!form.watch("rtbShareableTags") && (
                  <TabsTrigger value="request">Request</TabsTrigger>
                )}
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
                            <FormLabel className="flex items-center gap-2">
                              Name <span className="text-red-500">*</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Unique identifier for this RTB target. This name will appear in reports and analytics.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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
                            <FormLabel className="flex items-center gap-2">
                              Sub ID
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Optional secondary identifier for tracking or organization purposes.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Optional sub ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Company Name
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Select the buyer company that will receive RTB requests.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingBuyers ? "Loading buyers..." : "Select a buyer company"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {buyers.length === 0 && !loadingBuyers ? (
                                    <SelectItem value="no-buyers" disabled>
                                      No buyers available - create buyers first
                                    </SelectItem>
                                  ) : (
                                    buyers.map((buyer) => (
                                      <SelectItem key={buyer.id} value={buyer.companyName || buyer.name || `Buyer ${buyer.id}`}>
                                        {buyer.companyName || buyer.name || `Buyer ${buyer.id}`}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Contact Person
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Main contact person for this RTB target for technical or business communications.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Primary contact name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Contact Email
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Email address for technical support, notifications, and billing issues.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Contact Phone
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Phone number for urgent technical issues or emergency contact.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+1-555-123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="enableDynamicNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Dynamic Number/SIP
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Enable dynamic number insertion and SIP routing for advanced call handling.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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
                            <FormLabel className="flex items-center gap-2">
                              RTB Shareable Tags
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Allow sharing of RTB tags and parameters with external bidding partners. When enabled, Request Settings section becomes unavailable.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
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

                      {/* RTB Configuration - Show only when RTB Shareable Tags is enabled */}
                      {form.watch("rtbShareableTags") && (
                        <div className="space-y-4 mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">RTB Configuration</h4>
                            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                              Request Settings disabled
                            </div>
                          </div>
                          
                          {/* Share Inbound Call ID */}
                          <FormField
                            control={form.control}
                            name="shareInboundCallId"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm flex items-center gap-2">
                                    Share Inbound Call ID
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Send the Call ID for each incoming call to the Buyer via [tag:user:publisherInboundCallId]</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Send unique Call ID to Buyer for each incoming call
                                  </p>
                                </div>
                                <FormControl>
                                  <ToggleSwitch
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                    size="sm"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Expose Caller ID */}
                          <FormField
                            control={form.control}
                            name="exposeCallerId"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm flex items-center gap-2">
                                    Expose Caller ID
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Expose caller ID to Buyer in multiple tags including inbound number, prefix, and suffix</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Share caller's phone number with Buyer in bidding process
                                  </p>
                                </div>
                                <FormControl>
                                  <ToggleSwitch
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                    size="sm"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* RTB ID */}
                          <FormField
                            control={form.control}
                            name="rtbId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm">
                                  RTB ID
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Long hexadecimal RTB ID provided by your Buyer (e.g., 1c22a98c60a74cf38944c0cc77eb0t12)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <span className="text-xs text-red-500">Required</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="1c22a98c60a74cf38944c0cc77eb0t12"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="font-mono text-xs"
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  Extract from buyer's URL: between /production/ and .json
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Conditional Dynamic Number/SIP fields - only show when disabled */}
                    {!enableDynamicNumber && (
                      <div className="space-y-4 mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="dynamicNumberType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Type
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Choose between Number (phone number) or SIP (Session Initiation Protocol) routing.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex gap-2 max-w-xs">
                                    <Button
                                      type="button"
                                      variant={field.value === "Number" ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => field.onChange("Number")}
                                      className="flex-1"
                                    >
                                      Number
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={field.value === "SIP" ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => field.onChange("SIP")}
                                      className="flex-1"
                                    >
                                      SIP
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {dynamicNumberType === "Number" ? (
                            <FormField
                              control={form.control}
                              name="dynamicNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Number
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>The phone number that will be dynamically assigned for this target.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <span className="text-xs text-muted-foreground ml-auto">Required</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <Input 
                                        placeholder="+1-555-123-4567"
                                        {...field} 
                                        className="flex-1"
                                      />
                                      <Button type="button" variant="outline" size="sm">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="sipEndpoint"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      SIP Endpoint
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>The SIP server endpoint for routing calls.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <span className="text-xs text-muted-foreground ml-auto">Required</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="sip.example.com"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="sipUsername"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      SIP Username
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Username for SIP authentication.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="username"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="sipPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      SIP Password
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Password for SIP authentication.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="password"
                                        placeholder="Password"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="connectionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Connection Timeout (ms)
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Maximum time to wait for bid response from this target (1000-30000ms). Lower values improve auction speed.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Search Timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UTC-08:00">UTC-08:00 (Pacific Standard Time)</SelectItem>
                              <SelectItem value="UTC-07:00">UTC-07:00 (Mountain Standard Time)</SelectItem>
                              <SelectItem value="UTC-06:00">UTC-06:00 (Central Standard Time)</SelectItem>
                              <SelectItem value="UTC-05:00">UTC-05:00 (Eastern Standard Time)</SelectItem>
                              <SelectItem value="UTC-04:00">UTC-04:00 (Atlantic Standard Time)</SelectItem>
                              <SelectItem value="UTC-03:00">UTC-03:00 (Brazil Time)</SelectItem>
                              <SelectItem value="UTC-02:00">UTC-02:00 (South Georgia Time)</SelectItem>
                              <SelectItem value="UTC-01:00">UTC-01:00 (Azores Time)</SelectItem>
                              <SelectItem value="UTC+00:00">UTC+00:00 (Greenwich Mean Time)</SelectItem>
                              <SelectItem value="UTC+01:00">UTC+01:00 (Central European Time)</SelectItem>
                              <SelectItem value="UTC+02:00">UTC+02:00 (Eastern European Time)</SelectItem>
                              <SelectItem value="UTC+03:00">UTC+03:00 (Moscow Standard Time)</SelectItem>
                              <SelectItem value="UTC+04:00">UTC+04:00 (Gulf Standard Time)</SelectItem>
                              <SelectItem value="UTC+05:00">UTC+05:00 (Pakistan Standard Time)</SelectItem>
                              <SelectItem value="UTC+06:00">UTC+06:00 (Bangladesh Standard Time)</SelectItem>
                              <SelectItem value="UTC+07:00">UTC+07:00 (Indochina Time)</SelectItem>
                              <SelectItem value="UTC+08:00">UTC+08:00 (China Standard Time)</SelectItem>
                              <SelectItem value="UTC+09:00">UTC+09:00 (Japan Standard Time)</SelectItem>
                              <SelectItem value="UTC+10:00">UTC+10:00 (Australian Eastern Time)</SelectItem>
                              <SelectItem value="UTC+11:00">UTC+11:00 (Solomon Islands Time)</SelectItem>
                              <SelectItem value="UTC+12:00">UTC+12:00 (New Zealand Standard Time)</SelectItem>
                              <SelectItem value="UTC+13:00">UTC+13:00 (Tonga Time)</SelectItem>
                              <SelectItem value="UTC+14:00">UTC+14:00 (Line Islands Time)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


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

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Predictive Routing Configuration
                      </h4>
                      <FormField
                        control={form.control}
                        name="predictiveRoutingConfigId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Configuration
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Select a predictive routing configuration to apply intelligent call routing based on target performance and priority settings.</p>
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <div className="flex gap-2">
                              <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select configuration..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Configuration</SelectItem>
                                  {loadingConfigs ? (
                                    <SelectItem value="loading" disabled>Loading configurations...</SelectItem>
                                  ) : Array.isArray(predictiveRoutingConfigs) && predictiveRoutingConfigs.length > 0 ? (
                                    predictiveRoutingConfigs.map((config: any) => (
                                      <SelectItem key={config.id} value={config.id.toString()}>
                                        {config.name} ({config.type})
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="notfound" disabled>No configurations found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Open predictive routing settings in new tab
                                  window.open('/settings/predictive-routing', '_blank');
                                }}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                NEW
                              </Button>
                            </div>
                            <FormDescription>
                              Choose a predictive routing configuration or create a new one. This determines how calls are intelligently routed based on target performance.
                              {!loadingConfigs && Array.isArray(predictiveRoutingConfigs) && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({predictiveRoutingConfigs.length} configurations available)
                                </span>
                              )}
                            </FormDescription>
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

              {/* Revenue Settings Tab */}
              <TabsContent value="revenue" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Revenue Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Conversion Settings */}
                    <FormField
                      control={form.control}
                      name="conversionSettings"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              Conversion Settings
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Configure how conversions are tracked and calculated for this target.</p>
                                </TooltipContent>
                              </Tooltip>
                            </h4>
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant={field.value === "use_ring_tree" ? "default" : "outline"}
                                size="sm" 
                                className={field.value === "use_ring_tree" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                onClick={() => field.onChange("use_ring_tree")}
                              >
                                Use Ring Tree Settings
                              </Button>
                              <Button 
                                type="button" 
                                variant={field.value === "override" ? "default" : "outline"}
                                size="sm"
                                className={field.value === "override" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                onClick={() => field.onChange("override")}
                              >
                                Override
                              </Button>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Override Settings - Show only when Override is selected */}
                    {form.watch("conversionSettings") === "override" && (
                      <div className="space-y-6 pl-4 border-l-2 border-blue-200">
                        {/* Revenue Type */}
                        <FormField
                          control={form.control}
                          name="revenueType"
                          render={({ field }) => (
                            <FormItem>
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                  Revenue Type
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Choose between dynamic revenue calculation or static fixed amounts.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </h4>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button" 
                                    variant={field.value === "dynamic" ? "default" : "outline"}
                                    size="sm" 
                                    className={field.value === "dynamic" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    onClick={() => field.onChange("dynamic")}
                                  >
                                    Dynamic
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant={field.value === "static" ? "default" : "outline"}
                                    size="sm"
                                    className={field.value === "static" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    onClick={() => field.onChange("static")}
                                  >
                                    Static
                                  </Button>
                                </div>
                              </div>
                            </FormItem>
                          )}
                        />

                        {/* Static Revenue Amount - Show only when Static is selected */}
                        {form.watch("revenueType") === "static" && (
                          <FormField
                            control={form.control}
                            name="staticRevenueAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Static Revenue Amount
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Fixed revenue amount for static revenue calculation.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">$</span>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0"
                                      placeholder="0"
                                      value={field.value?.toString() || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === "" ? 0 : parseFloat(value) || 0);
                                      }}
                                      className="w-24"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Failure Revenue Amount */}
                        <FormField
                          control={form.control}
                          name="failureRevenueAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Failure Revenue Amount
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Revenue amount assigned when call fails to convert.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">$</span>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value={field.value?.toString() || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value === "" ? 0 : parseFloat(value) || 0);
                                    }}
                                    className="w-24"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Convert On */}
                        <FormField
                          control={form.control}
                          name="convertOn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Convert On
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Define what event triggers a conversion for revenue calculation.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-64">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Call Successfully Connected">Call Successfully Connected</SelectItem>
                                  <SelectItem value="Call Length">Call Length</SelectItem>
                                  <SelectItem value="Postback/Webhook">Postback/Webhook</SelectItem>
                                  <SelectItem value="Dialed">Dialed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Call Length Configuration - Show only when "Call Length" is selected */}
                        {form.watch("convertOn") === "Call Length" && (
                          <div className="space-y-6 pl-4 border-l-2 border-blue-200">
                            {/* Start Call Length On */}
                            <FormField
                              control={form.control}
                              name="startCallLengthOn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Start Call Length On
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Choose when to start counting the call length for conversion calculation.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </FormLabel>
                                  <div className="flex gap-2">
                                    <Button 
                                      type="button" 
                                      variant={field.value === "Incoming" ? "default" : "outline"}
                                      size="sm" 
                                      className={field.value === "Incoming" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                      onClick={() => field.onChange("Incoming")}
                                    >
                                      Incoming
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant={field.value === "Dial" ? "default" : "outline"}
                                      size="sm"
                                      className={field.value === "Dial" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                      onClick={() => field.onChange("Dial")}
                                    >
                                      Dial
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant={field.value === "Connect" ? "default" : "outline"}
                                      size="sm"
                                      className={field.value === "Connect" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                      onClick={() => field.onChange("Connect")}
                                    >
                                      Connect
                                    </Button>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Conversion call length value */}
                            <FormField
                              control={form.control}
                              name="callLengthValueType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Conversion call length value
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Choose between dynamic call length calculation or static fixed duration.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </FormLabel>
                                  <div className="flex gap-2">
                                    <Button 
                                      type="button" 
                                      variant={field.value === "Dynamic" ? "default" : "outline"}
                                      size="sm" 
                                      className={field.value === "Dynamic" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                      onClick={() => field.onChange("Dynamic")}
                                    >
                                      Dynamic
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant={field.value === "Static" ? "default" : "outline"}
                                      size="sm"
                                      className={field.value === "Static" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                      onClick={() => field.onChange("Static")}
                                    >
                                      Static
                                    </Button>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Dynamic Duration Configuration */}
                            {form.watch("callLengthValueType") === "Dynamic" && (
                              <FormField
                                control={form.control}
                                name="maxDynamicDuration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      Max dynamic duration
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>The maximum accepted dynamic call duration, in seconds. If the ping response requires a higher call duration for conversion, the ping will be ignored.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </FormLabel>
                                    <FormControl>
                                      <div className="flex items-center gap-2">
                                        <Input 
                                          type="number" 
                                          step="1"
                                          min="0"
                                          placeholder=""
                                          value={field.value && field.value > 0 ? field.value.toString() : ""}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? null : parseInt(value) || null);
                                          }}
                                          className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                          {!field.value || field.value === 0 ? "unlimited" : "seconds"}
                                        </span>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {/* Static Duration Configuration */}
                            {form.watch("callLengthValueType") === "Static" && (
                              <FormField
                                control={form.control}
                                name="staticCallLength"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                      Length
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Fixed call duration in seconds required for conversion.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="1"
                                        min="1"
                                        placeholder="30"
                                        value={field.value?.toString() || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          field.onChange(value === "" ? 30 : parseInt(value) || 30);
                                        }}
                                        className="w-24"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Minimum Revenue Amount */}
                    <FormField
                      control={form.control}
                      name="minimumRevenueSettings"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              Minimum Revenue Amount
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Set minimum revenue threshold for this target.</p>
                                </TooltipContent>
                              </Tooltip>
                            </h4>
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant={field.value === "use_ring_tree" ? "default" : "outline"}
                                size="sm" 
                                className={field.value === "use_ring_tree" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                onClick={() => field.onChange("use_ring_tree")}
                              >
                                Use Ring Tree Settings
                              </Button>
                              <Button 
                                type="button" 
                                variant={field.value === "override" ? "default" : "outline"}
                                size="sm"
                                className={field.value === "override" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                onClick={() => field.onChange("override")}
                              >
                                Override
                              </Button>
                            </div>

                            {/* Override - Minimum Revenue Amount Input */}
                            {field.value === "override" && (
                              <FormField
                                control={form.control}
                                name="minimumRevenueAmount"
                                render={({ field: amountField }) => (
                                  <FormItem>
                                    <FormControl>
                                      <div className="flex items-center gap-2 mt-4">
                                        <span className="text-sm">$</span>
                                        <Input 
                                          type="number" 
                                          step="0.01"
                                          min="0"
                                          placeholder="20"
                                          value={amountField.value?.toString() || ""}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            amountField.onChange(value === "" ? 0 : parseFloat(value) || 0);
                                          }}
                                          className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground italic">Required</span>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Request Settings Tab - Hidden when RTB Shareable Tags is enabled */}
              {!form.watch("rtbShareableTags") && (
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <FormLabel>Request Body Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder='{"requestId": "{requestId}", "campaignId": "{campaignId}", "callerId": "{callerId}", "callStartTime": "{callStartTime}", "minBid": {minBid}, "maxBid": {maxBid}, "currency": "{currency}"}'
                              className="min-h-[120px] font-mono text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Use template variables: {"{requestId}"}, {"{campaignId}"}, {"{callerId}"}, {"{callStartTime}"}, {"{minBid}"}, {"{maxBid}"}, {"{currency}"}
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
              )}

              {/* Response Parsing Tab */}
              <TabsContent value="parsing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Response Field Mapping
                    </CardTitle>
                    <CardDescription>
                      Configure how to extract data from different response formats using JSONPath expressions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {form.watch("responseParserType") === "json_path" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bidAmountPath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bid Amount Path</FormLabel>
                            <FormControl>
                              <Input placeholder="bidAmount or $.bid.amount" {...field} />
                            </FormControl>
                            <FormDescription>
                              JSONPath to extract bid amount from response
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="destinationNumberPath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination Number Path</FormLabel>
                            <FormControl>
                              <Input placeholder="destinationNumber or $.routing.phone" {...field} />
                            </FormControl>
                            <FormDescription>
                              JSONPath to extract destination phone number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="acceptancePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acceptance Path</FormLabel>
                            <FormControl>
                              <Input placeholder="accepted or $.status.accepted" {...field} />
                            </FormControl>
                            <FormDescription>
                              JSONPath to check if bid is accepted
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="currencyPath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency Path</FormLabel>
                            <FormControl>
                              <Input placeholder="currency or $.bid.currency" {...field} />
                            </FormControl>
                            <FormDescription>
                              JSONPath to extract currency code
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="durationPath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration Path</FormLabel>
                            <FormControl>
                              <Input placeholder="duration or $.requirements.duration" {...field} />
                            </FormControl>
                            <FormDescription>
                              JSONPath to extract required call duration
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Advanced Response Parsing
                    </CardTitle>
                    <CardDescription>
                      Choose parsing method and configure custom acceptance logic
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="responseParserType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Parser Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "json_path"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="json_path">JSONPath (Simple)</SelectItem>
                              <SelectItem value="javascript">JavaScript (Advanced)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Use JSONPath for simple field extraction or JavaScript for complex logic
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("responseParserType") === "javascript" && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="dynamicBidParser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Dynamic Bid Parsing (Required)
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>JavaScript function to extract bid amount from RTB response. 
                                    Use 'input' variable for the response data. Must return numeric bid amount.</p>
                                    <p className="mt-1 text-xs">Example: function(input) &#123;return JSON.parse(input).bidAmount;&#125;</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="function(input) {return JSON.parse(input).bidAmount;}"
                                  className="font-mono text-sm min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                JavaScript function to extract bid amount from response.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="javascriptParser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Call Acceptance Parsing (Required)
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>JavaScript function to determine if the buyer accepts the call. 
                                    Use 'input' variable for the response data. Must return true/false.</p>
                                    <p className="mt-1 text-xs">Example: function(input) &#123;return JSON.parse(input).bidAmount &gt; 0;&#125;</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="function(input) {return JSON.parse(input).bidAmount > 0;}"
                                  className="font-mono text-sm min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                JavaScript function to evaluate buyer acceptance. Must return true/false.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dynamicNumberParser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Dynamic Number/SIP Parsing (Required)
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>JavaScript function to extract phone number from RTB response. 
                                    Use 'input' variable for the response data. Must return phone number string.</p>
                                    <p className="mt-1 text-xs">Example: function(input) &#123;return JSON.parse(input).phoneNumber;&#125;</p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="function(input) {return JSON.parse(input).phoneNumber;}"
                                  className="font-mono text-sm min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                JavaScript function to extract destination phone number from response.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
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
    </TooltipProvider>
  );
}