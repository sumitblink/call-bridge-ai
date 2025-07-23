import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Link, ExternalLink, Download, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';


interface CampaignUrlParametersProps {
  campaignId?: number;
}

interface UrlParameter {
  id: number;
  name: string;
  parameterName: string;
  reportingMenuName: string;
  reportName: string;
  parameterType: 'string' | 'integer' | 'decimal';
  required: boolean;
  active: boolean;
}

const DEFAULT_PARAMETERS: UrlParameter[] = [
  {
    id: 1,
    name: 'Campaign Source',
    parameterName: 'utm_source',
    reportingMenuName: 'Traffic Source',
    reportName: 'Source',
    parameterType: 'string',
    required: true,
    active: true
  },
  {
    id: 2,
    name: 'Campaign Medium',
    parameterName: 'utm_medium',
    reportingMenuName: 'Traffic Source',
    reportName: 'Medium',
    parameterType: 'string',
    required: true,
    active: true
  },
  {
    id: 3,
    name: 'Campaign Name',
    parameterName: 'utm_campaign',
    reportingMenuName: 'Campaign Performance',
    reportName: 'Campaign',
    parameterType: 'string',
    required: true,
    active: true
  },
  {
    id: 4,
    name: 'Campaign Content',
    parameterName: 'utm_content',
    reportingMenuName: 'Campaign Performance',
    reportName: 'Content',
    parameterType: 'string',
    required: false,
    active: true
  },
  {
    id: 5,
    name: 'Campaign Term',
    parameterName: 'utm_term',
    reportingMenuName: 'Campaign Performance',
    reportName: 'Keyword',
    parameterType: 'string',
    required: false,
    active: true
  }
];

const getParametersStorageKey = (campaignId?: number) => 
  campaignId ? `campaign_url_parameters_${campaignId}` : 'campaign_url_parameters_default';

export default function CampaignUrlParameters({ campaignId }: CampaignUrlParametersProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<UrlParameter | null>(null);
  const [parameters, setParameters] = useState<UrlParameter[]>(() => {
    // Load saved parameters from localStorage on initialization
    try {
      const storageKey = getParametersStorageKey(campaignId);
      const savedParameters = localStorage.getItem(storageKey);
      if (savedParameters) {
        return JSON.parse(savedParameters);
      }
    } catch (error) {
      console.log('Failed to load saved URL parameters');
    }
    return DEFAULT_PARAMETERS;
  });
  const [selectedGlobalParameters, setSelectedGlobalParameters] = useState<number[]>([]);
  const [formData, setFormData] = useState<{
    parameterName: string;
    reportingMenuName: string;
    reportName: string;
  }>({
    parameterName: '',
    reportingMenuName: '',
    reportName: ''
  });
  
  const { toast } = useToast();

  // Save parameters to localStorage whenever they change
  useEffect(() => {
    try {
      const storageKey = getParametersStorageKey(campaignId);
      localStorage.setItem(storageKey, JSON.stringify(parameters));
    } catch (error) {
      console.log('Failed to save URL parameters');
    }
  }, [parameters, campaignId]);

  // Fetch global URL parameters from Integrations
  const { data: globalParameters, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['/api/integrations/url-parameters'],
    retry: false,
  });

  const resetForm = () => {
    setFormData({
      parameterName: '',
      reportingMenuName: '',
      reportName: ''
    });
    setEditingParameter(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingParameter) {
      // Update existing parameter
      setParameters(prev => prev.map(param => 
        param.id === editingParameter.id 
          ? { 
              ...param, 
              name: formData.parameterName,
              parameterName: formData.parameterName,
              reportingMenuName: formData.reportingMenuName,
              reportName: formData.reportName
            }
          : param
      ));
      toast({
        title: 'Success',
        description: 'URL parameter updated successfully'
      });
    } else {
      // Create new parameter
      const newParameter: UrlParameter = {
        id: Date.now(),
        name: formData.parameterName,
        parameterName: formData.parameterName,
        reportingMenuName: formData.reportingMenuName,
        reportName: formData.reportName,
        parameterType: 'string',
        required: true,
        active: true
      };
      setParameters(prev => [...prev, newParameter]);
      toast({
        title: 'Success',
        description: 'URL parameter created successfully'
      });
    }
    
    resetForm();
  };

  const handleEdit = (parameter: UrlParameter) => {
    setEditingParameter(parameter);
    setFormData({
      parameterName: parameter.parameterName,
      reportingMenuName: parameter.reportingMenuName,
      reportName: parameter.reportName
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setParameters(prev => prev.filter(param => param.id !== id));
    toast({
      title: 'Success',
      description: 'URL parameter deleted successfully'
    });
  };

  const handleToggleActive = (id: number) => {
    setParameters(prev => prev.map(param => 
      param.id === id 
        ? { ...param, active: !param.active }
        : param
    ));
  };

  const generateSampleUrl = () => {
    const baseUrl = 'https://your-website.com/landing-page';
    const activeParams = parameters.filter(p => p.active);
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

  const handleImportParameters = () => {
    if (!globalParameters || !Array.isArray(globalParameters) || selectedGlobalParameters.length === 0) return;

    const parametersToImport = globalParameters.filter((param: any) => 
      selectedGlobalParameters.includes(param.id)
    );

    const highestId = Math.max(...parameters.map(p => p.id), 0);
    const newParameters = parametersToImport.map((param: any, index: number) => ({
      id: highestId + index + 1,
      name: param.parameterName,
      parameterName: param.parameterName,
      reportingMenuName: param.reportingMenuName,
      reportName: param.reportName,
      parameterType: param.parameterType,
      required: param.required,
      active: true
    }));

    setParameters(prev => [...prev, ...newParameters]);
    setSelectedGlobalParameters([]);
    setIsImportDialogOpen(false);
    
    toast({
      title: 'Parameters Imported!',
      description: `${newParameters.length} parameter(s) imported from Integrations`
    });
  };

  const handleToggleParameterSelection = (paramId: number) => {
    setSelectedGlobalParameters(prev => 
      prev.includes(paramId) 
        ? prev.filter(id => id !== paramId)
        : [...prev, paramId]
    );
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
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Import Existing
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import URL Parameters</DialogTitle>
                    <DialogDescription>
                      Select URL parameters from your Integrations to add to this campaign
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {isLoadingGlobal ? (
                      <div className="text-center py-8">Loading parameters...</div>
                    ) : !globalParameters || !Array.isArray(globalParameters) || globalParameters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No URL parameters found in Integrations. Create some parameters in the Integrations section first.
                      </div>
                    ) : (
                      <>
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Select</TableHead>
                                <TableHead>Parameter Name</TableHead>
                                <TableHead>URL Parameter</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Required</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {globalParameters.map((param: any) => (
                                <TableRow key={param.id}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedGlobalParameters.includes(param.id)}
                                      onChange={() => handleToggleParameterSelection(param.id)}
                                      className="rounded"
                                    />
                                  </TableCell>
                                  <TableCell>{param.parameterName}</TableCell>
                                  <TableCell>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                                      {param.parameterName}
                                    </code>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{param.parameterType}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {param.required ? 
                                      <Badge variant="default" className="bg-orange-100 text-orange-800">Required</Badge> : 
                                      <Badge variant="secondary">Optional</Badge>
                                    }
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setSelectedGlobalParameters([]);
                              setIsImportDialogOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleImportParameters}
                            disabled={selectedGlobalParameters.length === 0}
                          >
                            Import {selectedGlobalParameters.length} Parameter(s)
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingParameter(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Parameter
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingParameter ? 'Edit' : 'Add'} URL Parameter
                  </DialogTitle>
                  <DialogDescription>
                    Configure how this parameter appears in tracking and reports
                  </DialogDescription>
                </DialogHeader>
                <TooltipProvider>
                  <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="parameterName">URL Parameter <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The actual URL parameter name that will be captured (e.g., utm_source, utm_campaign, gclid)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="parameterName"
                      value={formData.parameterName}
                      onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
                      placeholder="e.g., utm_source"
                      required
                    />
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reportingMenuName">Reporting Menu Name <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The section name where this parameter will appear in reports (e.g., "User", "Campaign Performance")</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="reportingMenuName"
                      value={formData.reportingMenuName}
                      onChange={(e) => setFormData({ ...formData, reportingMenuName: e.target.value })}
                      placeholder="e.g., User"
                      required
                    />
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reportName">Report Name <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The column header name that will be displayed in reports (e.g., "Source", "Campaign", "Medium")</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="reportName"
                      value={formData.reportName}
                      onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
                      placeholder="e.g., Source"
                      required
                    />
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>

                  <div className="flex justify-center space-x-3 pt-6">
                    <Button type="submit" className="px-8">
                      {editingParameter ? 'UPDATE' : 'CREATE'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="px-8">
                      CANCEL
                    </Button>
                  </div>
                </form>
                </TooltipProvider>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No URL parameters configured yet. Add your first parameter to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter Name</TableHead>
                    <TableHead>URL Parameter</TableHead>
                    <TableHead>Report Menu</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.map((parameter) => (
                    <TableRow key={parameter.id}>
                      <TableCell>{parameter.name}</TableCell>
                      <TableCell>
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                          {parameter.parameterName}
                        </code>
                      </TableCell>
                      <TableCell>{parameter.reportingMenuName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {parameter.parameterType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {parameter.required ? 
                          <Badge variant="default" className="bg-orange-100 text-orange-800">Required</Badge> : 
                          <Badge variant="secondary">Optional</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={parameter.active ? "default" : "secondary"}
                          className={parameter.active ? 'bg-green-100 text-green-800' : ''}
                        >
                          {parameter.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(parameter.id)}
                          >
                            {parameter.active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(parameter)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(parameter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Sample URL Preview */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Sample Tracking URL
                  </h4>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(generateSampleUrl())}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <code className="text-sm break-all">
                  {generateSampleUrl()}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  This URL includes all active parameters and can be used to test tracking
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}