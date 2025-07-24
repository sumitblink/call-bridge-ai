import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Link, Code, Settings, Download, Info, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Reserved column IDs that cannot be used as URL parameter names
const RESERVED_COLUMN_IDS = [
  'campaign', 'publisherName', 'target', 'buyer', 'callDate', 'callerId', 'dialedNumber', 
  'duration', 'status', 'actions', 'fromNumber', 'toNumber', 'duplicate', 'previouslyConnected',
  'campaignId', 'buyerId', 'targetNumber', 'targetGroup', 'publisherId', 'numberPool', 'revenue',
  'profit', 'payout', 'timeToCall', 'timeToConnect', 'connectedCallLength', 'numberPoolId',
  'numberPoolUsed'
];

interface CampaignUrlParametersProps {
  campaignId?: string;
}

interface URLParameter {
  id: number;
  parameterName: string;
  reportingMenuName: string;
  reportName: string;
  parameterType: 'string' | 'integer' | 'decimal';
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignUrlParameters({ campaignId }: CampaignUrlParametersProps) {
  const [isUrlParameterDialogOpen, setIsUrlParameterDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<URLParameter | null>(null);
  const [selectedGlobalParameters, setSelectedGlobalParameters] = useState<number[]>([]);
  const [campaignParameterIds, setCampaignParameterIds] = useState<number[]>([]);
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingParameter, setSelectedExistingParameter] = useState<number | null>(null);
  const [urlParameterForm, setUrlParameterForm] = useState({
    parameterName: "",
    reportingMenuName: "",
    reportName: "",
    parameterType: "string" as 'string' | 'integer' | 'decimal',
    isRequired: false,
    defaultValue: "",
    description: "",
    isActive: true
  });

  const { toast } = useToast();

  // Fetch all URL Parameters from Integrations
  const { data: allUrlParameters = [], isLoading: isLoadingAllParameters } = useQuery<URLParameter[]>({
    queryKey: ['/api/integrations/url-parameters']
  });

  // Get campaign-specific parameter IDs from localStorage
  const getCampaignParameterIds = (): number[] => {
    if (!campaignId) return [];
    try {
      const stored = localStorage.getItem(`campaign_url_params_${campaignId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save campaign-specific parameter IDs to localStorage
  const saveCampaignParameterIds = (ids: number[]) => {
    if (!campaignId) return;
    try {
      localStorage.setItem(`campaign_url_params_${campaignId}`, JSON.stringify(ids));
      setCampaignParameterIds(ids);
    } catch (error) {
      console.error('Failed to save campaign parameter IDs');
    }
  };

  // Initialize campaign parameter IDs
  useEffect(() => {
    setCampaignParameterIds(getCampaignParameterIds());
  }, [campaignId]);

  // Filter parameters to show only those assigned to this campaign
  const urlParameters = allUrlParameters.filter(param => 
    campaignParameterIds.includes(param.id)
  );

  const resetUrlParameterForm = () => {
    setUrlParameterForm({
      parameterName: "",
      reportingMenuName: "",
      reportName: "",
      parameterType: "string",
      isRequired: false,
      defaultValue: "",
      description: "",
      isActive: true
    });
    setEditingItem(null);
    setCreateMode('new');
    setSelectedExistingParameter(null);
    setIsUrlParameterDialogOpen(false);
  };

  // Create URL Parameter Mutation
  const createUrlParameterMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/integrations/url-parameters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      
      // Auto-assign new parameter to this campaign
      if (response && response.id) {
        const newIds = [...campaignParameterIds, response.id];
        saveCampaignParameterIds(newIds);
      }
      
      resetUrlParameterForm();
      toast({
        title: "Success",
        description: "URL parameter created and added to campaign"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create URL parameter",
        variant: "destructive"
      });
    }
  });

  // Update URL Parameter Mutation
  const updateUrlParameterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      fetch(`/api/integrations/url-parameters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      resetUrlParameterForm();
      toast({
        title: "Success",
        description: "URL parameter updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update URL parameter",
        variant: "destructive"
      });
    }
  });

  // Delete URL Parameter Mutation
  const deleteUrlParameterMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/integrations/url-parameters/${id}`, {
      method: 'DELETE'
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      toast({
        title: "Success",
        description: "URL parameter deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete URL parameter",
        variant: "destructive"
      });
    }
  });

  const handleUrlParameterSubmit = async () => {
    if (createMode === 'existing') {
      // Add existing parameter to campaign
      if (!selectedExistingParameter) {
        toast({
          title: "Validation Error",
          description: "Please select a parameter to add",
          variant: "destructive"
        });
        return;
      }

      // Check if parameter already assigned to this campaign
      if (campaignParameterIds.includes(selectedExistingParameter)) {
        toast({
          title: "Already Added",
          description: "This parameter is already assigned to this campaign",
          variant: "destructive"
        });
        return;
      }

      // Add to campaign
      const newIds = [...campaignParameterIds, selectedExistingParameter];
      saveCampaignParameterIds(newIds);
      
      toast({
        title: "Success",
        description: "Parameter added to campaign successfully"
      });
      
      resetUrlParameterForm();
      return;
    }

    // Create new parameter mode
    if (!urlParameterForm.parameterName || !urlParameterForm.reportingMenuName || !urlParameterForm.reportName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check for reserved column names
    if (RESERVED_COLUMN_IDS.includes(urlParameterForm.parameterName.toLowerCase())) {
      toast({
        title: "Reserved Column Name",
        description: `"${urlParameterForm.parameterName}" is a built-in column name and cannot be used as a URL parameter. Please choose a different name.`,
        variant: "destructive"
      });
      return;
    }

    // Check for duplicates across ALL parameters (not just campaign-specific)
    const isDuplicateParameterName = allUrlParameters.some(param => 
      param.parameterName.toLowerCase() === urlParameterForm.parameterName.toLowerCase() && 
      (!editingItem || param.id !== editingItem.id)
    );
    
    const isDuplicateReportName = allUrlParameters.some(param => 
      param.reportName.toLowerCase() === urlParameterForm.reportName.toLowerCase() && 
      (!editingItem || param.id !== editingItem.id)
    );

    if (isDuplicateParameterName) {
      toast({
        title: "Duplicate Parameter",
        description: "A parameter with this name already exists",
        variant: "destructive"
      });
      return;
    }

    if (isDuplicateReportName) {
      toast({
        title: "Duplicate Report Name",
        description: "A parameter with this report name already exists",
        variant: "destructive"
      });
      return;
    }

    const data = {
      parameterName: urlParameterForm.parameterName,
      reportingMenuName: urlParameterForm.reportingMenuName,
      reportName: urlParameterForm.reportName,
      parameterType: urlParameterForm.parameterType,
      isRequired: urlParameterForm.isRequired,
      defaultValue: urlParameterForm.defaultValue || null,
      description: urlParameterForm.description || null,
      isActive: urlParameterForm.isActive
    };

    if (editingItem) {
      updateUrlParameterMutation.mutate({ id: editingItem.id, data });
    } else {
      createUrlParameterMutation.mutate(data);
    }
  };

  const handleEditUrlParameter = (parameter: URLParameter) => {
    setEditingItem(parameter);
    setUrlParameterForm({
      parameterName: parameter.parameterName,
      reportingMenuName: parameter.reportingMenuName,
      reportName: parameter.reportName,
      parameterType: parameter.parameterType,
      isRequired: parameter.isRequired,
      defaultValue: parameter.defaultValue || "",
      description: parameter.description || "",
      isActive: parameter.isActive
    });
    setIsUrlParameterDialogOpen(true);
  };

  const handleDeleteUrlParameter = (id: number) => {
    deleteUrlParameterMutation.mutate(id);
  };

  const handleRemoveFromCampaign = (parameterId: number) => {
    const newIds = campaignParameterIds.filter(id => id !== parameterId);
    saveCampaignParameterIds(newIds);
    toast({
      title: "Success",
      description: "Parameter removed from campaign"
    });
  };

  const generateSampleUrl = () => {
    const baseUrl = 'https://your-website.com/landing-page';
    const activeParams = urlParameters.filter(p => p.isActive);
    const sampleParams = activeParams.map(param => {
      const sampleValue = param.parameterType === 'integer' ? '123' : 
                         param.parameterType === 'decimal' ? '12.34' : 
                         'sample_value';
      return `${param.parameterName}=${sampleValue}`;
    }).join('&');
    
    return `${baseUrl}?${sampleParams}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Sample URL copied to clipboard'
    });
  };

  return (
    <div className="space-y-6">
      {/* Parameter Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>URL Parameters Configuration</CardTitle>
              <CardDescription>
                Configure which URL parameters to track and how they appear in reports
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isUrlParameterDialogOpen} onOpenChange={setIsUrlParameterDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    resetUrlParameterForm();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Edit URL Parameter' : 'Add URL Parameter'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? 'Edit existing parameter' : 'Add existing parameter or create a new one'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Mode Selection - only show when creating new */}
                    {!editingItem && (
                      <div>
                        <Label>Parameter Source</Label>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="create-new"
                              name="createMode"
                              value="new"
                              checked={createMode === 'new'}
                              onChange={(e) => setCreateMode(e.target.value as 'new' | 'existing')}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="create-new" className="cursor-pointer">Create New Parameter</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="use-existing"
                              name="createMode"
                              value="existing"
                              checked={createMode === 'existing'}
                              onChange={(e) => setCreateMode(e.target.value as 'new' | 'existing')}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="use-existing" className="cursor-pointer">Use Existing Parameter</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Existing Parameter Selection */}
                    {!editingItem && createMode === 'existing' && (
                      <div>
                        <Label htmlFor="existing-parameter">Select Parameter <span className="text-red-500">*</span></Label>
                        <Select 
                          value={selectedExistingParameter?.toString() || ""} 
                          onValueChange={(value) => setSelectedExistingParameter(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose from existing parameters..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allUrlParameters
                              .filter(param => !campaignParameterIds.includes(param.id))
                              .map(param => (
                                <SelectItem key={param.id} value={param.id.toString()}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{param.parameterName}</span>
                                    <span className="text-xs text-gray-500">{param.reportName} • {param.reportingMenuName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {allUrlParameters.filter(param => !campaignParameterIds.includes(param.id)).length === 0 && (
                          <span className="text-xs text-gray-500 mt-1">No available parameters to add</span>
                        )}
                      </div>
                    )}

                    {/* New Parameter Form - only show when creating new or editing */}
                    {(editingItem || createMode === 'new') && (
                      <div className="space-y-4">
                    <div>
                      <Label htmlFor="parameter-name">URL Parameter <span className="text-red-500">*</span></Label>
                      <Input
                        id="parameter-name"
                        placeholder="utm_campaign"
                        value={urlParameterForm.parameterName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, parameterName: e.target.value }))}
                        required
                        className={
                          urlParameterForm.parameterName && 
                          (urlParameters.find(param => 
                            param.parameterName.toLowerCase() === urlParameterForm.parameterName.toLowerCase() && 
                            (!editingItem || param.id !== editingItem.id)
                          ) || RESERVED_COLUMN_IDS.includes(urlParameterForm.parameterName.toLowerCase())) ? "border-red-500" : ""
                        }
                      />
                      {urlParameterForm.parameterName && 
                       urlParameters.find(param => 
                         param.parameterName.toLowerCase() === urlParameterForm.parameterName.toLowerCase() && 
                         (!editingItem || param.id !== editingItem.id)
                       ) ? (
                        <span className="text-xs text-red-500 mt-1">⚠️ Parameter name already exists</span>
                      ) : urlParameterForm.parameterName && 
                         RESERVED_COLUMN_IDS.includes(urlParameterForm.parameterName.toLowerCase()) ? (
                        <span className="text-xs text-red-500 mt-1">⚠️ Parameter name conflicts with built-in column</span>
                      ) : (
                        <span className="text-xs text-gray-500 mt-1">Required</span>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reporting-menu">Reporting Menu Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="reporting-menu"
                        placeholder="User"
                        value={urlParameterForm.reportingMenuName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, reportingMenuName: e.target.value }))}
                        required
                      />
                      <span className="text-xs text-gray-500 mt-1">Required</span>
                    </div>

                    <div>
                      <Label htmlFor="report-name">Report Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="report-name"
                        placeholder="Campaign Name"
                        value={urlParameterForm.reportName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, reportName: e.target.value }))}
                        required
                        className={
                          urlParameterForm.reportName && 
                          urlParameters.find(param => 
                            param.reportName.toLowerCase() === urlParameterForm.reportName.toLowerCase() && 
                            (!editingItem || param.id !== editingItem.id)
                          ) ? "border-red-500" : ""
                        }
                      />
                      {urlParameterForm.reportName && 
                       urlParameters.find(param => 
                         param.reportName.toLowerCase() === urlParameterForm.reportName.toLowerCase() && 
                         (!editingItem || param.id !== editingItem.id)
                       ) ? (
                        <span className="text-xs text-red-500 mt-1">⚠️ Report name already exists</span>
                      ) : (
                        <span className="text-xs text-gray-500 mt-1">Required - appears as column header</span>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="parameter-type">Parameter Type</Label>
                      <Select 
                        value={urlParameterForm.parameterType} 
                        onValueChange={(value: 'string' | 'integer' | 'decimal') => 
                          setUrlParameterForm(prev => ({ ...prev, parameterType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="integer">Integer</SelectItem>
                          <SelectItem value="decimal">Decimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Brief description of this parameter"
                        value={urlParameterForm.description}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-required"
                        checked={urlParameterForm.isRequired}
                        onCheckedChange={(checked) => setUrlParameterForm(prev => ({ ...prev, isRequired: checked }))}
                      />
                      <Label htmlFor="is-required">Required Parameter</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-active"
                        checked={urlParameterForm.isActive}
                        onCheckedChange={(checked) => setUrlParameterForm(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="is-active">Active</Label>
                    </div>
                      </div>
                    )}

                    <div className="flex justify-center space-x-3 pt-6">
                      <Button
                        onClick={handleUrlParameterSubmit}
                        disabled={createUrlParameterMutation.isPending || updateUrlParameterMutation.isPending}
                        className="px-8"
                      >
                        {editingItem ? 'UPDATE' : (createMode === 'existing' ? 'ADD TO CAMPAIGN' : 'CREATE')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsUrlParameterDialogOpen(false);
                          setEditingItem(null);
                          resetUrlParameterForm();
                        }}
                        className="px-8"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* URL Parameters Table */}
      <div className="bg-white rounded-lg border">
        {isLoadingAllParameters ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading URL parameters...</p>
          </div>
        ) : urlParameters.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No URL Parameters</h3>
            <p className="text-gray-600 mb-4">Configure URL parameters to track campaign data from traffic sources</p>
            <p className="text-sm text-gray-500">Examples: utm_campaign, utm_source, keyword, adgroup_id</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Column</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urlParameters.map((parameter) => (
                  <tr key={parameter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Code className="h-4 w-4 text-purple-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{parameter.parameterName}</div>
                          {parameter.description && (
                            <div className="text-sm text-gray-500">{parameter.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{parameter.reportingMenuName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{parameter.reportName}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">{parameter.parameterType}</Badge>
                      {parameter.isRequired && (
                        <Badge variant="destructive" className="ml-1">Required</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={parameter.isActive ? "default" : "secondary"}>
                        {parameter.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUrlParameter(parameter)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveFromCampaign(parameter.id)}
                        className="text-orange-600 hover:text-orange-700"
                        title="Remove from Campaign"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Information */}
      {urlParameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link className="h-5 w-5 mr-2" />
              Parameter Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              These parameters will be captured from campaign URLs and displayed in reports:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm mb-3">
              {generateSampleUrl()}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(generateSampleUrl())}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Sample URL
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Values will appear in reporting under the configured menu names and column headers.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}