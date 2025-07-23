import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Edit, Trash2, Phone, Clock, Target, TrendingUp, Activity, AlertCircle, CheckCircle, Settings, PhoneCall, UserCheck, Timer, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

interface Agent {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  status: string;
  skills: string[];
  maxConcurrentCalls: number;
  priority: number;
  isOnline: boolean;
  callsHandled: number;
  averageCallDuration: number;
  totalTalkTime: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentDashboard {
  totalAgents: number;
  onlineAgents: number;
  availableAgents: number;
  busyAgents: number;
  activeCalls: number;
  agentsList: AgentAvailability[];
}

interface AgentAvailability {
  agentId: number;
  name: string;
  status: string;
  currentCalls: number;
  maxConcurrentCalls: number;
  priority: number;
  skills: string[];
  isAvailable: boolean;
}

export default function AgentsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgentForStatus, setSelectedAgentForStatus] = useState<Agent | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    status: "offline",
    skills: [] as string[],
    maxConcurrentCalls: 1,
    priority: 5,
    department: "",
    timezone: "UTC"
  });
  const [newSkill, setNewSkill] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery<AgentDashboard>({
    queryKey: ["/api/agents/dashboard"],
    refetchInterval: 120000, // Refresh every 2 minutes (was 30 seconds - too aggressive)
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating agent with data:", data);
      const response = await apiRequest("/api/agents", "POST", data);
      return response.json();
    },
    onSuccess: (result) => {
      console.log("Agent created successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/dashboard"] });
      toast({ title: "Agent created successfully" });
      setIsCreating(false);
      setFormData({ 
        name: "", 
        email: "", 
        phoneNumber: "",
        status: "offline",
        skills: [],
        maxConcurrentCalls: 1,
        priority: 5,
        department: "",
        timezone: "UTC"
      });
      setShowValidation(false);
    },
    onError: (error) => {
      console.error("Failed to create agent:", error);
      toast({ title: "Failed to create agent", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest(`/api/agents/${id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/dashboard"] });
      toast({ title: "Agent updated successfully" });
      setEditingAgent(null);
      setFormData({ 
        name: "", 
        email: "", 
        phoneNumber: "",
        status: "offline",
        skills: [],
        maxConcurrentCalls: 1,
        priority: 5,
        department: "",
        timezone: "UTC"
      });
      setShowValidation(false);
      setIsCreating(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/agents/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete agent", variant: "destructive" });
    }
  });

  const statusChangeMutation = useMutation({
    mutationFn: async ({ agentId, status, reason }: { agentId: number; status: string; reason?: string }) => {
      const response = await apiRequest(`/api/agents/${agentId}/status`, "POST", { status, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/dashboard"] });
      toast({ title: "Agent status updated successfully" });
      setSelectedAgentForStatus(null);
      setStatusChangeReason("");
    },
    onError: () => {
      toast({ title: "Failed to update agent status", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    setShowValidation(true);
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({ title: "Agent name is required", variant: "destructive" });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phoneNumber: agent.phoneNumber || "",
      status: agent.status,
      skills: agent.skills || [],
      maxConcurrentCalls: agent.maxConcurrentCalls || 1,
      priority: agent.priority || 5,
      department: "",
      timezone: "UTC"
    });
    setShowValidation(false);
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNumber: "",
      status: "offline",
      skills: [],
      maxConcurrentCalls: 1,
      priority: 5,
      department: "",
      timezone: "UTC"
    });
    setEditingAgent(null);
    setShowValidation(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'break': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch actual agent performance data
  const { data: agentPerformance } = useQuery({
    queryKey: ['/api/agents/performance'],
    staleTime: 30000,
  });

  const agentPerformanceData = agents.map(agent => {
    const performance = agentPerformance?.find((p: any) => p.agentId === agent.id);
    return {
      ...agent,
      liveCallsCount: performance?.liveCallsCount || 0,
      avgCallDuration: performance?.avgCallDuration || 0,
      conversionRate: performance?.conversionRate || 0,
      todaysRevenue: performance?.todaysRevenue || 0,
      availability: performance?.availability || 'offline'
    };
  });

  const totalLiveCalls = agentPerformanceData.reduce((sum, agent) => sum + agent.liveCallsCount, 0);
  const availableAgents = agentPerformanceData.filter(agent => agent.availability === 'available').length;
  const avgPerformanceScore = agentPerformanceData.length > 0 
    ? Math.round(agentPerformanceData.reduce((sum, agent) => sum + agent.conversionRate, 0) / agentPerformanceData.length)
    : 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agent Management & Performance</h1>
            <p className="text-gray-600 mt-1">Monitor agent performance and manage call routing targets</p>
          </div>
          <Dialog open={isCreating} onOpenChange={(open) => {
            setIsCreating(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Edit Agent" : "Add New Agent"}</DialogTitle>
                <DialogDescription>
                  {editingAgent ? "Update agent information and routing settings" : "Create a new call center agent with routing capabilities"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      className={showValidation && !formData.name.trim() ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {showValidation && !formData.name.trim() && (
                      <p className="text-sm text-red-600 mt-1">Agent name is required</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@company.com"
                      className={showValidation && !formData.email.trim() ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {showValidation && !formData.email.trim() && (
                      <p className="text-sm text-red-600 mt-1">Email is required</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Initial Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="break">On Break</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxConcurrentCalls">Max Concurrent Calls</Label>
                    <Input
                      id="maxConcurrentCalls"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.maxConcurrentCalls}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentCalls: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority (1=highest, 10=lowest)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills">Skills (for call routing)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add skill (e.g., sales, support, technical)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          setFormData(prev => ({ 
                            ...prev, 
                            skills: [...prev.skills, newSkill.trim()] 
                          }));
                          setNewSkill("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newSkill.trim()) {
                          setFormData(prev => ({ 
                            ...prev, 
                            skills: [...prev.skills, newSkill.trim()] 
                          }));
                          setNewSkill("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {skill}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            skills: prev.skills.filter((_, i) => i !== index) 
                          }))}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Real-time Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.totalAgents || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.onlineAgents || 0} online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Agents</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboard?.availableAgents || 0}</div>
              <p className="text-xs text-muted-foreground">Ready for calls</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dashboard?.activeCalls || 0}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Busy Agents</CardTitle>
              <Timer className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{dashboard?.busyAgents || 0}</div>
              <p className="text-xs text-muted-foreground">On calls or break</p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Agent Status Table */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents">Agent Directory</TabsTrigger>
            <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
            <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agent Management</CardTitle>
                <CardDescription>
                  Manage your call center agents, their skills, and routing priorities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.email}</div>
                            {agent.phoneNumber && (
                              <div className="text-sm text-gray-500">{agent.phoneNumber}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(agent.status)}>
                            {agent.status}
                          </Badge>
                          {agent.isOnline && (
                            <Badge variant="outline" className="ml-2">
                              <Activity className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(agent.skills || []).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{agent.maxConcurrentCalls || 1} max calls</div>
                            <div className="text-gray-500">Priority: {agent.priority || 5}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{agent.priority || 5}</div>
                            <div className="text-xs text-gray-500">Routing priority</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{agent.callsHandled || 0} calls</div>
                            <div className="text-gray-500">
                              {formatDuration(agent.averageCallDuration || 0)} avg
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAgentForStatus(agent)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(agent)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {agent.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(agent.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Agent
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Agent Dashboard</CardTitle>
                <CardDescription>
                  Live view of agent availability and call routing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dashboard?.agentsList?.map((agent) => (
                    <Card key={agent.agentId} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{agent.name}</div>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Current Calls:</span>
                          <span>{agent.currentCalls}/{agent.maxConcurrentCalls}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Priority:</span>
                          <span>{agent.priority}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span className={agent.isAvailable ? 'text-green-600' : 'text-red-600'}>
                            {agent.isAvailable ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.skills.map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )) || (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      No agent data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance analytics and KPI tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">{agent.name}</h3>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{agent.callsHandled || 0}</div>
                          <div className="text-sm text-gray-500">Total Calls</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatDuration(agent.averageCallDuration || 0)}
                          </div>
                          <div className="text-sm text-gray-500">Avg Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatDuration(agent.totalTalkTime || 0)}
                          </div>
                          <div className="text-sm text-gray-500">Total Talk Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{agent.priority || 5}</div>
                          <div className="text-sm text-gray-500">Priority</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Agent Status Change Dialog */}
        <Dialog open={!!selectedAgentForStatus} onOpenChange={(open) => !open && setSelectedAgentForStatus(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Agent Status</DialogTitle>
              <DialogDescription>
                Update {selectedAgentForStatus?.name}'s status and routing availability
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newStatus">New Status</Label>
                <Select 
                  value={selectedAgentForStatus?.status || ""} 
                  onValueChange={(value) => {
                    if (selectedAgentForStatus) {
                      setSelectedAgentForStatus({...selectedAgentForStatus, status: value});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="break">On Break</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  placeholder="Enter reason for status change..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAgentForStatus(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedAgentForStatus) {
                    statusChangeMutation.mutate({
                      agentId: selectedAgentForStatus.id,
                      status: selectedAgentForStatus.status,
                      reason: statusChangeReason
                    });
                  }
                }}
                disabled={statusChangeMutation.isPending}
              >
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}