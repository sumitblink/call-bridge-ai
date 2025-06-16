import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PhoneCall, Phone, ArrowRight, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CallFlowStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  details?: string;
}

interface CallFlowDemoProps {
  campaignId: number;
  campaignName: string;
  campaignPhone: string;
}

export function CallFlowDemo({ campaignId, campaignName, campaignPhone }: CallFlowDemoProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [callerNumber, setCallerNumber] = useState('+919876543210');
  const [steps, setSteps] = useState<CallFlowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: buyers } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/buyers`],
    retry: false,
  });

  const runCallFlowDemo = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/campaigns/test-call', 'POST', {
        campaignId,
        callerNumber
      });
      return await response.json();
    },
    onSuccess: (data) => {
      simulateCallFlow(data);
    }
  });

  const simulateCallFlow = async (routingData: any) => {
    const callSteps: CallFlowStep[] = [
      {
        step: 1,
        title: 'Incoming Call Received',
        description: `Customer calls ${campaignPhone}`,
        status: 'pending',
        details: `From: ${callerNumber}`
      },
      {
        step: 2,
        title: 'Campaign Identification',
        description: `System identifies campaign: ${campaignName}`,
        status: 'pending',
        details: `Campaign ID: ${campaignId}`
      },
      {
        step: 3,
        title: 'Buyer Routing Analysis',
        description: 'Analyzing available buyers and priorities',
        status: 'pending',
        details: buyers ? `${buyers.length} buyers configured` : 'Loading buyers...'
      },
      {
        step: 4,
        title: 'Buyer Selection',
        description: routingData.selectedBuyer 
          ? `Selected: ${routingData.selectedBuyer.name}`
          : 'No buyers available',
        status: 'pending',
        details: routingData.selectedBuyer 
          ? `Priority: ${routingData.selectedBuyer.priority} | Phone: ${routingData.selectedBuyer.phoneNumber}`
          : routingData.reason
      },
      {
        step: 5,
        title: 'Call Connection',
        description: routingData.selectedBuyer 
          ? `Connecting to ${routingData.selectedBuyer.name}`
          : 'Call failed - no available buyers',
        status: 'pending',
        details: routingData.selectedBuyer 
          ? `Dialing ${routingData.selectedBuyer.phoneNumber}`
          : 'Customer hears busy tone or voicemail'
      },
      {
        step: 6,
        title: 'Call Tracking',
        description: 'Recording call details and metrics',
        status: 'pending',
        details: `Call ID: ${routingData.callSid || 'N/A'}`
      }
    ];

    setSteps(callSteps);
    setCurrentStep(0);

    // Simulate step-by-step execution
    for (let i = 0; i < callSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSteps(prev => prev.map((step, index) => {
        if (index === i) {
          return { 
            ...step, 
            status: (i === 4 && !routingData.selectedBuyer) ? 'failed' : 'active'
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
    }

    // Final step completion
    await new Promise(resolve => setTimeout(resolve, 500));
    setSteps(prev => prev.map((step, index) => {
      if (index === callSteps.length - 1) {
        return { ...step, status: 'completed' };
      }
      return step;
    }));
    
    setIsRunning(false);
  };

  const handleStartDemo = () => {
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
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5" />
          Live Call Flow Demonstration
        </CardTitle>
        <p className="text-sm text-gray-600">
          See exactly how incoming calls are processed and routed to buyers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Campaign Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Campaign:</span> {campaignName}
            </div>
            <div>
              <span className="font-medium">Phone Number:</span> {campaignPhone}
            </div>
            <div>
              <span className="font-medium">Available Buyers:</span> {buyers?.length || 0}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge variant="default" className="ml-2">Active</Badge>
            </div>
          </div>
        </div>

        {/* Caller Input */}
        <div className="space-y-2">
          <Label htmlFor="caller">Simulate Incoming Call From:</Label>
          <Input
            id="caller"
            value={callerNumber}
            onChange={(e) => setCallerNumber(e.target.value)}
            placeholder="+919876543210"
            disabled={isRunning}
            className="max-w-sm"
          />
          <p className="text-xs text-gray-500">
            This simulates a customer calling your campaign number
          </p>
        </div>

        {/* Start Demo Button */}
        <Button 
          onClick={handleStartDemo}
          disabled={isRunning || runCallFlowDemo.isPending}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-pulse" />
              Call Flow In Progress...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Start Call Flow Demo
            </>
          )}
        </Button>

        {/* Call Flow Steps */}
        {steps.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-semibold text-lg">Call Flow Steps</h3>
            
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className={`p-4 rounded-lg border transition-all duration-300 ${getStepColor(step)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStepIcon(step)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Step {step.step}:</span>
                        <span className="font-semibold">{step.title}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                      {step.details && (
                        <p className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded">
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
          </div>
        )}

        {/* Buyer Information */}
        {buyers && buyers.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Configured Buyers</h3>
            </div>
            <div className="space-y-2">
              {buyers.map((buyer: any) => (
                <div key={buyer.id} className="flex items-center justify-between bg-white p-3 rounded border">
                  <div>
                    <span className="font-medium">{buyer.name}</span>
                    <span className="text-sm text-gray-600 ml-2">{buyer.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Priority {buyer.priority}</Badge>
                    <Badge variant={buyer.status === 'active' ? 'default' : 'secondary'}>
                      {buyer.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}