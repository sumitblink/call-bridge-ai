import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ExternalLink, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// RedTrack configuration schema
const redtrackConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required').url('Must be a valid URL'),
  postbackUrl: z.string().min(1, 'Postback URL is required').url('Must be a valid URL'),
  apiKey: z.string().optional(),
  campaignId: z.string().optional(),
  offerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type RedtrackConfigFormData = z.infer<typeof redtrackConfigSchema>;

interface RedtrackConfig {
  id: number;
  userId: number;
  name: string;
  domain: string;
  postbackUrl: string;
  apiKey?: string;
  campaignId?: string;
  offerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export function RedtrackConfigManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RedtrackConfig | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch RedTrack configurations
  const { data: configs = [], isLoading } = useQuery<RedtrackConfig[]>({
    queryKey: ['/api/redtrack/configs'],
  });

  // Create configuration mutation
  const createMutation = useMutation({
    mutationFn: (data: RedtrackConfigFormData) =>
      apiRequest('/api/redtrack/configs', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/redtrack/configs'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'RedTrack configuration created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create configuration',
        variant: 'destructive',
      });
    },
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RedtrackConfigFormData> }) =>
      apiRequest(`/api/redtrack/configs/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/redtrack/configs'] });
      setEditingConfig(null);
      toast({
        title: 'Success',
        description: 'RedTrack configuration updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration',
        variant: 'destructive',
      });
    },
  });

  // Delete configuration mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/redtrack/configs/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/redtrack/configs'] });
      toast({
        title: 'Success',
        description: 'RedTrack configuration deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete configuration',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<RedtrackConfigFormData>({
    resolver: zodResolver(redtrackConfigSchema),
    defaultValues: {
      name: '',
      domain: '',
      postbackUrl: '',
      apiKey: '',
      campaignId: '',
      offerId: '',
      isActive: true,
    },
  });

  const onSubmit = (data: RedtrackConfigFormData) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (config: RedtrackConfig) => {
    setEditingConfig(config);
    form.reset({
      name: config.name,
      domain: config.domain,
      postbackUrl: config.postbackUrl,
      apiKey: config.apiKey || '',
      campaignId: config.campaignId || '',
      offerId: config.offerId || '',
      isActive: config.isActive,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this RedTrack configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Loading RedTrack configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RedTrack Integration</h2>
          <p className="text-muted-foreground">
            Manage RedTrack configurations for clickid capture and postback attribution
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create RedTrack Configuration</DialogTitle>
              <DialogDescription>
                Set up a new RedTrack integration for campaign attribution
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My RedTrack Config" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RedTrack Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your.redtrack.domain" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your RedTrack tracking domain URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postbackUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postback URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your.redtrack.domain/postback" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL where conversion events will be sent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="campaign123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="offer456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key (Optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Optional API key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Configuration</FormLabel>
                        <FormDescription>
                          Enable this RedTrack configuration for tracking
                        </FormDescription>
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Configuration'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No RedTrack Configurations</h3>
              <p className="text-muted-foreground mb-4">
                Create your first RedTrack configuration to start tracking conversions
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.name}
                      <Badge variant={config.isActive ? 'default' : 'secondary'}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{config.domain}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Postback URL:</span>
                    <p className="text-muted-foreground break-all">{config.postbackUrl}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Used:</span>
                    <p className="text-muted-foreground">
                      {config.lastUsed
                        ? new Date(config.lastUsed).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  {config.campaignId && (
                    <div>
                      <span className="font-medium">Campaign ID:</span>
                      <p className="text-muted-foreground">{config.campaignId}</p>
                    </div>
                  )}
                  {config.offerId && (
                    <div>
                      <span className="font-medium">Offer ID:</span>
                      <p className="text-muted-foreground">{config.offerId}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(config.domain, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open RedTrack
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit RedTrack Configuration</DialogTitle>
            <DialogDescription>
              Update your RedTrack integration settings
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My RedTrack Config" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RedTrack Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your.redtrack.domain" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postbackUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postback URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your.redtrack.domain/postback" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="campaignId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="campaign123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="offer456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Configuration</FormLabel>
                      <FormDescription>
                        Enable this RedTrack configuration for tracking
                      </FormDescription>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingConfig(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Configuration'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}