import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import Documentation from "@/pages/documentation";
import Campaigns from "@/pages/campaigns";
import CampaignDetail from "@/pages/campaign-detail";
import Buyers from "@/pages/buyers";
import Publishers from "@/pages/publishers";
import Agents from "@/pages/agents";
import CallControl from "@/pages/call-control";
import IVRSetup from "@/pages/ivr-setup";
import Integrations from "@/pages/integrations";
import PhoneNumbers from "@/pages/phone-numbers";
import RTBManagement from "@/pages/rtb-management";
import Feedback from "@/pages/feedback";
import CallFlows from "@/pages/call-flows";
import RedTrackPage from "@/pages/redtrack";

import RealTrackingDashboard from "@/pages/real-tracking-dashboard";
import AdvancedAnalyticsPage from "@/pages/advanced-analytics";
import UsefulAnalytics from "@/pages/useful-analytics";

import EnhancedReporting from "@/pages/enhanced-reporting";


import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <div className="w-6 h-6 bg-white rounded-full opacity-75"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/documentation" component={Documentation} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Auth} />
          <Route component={Auth} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:campaignId" component={CampaignDetail} />
          <Route path="/buyers" component={Buyers} />
          <Route path="/publishers" component={Publishers} />
          <Route path="/agents" component={Agents} />

          <Route path="/phone-numbers" component={PhoneNumbers} />
          <Route path="/rtb-management" component={RTBManagement} />
          <Route path="/call-flows" component={CallFlows} />


          <Route path="/analytics" component={UsefulAnalytics} />
          <Route path="/enhanced-reporting" component={EnhancedReporting} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/redtrack" component={RedTrackPage} />
          <Route path="/help" component={Feedback} />

          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
