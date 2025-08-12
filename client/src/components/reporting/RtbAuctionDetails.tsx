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
    <div className="space-y-3">
      {/* Compact RTB Auction Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Targets Pinged</p>
                <p className="text-lg font-bold">{totalTargetsPinged}</p>
              </div>
              <Target className="h-3 w-3 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Responses</p>
                <p className="text-lg font-bold">{successfulResponses}</p>
                <p className="text-xs text-red-500">{failedPings} failed</p>
              </div>
              <Activity className="h-3 w-3 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Eligible Bidders</p>
                <p className="text-lg font-bold">{eligibleBidders}</p>
              </div>
              <Users className="h-3 w-3 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Winning Bid</p>
                <p className="text-lg font-bold">${winningBidAmount}</p>
                <p className="text-xs text-muted-foreground">{totalResponseTimeMs}ms</p>
              </div>
              <DollarSign className="h-3 w-3 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Call Flow Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <PhoneCall className="h-4 w-4" />
            <span>Call Flow Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Caller Number</p>
              <p className="font-mono text-sm">{fromNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inbound Number</p>
              <p className="font-mono text-sm">{inboundNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destination Number</p>
              <p className="font-mono text-sm">{winningBid?.destinationNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Call Duration</p>
              <p className="font-mono text-sm">{callDuration}s</p>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-muted rounded flex items-center space-x-2">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs font-medium">Call Termination:</span>
            <Badge variant={hangupInfo.color as any} className="text-xs py-0 px-1">{hangupInfo.party}</Badge>
            <span className="text-xs text-muted-foreground">- {hangupInfo.reason}</span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed RTB Bidding Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">RTB Auction Results</CardTitle>
          <CardDescription className="text-xs">
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