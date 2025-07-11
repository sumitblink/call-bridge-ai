import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertCampaignSchema, type Campaign, type InsertCampaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";

const campaignFormSchema = insertCampaignSchema.extend({
  name: insertCampaignSchema.shape.name.min(1, "Name is required"),
  description: insertCampaignSchema.shape.description.optional(),
}).omit({
  userId: true,
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignSettingsProps {
  campaignId: number;
  campaign: Campaign;
}

export default function CampaignSettings({ campaignId, campaign }: CampaignSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: validation } = useCampaignValidation(campaignId);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: campaign?.name || "",
      description: campaign?.description || "",
      phoneNumber: campaign?.phoneNumber || "",
      poolId: campaign?.poolId || null,
      callCap: campaign?.callCap || 100,
      routingType: campaign?.routingType || "direct",
      callRoutingStrategy: campaign?.callRoutingStrategy || "priority",
      status: campaign?.status || "draft",
    },
  });

  // Fetch available phone numbers
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["/api/phone-numbers"],
    queryFn: async () => {
      const response = await fetch("/api/phone-numbers");
      return response.json();
    },
  });

  // Fetch available pools (excluding those already assigned to other campaigns)
  const { data: numberPools = [] } = useQuery({
    queryKey: ["/api/number-pools", "available", campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools?available=true&excludeCampaign=${campaignId}`);
      return response.json();
    },
  });

  // Watch routing type to handle conditional fields
  const watchedRoutingType = form.watch("routingType");

  // Handle routing type changes - clear conflicting fields
  React.useEffect(() => {
    if (watchedRoutingType === "direct") {
      // Clear pool ID when switching to direct routing
      if (form.formState.isDirty) {
        form.setValue("poolId", null);
      }
    } else if (watchedRoutingType === "pool") {
      // Clear phone number when switching to pool routing
      if (form.formState.isDirty) {
        form.setValue("phoneNumber", "");
      }
    }
  }, [watchedRoutingType, form]);

  // Reset form when campaign data changes
  React.useEffect(() => {
    if (campaign && typeof campaign === 'object' && !Array.isArray(campaign)) {
      const formData = {
        name: campaign.name || "",
        description: campaign.description || "",
        phoneNumber: campaign.phoneNumber || "",
        poolId: campaign.poolId || null,
        callCap: campaign.callCap || 100,
        routingType: campaign.routingType || "direct",
        callRoutingStrategy: campaign.callRoutingStrategy || "priority",
        status: campaign.status || "draft",
      };
      form.reset(formData);
    }
  }, [campaign, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await apiRequest(`/api/campaigns/${campaignId}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      toast({
        title: "Success",
        description: "Campaign settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    // Clean up data based on routing type
    const cleanedData = { ...data };
    
    if (data.routingType === "direct") {
      // Clear poolId when using direct routing
      cleanedData.poolId = null;
    } else if (data.routingType === "pool") {
      // Clear phoneNumber when using pool routing
      cleanedData.phoneNumber = "";
    }
    
    // Prevent activating incomplete campaigns
    if (data.status === "active" && validation && !validation.canActivate) {
      toast({
        title: "Cannot Activate Campaign",
        description: "Please complete all required setup steps before activating.",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate(cleanedData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure basic campaign information and routing preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem 
                            value="active"
                            disabled={validation && !validation.canActivate}
                          >
                            Active {validation && !validation.canActivate && "(Setup Required)"}
                          </SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {validation && !validation.canActivate && field.value === "active" && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Campaign cannot be activated. Complete all required setup steps first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="routingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call Routing Configuration</FormLabel>
                        <div className="text-sm text-muted-foreground mb-3">
                          Choose how incoming calls will be routed. These options are mutually exclusive.
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-4"
                          >
                            <div className="flex items-center space-x-2 p-3 border rounded-lg">
                              <RadioGroupItem value="direct" id="direct" />
                              <Label htmlFor="direct" className="flex-1">
                                <div className="font-medium">Direct Number</div>
                                <div className="text-sm text-muted-foreground">
                                  Use a single Twilio phone number for all calls. Best for simple campaigns.
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg">
                              <RadioGroupItem value="pool" id="pool" />
                              <Label htmlFor="pool" className="flex-1">
                                <div className="font-medium">Number Pool</div>
                                <div className="text-sm text-muted-foreground">
                                  Use dynamic number assignment from a pool for advanced tracking and attribution.
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditional fields based on routing type */}
                {watchedRoutingType === "direct" && (
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Phone Number</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a phone number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {phoneNumbers.map((phone: any) => (
                              <SelectItem 
                                key={phone.id} 
                                value={phone.phoneNumber}
                                disabled={phone.status === 'assigned' && phone.assignedTo !== campaign?.name}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{phone.phoneNumber} ({phone.friendlyName || phone.country})</span>
                                  <div className="flex items-center gap-2">
                                    {phone.status === 'available' && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        Available
                                      </span>
                                    )}
                                    {phone.status === 'assigned' && (
                                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                        {phone.assignedType === 'campaign' ? 'Campaign' : 'Pool'}: {phone.assignedTo}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedRoutingType === "pool" && (
                  <FormField
                    control={form.control}
                    name="poolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Number Pool</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                          value={field.value?.toString() || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a number pool" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No pool selected</SelectItem>
                            {numberPools.map((pool: any) => (
                              <SelectItem key={pool.id} value={pool.id.toString()}>
                                {pool.name} ({pool.poolSize} numbers)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedRoutingType === "direct" && (
                  <FormField
                    control={form.control}
                    name="callRoutingStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call Routing Strategy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select routing strategy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="priority">Priority Based</SelectItem>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="weighted">Weighted Distribution</SelectItem>
                            <SelectItem value="geo">Geographic</SelectItem>
                            <SelectItem value="time_based">Time Based</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="callCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Call Cap</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter campaign description" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}