import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Play, Pause, Copy, MoreHorizontal, Eye, Settings, GitBranch, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CallFlow, Campaign } from '@shared/schema';
import { CallFlowEditor } from '@/components/call-flow/CallFlowEditor';
import { CallFlowTemplates } from '@/components/call-flow/CallFlowTemplates';

export default function CallFlows() {
  const [selectedFlow, setSelectedFlow] = useState<CallFlow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch call flows
  const { data: callFlows, isLoading } = useQuery<CallFlow[]>({
    queryKey: ['/api/call-flows'],
  });

  // Fetch campaigns for dropdown
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  // Create call flow mutation
  const createCallFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await apiRequest('/api/call-flows', 'POST', flowData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flows'] });
      toast({
        title: "Success",
        description: "Call flow created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create call flow",
        variant: "destructive",
      });
    },
  });

  // Update call flow mutation
  const updateCallFlowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest(`/api/call-flows/${id}`, 'PUT', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flows'] });
      toast({
        title: "Success",
        description: "Call flow updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update call flow",
        variant: "destructive",
      });
    },
  });

  // Delete call flow mutation
  const deleteCallFlowMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/call-flows/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flows'] });
      toast({
        title: "Success",
        description: "Call flow deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete call flow",
        variant: "destructive",
      });
    },
  });

  // Toggle flow status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/call-flows/${id}/status`, 'PUT', { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flows'] });
      toast({
        title: "Success",
        description: "Call flow status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update call flow status",
        variant: "destructive",
      });
    },
  });

  // Filter call flows
  const filteredFlows = callFlows?.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleCreateFlow = () => {
    setSelectedFlow(null);
    setIsEditing(true);
  };

  const handleEditFlow = (flow: CallFlow) => {
    setSelectedFlow(flow);
    setIsEditing(true);
  };

  const handleCloseEditor = () => {
    setSelectedFlow(null);
    setIsEditing(false);
  };

  const handleSaveFlow = async (flowData: any) => {
    if (selectedFlow) {
      await updateCallFlowMutation.mutateAsync({ id: selectedFlow.id, data: flowData });
    } else {
      await createCallFlowMutation.mutateAsync(flowData);
    }
    handleCloseEditor();
  };

  const handleDeleteFlow = async (id: number) => {
    if (confirm('Are you sure you want to delete this call flow?')) {
      await deleteCallFlowMutation.mutateAsync(id);
    }
  };

  const handleToggleStatus = async (flow: CallFlow) => {
    const newStatus = flow.status === 'active' ? 'paused' : 'active';
    await toggleStatusMutation.mutateAsync({ id: flow.id, status: newStatus });
  };

  const handleDuplicateFlow = async (flow: CallFlow) => {
    const duplicatedFlow = {
      ...flow,
      name: `${flow.name} (Copy)`,
      status: 'draft',
    };
    delete duplicatedFlow.id;
    await createCallFlowMutation.mutateAsync(duplicatedFlow);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'draft': return <Edit className="h-3 w-3" />;
      case 'archived': return <Eye className="h-3 w-3" />;
      default: return <Settings className="h-3 w-3" />;
    }
  };

  if (isEditing) {
    return (
      <CallFlowEditor
        flow={selectedFlow}
        campaigns={campaigns || []}
        onSave={handleSaveFlow}
        onCancel={handleCloseEditor}
      />
    );
  }

  if (showTemplates) {
    return (
      <CallFlowTemplates
        onSelectTemplate={(template) => {
          setSelectedFlow(template);
          setIsEditing(true);
          setShowTemplates(false);
        }}
        onClose={() => setShowTemplates(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Call Flows</h1>
          <p className="text-gray-600 mt-1">
            Design and manage intelligent call routing workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2"
          >
            <GitBranch className="h-4 w-4" />
            Templates
          </Button>
          <Button
            onClick={handleCreateFlow}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Flow
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1">
          <Input
            placeholder="Search call flows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Flows</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {callFlows?.length || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-semibold text-green-600">
                  {callFlows?.filter(f => f.status === 'active').length || 0}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Play className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Executions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {callFlows?.reduce((sum, flow) => sum + flow.totalExecutions, 0) || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Timer className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {callFlows?.length > 0 
                    ? Math.round((callFlows.reduce((sum, flow) => sum + flow.successfulExecutions, 0) / 
                                  callFlows.reduce((sum, flow) => sum + flow.totalExecutions, 0)) * 100) || 0
                    : 0}%
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Flows List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading call flows...</p>
          </div>
        ) : filteredFlows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call flows found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No call flows match your current filters.'
                  : 'Get started by creating your first call flow.'}
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create Call Flow
                </Button>
                <Button variant="outline" onClick={() => setShowTemplates(true)}>
                  Browse Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredFlows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{flow.name}</h3>
                      <Badge className={`${getStatusColor(flow.status)} flex items-center gap-1`}>
                        {getStatusIcon(flow.status)}
                        {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
                      </Badge>
                      {flow.isTemplate && (
                        <Badge variant="outline" className="text-purple-600 border-purple-200">
                          Template
                        </Badge>
                      )}
                    </div>
                    
                    {flow.description && (
                      <p className="text-gray-600 mb-3">{flow.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Version: {flow.version}</span>
                      <span>Executions: {flow.totalExecutions}</span>
                      <span>Success Rate: {flow.totalExecutions > 0 ? Math.round((flow.successfulExecutions / flow.totalExecutions) * 100) : 0}%</span>
                      {flow.lastExecuted && (
                        <span>Last Run: {new Date(flow.lastExecuted).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFlow(flow)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleStatus(flow)}>
                          {flow.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Flow
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Activate Flow
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateFlow(flow)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}