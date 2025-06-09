import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Users, Target, DollarSign, Play, Pause } from "lucide-react";
import Layout from "@/components/Layout";

interface FlowStep {
  id: number;
  title: string;
  description: string;
  entity: string;
  role: string;
  action: string;
  payment?: string;
  active: boolean;
}

export default function CallFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch real data to show in the flow
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    select: (data) => data.slice(0, 2) // Show first 2 campaigns
  });

  const { data: buyers } = useQuery({
    queryKey: ["/api/buyers"],
    select: (data) => data.slice(0, 2) // Show first 2 buyers
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
    select: (data) => data.slice(0, 2) // Show first 2 agents
  });

  const { data: publishers } = useQuery({
    queryKey: ["/api/publishers"],
    select: (data) => data.slice(0, 2) // Show first 2 publishers
  });

  const flowSteps: FlowStep[] = [
    {
      id: 1,
      title: "Publisher Generates Call",
      description: "Publisher runs ads and generates a call to campaign phone number",
      entity: "Publisher",
      role: "Traffic Source",
      action: "Runs Google Ads → Customer calls campaign number",
      payment: "Earns $25 per qualified call",
      active: currentStep >= 0
    },
    {
      id: 2,
      title: "Campaign Receives Call",
      description: "Call routes through campaign system for processing",
      entity: "Campaign",
      role: "Call Router",
      action: "Receives call → Applies filters → Finds available buyers",
      active: currentStep >= 1
    },
    {
      id: 3,
      title: "Buyers Get Pinged",
      description: "System pings buyers to check availability and bid",
      entity: "Buyers",
      role: "Call Purchasers",
      action: "Receive ping → Submit bids → Highest bidder wins",
      payment: "Pays $40 for accepted call",
      active: currentStep >= 2
    },
    {
      id: 4,
      title: "Call Connected to Buyer",
      description: "Winning buyer receives the call connection",
      entity: "Buyer",
      role: "Call Recipient",
      action: "Accepts call → Routes to their internal system",
      active: currentStep >= 3
    },
    {
      id: 5,
      title: "Agent Handles Call",
      description: "Buyer's agent speaks with the original caller",
      entity: "Agent",
      role: "Call Handler",
      action: "Answers call → Qualifies lead → Closes sale",
      payment: "Earns hourly wage + commission",
      active: currentStep >= 4
    }
  ];

  const startAnimation = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= flowSteps.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
  };

  const resetAnimation = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "publisher": return <Target className="h-5 w-5" />;
      case "campaign": return <Phone className="h-5 w-5" />;
      case "buyers": 
      case "buyer": return <DollarSign className="h-5 w-5" />;
      case "agent": return <Users className="h-5 w-5" />;
      default: return <Phone className="h-5 w-5" />;
    }
  };

  const getEntityColor = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "publisher": return "bg-blue-500";
      case "campaign": return "bg-green-500";
      case "buyers":
      case "buyer": return "bg-purple-500";
      case "agent": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Call Flow Demonstration</h1>
            <p className="text-muted-foreground">See how Publishers, Campaigns, Buyers, and Agents work together</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={startAnimation} disabled={isPlaying}>
              <Play className="mr-2 h-4 w-4" />
              Start Demo
            </Button>
            <Button variant="outline" onClick={resetAnimation}>
              <Pause className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Flow Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Live Call Routing Flow</CardTitle>
            <CardDescription>Watch how a call moves through your system from Publisher to Agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {flowSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  <div className={`flex items-start space-x-4 p-4 rounded-lg border transition-all duration-500 ${
                    step.active ? 'bg-primary/5 border-primary' : 'bg-muted/30 border-muted'
                  }`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white transition-all duration-500 ${
                      step.active ? getEntityColor(step.entity) : 'bg-gray-400'
                    }`}>
                      {getEntityIcon(step.entity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        <Badge variant={step.active ? "default" : "secondary"}>
                          {step.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      <p className="text-sm font-medium">{step.action}</p>
                      {step.payment && (
                        <p className="text-sm text-green-600 font-medium mt-1">💰 {step.payment}</p>
                      )}
                    </div>
                  </div>
                  
                  {index < flowSteps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className={`h-6 w-6 transition-colors duration-500 ${
                        currentStep > index ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Entity Breakdown */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-blue-600">
                <Target className="mr-2 h-5 w-5" />
                Publishers
              </CardTitle>
              <CardDescription>Traffic Sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Role:</strong> Generate calls</p>
                <p className="text-sm"><strong>Method:</strong> Ads, websites, marketing</p>
                <p className="text-sm"><strong>Payment:</strong> Earn per call/minute</p>
                <p className="text-sm"><strong>Examples:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  <li>Google Ads affiliates</li>
                  <li>Lead gen websites</li>
                  <li>Social media marketers</li>
                </ul>
                {publishers && publishers.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium">Your Publishers:</p>
                    {publishers.map((pub: any) => (
                      <p key={pub.id} className="text-xs">{pub.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-green-600">
                <Phone className="mr-2 h-5 w-5" />
                Campaigns
              </CardTitle>
              <CardDescription>Call Routers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Role:</strong> Route incoming calls</p>
                <p className="text-sm"><strong>Method:</strong> Rules, filters, targeting</p>
                <p className="text-sm"><strong>Function:</strong> Connect callers to buyers</p>
                <p className="text-sm"><strong>Features:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  <li>Geographic targeting</li>
                  <li>Time restrictions</li>
                  <li>Call quality filters</li>
                </ul>
                {campaigns && campaigns.length > 0 && (
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <p className="text-xs font-medium">Your Campaigns:</p>
                    {campaigns.map((camp: any) => (
                      <p key={camp.id} className="text-xs">{camp.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-purple-600">
                <DollarSign className="mr-2 h-5 w-5" />
                Buyers
              </CardTitle>
              <CardDescription>Call Purchasers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Role:</strong> Purchase calls</p>
                <p className="text-sm"><strong>Method:</strong> Bidding, fixed rates</p>
                <p className="text-sm"><strong>Payment:</strong> Pay per accepted call</p>
                <p className="text-sm"><strong>Examples:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  <li>Insurance companies</li>
                  <li>Service providers</li>
                  <li>Lead buyers</li>
                </ul>
                {buyers && buyers.length > 0 && (
                  <div className="mt-3 p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium">Your Buyers:</p>
                    {buyers.map((buyer: any) => (
                      <p key={buyer.id} className="text-xs">{buyer.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-orange-600">
                <Users className="mr-2 h-5 w-5" />
                Agents
              </CardTitle>
              <CardDescription>Call Handlers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Role:</strong> Handle conversations</p>
                <p className="text-sm"><strong>Method:</strong> Phone, live chat</p>
                <p className="text-sm"><strong>Payment:</strong> Salary, hourly, commission</p>
                <p className="text-sm"><strong>Tasks:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  <li>Qualify leads</li>
                  <li>Close sales</li>
                  <li>Provide support</li>
                </ul>
                {agents && agents.length > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 rounded">
                    <p className="text-xs font-medium">Your Agents:</p>
                    {agents.map((agent: any) => (
                      <p key={agent.id} className="text-xs">{agent.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Money Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Flow</CardTitle>
            <CardDescription>How money moves through your call center</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-700 mb-2">You Pay Out</h3>
                <p className="text-sm text-red-600">Publishers: $25/call</p>
                <p className="text-sm text-red-600">Agents: $20/hour + commission</p>
                <p className="text-sm text-red-600">Platform: Infrastructure costs</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-700 mb-2">You Collect</h3>
                <p className="text-sm text-green-600">Buyers: $40/call</p>
                <p className="text-sm text-green-600">Premium features: Monthly fees</p>
                <p className="text-sm text-green-600">Volume bonuses: Tier pricing</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-700 mb-2">Your Profit</h3>
                <p className="text-sm text-blue-600">$40 - $25 = $15/call</p>
                <p className="text-sm text-blue-600">Minus agent costs</p>
                <p className="text-sm text-blue-600">= Net profit per call</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}