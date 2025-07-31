import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Edit, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface PredictiveConfig {
  id: number;
  name: string;
  type: "basic" | "use_revenue" | "advanced";
  newTargetPriority: number; // -10 to 10 scale
  underperformingTargetPriority: number; // -10 to 10 scale  
  trainingRequirement: number; // -10 to 10 scale
  isActive: boolean;
  createdAt: string;
}

export default function PredictiveRoutingSettings() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PredictiveConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "basic" as "basic" | "use_revenue" | "advanced",
    newTargetPriority: 0,
    underperformingTargetPriority: 0,
    trainingRequirement: 0,
    isActive: true
  });

  // Fetch predictive routing configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["/api/settings/predictive-routing"],
    initialData: []
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest("/api/settings/predictive-routing", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/predictive-routing"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Configuration Created",
        description: "Predictive routing configuration has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create predictive routing configuration.",
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) => 
      apiRequest(`/api/settings/predictive-routing/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/predictive-routing"] });
      setEditingConfig(null);
      resetForm();
      toast({
        title: "Configuration Updated",
        description: "Predictive routing configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update predictive routing configuration.",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/settings/predictive-routing/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/predictive-routing"] });
      toast({
        title: "Configuration Deleted",
        description: "Predictive routing configuration has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete predictive routing configuration.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "basic",
      newTargetPriority: 0,
      underperformingTargetPriority: 0,
      trainingRequirement: 0,
      isActive: true
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEdit = (config: PredictiveConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      newTargetPriority: config.newTargetPriority,
      underperformingTargetPriority: config.underperformingTargetPriority,
      trainingRequirement: config.trainingRequirement,
      isActive: config.isActive
    });
  };

  const handleSubmit = () => {
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const getSliderValue = (value: number) => {
    if (value < -3) return "Low";
    if (value > 3) return "High"; 
    return "Default";
  };

  const getSliderColor = (value: number) => {
    if (value < -3) return "from-blue-500 to-blue-600";
    if (value > 3) return "from-green-500 to-green-600";
    return "from-gray-400 to-gray-500";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Predictive Routing
            </h1>
            <p className="text-gray-600 mt-1">
              Manage predictive routing configurations for intelligent call distribution
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            CREATE CONFIGURATION
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Predictive Routing Configurations</CardTitle>
            <CardDescription>
              Create and manage configurations for predictive call routing and target prioritization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading configurations...</span>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No predictive routing configurations found</p>
                <Button onClick={handleCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Configuration
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config: PredictiveConfig) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <Badge variant={config.type === "use_revenue" ? "default" : "secondary"}>
                          {config.type === "use_revenue" ? "Use Revenue" : "Advanced"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(config.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConfigMutation.mutate(config.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Configuration Dialog */}
        <Dialog open={isCreateDialogOpen || editingConfig !== null} onOpenChange={() => {
          setIsCreateDialogOpen(false);
          setEditingConfig(null);
          resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Configuration" : "Predictive Routing"}
              </DialogTitle>
              <DialogDescription>
                Configure predictive routing settings for intelligent call distribution
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Configuration Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Configuration name"
                />
              </div>

              {/* Toggle Switches - Use Revenue and Advanced */}  
              <div className="flex items-center justify-end gap-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="use-revenue">Use Revenue</Label>
                  <Switch
                    id="use-revenue"
                    checked={formData.type === "use_revenue"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({ ...prev, type: "use_revenue" }));
                      } else {
                        setFormData(prev => ({ ...prev, type: "basic" }));
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="advanced">Advanced</Label>
                  <Switch
                    id="advanced"
                    checked={formData.type === "advanced"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({ ...prev, type: "advanced" }));
                      } else {
                        setFormData(prev => ({ ...prev, type: "basic" }));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Basic Mode - Show sliders when neither Use Revenue nor Advanced is ON */}
              {formData.type === "basic" && (
                <div className="space-y-6">
                  {/* New Target Priority Slider */}
                  <div className="space-y-3">
                    <Label>New Target Priority</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Default</span>
                        <span>High</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={formData.newTargetPriority}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTargetPriority: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-muted-foreground">
                        Default ({formData.newTargetPriority > 0 ? '+' : ''}{formData.newTargetPriority})
                      </div>
                    </div>
                  </div>

                  {/* Underperforming Target Priority Slider */}
                  <div className="space-y-3">
                    <Label>Underperforming Target Priority</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Default</span>
                        <span>High</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={formData.underperformingTargetPriority}
                        onChange={(e) => setFormData(prev => ({ ...prev, underperformingTargetPriority: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-muted-foreground">
                        Default ({formData.underperformingTargetPriority > 0 ? '+' : ''}{formData.underperformingTargetPriority})
                      </div>
                    </div>
                  </div>

                  {/* Training Requirement Slider */}
                  <div className="space-y-3">
                    <Label>Training Requirement</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Less Calls</span>
                        <span>Default</span>
                        <span>More Calls</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={formData.trainingRequirement}
                        onChange={(e) => setFormData(prev => ({ ...prev, trainingRequirement: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-muted-foreground">
                        Default ({formData.trainingRequirement > 0 ? '+' : ''}{formData.trainingRequirement})
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Settings - Only show when Advanced is ON */}
              {formData.type === "advanced" && (
                <div className="space-y-6">
                  {/* Tracking Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Tracking Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Count Attempts</Label>
                        <select className="w-full border rounded px-3 py-2 bg-background">
                          <option>On Dial</option>
                          <option>On Answer</option>
                          <option>On Conversion</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Track Connections by</Label>
                        <select className="w-full border rounded px-3 py-2 bg-background">
                          <option>Buyer</option>
                          <option>Target</option>
                          <option>Campaign and Buyer</option>
                          <option>Campaign and Target</option>
                          <option>Publisher, Campaign and Buyer</option>
                          <option>Publisher, Campaign and Target</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Call Filter Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Call Filter Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Number of Calls</Label>
                        <Input
                          type="number"
                          defaultValue="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Desired Number of Calls</Label>
                        <Input
                          type="number"
                          defaultValue="75"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Number of Hours</Label>
                        <Input
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Desired Number of Hours</Label>
                        <Input
                          type="number"
                          defaultValue="720"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Skip Latest Hours</Label>
                        <Input
                          type="number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Priority Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Priority Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>New Targets</Label>
                        <Input
                          type="number"
                          defaultValue="47"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Underperforming Targets</Label>
                        <Input
                          type="number"
                          defaultValue="10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Active Configuration</div>
                  <div className="text-sm text-muted-foreground">
                    Enable this configuration for use in campaigns
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingConfig(null);
                  resetForm();
                }}
              >
                CANCEL
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createConfigMutation.isPending || updateConfigMutation.isPending || !formData.name.trim()}
              >
                {createConfigMutation.isPending || updateConfigMutation.isPending ? "Saving..." : "CREATE"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}