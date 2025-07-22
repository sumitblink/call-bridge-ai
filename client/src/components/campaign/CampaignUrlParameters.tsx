import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Link, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

export default function CampaignUrlParameters({ campaignId }: CampaignUrlParametersProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<UrlParameter | null>(null);
  const [parameters, setParameters] = useState<UrlParameter[]>(DEFAULT_PARAMETERS);
  const [formData, setFormData] = useState<{
    name: string;
    parameterName: string;
    reportingMenuName: string;
    reportName: string;
    parameterType: 'string' | 'integer' | 'decimal';
    required: boolean;
    active: boolean;
  }>({
    name: '',
    parameterName: '',
    reportingMenuName: '',
    reportName: '',
    parameterType: 'string',
    required: false,
    active: true
  });
  
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      parameterName: '',
      reportingMenuName: '',
      reportName: '',
      parameterType: 'string',
      required: false,
      active: true
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
          ? { ...param, ...formData }
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
        ...formData
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
      name: parameter.name,
      parameterName: parameter.parameterName,
      reportingMenuName: parameter.reportingMenuName,
      reportName: parameter.reportName,
      parameterType: parameter.parameterType,
      required: parameter.required,
      active: parameter.active
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingParameter(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Parameter Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Campaign Source"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="parameterName">URL Parameter</Label>
                    <Input
                      id="parameterName"
                      value={formData.parameterName}
                      onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
                      placeholder="e.g., utm_source"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reportingMenuName">Reporting Menu</Label>
                      <Input
                        id="reportingMenuName"
                        value={formData.reportingMenuName}
                        onChange={(e) => setFormData({ ...formData, reportingMenuName: e.target.value })}
                        placeholder="e.g., Traffic Source"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="reportName">Report Column</Label>
                      <Input
                        id="reportName"
                        value={formData.reportName}
                        onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
                        placeholder="e.g., Source"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="parameterType">Parameter Type</Label>
                    <Select 
                      value={formData.parameterType} 
                      onValueChange={(value: any) => setFormData({ ...formData, parameterType: value })}
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="required">Required parameter</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingParameter ? 'Update' : 'Create'} Parameter
                    </Button>
                  </div>
                </form>
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