import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  PhoneCall, 
  PhoneForwarded, 
  PhoneOff, 
  Pause, 
  Play, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Users,
  Settings,
  Square,
  Circle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

interface ActiveCall {
  id: number;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  status: string;
  duration: number;
  campaignName: string;
  agentName?: string;
  isRecording: boolean;
  isMuted: boolean;
  isOnHold: boolean;
}

export default function CallControlPage() {
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [transferNumber, setTransferNumber] = useState("");
  const [conferenceParticipants, setConferenceParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");

  const { toast } = useToast();

  // Fetch real calls data from API
  const { data: callsData, isLoading } = useQuery({
    queryKey: ["/api/calls"],
    refetchInterval: false, // Turn off auto-refresh to reduce console spam
  });

  // Transform API data to match ActiveCall interface
  const activeCalls: ActiveCall[] = (callsData && Array.isArray(callsData)) ? callsData
    .filter((call: any) => ['ringing', 'in-progress', 'queued'].includes(call.status))
    .map((call: any) => ({
      id: call.id,
      callSid: call.callSid,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      status: call.status,
      duration: call.duration || 0,
      campaignName: call.campaignId ? `Campaign ${call.campaignId}` : "Unknown Campaign",
      agentName: call.buyerId ? `Agent ${call.buyerId}` : undefined,
      isRecording: !!call.recordingUrl,
      isMuted: false,
      isOnHold: call.status === 'on-hold'
    })) : [];

  // Call control mutations
  const transferMutation = useMutation({
    mutationFn: async ({ callSid, targetNumber }: { callSid: string; targetNumber: string }) => 
      apiRequest(`/api/calls/${callSid}/transfer`, "POST", { targetNumber }),
    onSuccess: () => {
      toast({ title: "Call transfer initiated successfully" });
      setTransferNumber("");
    },
    onError: () => {
      toast({ title: "Failed to transfer call", variant: "destructive" });
    }
  });

  const holdMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/hold`, "POST"),
    onSuccess: () => {
      toast({ title: "Call placed on hold" });
    }
  });

  const resumeMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/resume`, "POST"),
    onSuccess: () => {
      toast({ title: "Call resumed" });
    }
  });

  const muteMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/mute`, "POST"),
    onSuccess: () => {
      toast({ title: "Call muted" });
    }
  });

  const unmuteMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/unmute`, "POST"),
    onSuccess: () => {
      toast({ title: "Call unmuted" });
    }
  });

  const conferenceMutation = useMutation({
    mutationFn: async (participants: string[]) => 
      apiRequest("/api/conference/create", "POST", { participants }),
    onSuccess: () => {
      toast({ title: "Conference call created successfully" });
      setConferenceParticipants([]);
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTransfer = () => {
    if (selectedCall && transferNumber) {
      transferMutation.mutate({ callSid: selectedCall.callSid, targetNumber: transferNumber });
    }
  };

  const handleConference = () => {
    if (conferenceParticipants.length >= 2) {
      conferenceMutation.mutate(conferenceParticipants);
    }
  };

  const addParticipant = () => {
    if (newParticipant && !conferenceParticipants.includes(newParticipant)) {
      setConferenceParticipants([...conferenceParticipants, newParticipant]);
      setNewParticipant("");
    }
  };

  const removeParticipant = (participant: string) => {
    setConferenceParticipants(conferenceParticipants.filter(p => p !== participant));
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Real-time Call Control</h1>
            <p className="text-gray-600 mt-1">Manage active calls with advanced control features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Calls List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Active Calls ({activeCalls.length})
                </CardTitle>
                <CardDescription>
                  Click on a call to access control options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCalls.map((call) => (
                    <div 
                      key={call.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedCall?.id === call.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCall(call)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            call.status === 'in-progress' ? 'bg-green-500' : 
                            call.status === 'ringing' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}></div>
                          <div>
                            <p className="font-medium">{call.fromNumber} → {call.toNumber}</p>
                            <p className="text-sm text-gray-600">{call.campaignName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            call.status === 'in-progress' ? 'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {call.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{formatDuration(call.duration)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        {call.agentName && (
                          <span className="text-gray-600">Agent: {call.agentName}</span>
                        )}
                        <div className="flex gap-2">
                          {call.isRecording && (
                            <Badge variant="outline" className="text-red-600">
                              <Circle className="h-2 w-2 mr-1 fill-current" />
                              Recording
                            </Badge>
                          )}
                          {call.isMuted && (
                            <Badge variant="outline">
                              <MicOff className="h-2 w-2 mr-1" />
                              Muted
                            </Badge>
                          )}
                          {call.isOnHold && (
                            <Badge variant="outline">
                              <Pause className="h-2 w-2 mr-1" />
                              On Hold
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeCalls.length === 0 && (
                    <div className="text-center py-12">
                      <PhoneOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No active calls</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call Control Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Call Controls
                </CardTitle>
                <CardDescription>
                  {selectedCall ? `Control call ${selectedCall.callSid}` : "Select a call to control"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCall ? (
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="transfer">Transfer</TabsTrigger>
                      <TabsTrigger value="conference">Conference</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCall.status === 'in-progress' && !selectedCall.isOnHold && (
                          <Button 
                            variant="outline" 
                            onClick={() => holdMutation.mutate(selectedCall.callSid)}
                            disabled={holdMutation.isPending}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Hold
                          </Button>
                        )}
                        
                        {selectedCall.isOnHold && (
                          <Button 
                            variant="outline" 
                            onClick={() => resumeMutation.mutate(selectedCall.callSid)}
                            disabled={resumeMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                        )}

                        {!selectedCall.isMuted && (
                          <Button 
                            variant="outline" 
                            onClick={() => muteMutation.mutate(selectedCall.callSid)}
                            disabled={muteMutation.isPending}
                          >
                            <MicOff className="h-4 w-4 mr-2" />
                            Mute
                          </Button>
                        )}

                        {selectedCall.isMuted && (
                          <Button 
                            variant="outline" 
                            onClick={() => unmuteMutation.mutate(selectedCall.callSid)}
                            disabled={unmuteMutation.isPending}
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            Unmute
                          </Button>
                        )}

                        <Button variant="outline" disabled>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Volume
                        </Button>

                        <Button variant="destructive" disabled>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          Hangup
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="transfer" className="space-y-4">
                      <div>
                        <Label htmlFor="transfer-number">Transfer to Number</Label>
                        <Input
                          id="transfer-number"
                          placeholder="+1234567890"
                          value={transferNumber}
                          onChange={(e) => setTransferNumber(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleTransfer}
                        disabled={!transferNumber || transferMutation.isPending}
                        className="w-full"
                      >
                        <PhoneForwarded className="h-4 w-4 mr-2" />
                        Transfer Call
                      </Button>
                    </TabsContent>

                    <TabsContent value="conference" className="space-y-4">
                      <div>
                        <Label htmlFor="participant">Add Participant</Label>
                        <div className="flex gap-2">
                          <Input
                            id="participant"
                            placeholder="+1234567890"
                            value={newParticipant}
                            onChange={(e) => setNewParticipant(e.target.value)}
                          />
                          <Button onClick={addParticipant} disabled={!newParticipant}>
                            Add
                          </Button>
                        </div>
                      </div>

                      {conferenceParticipants.length > 0 && (
                        <div>
                          <Label>Participants ({conferenceParticipants.length})</Label>
                          <div className="space-y-2 mt-2">
                            {conferenceParticipants.map((participant, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm">{participant}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => removeParticipant(participant)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handleConference}
                        disabled={conferenceParticipants.length < 2 || conferenceMutation.isPending}
                        className="w-full"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Create Conference
                      </Button>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Select an active call to access controls</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}