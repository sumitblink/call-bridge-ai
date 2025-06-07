import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const { toast } = useToast();

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
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your call center campaigns and track performance</p>
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
