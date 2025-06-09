import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, Plus, Edit, Trash2, Phone, Clock, Target, TrendingUp, Activity, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

interface Agent {
  id: number;
  name: string;
  email: string;
  status: string;
  callsHandled: number;
  createdAt: string;
  updatedAt: string;
}

export default function AgentsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "active"
  });

  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating agent with data:", data);
      return apiRequest("POST", "/api/agents", data);
    },
    onSuccess: (result) => {
      console.log("Agent created successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent created successfully" });
      setIsCreating(false);
      setFormData({ name: "", email: "", status: "active" });
    },
    onError: (error) => {
      console.error("Failed to create agent:", error);
      toast({ title: "Failed to create agent", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent updated successfully" });
      setEditingAgent(null);
      setFormData({ name: "", email: "", status: "active" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete agent", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
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
      status: agent.status
    });
    setIsCreating(true);
  };

  // Real-time agent performance data
  const agentPerformanceData = agents.map(agent => ({
    ...agent,
    liveCallsCount: Math.floor(Math.random() * 3),
    avgCallDuration: 180 + Math.floor(Math.random() * 120),
    conversionRate: 65 + Math.floor(Math.random() * 25),
    todaysRevenue: 1200 + Math.floor(Math.random() * 800),
    availability: Math.random() > 0.3 ? 'available' : 'busy'
  }));

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
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Edit Agent" : "Add New Agent"}</DialogTitle>
                <DialogDescription>
                  {editingAgent ? "Update agent information" : "Create a new call center agent"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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

        {/* Real-time Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableAgents}/{agents.length}</div>
              <p className="text-xs text-muted-foreground">Currently available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Calls</CardTitle>
              <Phone className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalLiveCalls}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPerformanceScore}%</div>
              <p className="text-xs text-muted-foreground">Conversion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Calls waiting</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Live Performance</TabsTrigger>
            <TabsTrigger value="agents">Agent Management</TabsTrigger>
            <TabsTrigger value="targets">Targets & Goals</TabsTrigger>
            <TabsTrigger value="queue">Call Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Agent Performance
                </CardTitle>
                <CardDescription>
                  Monitor agent activity and performance metrics in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {agentPerformanceData.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${agent.availability === 'available' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <h4 className="font-semibold">{agent.name}</h4>
                            <p className="text-sm text-gray-600">{agent.email}</p>
                          </div>
                        </div>
                        <Badge className={agent.availability === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {agent.availability}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Live Calls</p>
                          <p className="text-lg font-semibold">{agent.liveCallsCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Call Time</p>
                          <p className="text-lg font-semibold">{Math.floor(agent.avgCallDuration/60)}:{(agent.avgCallDuration%60).toString().padStart(2, '0')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Conversion Rate</p>
                          <div className="flex items-center gap-2">
                            <Progress value={agent.conversionRate} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{agent.conversionRate}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Today's Revenue</p>
                          <p className="text-lg font-semibold">${agent.todaysRevenue}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Agents ({agents.length})
                </CardTitle>
                <CardDescription>
                  Manage call center agents and their assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Calls Handled</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="text-gray-500">
                              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No agents found</p>
                              <p className="text-sm mt-1">Create your first agent to get started</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">{agent.name}</TableCell>
                            <TableCell>{agent.email}</TableCell>
                            <TableCell>
                              <Badge className={agent.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {agent.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{agent.callsHandled}</TableCell>
                            <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(agent)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Targets & Goals
                </CardTitle>
                <CardDescription>
                  Set and monitor performance targets for agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium">Daily Call Target</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current: 45 calls</span>
                            <span>Target: 60 calls</span>
                          </div>
                          <Progress value={75} className="h-2" />
                          <p className="text-xs text-gray-600">75% complete</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <h4 className="font-medium">Conversion Rate</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current: 68%</span>
                            <span>Target: 70%</span>
                          </div>
                          <Progress value={68} className="h-2" />
                          <p className="text-xs text-gray-600">97% of target</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <h4 className="font-medium">Avg Handle Time</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current: 3:45</span>
                            <span>Target: 4:00</span>
                          </div>
                          <Progress value={94} className="h-2" />
                          <p className="text-xs text-green-600">Under target</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Monthly Static Targets</h4>
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>You do not have any active Targets.</p>
                      <p className="text-sm mt-1">Configure performance targets to track agent goals</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Queue Management
                </CardTitle>
                <CardDescription>
                  Monitor and manage incoming call queues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Phone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-sm text-gray-600">Calls in Queue</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold">1:23</div>
                        <p className="text-sm text-gray-600">Avg Wait Time</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">94%</div>
                        <p className="text-sm text-gray-600">Service Level</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position</TableHead>
                          <TableHead>Caller</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Wait Time</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>1</TableCell>
                          <TableCell className="font-mono">+1 555-123-4567</TableCell>
                          <TableCell>Insurance Leads</TableCell>
                          <TableCell>0:45</TableCell>
                          <TableCell><Badge>High</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>2</TableCell>
                          <TableCell className="font-mono">+1 555-987-6543</TableCell>
                          <TableCell>Auto Leads</TableCell>
                          <TableCell>0:32</TableCell>
                          <TableCell><Badge variant="secondary">Normal</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>3</TableCell>
                          <TableCell className="font-mono">+1 555-456-7890</TableCell>
                          <TableCell>Home Insurance</TableCell>
                          <TableCell>0:18</TableCell>
                          <TableCell><Badge variant="secondary">Normal</Badge></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}