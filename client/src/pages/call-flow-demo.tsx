import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PhoneCall, Phone, ArrowRight, CheckCircle, XCircle, Clock, Users, PlayCircle, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CallFlowStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  details?: string;
  timestamp?: string;
}

export default function CallFlowDemo() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [callerNumber, setCallerNumber] = useState('+919876543210');
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<CallFlowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
    retry: false,
  });

  const { data: buyers } = useQuery({
    queryKey: [`/api/campaigns/${selectedCampaign}/buyers`],
    retry: false,
    enabled: !!selectedCampaign,
  });

  const runCallFlowDemo = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/campaigns/test-call', 'POST', {
        campaignId: parseInt(selectedCampaign),
        callerNumber
      });
      return await response.json();
    },
    onSuccess: (data) => {
      simulateRealCallFlow(data);
    },
    onError: (error: any) => {
      toast({
        title: "Demo Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsRunning(false);
    }
  });

  const simulateRealCallFlow = async (routingData: any) => {
    const campaign = campaigns?.find((c: any) => c.id === parseInt(selectedCampaign));
    
    const callSteps: CallFlowStep[] = [
      {
        step: 1,
        title: 'Customer Dials Campaign Number',
        description: `Real customer calls ${campaign?.phoneNumber}`,
        status: 'pending',
        details: `Customer location: India | Calling from: ${callerNumber}`
      },
      {
        step: 2,
        title: 'Twilio Receives Call',
        description: 'Twilio cloud service captures the incoming call',
        status: 'pending',
        details: 'Call enters Twilio voice network and triggers webhook'
      },
      {
        step: 3,
        title: 'Webhook Triggers System',
        description: 'Your server receives call notification instantly',
        status: 'pending',
        details: `POST webhook to: https://yourapp.com/api/twilio/webhook`
      },
      {
        step: 4,
        title: 'Campaign Identification',
        description: `System identifies: ${campaign?.name}`,
        status: 'pending',
        details: `Campaign ID: ${selectedCampaign} | Status: Active`
      },
      {
        step: 5,
        title: 'Buyer Routing Engine',
        description: 'Analyzing all available buyers for this campaign',
        status: 'pending',
        details: `Found ${buyers?.length || 0} configured buyers`
      },
      {
        step: 6,
        title: 'Priority & Availability Check',
        description: 'Checking buyer status, daily caps, and concurrency',
        status: 'pending',
        details: 'Evaluating: Active status, phone availability, call limits'
      },
      {
        step: 7,
        title: 'Buyer Selection',
        description: routingData.selectedBuyer 
          ? `Selected: ${routingData.selectedBuyer.name}`
          : 'No buyers available - call will be rejected',
        status: 'pending',
        details: routingData.selectedBuyer 
          ? `Priority: ${routingData.selectedBuyer.priority} | Phone: ${routingData.selectedBuyer.phoneNumber}`
          : `Reason: ${routingData.reason}`
      },
      {
        step: 8,
        title: 'Call Bridging',
        description: routingData.selectedBuyer 
          ? `Connecting customer to ${routingData.selectedBuyer.name}`
          : 'Playing busy signal to customer',
        status: 'pending',
        details: routingData.selectedBuyer 
          ? `Dialing buyer at ${routingData.selectedBuyer.phoneNumber}`
          : 'Customer hears: "All agents are busy, please try again later"'
      },
      {
        step: 9,
        title: 'Call Tracking & Analytics',
        description: 'Recording call data for reporting and billing',
        status: 'pending',
        details: `Call ID: ${routingData.callSid} | Duration tracking started`
      },
      {
        step: 10,
        title: 'Live Conversation',
        description: routingData.selectedBuyer 
          ? 'Customer and buyer are now connected'
          : 'Call ended - no connection made',
        status: 'pending',
        details: routingData.selectedBuyer 
          ? 'Call recording active | Analytics tracking in progress'
          : 'System ready for next incoming call'
      }
    ];

    setSteps(callSteps);
    setCurrentStep(0);

    // Simulate step-by-step execution with realistic timing
    for (let i = 0; i < callSteps.length; i++) {
      const delay = i < 4 ? 800 : i < 7 ? 1200 : 1000; // Faster for initial steps
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const timestamp = new Date().toLocaleTimeString();
      
      setSteps(prev => prev.map((step, index) => {
        if (index === i) {
          return { 
            ...step, 
            status: (i === 7 && !routingData.selectedBuyer) ? 'failed' : 'active',
            timestamp
          };
        }
        if (index < i) {
          return { 
            ...step, 
            status: (step.status === 'failed') ? 'failed' : 'completed'
          };
        }
        return step;
      }));
      setCurrentStep(i);

      // If buyer selection fails, mark subsequent steps as failed
      if (i === 6 && !routingData.selectedBuyer) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSteps(prev => prev.map((step, index) => {
          if (index > 6) {
            return { ...step, status: 'failed' };
          }
          return step;
        }));
        break;
      }
    }

    // Final completion
    await new Promise(resolve => setTimeout(resolve, 500));
    setSteps(prev => prev.map((step, index) => {
      if (index === callSteps.length - 1 && step.status !== 'failed') {
        return { ...step, status: 'completed' };
      }
      return step;
    }));
    
    setIsRunning(false);
  };

  const handleStartDemo = () => {
    if (!selectedCampaign) {
      toast({
        title: "Select Campaign",
        description: "Please select a campaign to demonstrate call flow",
        variant: "destructive",
      });
      return;
    }
    
    setIsRunning(true);
    setSteps([]);
    setCurrentStep(0);
    runCallFlowDemo.mutate();
  };

  const getStepIcon = (step: CallFlowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'active':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (step: CallFlowStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'active':
        return 'border-blue-200 bg-blue-50 shadow-md';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const selectedCampaignData = campaigns?.find((c: any) => c.id === parseInt(selectedCampaign));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Call Flow Demonstration</h1>
        <p className="text-gray-600">
          See exactly how real customer calls are processed and routed through your system
        </p>
      </div>

      {/* Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Demo Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign">Select Campaign to Test:</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name} ({campaign.phoneNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="caller">Customer Phone Number:</Label>
              <Input
                id="caller"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                placeholder="+919876543210"
                disabled={isRunning}
              />
            </div>
          </div>

          {selectedCampaignData && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Selected Campaign Details</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {selectedCampaignData.name}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {selectedCampaignData.phoneNumber}
                </div>
                <div>
                  <span className="font-medium">Buyers:</span> {buyers?.length || 0} configured
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleStartDemo}
            disabled={isRunning || runCallFlowDemo.isPending || !selectedCampaign}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-pulse" />
                Call Flow In Progress...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Start Real Call Flow Demo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Call Flow Steps */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Live Call Processing
            </CardTitle>
            <p className="text-sm text-gray-600">
              This is exactly what happens when a real customer calls your number
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className={`p-4 rounded-lg border transition-all duration-500 ${getStepColor(step)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStepIcon(step)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Step {step.step}:</span>
                          <span className="font-semibold">{step.title}</span>
                        </div>
                        {step.timestamp && (
                          <span className="text-xs text-gray-500">{step.timestamp}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                      {step.details && (
                        <p className="text-xs text-gray-600 bg-white/70 px-3 py-1 rounded border">
                          {step.details}
                        </p>
                      )}
                    </div>
                    {index < steps.length - 1 && step.status === 'completed' && (
                      <ArrowRight className="h-4 w-4 text-gray-400 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyer Information */}
      {selectedCampaign && buyers && buyers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Buyers for This Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buyers.map((buyer: any) => (
                <div key={buyer.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                  <div>
                    <span className="font-medium">{buyer.name}</span>
                    <span className="text-sm text-gray-600 ml-2">{buyer.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Priority {buyer.priority}</Badge>
                    <Badge variant={buyer.status === 'active' ? 'default' : 'secondary'}>
                      {buyer.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Cap: {buyer.dailyCap}/day
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6 bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            Understanding the Call Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700">
          <div className="space-y-2">
            <p><strong>This demo shows real call routing logic:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>When customers call your campaign numbers, Twilio immediately notifies your system</li>
              <li>Your system checks which buyers are available based on priority, daily caps, and status</li>
              <li>The highest priority available buyer receives the call automatically</li>
              <li>All call data is tracked for reporting and billing purposes</li>
              <li>If no buyers are available, customers hear a professional message</li>
            </ul>
            <p className="mt-3"><strong>For real calls:</strong> Configure your Twilio webhook URL to point to your deployed application.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}