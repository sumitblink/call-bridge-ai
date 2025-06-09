import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Buyers from "@/pages/buyers";
import Agents from "@/pages/agents";
import Calls from "@/pages/calls";
import WebhookTest from "@/pages/webhook-test";
import WebhookSetup from "@/pages/webhook-setup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/buyers" component={Buyers} />
      <Route path="/agents" component={Agents} />
      <Route path="/calls" component={Calls} />
      <Route path="/webhook-test" component={WebhookTest} />
      <Route path="/webhook-setup" component={WebhookSetup} />
      <Route component={NotFound} />
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
