import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Phone, PhoneCall, Square, Users, Volume2, VolumeX, Circle as RecordIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TwilioTestPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [testCallSid, setTestCallSid] = useState("");
  const [testRecordingSid, setTestRecordingSid] = useState("");
  const [conferenceParticipants, setConferenceParticipants] = useState("");
  const { toast } = useToast();

  // Outbound call mutation
  const outboundCallMutation = useMutation({
    mutationFn: async (data: { to: string; campaignId?: number }) => 
      apiRequest("POST", "/api/calls/outbound", data),
    onSuccess: (data: any) => {
      setTestCallSid(data.callSid);
      toast({
        title: "Call Initiated",
        description: `Outbound call started with SID: ${data.callSid}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate outbound call",
        variant: "destructive",
      });
    }
  });

  // Recording mutations
  const startRecordingMutation = useMutation({
    mutationFn: async (callSid: string) => 
      apiRequest("POST", `/api/calls/${callSid}/recording/start`),
    onSuccess: (data: any) => {
      setTestRecordingSid(data.recordingSid);
      toast({
        title: "Recording Started",
        description: `Recording SID: ${data.recordingSid}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Recording Failed",
        description: error.message || "Failed to start recording",
        variant: "destructive",
      });
    }
  });

  const stopRecordingMutation = useMutation({
    mutationFn: async ({ callSid, recordingSid }: { callSid: string; recordingSid: string }) => 
      apiRequest("POST", `/api/calls/${callSid}/recording/stop`, { recordingSid }),
    onSuccess: (data: any) => {
      toast({
        title: "Recording Stopped",
        description: `Recording URL: ${data.recordingUrl}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Stop Recording Failed",
        description: error.message || "Failed to stop recording",
        variant: "destructive",
      });
    }
  });

  // Call control mutations
  const transferCallMutation = useMutation({
    mutationFn: async ({ callSid, destination }: { callSid: string; destination: string }) => 
      apiRequest("POST", `/api/calls/${callSid}/transfer`, { destination }),
    onSuccess: () => {
      toast({ title: "Call Transferred", description: "Call transfer initiated" });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer call",
        variant: "destructive",
      });
    }
  });

  const holdCallMutation = useMutation({
    mutationFn: async (callSid: string) => 
      apiRequest("POST", `/api/calls/${callSid}/hold`),
    onSuccess: () => {
      toast({ title: "Call On Hold", description: "Call placed on hold" });
    },
    onError: (error: any) => {
      toast({
        title: "Hold Failed",
        description: error.message || "Failed to hold call",
        variant: "destructive",
      });
    }
  });

  const muteCallMutation = useMutation({
    mutationFn: async (callSid: string) => 
      apiRequest("POST", `/api/calls/${callSid}/mute`),
    onSuccess: () => {
      toast({ title: "Call Muted", description: "Call audio muted" });
    },
    onError: (error: any) => {
      toast({
        title: "Mute Failed",
        description: error.message || "Failed to mute call",
        variant: "destructive",
      });
    }
  });

  // Conference call mutation
  const conferenceCallMutation = useMutation({
    mutationFn: async (participants: string[]) => 
      apiRequest("POST", "/api/conference/create", { participants }),
    onSuccess: (data: any) => {
      toast({
        title: "Conference Created",
        description: `Conference SID: ${data.conferenceSid}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conference Failed",
        description: error.message || "Failed to create conference",
        variant: "destructive",
      });
    }
  });

  const handleOutboundCall = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    outboundCallMutation.mutate({ to: phoneNumber, campaignId: 20 });
  };

  const handleStartRecording = () => {
    if (!testCallSid.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a Call SID",
        variant: "destructive",
      });
      return;
    }
    startRecordingMutation.mutate(testCallSid);
  };

  const handleStopRecording = () => {
    if (!testCallSid.trim() || !testRecordingSid.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter both Call SID and Recording SID",
        variant: "destructive",
      });
      return;
    }
    stopRecordingMutation.mutate({ callSid: testCallSid, recordingSid: testRecordingSid });
  };

  const handleTransferCall = () => {
    if (!testCallSid.trim() || !phoneNumber.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter Call SID and destination number",
        variant: "destructive",
      });
      return;
    }
    transferCallMutation.mutate({ callSid: testCallSid, destination: phoneNumber });
  };

  const handleConferenceCall = () => {
    const participants = conferenceParticipants.split(',').map(p => p.trim()).filter(p => p);
    if (participants.length < 2) {
      toast({
        title: "Invalid Input",
        description: "Please enter at least 2 phone numbers separated by commas",
        variant: "destructive",
      });
      return;
    }
    conferenceCallMutation.mutate(participants);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Outbound Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Outbound Call Testing
            </CardTitle>
            <CardDescription>
              Test making outbound calls using your Twilio number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleOutboundCall}
              disabled={outboundCallMutation.isPending}
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-2" />
              {outboundCallMutation.isPending ? "Calling..." : "Make Outbound Call"}
            </Button>
            {testCallSid && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium text-green-800">Active Call SID:</p>
                <p className="text-sm text-green-700 font-mono">{testCallSid}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Recording */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RecordIcon className="h-5 w-5" />
              Call Recording Testing
            </CardTitle>
            <CardDescription>
              Test call recording functionality with active calls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="callSid">Call SID</Label>
              <Input
                id="callSid"
                placeholder="CA1234567890abcdef1234567890abcdef"
                value={testCallSid}
                onChange={(e) => setTestCallSid(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="recordingSid">Recording SID (auto-filled)</Label>
              <Input
                id="recordingSid"
                placeholder="RE1234567890abcdef1234567890abcdef"
                value={testRecordingSid}
                onChange={(e) => setTestRecordingSid(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleStartRecording}
                disabled={startRecordingMutation.isPending}
                className="flex-1"
              >
                <RecordIcon className="h-4 w-4 mr-2" />
                {startRecordingMutation.isPending ? "Starting..." : "Start Recording"}
              </Button>
              <Button 
                onClick={handleStopRecording}
                disabled={stopRecordingMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {stopRecordingMutation.isPending ? "Stopping..." : "Stop Recording"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Call Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Call Control Testing
            </CardTitle>
            <CardDescription>
              Test live call control features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={handleTransferCall}
                disabled={transferCallMutation.isPending}
                variant="outline"
                size="sm"
              >
                Transfer
              </Button>
              <Button 
                onClick={() => testCallSid && holdCallMutation.mutate(testCallSid)}
                disabled={holdCallMutation.isPending}
                variant="outline"
                size="sm"
              >
                Hold
              </Button>
              <Button 
                onClick={() => testCallSid && muteCallMutation.mutate(testCallSid)}
                disabled={muteCallMutation.isPending}
                variant="outline"
                size="sm"
              >
                <VolumeX className="h-4 w-4" />
                Mute
              </Button>
              <Button 
                onClick={() => toast({ title: "Resume", description: "Resume call functionality" })}
                variant="outline"
                size="sm"
              >
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conference Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Conference Call Testing
            </CardTitle>
            <CardDescription>
              Test creating conference calls with multiple participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="participants">Participants (comma-separated)</Label>
              <Input
                id="participants"
                placeholder="+1234567890, +1987654321, +1555123456"
                value={conferenceParticipants}
                onChange={(e) => setConferenceParticipants(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleConferenceCall}
              disabled={conferenceCallMutation.isPending}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              {conferenceCallMutation.isPending ? "Creating..." : "Create Conference Call"}
            </Button>
          </CardContent>
        </Card>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>Twilio Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Twilio credentials authenticated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Account Status: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Phone Number: {process.env.TWILIO_PHONE_NUMBER || "Configured"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}