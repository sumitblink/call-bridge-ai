import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, Code, Copy, Settings, BarChart3, Phone, Globe, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to format phone numbers consistently
const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  // Remove all non-digits
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    const formatted = digits.slice(1);
    return `(${formatted.slice(0, 3)}) ${formatted.slice(3, 6)}-${formatted.slice(6)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not standard US format
  return phoneNumber;
};

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
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CallTrackingTag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    tagCode: "",
    primaryNumberId: "none",
    numberToReplace: "",
    poolId: "none",
    rotationStrategy: "round_robin",
    publisherId: "none",
    captureUserData: false,
    sessionTimeout: 1800,
    stickyDuration: 86400
  });
  const [settingsData, setSettingsData] = useState({
    name: "",
    tagCode: "",
    primaryNumberId: "none",
    numberToReplace: "",
    poolId: "none",
    rotationStrategy: "round_robin",
    publisherId: "none",
    captureUserData: false,
    sessionTimeout: 1800,
    stickyDuration: 86400
  });

  // Fetch campaign data to check routing type
  const { data: campaign } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}`],
  });

  // Fetch tracking tags for campaign
  const { data: trackingTags = [], isLoading: isLoadingTags } = useQuery<CallTrackingTag[]>({
    queryKey: [`/api/campaigns/${campaignId}/tracking-tags`],
  });

  // Fetch phone numbers for dropdown
  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers"],
  });

  // Fetch number pools for dropdown (only if campaign uses pool routing)
  const { data: numberPools = [] } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools"],
    enabled: campaign?.routingType === "pool",
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
        primaryNumberId: "none",
        numberToReplace: "",
        poolId: "none",
        rotationStrategy: "round_robin",
        publisherId: "none",
        captureUserData: false,
        sessionTimeout: 1800,
        stickyDuration: 86400
      });
      toast({
        title: "Success",
        description: "Call tracking tag created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Create tag error:", error);
      
      // Handle specific duplicate tag code error
      if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        toast({
          title: "Tag Code Already Exists",
          description: `The tag code "${formData.tagCode}" is already in use. Please choose a different tag code.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create tracking tag",
          variant: "destructive",
        });
      }
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

  // Update tracking tag mutation
  const updateTagMutation = useMutation({
    mutationFn: ({ tagId, data }: { tagId: number; data: any }) => 
      apiRequest(`/api/tracking-tags/${tagId}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/tracking-tags`] });
      setIsSettingsDialogOpen(false);
      toast({
        title: "Success",
        description: "Tracking tag updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tracking tag",
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
      primaryNumberId: formData.primaryNumberId && formData.primaryNumberId !== "none" ? parseInt(formData.primaryNumberId) : undefined,
      poolId: formData.poolId && formData.poolId !== "none" ? parseInt(formData.poolId) : undefined,
      publisherId: formData.publisherId && formData.publisherId !== "none" ? parseInt(formData.publisherId) : undefined,
    });
  };

  const handleSettingsSubmit = () => {
    if (!selectedTag) return;

    if (!settingsData.name || !settingsData.tagCode) {
      toast({
        title: "Validation Error",
        description: "Tag name and code are required",
        variant: "destructive",
      });
      return;
    }

    updateTagMutation.mutate({
      tagId: selectedTag.id,
      data: {
        ...settingsData,
        primaryNumberId: settingsData.primaryNumberId && settingsData.primaryNumberId !== "none" ? parseInt(settingsData.primaryNumberId) : undefined,
        poolId: settingsData.poolId && settingsData.poolId !== "none" ? parseInt(settingsData.poolId) : undefined,
        publisherId: settingsData.publisherId && settingsData.publisherId !== "none" ? parseInt(settingsData.publisherId) : undefined,
      }
    });
  };

  const showCodeSnippets = (tag: CallTrackingTag) => {
    setSelectedTag(tag);
    setIsCodeDialogOpen(true);
  };

  const showSettings = (tag: CallTrackingTag) => {
    setSelectedTag(tag);
    setSettingsData({
      name: tag.name || "",
      tagCode: tag.tagCode || "",
      primaryNumberId: tag.primaryNumberId?.toString() || "none",
      numberToReplace: tag.numberToReplace || "",
      poolId: tag.poolId?.toString() || "none",
      rotationStrategy: tag.rotationStrategy || "round_robin",
      publisherId: tag.publisherId?.toString() || "none",
      captureUserData: tag.captureUserData || false,
      sessionTimeout: tag.sessionTimeout || 1800,
      stickyDuration: tag.stickyDuration || 86400
    });
    setIsSettingsDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const generateSimpleTrackingCode = (campaignId: string) => {
    const currentDomain = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const baseUrl = `${protocol}//${currentDomain}${port}`;
    
    return `<script src="${baseUrl}/js/t.js" data-campaign="${campaignId}" async></script>`;
  };

  const generateJavaScriptCode = (tag: any) => {
    if (!tag) return '';
    
    const currentDomain = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const baseUrl = `${protocol}//${currentDomain}${port}`;
    

    
    return `<script>
(function() {
  'use strict';
  
  var DNI = {
    config: {
      tagCode: '${tag.tagCode}',
      apiUrl: '${baseUrl}/api/dni/track',
      timeout: 5000,
      captureUserData: ${tag.captureUserData || false},
      debug: false
    },
    
    init: function() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.replaceNumbers.bind(this));
      } else {
        this.replaceNumbers();
      }
    },
    
    replaceNumbers: function() {
      var elements = document.querySelectorAll('.tracking-number, [data-tracking-number]');
      if (elements.length === 0) {
        console.warn('DNI: No tracking number elements found');
        return;
      }
      
      this.getTrackingNumber(function(response) {
        if (response.success && response.formattedNumber) {
          for (var i = 0; i < elements.length; i++) {
            elements[i].textContent = response.formattedNumber;
            // Update href if it's a link
            if (elements[i].tagName === 'A') {
              elements[i].href = 'tel:' + response.phoneNumber;
            }
          }
        }
      });
    },
    
    getTrackingNumber: function(callback) {
      var requestData = {
        tagCode: this.config.tagCode,
        sessionId: this.getSessionId(),
        domain: window.location.hostname,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      };
      
      if (this.config.captureUserData) {
        var urlParams = new URLSearchParams(window.location.search);
        // Standard UTM parameters
        requestData.utmSource = urlParams.get('utm_source');
        requestData.utmMedium = urlParams.get('utm_medium');
        requestData.utmCampaign = urlParams.get('utm_campaign');
        requestData.utmContent = urlParams.get('utm_content');
        requestData.utmTerm = urlParams.get('utm_term');
        
        // Custom URL parameters (auto-generated from configuration)
        requestData.publisher = urlParams.get('publisher');
        requestData.gclid = urlParams.get('gclid');
        requestData.fbclid = urlParams.get('fbclid');
        requestData.msclkid = urlParams.get('msclkid');
        requestData.ttclid = urlParams.get('ttclid');
        requestData.twclid = urlParams.get('twclid');
        requestData.liclid = urlParams.get('liclid');
        requestData.subid = urlParams.get('subid');
        requestData.clickid = urlParams.get('clickid');
        requestData.affid = urlParams.get('affid');
        requestData.pubid = urlParams.get('pubid');
        requestData.source = urlParams.get('source');
        requestData.medium = urlParams.get('medium');
        requestData.campaign = urlParams.get('campaign');
        requestData.content = urlParams.get('content');
        requestData.term = urlParams.get('term');
        requestData.keyword = urlParams.get('keyword');
        requestData.placement = urlParams.get('placement');
        requestData.adgroup = urlParams.get('adgroup');
        requestData.creative = urlParams.get('creative');
        requestData.device = urlParams.get('device');
        requestData.network = urlParams.get('network');
        requestData.matchtype = urlParams.get('matchtype');
        requestData.adposition = urlParams.get('adposition');
        requestData.target = urlParams.get('target');
        requestData.targetid = urlParams.get('targetid');
        requestData.loc_physical_ms = urlParams.get('loc_physical_ms');
        requestData.loc_interest_ms = urlParams.get('loc_interest_ms');
      }
      
      fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        mode: 'cors'
      })
      .then(function(response) {
        return response.json();
      })
      .then(callback)
      .catch(function(error) {
        console.error('DNI Error:', error);
      });
    },
    
    getSessionId: function() {
      var sessionId = sessionStorage.getItem('dni_session_id');
      if (!sessionId) {
        sessionId = 'dni_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('dni_session_id', sessionId);
      }
      return sessionId;
    }
  };
  
  DNI.init();
})();
</script>`;
  };

  const generateHTMLSnippet = (tag: any) => {
    if (!tag) return '';
    
    return `<!-- DNI Call Tracking Tag: ${tag.name} -->
<!-- Replace your phone numbers with this structure -->
<span class="tracking-number">${tag.numberToReplace || '(555) 123-4567'}</span>

<!-- Or as a clickable link -->
<a href="tel:+15551234567" class="tracking-number">${tag.numberToReplace || '(555) 123-4567'}</a>

<!-- Place this script before closing </body> tag -->
${generateJavaScriptCode(tag)}`;
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
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="name">Tag Name *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>A descriptive name for this tracking tag<br/>
                            Examples: "Homepage Banner", "Contact Form"</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Homepage Banner"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="tagCode">Tag Code *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Unique code identifier for this tag<br/>
                            Used in analytics and reporting</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="primaryNumber">Primary Number</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Default number to display when no pool is used<br/>
                            This is your fallback tracking number</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={formData.primaryNumberId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, primaryNumberId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Publisher Number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No primary number</SelectItem>
                      {phoneNumbers.map((number) => (
                        <SelectItem key={number.id} value={number.id.toString()}>
                          {number.friendlyName || formatPhoneNumber(number.phoneNumber)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="numberToReplace">Number to Replace</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Original number on your website to replace<br/>
                            The tracking script will replace this number dynamically</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="numberToReplace"
                    value={formData.numberToReplace}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberToReplace: e.target.value }))}
                    placeholder="e.g., (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {campaign?.routingType === "pool" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label htmlFor="pool">Number Pool</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pool of numbers for dynamic insertion<br/>
                              Perfect for testing different numbers with visitors</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={formData.poolId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, poolId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Number Pool" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No pool</SelectItem>
                        {numberPools.map((pool) => (
                          <SelectItem key={pool.id} value={pool.id.toString()}>
                            {pool.name} ({pool.poolSize} numbers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Campaign Number</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This campaign uses direct routing<br/>
                              Tracking will use the assigned campaign number</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {campaign?.phoneNumber ? formatPhoneNumber(campaign.phoneNumber) : "No number assigned"}
                      </span>
                      <Badge variant="secondary">Direct</Badge>
                    </div>
                  </div>
                )}
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
                    <SelectItem value="none">No publisher</SelectItem>
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
                          <DropdownMenuItem onClick={() => showSettings(tag)}>
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
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="simple">Simple (Recommended)</TabsTrigger>
              <TabsTrigger value="javascript">Advanced JavaScript</TabsTrigger>
              <TabsTrigger value="html">HTML Snippet</TabsTrigger>
              <TabsTrigger value="manual">Manual Integration</TabsTrigger>
            </TabsList>
            <TabsContent value="simple" className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">You only need to add this once per campaign</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Copy and paste this snippet in your page header. It will search for phone numbers to replace and swap them with Pool Numbers.
                </p>
              </div>
              <div>
                <Label>One-Line Script Tag (Ringba Style)</Label>
                <div className="relative">
                  <Textarea
                    className="font-mono text-sm h-16"
                    value={selectedTag?.campaignId ? generateSimpleTrackingCode(selectedTag.campaignId) : ''}
                    readOnly
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => selectedTag?.campaignId && copyToClipboard(generateSimpleTrackingCode(selectedTag.campaignId))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">How it works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Automatically detects phone numbers on your page</li>
                    <li>• Replaces them with tracking numbers from your pool</li>
                    <li>• Captures all URL parameters (publisher, UTM, click IDs)</li>
                    <li>• Works on any website without configuration</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="javascript" className="space-y-4">
              <div>
                <Label>Advanced JavaScript Code</Label>
                <div className="relative">
                  <Textarea
                    className="font-mono text-sm min-h-[300px]"
                    value={selectedTag ? generateJavaScriptCode(selectedTag) : ''}
                    readOnly
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => selectedTag && copyToClipboard(generateJavaScriptCode(selectedTag))}
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
                    value={selectedTag ? generateHTMLSnippet(selectedTag) : ''}
                    readOnly
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => selectedTag && copyToClipboard(generateHTMLSnippet(selectedTag))}
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

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Edit Tracking Tag - {selectedTag?.name}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-name">Tag Name *</Label>
                <Input
                  id="settings-name"
                  value={settingsData.name}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Homepage Banner"
                />
              </div>
              <div>
                <Label htmlFor="settings-tagCode">Tag Code *</Label>
                <Input
                  id="settings-tagCode"
                  value={settingsData.tagCode}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, tagCode: e.target.value }))}
                  placeholder="e.g., homepage_banner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-primaryNumber">Primary Phone Number</Label>
                <Select
                  value={settingsData.primaryNumberId}
                  onValueChange={(value) => setSettingsData(prev => ({ ...prev, primaryNumberId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No primary number</SelectItem>
                    {phoneNumbers.map((phone) => (
                      <SelectItem key={phone.id} value={phone.id.toString()}>
                        {phone.friendlyName || formatPhoneNumber(phone.phoneNumber)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="settings-numberToReplace">Number to Replace</Label>
                <Input
                  id="settings-numberToReplace"
                  value={settingsData.numberToReplace}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, numberToReplace: e.target.value }))}
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {campaign?.routingType === "pool" ? (
                <div>
                  <Label htmlFor="settings-pool">Number Pool</Label>
                  <Select
                    value={settingsData.poolId}
                    onValueChange={(value) => setSettingsData(prev => ({ ...prev, poolId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select number pool" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No pool</SelectItem>
                      {numberPools.map((pool) => (
                        <SelectItem key={pool.id} value={pool.id.toString()}>
                          {pool.name} ({pool.poolSize} numbers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Campaign Number</Label>
                  <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {campaign?.phoneNumber ? formatPhoneNumber(campaign.phoneNumber) : "No number assigned"}
                    </span>
                    <Badge variant="secondary">Direct</Badge>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="settings-rotationStrategy">Rotation Strategy</Label>
                <Select
                  value={settingsData.rotationStrategy}
                  onValueChange={(value) => setSettingsData(prev => ({ ...prev, rotationStrategy: value }))}
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
              <Label htmlFor="settings-publisher">Publisher</Label>
              <Select
                value={settingsData.publisherId}
                onValueChange={(value) => setSettingsData(prev => ({ ...prev, publisherId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select publisher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No publisher</SelectItem>
                  {publishers.map((publisher) => (
                    <SelectItem key={publisher.id} value={publisher.id.toString()}>
                      {publisher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="settings-captureUserData"
                  checked={settingsData.captureUserData}
                  onCheckedChange={(checked) => setSettingsData(prev => ({ ...prev, captureUserData: checked === true }))}
                />
                <Label htmlFor="settings-captureUserData">Capture User Data (UTM parameters, referrer, etc.)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="settings-sessionTimeout">Session Timeout (seconds)</Label>
                  <Input
                    id="settings-sessionTimeout"
                    type="number"
                    value={settingsData.sessionTimeout}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 1800 }))}
                    min="300"
                    max="7200"
                  />
                </div>
                <div>
                  <Label htmlFor="settings-stickyDuration">Sticky Duration (seconds)</Label>
                  <Input
                    id="settings-stickyDuration"
                    type="number"
                    value={settingsData.stickyDuration}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, stickyDuration: parseInt(e.target.value) || 86400 }))}
                    min="3600"
                    max="2592000"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSettingsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSettingsSubmit}
              disabled={updateTagMutation.isPending}
            >
              {updateTagMutation.isPending ? "Updating..." : "Update Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}