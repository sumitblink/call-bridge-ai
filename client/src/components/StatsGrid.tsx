import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Phone, TrendingUp, Users } from "lucide-react";

interface Stats {
  activeCampaigns: number;
  totalCalls: number;
  successRate: string;
  activeAgents: number;
}

interface StatsGridProps {
  stats?: Stats;
  isLoading: boolean;
}

const statItems = [
  {
    name: "Active Campaigns",
    key: "activeCampaigns" as keyof Stats,
    icon: BellRing,
    color: "text-green-600 bg-green-100",
    change: "+2.5%",
    changeText: "from last month",
    changeColor: "text-green-600",
  },
  {
    name: "Total Calls",
    key: "totalCalls" as keyof Stats,
    icon: Phone,
    color: "text-blue-600 bg-blue-100",
    change: "+12.3%",
    changeText: "from last week",
    changeColor: "text-green-600",
  },
  {
    name: "Success Rate",
    key: "successRate" as keyof Stats,
    icon: TrendingUp,
    color: "text-yellow-600 bg-yellow-100",
    change: "-1.2%",
    changeText: "from last week",
    changeColor: "text-red-600",
  },
  {
    name: "Active Agents",
    key: "activeAgents" as keyof Stats,
    icon: Users,
    color: "text-purple-600 bg-purple-100",
    change: "+3 agents",
    changeText: "this week",
    changeColor: "text-green-600",
  },
];

export default function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statItems.map((item, index) => (
          <Card key={index} className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="w-12 h-12 rounded-lg" />
              </div>
              <div className="flex items-center mt-4">
                <Skeleton className="h-4 w-12 mr-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statItems.map((item, index) => (
          <Card key={index} className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-sm text-gray-500 font-medium">No data</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => {
        const value = stats[item.key];
        const displayValue = typeof value === "number" ? value.toLocaleString() : value;
        
        return (
          <Card key={index} className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{displayValue}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className={`text-sm font-medium ${item.changeColor}`}>{item.change}</span>
                <span className="text-sm text-gray-500 ml-2">{item.changeText}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
