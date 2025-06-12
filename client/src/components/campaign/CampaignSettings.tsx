import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Save, RefreshCw } from "lucide-react";

interface CampaignSettingsProps {
  campaign: any;
}

export default function CampaignSettings({ campaign }: CampaignSettingsProps) {
  const [settings, setSettings] = useState({
    name: campaign.name || "",
    description: campaign.description || "",
    status: campaign.status || "active",
    trackingId: campaign.trackingId || "",
    numberFormat: campaign.numberFormat || "(nnn) nnn-nnnn",
    duplicateCallHandling: campaign.duplicateCallHandling || "connect",
    routePreviouslyConnected: campaign.routePreviouslyConnected || "normally",
    handleAnonymousAsDuplicate: campaign.handleAnonymousAsDuplicate || false,
    payoutOncePerCaller: campaign.payoutOncePerCaller || false,
    recordCalls: campaign.recordCalls || true,
    trimSilence: campaign.trimSilence || true,
    targetDialAttempts: campaign.targetDialAttempts || 3,
    stirShakenAttestation: campaign.stirShakenAttestation || "disabled",
    filterRepeatCallers: campaign.filterRepeatCallers || 2,
    filterAnonymousAsSpam: campaign.filterAnonymousAsSpam || false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/campaigns/${campaign.id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Updated",
        description: "Campaign settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id.toString()] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update campaign settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Campaign ID copied to clipboard.",
    });
  };

  const generateTrackingId = () => {
    const newTrackingId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setSettings(prev => ({ ...prev, trackingId: newTrackingId }));
  };

  return (
    <div className="space-y-6">
      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="campaignId">Campaign ID</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="campaignId"
                  value={campaign.id}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(campaign.id.toString())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={settings.name}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingId">Tracking ID</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="trackingId"
                  value={settings.trackingId}
                  onChange={(e) => setSettings(prev => ({ ...prev, trackingId: e.target.value }))}
                  placeholder="Optional tracking ID"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateTrackingId}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberFormat">Number Format</Label>
              <Select
                value={settings.numberFormat}
                onValueChange={(value) => setSettings(prev => ({ ...prev, numberFormat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="(nnn) nnn-nnnn">(555) 123-4567</SelectItem>
                  <SelectItem value="nnn-nnn-nnnn">555-123-4567</SelectItem>
                  <SelectItem value="nnn.nnn.nnnn">555.123.4567</SelectItem>
                  <SelectItem value="nnnnnnnnnn">5551234567</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={settings.description}
              onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Campaign description (optional)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Routing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Call Routing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Report Duplicate Calls On</Label>
              <Select
                value={settings.duplicateCallHandling}
                onValueChange={(value) => setSettings(prev => ({ ...prev, duplicateCallHandling: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connect">Connect</SelectItem>
                  <SelectItem value="attempt">Attempt</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Route Previously Connected Calls</Label>
              <div className="flex space-x-2">
                <Button
                  variant={settings.routePreviouslyConnected === "normally" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, routePreviouslyConnected: "normally" }))}
                >
                  Normally
                </Button>
                <Button
                  variant={settings.routePreviouslyConnected === "toOriginal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, routePreviouslyConnected: "toOriginal" }))}
                >
                  To Original
                </Button>
                <Button
                  variant={settings.routePreviouslyConnected === "toDifferent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, routePreviouslyConnected: "toDifferent" }))}
                >
                  To Different
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Handle Anonymous Calls as Duplicate</Label>
                <p className="text-sm text-gray-500">Treat anonymous calls as potential duplicates</p>
              </div>
              <Switch
                checked={settings.handleAnonymousAsDuplicate}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, handleAnonymousAsDuplicate: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Payout Once Per Caller</Label>
                <p className="text-sm text-gray-500">Only pay out once per unique caller</p>
              </div>
              <Switch
                checked={settings.payoutOncePerCaller}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, payoutOncePerCaller: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Record Calls</Label>
                <p className="text-sm text-gray-500">Enable call recording for this campaign</p>
              </div>
              <Switch
                checked={settings.recordCalls}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, recordCalls: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Trim Silence</Label>
                <p className="text-sm text-gray-500">Remove silent portions from recordings</p>
              </div>
              <Switch
                checked={settings.trimSilence}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, trimSilence: checked }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="targetDialAttempts">Target Dial Attempts</Label>
              <Input
                id="targetDialAttempts"
                type="number"
                min="1"
                max="10"
                value={settings.targetDialAttempts}
                onChange={(e) => setSettings(prev => ({ ...prev, targetDialAttempts: parseInt(e.target.value) || 3 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Require STIR/SHAKEN Attestation</Label>
              <div className="flex space-x-2">
                <Button
                  variant={settings.stirShakenAttestation === "disabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, stirShakenAttestation: "disabled" }))}
                >
                  Account Setting (Disabled)
                </Button>
                <Button
                  variant={settings.stirShakenAttestation === "enabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, stirShakenAttestation: "enabled" }))}
                >
                  Enabled
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spam Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Spam Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="filterRepeatCallers">Filter Repeat Callers</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="filterRepeatCallers"
                  type="number"
                  min="0"
                  max="60"
                  value={settings.filterRepeatCallers}
                  onChange={(e) => setSettings(prev => ({ ...prev, filterRepeatCallers: parseInt(e.target.value) || 0 }))}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Filter Anonymous Calls As Spam</Label>
                <p className="text-sm text-gray-500">Block anonymous/private numbers</p>
              </div>
              <Switch
                checked={settings.filterAnonymousAsSpam}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, filterAnonymousAsSpam: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}