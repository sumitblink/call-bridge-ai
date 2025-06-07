import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <StatsGrid stats={stats} isLoading={statsLoading} />
          <CampaignList campaigns={campaigns} isLoading={campaignLoading} />
        </main>
      </div>
    </div>
  );
}
