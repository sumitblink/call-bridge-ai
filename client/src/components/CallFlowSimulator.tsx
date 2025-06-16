import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Play, ArrowRight, User, Clock, Star } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface Buyer {
  id: number;
  name: string;
  phoneNumber: string | null;
  priority: number | null;
  dailyCap: number | null;
  concurrencyLimit: number | null;
  status: string | null;
}

interface RoutingResult {
  selectedBuyer: Buyer | null;
  reason: string;
  alternativeBuyers: Buyer[];
}

export default function CallFlowSimulator() {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [callerNumber, setCallerNumber] = useState("+1234567890");
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const { data: campaignBuyers = [] } = useQuery({
    queryKey: ['/api/campaigns', selectedCampaign, 'buyers'],
    enabled: !!selectedCampaign,
  });

  const simulateCall = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign to simulate the call flow",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    try {
      // Simulate the call routing logic
      const response = await fetch('/api/call-routing/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: parseInt(selectedCampaign),
          callerNumber,
        }),
      });

      const result = await response.json();
      setRoutingResult(result);
      
      toast({
        title: "Call Simulation Complete",
        description: `Call would be routed to: ${result.selectedBuyer?.name || 'No available buyer'}`,
      });
    } catch (error) {
      toast({
        title: "Simulation Error",
        description: "Failed to simulate call routing",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getBuyerStatusColor = (buyer: Buyer) => {
    if (!buyer.phoneNumber) return "destructive";
    if (buyer.status === "active") return "default";
    return "secondary";
  };

  const getPriorityIcon = (priority: number | null) => {
    if (!priority) return null;
    if (priority === 1) return <Star className="h-4 w-4 text-yellow-500" />;
    return <span className="text-sm font-medium">#{priority}</span>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Call Flow Simulator
          </CardTitle>
          <CardDescription>
            Test your call routing logic without making actual calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign: Campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="caller">Caller Number</Label>
              <Input
                id="caller"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>
          
          <Button 
            onClick={simulateCall} 
            disabled={!selectedCampaign || isSimulating}
            className="w-full"
          >
            <Phone className="h-4 w-4 mr-2" />
            {isSimulating ? "Simulating Call..." : "Simulate Call Routing"}
          </Button>
        </CardContent>
      </Card>

      {/* Campaign Buyers */}
      {selectedCampaign && campaignBuyers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Buyers</CardTitle>
            <CardDescription>
              Buyers configured for this campaign, ordered by priority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaignBuyers
                .sort((a: Buyer, b: Buyer) => (a.priority || 999) - (b.priority || 999))
                .map((buyer: Buyer) => (
                <div key={buyer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold">{buyer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {buyer.phoneNumber || "No phone number"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(buyer.priority)}
                      <Badge variant={getBuyerStatusColor(buyer)}>
                        {buyer.status || "unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    <span>Daily Cap: {buyer.dailyCap || "Unlimited"}</span>
                    <span>Concurrency: {buyer.concurrencyLimit || "Unlimited"}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routing Result */}
      {routingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Routing Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routingResult.selectedBuyer ? (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-green-700 dark:text-green-300">
                        Call Routed Successfully
                      </div>
                      <div className="text-sm">
                        To: {routingResult.selectedBuyer.name} ({routingResult.selectedBuyer.phoneNumber})
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                    Reason: {routingResult.reason}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-red-700 dark:text-red-300">
                        No Available Buyer
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {routingResult.reason}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {routingResult.alternativeBuyers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Alternative Buyers Considered:</h4>
                  <div className="space-y-2">
                    {routingResult.alternativeBuyers.map((buyer) => (
                      <div key={buyer.id} className="text-sm text-muted-foreground border-l-2 pl-3">
                        {buyer.name} - Not available (capacity/status)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testing Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">1</div>
              <span>Create multiple buyers with different priorities to test routing order</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">2</div>
              <span>Set daily caps and concurrency limits to test capacity constraints</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">3</div>
              <span>Change buyer status to test availability filtering</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">4</div>
              <span>Use different caller numbers to test any number-based routing rules</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}