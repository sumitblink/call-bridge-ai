import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Phone, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Save, 
  Settings,
  Hash,
  PhoneForwarded,
  Voicemail,
  Users,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

interface IVRFlow {
  id: string;
  campaignId: number;
  campaignName: string;
  greeting: string;
  options: IVROption[];
  isActive: boolean;
  createdAt: string;
}

interface IVROption {
  digit: string;
  action: string;
  destination?: string;
  description: string;
}

interface Campaign {
  id: number;
  name: string;
  phoneNumber: string | null;
  status: string;
}

export default function IVRSetupPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingFlow, setEditingFlow] = useState<IVRFlow | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [greeting, setGreeting] = useState("");
  const [options, setOptions] = useState<IVROption[]>([]);
  const [currentOption, setCurrentOption] = useState<IVROption>({
    digit: "",
    action: "",
    destination: "",
    description: ""
  });

  const { toast } = useToast();

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Fetch IVR flows from API
  const { data: ivrFlows = [], isLoading: ivrLoading, error: ivrError } = useQuery<IVRFlow[]>({
    queryKey: ['/api/ivr-flows'],
    select: (data) => data.map((flow: any) => ({
      ...flow,
      options: typeof flow.options === 'string' ? JSON.parse(flow.options || '[]') : flow.options || [],
      campaignName: campaigns.find(c => c.id === flow.campaignId)?.name || `Campaign ${flow.campaignId}`
    }))
  });

  const createIVRMutation = useMutation({
    mutationFn: async (data: { campaignId: number; greeting: string; options: IVROption[] }) => {
      const res = await apiRequest('POST', `/api/campaigns/${data.campaignId}/ivr`, { 
        greeting: data.greeting, 
        options: data.options 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "IVR flow created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/ivr-flows'] });
      resetForm();
      setIsCreating(false);
    },
    onError: () => {
      toast({ title: "Failed to create IVR flow", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setSelectedCampaign(null);
    setGreeting("");
    setOptions([]);
    setCurrentOption({ digit: "", action: "", destination: "", description: "" });
  };

  const addOption = () => {
    if (currentOption.digit && currentOption.action && currentOption.description) {
      if (!options.find(opt => opt.digit === currentOption.digit)) {
        setOptions([...options, currentOption]);
        setCurrentOption({ digit: "", action: "", destination: "", description: "" });
      } else {
        toast({ title: "Digit already assigned", variant: "destructive" });
      }
    }
  };

  const removeOption = (digit: string) => {
    setOptions(options.filter(opt => opt.digit !== digit));
  };

  const handleSave = () => {
    if (selectedCampaign && greeting && options.length > 0) {
      createIVRMutation.mutate({
        campaignId: selectedCampaign,
        greeting,
        options
      });
    } else {
      toast({ title: "Please complete all required fields", variant: "destructive" });
    }
  };

  const playGreeting = async (flowId: string, greeting: string) => {
    toast({ title: "Playing greeting preview..." });
    // In production, this would trigger text-to-speech preview
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "transfer": return <PhoneForwarded className="h-4 w-4" />;
      case "queue": return <Users className="h-4 w-4" />;
      case "voicemail": return <Voicemail className="h-4 w-4" />;
      case "operator": return <Phone className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "transfer": return "bg-blue-100 text-blue-800";
      case "queue": return "bg-green-100 text-green-800";
      case "voicemail": return "bg-orange-100 text-orange-800";
      case "operator": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-end mb-8">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create IVR Flow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New IVR Flow</DialogTitle>
                <DialogDescription>
                  Design an interactive voice response system for your campaign
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Campaign Selection */}
                <div>
                  <Label htmlFor="campaign">Select Campaign</Label>
                  <Select value={selectedCampaign?.toString()} onValueChange={(value) => setSelectedCampaign(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name} {campaign.phoneNumber && `(${campaign.phoneNumber})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Greeting Message */}
                <div>
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea
                    id="greeting"
                    placeholder="Enter the greeting message that callers will hear..."
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be converted to speech using text-to-speech technology
                  </p>
                </div>

                {/* Menu Options */}
                <div>
                  <Label>Menu Options</Label>
                  <div className="border rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label htmlFor="digit">Digit</Label>
                        <Select value={currentOption.digit} onValueChange={(value) => setCurrentOption({...currentOption, digit: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Digit" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6,7,8,9].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                            <SelectItem value="*">*</SelectItem>
                            <SelectItem value="#">#</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="action">Action</Label>
                        <Select value={currentOption.action} onValueChange={(value) => setCurrentOption({...currentOption, action: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transfer">Transfer to Number</SelectItem>
                            <SelectItem value="queue">Add to Queue</SelectItem>
                            <SelectItem value="voicemail">Take Voicemail</SelectItem>
                            <SelectItem value="operator">Transfer to Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="destination">Destination</Label>
                        <Input
                          id="destination"
                          placeholder={
                            currentOption.action === "transfer" ? "+1234567890" :
                            currentOption.action === "queue" ? "queue_name" :
                            currentOption.action === "voicemail" ? "vm_box_id" :
                            "operator_id"
                          }
                          value={currentOption.destination}
                          onChange={(e) => setCurrentOption({...currentOption, destination: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="Menu description"
                          value={currentOption.description}
                          onChange={(e) => setCurrentOption({...currentOption, description: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={addOption} disabled={!currentOption.digit || !currentOption.action || !currentOption.description}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {/* Current Options */}
                  {options.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Configured Options</h4>
                      <div className="space-y-2">
                        {options.map((option) => (
                          <div key={option.digit} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                <span className="font-mono font-bold">{option.digit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getActionIcon(option.action)}
                                <span className="text-sm">{option.description}</span>
                              </div>
                              <Badge className={getActionColor(option.action)}>
                                {option.action}
                              </Badge>
                              {option.destination && (
                                <span className="text-xs text-gray-500">→ {option.destination}</span>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => removeOption(option.digit)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createIVRMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Create IVR Flow
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* IVR Flows List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              IVR Flows ({ivrFlows.length})
            </CardTitle>
            <CardDescription>
              Manage interactive voice response systems for your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Greeting Preview</TableHead>
                    <TableHead>Menu Options</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ivrFlows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No IVR flows configured</p>
                          <p className="text-sm mt-1">Create your first IVR flow to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ivrFlows.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{flow.campaignName}</p>
                            <p className="text-xs text-gray-500">ID: {flow.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={flow.greeting}>
                              {flow.greeting}
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-1"
                              onClick={() => playGreeting(flow.id, flow.greeting)}
                            >
                              <Volume2 className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {flow.options.map((option) => (
                              <div key={option.digit} className="flex items-center gap-2 text-xs">
                                <Hash className="h-3 w-3" />
                                <span className="font-mono">{option.digit}</span>
                                <span>→</span>
                                <Badge variant="outline" className={getActionColor(option.action)}>
                                  {option.action}
                                </Badge>
                                <span className="text-gray-500 truncate max-w-20">{option.description}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={flow.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {flow.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(flow.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Play className="h-3 w-3" />
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
      </div>
    </Layout>
  );
}