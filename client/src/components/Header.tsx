import { Button } from "@/components/ui/button";
import { Bell, Plus, User, LogOut, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/dashboard":
      return {
        title: "Dashboard",
        description: "Manage your call center campaigns and track performance"
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
  const { user } = useAuth();
  const pageInfo = getPageInfo(location);
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/logout', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      window.location.href = '/';
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = () => {
    const userData = user as any;
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    }
    if (userData?.email) {
      return userData.email[0].toUpperCase();
    }
    return 'DU';
  };

  const getUserDisplayName = () => {
    const userData = user as any;
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData?.email) {
      return userData.email;
    }
    return 'Demo User';
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

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={(user as any)?.profileImageUrl || ""} 
                    alt={getUserDisplayName()} 
                  />
                  <AvatarFallback className="bg-primary-100 text-primary-700">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {(user as any)?.email || 'demo@callcenter.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
