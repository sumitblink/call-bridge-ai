import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import StatsGrid from "@/components/StatsGrid";
import CampaignList from "@/components/CampaignList";
import type { Campaign } from "@shared/schema";

interface DashboardStats {
  activeCampaigns: number;
  totalCalls: number;
  successRate: string;
  activeAgents: number;
}

export default function Dashboard() {
  const { data: campaigns, isLoading: campaignLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Stats Section */}
        <StatsGrid stats={stats} isLoading={statsLoading} />
        
        {/* Campaigns Section */}
        <CampaignList campaigns={campaigns} isLoading={campaignLoading} />
      </div>
    </Layout>
  );
}