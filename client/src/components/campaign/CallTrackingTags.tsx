import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, Code, Copy, Settings, BarChart3, Phone, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CallTrackingTag {
  id: number;
  name: string;
  tagCode: string;
  primaryNumberId?: number;
  numberToReplace?: string;
  poolId?: number;
  rotationStrategy: string;
  publisherId?: number;
  captureUserData: boolean;
  sessionTimeout: number;
  stickyDuration: number;
  isActive: boolean;
  createdAt: string;
  primaryNumber?: {
    phoneNumber: string;
    friendlyName: string;
  };
  pool?: {
    name: string;
    poolSize: number;
  };
  publisher?: {
    name: string;
  };
}

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string;
}

interface NumberPool {
  id: number;
  name: string;
  poolSize: number;
}

interface Publisher {
  id: number;
  name: string;
}

interface CallTrackingTagsProps {
  campaignId: number;
}

export function CallTrackingTags({ campaignId }: CallTrackingTagsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CallTrackingTag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    tagCode: "",
    primaryNumberId: "",
    numberToReplace: "",
    poolId: "",
    rotationStrategy: "round_robin",
    publisherId: "",
    captureUserData: false,
    sessionTimeout: 1800,
    stickyDuration: 86400
  });

  // Fetch tracking tags for campaign
  const { data: trackingTags = [], isLoading: isLoadingTags } = useQuery<CallTrackingTag[]>({
    queryKey: [`/api/campaigns/${campaignId}/tracking-tags`],
  });

  // Fetch phone numbers for dropdown
  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers"],
  });

  // Fetch number pools for dropdown
  const { data: numberPools = [] } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools"],
  });

  // Fetch publishers for dropdown
  const { data: publishers = [] } = useQuery<Publisher[]>({
    queryKey: ["/api/publishers"],
  });

  // Create tracking tag mutation
  const createTagMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/campaigns/${campaignId}/tracking-tags`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/tracking-tags`] });
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        tagCode: "",
        primaryNumberId: "",
        numberToReplace: "",
        poolId: "",
        rotationStrategy: "round_robin",
        publisherId: "",
        captureUserData: false,
        sessionTimeout: 1800,
        stickyDuration: 86400
      });
      toast({
        title: "Success",
        description: "Call tracking tag created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tracking tag",
        variant: "destructive",
      });
    },
  });

  // Delete tracking tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (tagId: number) => apiRequest(`/api/tracking-tags/${tagId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/tracking-tags`] });
      toast({
        title: "Success",
        description: "Tracking tag deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tracking tag",
        variant: "destructive",
      });
    },
  });

  // Generate tag code from name
  const generateTagCode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      tagCode: generateTagCode(name)
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.tagCode) {
      toast({
        title: "Validation Error",
        description: "Tag name and code are required",
        variant: "destructive",
      });
      return;
    }

    createTagMutation.mutate({
      ...formData,
      primaryNumberId: formData.primaryNumberId ? parseInt(formData.primaryNumberId) : undefined,
      poolId: formData.poolId ? parseInt(formData.poolId) : undefined,
      publisherId: formData.publisherId ? parseInt(formData.publisherId) : undefined,
    });
  };

  const showCodeSnippets = (tag: CallTrackingTag) => {
    setSelectedTag(tag);
    setIsCodeDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const rotationStrategies = [
    { value: "round_robin", label: "Round Robin" },
    { value: "sticky", label: "Sticky (Session-based)" },
    { value: "random", label: "Random" },
    { value: "priority", label: "Priority Order" }
  ];

  if (isLoadingTags) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call Tracking Tags</h3>
          <p className="text-sm text-muted-foreground">
            Create dynamic number insertion (DNI) tags for website integration
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Call Tracking Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Call Tracking Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tag Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Homepage Banner"
                  />
                </div>
                <div>
                  <Label htmlFor="tagCode">Tag Code *</Label>
                  <Input
                    id="tagCode"
                    value={formData.tagCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagCode: e.target.value }))}
                    placeholder="e.g., homepage_banner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryNumber">Primary Number</Label>
                  <Select
                    value={formData.primaryNumberId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, primaryNumberId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Publisher Number" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers.map((number) => (
                        <SelectItem key={number.id} value={number.id.toString()}>
                          {number.friendlyName || number.phoneNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numberToReplace">Number to Replace</Label>
                  <Input
                    id="numberToReplace"
                    value={formData.numberToReplace}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberToReplace: e.target.value }))}
                    placeholder="e.g., (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pool">Number Pool</Label>
                  <Select
                    value={formData.poolId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, poolId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Number Pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {numberPools.map((pool) => (
                        <SelectItem key={pool.id} value={pool.id.toString()}>
                          {pool.name} ({pool.poolSize} numbers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rotationStrategy">Rotation Strategy</Label>
                  <Select
                    value={formData.rotationStrategy}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, rotationStrategy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rotationStrategies.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                          {strategy.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Select
                  value={formData.publisherId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, publisherId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Publisher" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishers.map((publisher) => (
                      <SelectItem key={publisher.id} value={publisher.id.toString()}>
                        {publisher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="captureUserData"
                  checked={formData.captureUserData}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, captureUserData: checked }))}
                />
                <Label htmlFor="captureUserData">Capture User Data</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="stickyDuration">Sticky Duration (seconds)</Label>
                  <Input
                    id="stickyDuration"
                    type="number"
                    value={formData.stickyDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, stickyDuration: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createTagMutation.isPending}>
                  {createTagMutation.isPending ? "Creating..." : "Create Tag"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {trackingTags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Call Tracking Tags</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first call tracking tag to enable dynamic number insertion on your website.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tracking Tags</CardTitle>
            <CardDescription>
              Manage your call tracking tags and DNI configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Capture User Data</TableHead>
                  <TableHead>Number Pool</TableHead>
                  <TableHead>Number to Replace</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tag.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Code: {tag.tagCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tag.primaryNumber ? (
                        <div>
                          <div className="font-medium">{tag.primaryNumber.phoneNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {tag.primaryNumber.friendlyName}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tag.publisher ? (
                        <Badge variant="outline">{tag.publisher.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tag.captureUserData ? "default" : "secondary"}>
                        {tag.captureUserData ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tag.pool ? (
                        <div>
                          <div className="font-medium">{tag.pool.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {tag.pool.poolSize} numbers
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No pool</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tag.numberToReplace || <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => showCodeSnippets(tag)}>
                            <Code className="h-4 w-4 mr-2" />
                            View Code
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteTagMutation.mutate(tag.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Code Snippets Dialog */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Integration Code - {selectedTag?.name}
              </div>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="html">HTML Snippet</TabsTrigger>
              <TabsTrigger value="manual">Manual Integration</TabsTrigger>
            </TabsList>
            <TabsContent value="javascript" className="space-y-4">
              <div>
                <Label>JavaScript Code</Label>
                <div className="relative">
                  <Textarea
                    className="font-mono text-sm min-h-[300px]"
                    value={`<script>
(function() {
  var config = {
    tagCode: '${selectedTag?.tagCode}',
    apiUrl: 'http://localhost:5000/api/dni/track',
    selectors: ['.tracking-number', '[data-tracking-number]'],
    captureUserData: ${selectedTag?.captureUserData}
  };
  
  // Your tracking code will be generated here
  // This is a placeholder - actual code will be fetched from the API
})();
</script>`}
                    readOnly
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`// Generated code for ${selectedTag?.tagCode}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="html" className="space-y-4">
              <div>
                <Label>HTML Integration Snippet</Label>
                <div className="relative">
                  <Textarea
                    className="font-mono text-sm min-h-[200px]"
                    value={`<!-- DNI Call Tracking Tag: ${selectedTag?.name} -->
<span class="tracking-number" data-tracking-number>${selectedTag?.numberToReplace || 'Your phone number here'}</span>

<!-- Place this script before closing </body> tag -->
<script src="http://localhost:5000/tracking/${selectedTag?.tagCode}.js"></script>`}
                    readOnly
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`<!-- HTML snippet for ${selectedTag?.tagCode} -->`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Manual Integration Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                      <div>
                        <h4 className="font-medium">Add CSS Classes</h4>
                        <p className="text-sm text-muted-foreground">
                          Add <code className="bg-muted px-1 rounded">tracking-number</code> class to phone number elements
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                      <div>
                        <h4 className="font-medium">Include JavaScript</h4>
                        <p className="text-sm text-muted-foreground">
                          Add the tracking script to your website before the closing body tag
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                      <div>
                        <h4 className="font-medium">Test Integration</h4>
                        <p className="text-sm text-muted-foreground">
                          Visit your website to verify numbers are being replaced dynamically
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}