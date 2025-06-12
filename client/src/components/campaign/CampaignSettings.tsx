import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { insertCampaignSchema, type Campaign, type InsertCampaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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

  console.log("CampaignSettings - campaign data:", campaign);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: campaign?.name || "",
      description: campaign?.description || "",
      phoneNumber: campaign?.phoneNumber || "",
      callCap: campaign?.callCap || 100,
      routingType: campaign?.routingType || "round_robin",
      status: campaign?.status || "draft",
    },
  });

  // Reset form when campaign data changes
  React.useEffect(() => {
    console.log("CampaignSettings - useEffect triggered with campaign:", campaign);
    if (campaign) {
      const formData = {
        name: campaign.name || "",
        description: campaign.description || "",
        phoneNumber: campaign.phoneNumber || "",
        callCap: campaign.callCap || 100,
        routingType: campaign.routingType || "round_robin",
        status: campaign.status || "draft",
      };
      console.log("CampaignSettings - resetting form with data:", formData);
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
    updateMutation.mutate(data);
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="routingType"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Routing Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select routing type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                          <SelectItem value="priority">Priority Based</SelectItem>
                          <SelectItem value="weighted">Weighted Distribution</SelectItem>
                          <SelectItem value="least_busy">Least Busy</SelectItem>
                        </SelectContent>
                      </Select>
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