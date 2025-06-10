import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import StatsGrid from "@/components/StatsGrid";
import CampaignList from "@/components/CampaignList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";

interface DashboardStats {
  activeCampaigns: number;
  totalCalls: number;
  successRate: string;
  activeAgents: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  
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
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger call');
      }
      
      return response.json();
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
              Test your Twilio integration with a live call to +917045484791
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestCall}
              disabled={testCallMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {testCallMutation.isPending ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Test Call
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
