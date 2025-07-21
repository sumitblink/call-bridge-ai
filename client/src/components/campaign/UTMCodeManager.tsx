import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, ExternalLink, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

const utmCodeSchema = z.object({
  utmSource: z.string().min(1, "UTM source is required"),
  utmMedium: z.string().min(1, "UTM medium is required"),
  utmCampaign: z.string().min(1, "UTM campaign name is required"),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  codeId: z.string().min(1, "Code ID is required").regex(/^[a-zA-Z0-9_-]+$/, "Code ID must contain only letters, numbers, underscores, and hyphens"),
  description: z.string().optional(),
});

type UTMCodeFormData = z.infer<typeof utmCodeSchema>;

interface UTMCodeManagerProps {
  campaignId: number;
  campaignName: string;
}

export default function UTMCodeManager({ campaignId, campaignName }: UTMCodeManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: utmCodes, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/utm-codes`],
  });

  const createUtmCodeMutation = useMutation({
    mutationFn: (data: UTMCodeFormData) => 
      apiRequest(`/api/campaigns/${campaignId}/utm-codes`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/utm-codes`] });
      setIsDialogOpen(false);
      toast({ title: "UTM code created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating UTM code", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteUtmCodeMutation = useMutation({
    mutationFn: (utmCodeId: number) => 
      apiRequest(`/api/campaigns/${campaignId}/utm-codes/${utmCodeId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/utm-codes`] });
      toast({ title: "UTM code deleted successfully" });
    },
  });

  const form = useForm<UTMCodeFormData>({
    resolver: zodResolver(utmCodeSchema),
    defaultValues: {
      utmSource: '',
      utmMedium: 'cpc',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
      codeId: '',
      description: '',
    },
  });

  const onSubmit = (data: UTMCodeFormData) => {
    createUtmCodeMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const generateSampleUrl = (utm: any) => {
    const url = new URL('https://your-landing-page.com');
    url.searchParams.set('utm_source', utm.utm_source);
    url.searchParams.set('utm_medium', utm.utm_medium);
    url.searchParams.set('utm_campaign', utm.utm_campaign);
    if (utm.utm_content) url.searchParams.set('utm_content', utm.utm_content);
    if (utm.utm_term) url.searchParams.set('utm_term', utm.utm_term);
    return url.toString();
  };

  const generateCodeId = () => {
    const source = form.getValues('utmSource').substring(0, 3).toLowerCase();
    const medium = form.getValues('utmMedium').substring(0, 3).toLowerCase();
    const random = Math.random().toString(36).substring(2, 5);
    form.setValue('codeId', `${source}_${medium}_${random}`);
  };

  if (isLoading) {
    return <div>Loading UTM codes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Authorized UTM Codes
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add UTM Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create UTM Tracking Code</DialogTitle>
                  <DialogDescription>
                    Generate authorized UTM parameters for {campaignName}. Only these UTM combinations will be accepted for tracking.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="utmSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Source</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="google">Google</SelectItem>
                                  <SelectItem value="facebook">Facebook</SelectItem>
                                  <SelectItem value="instagram">Instagram</SelectItem>
                                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                                  <SelectItem value="twitter">Twitter</SelectItem>
                                  <SelectItem value="youtube">YouTube</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="direct">Direct</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="utmMedium"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Medium</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select medium" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cpc">CPC (Paid Search)</SelectItem>
                                  <SelectItem value="social">Social Media</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="organic">Organic Search</SelectItem>
                                  <SelectItem value="referral">Referral</SelectItem>
                                  <SelectItem value="display">Display</SelectItem>
                                  <SelectItem value="affiliate">Affiliate</SelectItem>
                                  <SelectItem value="video">Video</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="utmCampaign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UTM Campaign</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., summer_sale_2025" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="utmContent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Content (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., banner_ad" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="utmTerm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Term (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., social_advertising" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="codeId"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Code ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., fb_cpc_001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="outline" onClick={generateCodeId} className="mt-8">
                        Generate
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Describe this UTM code..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={createUtmCodeMutation.isPending}>
                        {createUtmCodeMutation.isPending ? "Creating..." : "Create UTM Code"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Only authorized UTM combinations will be accepted for tracking. Create UTM codes to whitelist specific traffic sources.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!utmCodes || utmCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No UTM codes created yet.</p>
              <p className="text-sm mt-2">Create your first UTM code to start tracking authorized traffic sources.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code ID</TableHead>
                  <TableHead>UTM Parameters</TableHead>
                  <TableHead>Sample URL</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utmCodes.map((utm: any) => (
                  <TableRow key={utm.id}>
                    <TableCell>
                      <div>
                        <Badge variant="outline">{utm.code_id}</Badge>
                        {utm.description && (
                          <p className="text-sm text-gray-500 mt-1">{utm.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div><strong>Source:</strong> {utm.utm_source}</div>
                        <div><strong>Medium:</strong> {utm.utm_medium}</div>
                        <div><strong>Campaign:</strong> {utm.utm_campaign}</div>
                        {utm.utm_content && <div><strong>Content:</strong> {utm.utm_content}</div>}
                        {utm.utm_term && <div><strong>Term:</strong> {utm.utm_term}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                          {generateSampleUrl(utm)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generateSampleUrl(utm))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <BarChart className="h-3 w-3 text-blue-500" />
                          {utm.clicks} clicks
                        </div>
                        <div>{utm.calls} calls</div>
                        {utm.last_used_at && (
                          <div className="text-gray-500">
                            Used: {new Date(utm.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteUtmCodeMutation.mutate(utm.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}