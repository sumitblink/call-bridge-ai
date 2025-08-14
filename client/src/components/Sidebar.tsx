import { Link, useLocation } from "wouter";
import { Phone, BarChart3, BellRing, Users, PhoneCall, DollarSign, PhoneForwarded, Mic, Zap, UserCheck, LogOut, Menu, X, Database, Target, GitBranch, Activity, TrendingUp, ChevronDown, ChevronRight, ExternalLink, Settings, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3, current: true },
  { name: "Campaigns", href: "/campaigns", icon: BellRing, current: false },

  { name: "Phone Numbers", href: "/phone-numbers", icon: Phone, current: false },
  { name: "Buyers", href: "/buyers", icon: DollarSign, current: false },
  { name: "Targets", href: "/targets", icon: Target, current: false },
  { name: "Publishers", href: "/publishers", icon: UserCheck, current: false },
  { name: "Agents", href: "/agents", icon: Users, current: false },
  { name: "RTB Management", href: "/rtb-management", icon: Target, current: false },
  { name: "Call Flows", href: "/call-flows", icon: GitBranch, current: false },
  { name: "Integrations", href: "/integrations", icon: Zap, current: false },


];

const reportingNavigation = [
  { name: "Call Details", href: "/call-details", icon: Activity, current: false },
  { name: "Traffic Analytics", href: "/analytics", icon: BarChart3, current: false },
  { name: "Enhanced Reporting", href: "/enhanced-reporting", icon: PhoneCall, current: false },
];

const settingsNavigation = [
  { name: "Predictive Routing", href: "/settings/predictive-routing", icon: Settings, current: false },
];

const docsNavigation = [
  { name: "Platform Documentation", href: "/documentation", icon: BookOpen, current: false },
  { name: "API Documentation", href: "/api-documentation", icon: Database, current: false },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReportingExpanded, setIsReportingExpanded] = useState(true);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const [isDocsExpanded, setIsDocsExpanded] = useState(true);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/logout', 'POST', {});
      return response.json();
    },
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-sm border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Phone className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && <span className="ml-3 text-xl font-semibold text-gray-900">CallCenter</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 ml-[0px] mr-[0px] pl-[11px] pr-[11px]">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group
                ${isActive
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.name : ''}
            >
              <Icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && item.name}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}

        {/* Settings Section */}
        <div className="pt-3 border-t border-gray-100">
          {!isCollapsed && (
            <button
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>Settings</span>
              {isSettingsExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
          )}
          
          {/* Collapsed sidebar - show settings items without grouping */}
          {isCollapsed && settingsNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                  justify-center
                `}
                title={item.name}
              >
                <Icon className="w-6 h-6" />
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              </Link>
            );
          })}

          {/* Expanded sidebar - show collapsible settings items */}
          {!isCollapsed && isSettingsExpanded && settingsNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group ml-3
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Reporting Section */}
        <div className="pt-3 border-t border-gray-100">
          {!isCollapsed && (
            <button
              onClick={() => setIsReportingExpanded(!isReportingExpanded)}
              className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>Reporting</span>
              {isReportingExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
          )}
          
          {/* Collapsed sidebar - show reporting items without grouping */}
          {isCollapsed && reportingNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                  justify-center
                `}
                title={item.name}
              >
                <Icon className="w-6 h-6" />
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              </Link>
            );
          })}

          {/* Expanded sidebar - show collapsible reporting items */}
          {!isCollapsed && isReportingExpanded && reportingNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group ml-3
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Docs Section */}
        <div className="pt-3 border-t border-gray-100">
          {!isCollapsed && (
            <button
              onClick={() => setIsDocsExpanded(!isDocsExpanded)}
              className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>Docs</span>
              {isDocsExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
          )}
          
          {/* Collapsed sidebar - show docs items without grouping */}
          {isCollapsed && docsNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                  justify-center
                `}
                title={item.name}
              >
                <Icon className="w-6 h-6" />
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              </Link>
            );
          })}

          {/* Expanded sidebar - show collapsible docs items */}
          {!isCollapsed && isDocsExpanded && docsNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer relative group ml-3
                  ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-xs">
                  {getUserInitials()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500">{(user as any)?.email || 'demo@callcenter.com'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-xs">
                {getUserInitials()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-gray-400 hover:text-gray-600 relative group"
                disabled={logoutMutation.isPending}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
                
                {/* Tooltip for collapsed state */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Logout
                </div>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
