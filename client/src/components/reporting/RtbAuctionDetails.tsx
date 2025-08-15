import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, Phone, Target, CheckCircle, XCircle, AlertCircle, Activity, TrendingUp, PhoneCall, Users } from "lucide-react";

interface RtbAuctionData {
  requestId: string;
  campaignId: string;
  callerId: string;
  totalTargetsPinged: number;
  successfulResponses: number;
  winningBidAmount: number;
  winningTargetId: number;
  totalResponseTimeMs: number;
  publisherId: number;
  inboundNumber: string;
  callStatus: string;
  callDuration: number;
  fromNumber: string;
  toNumber: string;
  bidResponses: Array<{
    id: number;
    rtbTargetId: number;
    targetName: string;
    bidAmount: number;
    destinationNumber: string;
    responseTimeMs: number;
    responseStatus: string;
    isValid: boolean;
    isWinningBid: boolean;
    rejectionReason: string | null;
    rawResponse: any;
  }>;
}

interface RtbAuctionDetailsProps {
  auctionData: RtbAuctionData;
  callId: number;
}

export function RtbAuctionDetails({ auctionData, callId }: RtbAuctionDetailsProps) {
  const {
    totalTargetsPinged,
    successfulResponses,
    winningBidAmount,
    totalResponseTimeMs,
    bidResponses,
    callStatus,
    callDuration,
    fromNumber,
    toNumber,
    inboundNumber
  } = auctionData;

  const eligibleBidders = bidResponses.filter(bid => bid.isValid).length;
  const winningBid = bidResponses.find(bid => bid.isWinningBid);
  const failedPings = totalTargetsPinged - successfulResponses;

  // Determine who hung up based on call duration and status
  const getHangupInfo = () => {
    if (callDuration <= 1) {
      return { party: "External Partner", reason: "Immediate hangup (partner system rejection)", color: "destructive" };
    } else if (callStatus === "completed" && callDuration > 30) {
      return { party: "Caller", reason: "Normal call completion", color: "default" };
    } else if (callStatus === "busy") {
      return { party: "Buyer", reason: "Line busy", color: "secondary" };
    } else if (callStatus === "no-answer") {
      return { party: "Buyer", reason: "No answer", color: "secondary" };
    } else if (callStatus === "failed") {
      return { party: "System", reason: "Call routing failed", color: "destructive" };
    } else {
      return { party: "Unknown", reason: "Call ended", color: "outline" };
    }
  };

  const hangupInfo = getHangupInfo();

  return (
    <div className="space-y-6">
      {/* Ringba-Style RTB Auction Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Targets Pinged</p>
                <p className="text-2xl font-bold">{totalTargetsPinged}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Responses</p>
                <p className="text-2xl font-bold">{successfulResponses}</p>
                <p className="text-xs text-muted-foreground">{failedPings} failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Eligible Bidders</p>
                <p className="text-2xl font-bold">{eligibleBidders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Winning Bid</p>
                <p className="text-2xl font-bold">${winningBidAmount}</p>
                <p className="text-xs text-muted-foreground">{totalResponseTimeMs}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Flow Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PhoneCall className="h-5 w-5" />
            <span>Call Flow Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Caller Number</p>
              <p className="font-mono">{fromNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inbound Number</p>
              <p className="font-mono">{inboundNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Destination Number</p>
              <p className="font-mono">{winningBid?.destinationNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Call Duration</p>
              <p className="font-mono">{callDuration}s</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Call Termination:</span>
              <Badge variant={hangupInfo.color as any}>{hangupInfo.party}</Badge>
              <span className="text-sm text-muted-foreground">- {hangupInfo.reason}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed RTB Bidding Results */}
      <Card>
        <CardHeader>
          <CardTitle>RTB Auction Results</CardTitle>
          <CardDescription>
            Real-time bidding details for all targets contacted during the auction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all-bids" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all-bids">All Bids ({bidResponses.length})</TabsTrigger>
              <TabsTrigger value="eligible">Eligible ({eligibleBidders})</TabsTrigger>
              <TabsTrigger value="raw-data">Raw Responses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-bids" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Bid Amount</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bidResponses.map((bid) => (
                    <TableRow key={bid.id} className={bid.isWinningBid ? "bg-green-50 dark:bg-green-950" : ""}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{bid.targetName}</p>
                          <p className="text-xs text-muted-foreground">ID: {bid.rtbTargetId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-mono">{bid.bidAmount}</span>
                          {bid.isWinningBid && <Badge variant="default" className="ml-2">WINNER</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{bid.destinationNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{bid.responseTimeMs}ms</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bid.responseStatus === 'success' ? 'default' : 'destructive'}>
                          {bid.responseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {bid.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {bid.isValid ? 'Eligible' : bid.rejectionReason || 'Invalid'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="eligible" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Bid Amount</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Winner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bidResponses.filter(bid => bid.isValid).map((bid) => (
                    <TableRow key={bid.id} className={bid.isWinningBid ? "bg-green-50 dark:bg-green-950" : ""}>
                      <TableCell className="font-medium">{bid.targetName}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-mono">{bid.bidAmount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{bid.destinationNumber}</span>
                      </TableCell>
                      <TableCell>{bid.responseTimeMs}ms</TableCell>
                      <TableCell>
                        {bid.isWinningBid ? (
                          <Badge variant="default">WINNER</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="raw-data" className="mt-4">
              <div className="space-y-4">
                {bidResponses.map((bid) => (
                  <Card key={bid.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{bid.targetName}</CardTitle>
                      <CardDescription>Target ID: {bid.rtbTargetId}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(bid.rawResponse, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}