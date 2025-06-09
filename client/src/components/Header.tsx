import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/dashboard":
      return {
        title: "Dashboard",
        description: "Manage your call center campaigns and track performance"
      };
    case "/call-flow":
      return {
        title: "Call Flow Demo",
        description: "Simulate and test call routing scenarios"
      };
    case "/campaigns":
      return {
        title: "Campaigns",
        description: "Manage your call center campaigns"
      };
    case "/buyers":
      return {
        title: "Buyers",
        description: "Manage call buyers and their configurations"
      };
    case "/publishers":
      return {
        title: "Publishers",
        description: "Manage traffic sources and publisher relationships"
      };
    case "/agents":
      return {
        title: "Agents",
        description: "Monitor agent performance and manage team"
      };
    case "/calls":
      return {
        title: "Live Call Monitoring",
        description: "Monitor and manage all incoming calls in real-time"
      };
    case "/call-control":
      return {
        title: "Call Control",
        description: "Real-time call management and controls"
      };
    case "/ivr-setup":
      return {
        title: "IVR Setup",
        description: "Configure interactive voice response flows"
      };
    case "/integrations":
      return {
        title: "Integrations",
        description: "Manage platform integrations and connections"
      };
    case "/webhook-test":
      return {
        title: "Webhook Setup",
        description: "Configure and test webhook endpoints"
      };
    default:
      return {
        title: "CallCenter",
        description: "Professional call routing platform"
      };
  }
};

export default function Header() {
  const { toast } = useToast();
  const [location] = useLocation();
  const pageInfo = getPageInfo(location);

  const handleNewCampaign = () => {
    toast({
      title: "New Campaign",
      description: "Campaign creation form would be opened here.",
    });
  };

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "You have 3 new notifications.",
    });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{pageInfo.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{pageInfo.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleNotifications}
            className="relative text-gray-400 hover:text-gray-500"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>
          
          {/* New Campaign Button */}
          <Button 
            onClick={handleNewCampaign}
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>
    </header>
  );
}
