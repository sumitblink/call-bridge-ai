import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import StatsGrid from "@/components/StatsGrid";
import CampaignList from "@/components/CampaignList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Campaign } from "@shared/schema";

interface DashboardStats {
  activeCampaigns: number;
  totalCalls: number;
  successRate: string;
  activeAgents: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [testPhoneNumber, setTestPhoneNumber] = useState("+1234567890");
  
  const { data: campaigns, isLoading: campaignLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const testCallMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerNumber: testPhoneNumber
        }),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to trigger call';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid response format from server');
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Call triggered successfully",
        description: `Test call initiated with SID: ${data.callSid}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error triggering call",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestCall = () => {
    testCallMutation.mutate();
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Test Call Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              System Testing
            </CardTitle>
            <CardDescription>
              Test your call routing system by simulating a call to a buyer number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testPhoneNumber">Buyer Phone Number</Label>
              <Input
                id="testPhoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter the phone number to simulate calling a buyer
              </p>
            </div>
            <Button 
              onClick={handleTestCall}
              disabled={testCallMutation.isPending || !testPhoneNumber.trim()}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              {testCallMutation.isPending ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2 animate-spin" />
                  Calling {testPhoneNumber}...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Test Call to {testPhoneNumber}
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will place a real call using your Twilio account
            </p>
          </CardContent>
        </Card>

        <StatsGrid stats={stats} isLoading={statsLoading} />
        <CampaignList campaigns={campaigns} isLoading={campaignLoading} />
      </div>
    </Layout>
  );
}
