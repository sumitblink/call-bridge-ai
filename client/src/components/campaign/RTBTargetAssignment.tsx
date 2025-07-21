import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Settings, Trash2, DollarSign, Activity } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// RTB Target Assignment Schema
const rtbAssignmentSchema = z.object({
  targetAssignments: z.array(z.object({
    targetId: z.number(),
    priority: z.number().min(1).max(10),
    isActive: z.boolean(),
  })),
});

type RTBAssignmentFormData = z.infer<typeof rtbAssignmentSchema>;

interface RTBTargetAssignmentProps {
  campaignId: string;
  campaignName: string;
  isRtbEnabled: boolean;
}

export function RTBTargetAssignment({ campaignId, campaignName, isRtbEnabled }: RTBTargetAssignmentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetAssignments, setTargetAssignments] = useState<{[key: number]: {priority: number, active: boolean}}>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available RTB targets
  const { data: rtbTargets = [], isLoading: isLoadingTargets } = useQuery<any[]>({
    queryKey: ['/api/rtb/targets'],
  });

  // Fetch current campaign RTB target assignments
  const { data: currentAssignments = [], isLoading: isLoadingAssignments } = useQuery<any[]>({
    queryKey: [`/api/campaigns/${campaignId}/rtb-targets`],
    enabled: isRtbEnabled,
  });

  const form = useForm<RTBAssignmentFormData>({
    resolver: zodResolver(rtbAssignmentSchema),
    defaultValues: {
      targetAssignments: [],
    },
  });

  // Update assignment mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async (assignments: any[]) => {
      const response = await fetch(`/api/campaigns/${campaignId}/rtb-targets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments }),
      });
      if (!response.ok) {
        throw new Error('Failed to update RTB target assignments');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/rtb-targets`] });
      toast({ title: "Success", description: "RTB target assignments updated successfully" });
      setIsDialogOpen(false);
      setTargetAssignments({});
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openAssignmentDialog = () => {
    // Load current assignments into the form state
    const assignmentMap: {[key: number]: {priority: number, active: boolean}} = {};
    currentAssignments.forEach((assignment: any) => {
      const targetId = assignment.rtbTargetId || assignment.id;
      if (targetId) {
        assignmentMap[targetId] = {
          priority: assignment.priority || 1,
          active: assignment.isActive !== false,
        };
      }
    });
    setTargetAssignments(assignmentMap);
    setIsDialogOpen(true);
  };

  const handleAssignmentSubmit = () => {
    const assignments = Object.entries(targetAssignments)
      .filter(([_, assignment]) => assignment.active)
      .map(([targetId, assignment]) => ({
        targetId: parseInt(targetId),
        priority: assignment.priority,
        isActive: assignment.active,
      }));

    updateAssignmentsMutation.mutate(assignments);
  };

  const updateTargetAssignment = (targetId: number, updates: Partial<{priority: number, active: boolean}>) => {
    setTargetAssignments(prev => ({
      ...prev,
      [targetId]: {
        priority: updates.priority !== undefined ? updates.priority : (prev[targetId]?.priority || 1),
        active: updates.active !== undefined ? updates.active : (prev[targetId]?.active || false),
      },
    }));
  };

  const getTargetName = (targetId: number) => {
    const target = rtbTargets.find((t: any) => t.id === targetId);
    return target ? target.name : `Target ${targetId}`;
  };

  if (!isRtbEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            RTB Target Assignment
          </CardTitle>
          <CardDescription>
            Real-time bidding is disabled for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Enable RTB in campaign settings to assign targets
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              RTB Target Assignment
            </CardTitle>
            <CardDescription>
              Assign RTB targets to {campaignName} for real-time bidding
            </CardDescription>
          </div>
          <Button onClick={openAssignmentDialog} disabled={isLoadingTargets || isLoadingAssignments}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Targets
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {currentAssignments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              No RTB targets assigned to this campaign
            </div>
            <Button onClick={openAssignmentDialog} variant="outline" disabled={isLoadingTargets || isLoadingAssignments}>
              <Plus className="w-4 h-4 mr-2" />
              Assign RTB Targets
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Assigned Targets ({currentAssignments.length})</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bid Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssignments.map((assignment: any, index: number) => {
                  const target = rtbTargets.find((t: any) => t.id === (assignment.rtbTargetId || assignment.id));
                  return (
                    <TableRow key={assignment.id || assignment.rtbTargetId || index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.name || target?.name || `Target ${assignment.rtbTargetId || assignment.id}`}</div>
                          <div className="text-sm text-muted-foreground">{assignment.companyName || target?.companyName || assignment.endpointUrl || target?.endpointUrl}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Priority {assignment.priority || 1}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={assignment.isActive !== false ? 'default' : 'secondary'}
                          className={assignment.isActive !== false ? 'bg-green-100 text-green-800' : ''}
                        >
                          {assignment.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.minBidAmount && assignment.maxBidAmount ? `$${assignment.minBidAmount} - $${assignment.maxBidAmount}` : 
                         target ? `$${target.minBidAmount} - $${target.maxBidAmount}` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign RTB Targets to {campaignName}</DialogTitle>
            <DialogDescription>
              Select RTB targets and set their priority for real-time bidding auctions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {rtbTargets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No RTB targets available. Create targets in RTB Management first.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Select targets to include in bidding auctions. Higher priority targets are preferred when bids are equal.
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Assign</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Bid Range</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rtbTargets.map((target: any) => {
                      const assignment = targetAssignments[target.id] || { priority: 1, active: false };
                      return (
                        <TableRow key={target.id}>
                          <TableCell>
                            <Checkbox
                              checked={assignment.active}
                              onCheckedChange={(checked) => 
                                updateTargetAssignment(target.id, { active: !!checked })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{target.name}</div>
                              <div className="text-xs text-muted-foreground">{target.endpointUrl}</div>
                            </div>
                          </TableCell>
                          <TableCell>{target.companyName || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {target.minBidAmount} - {target.maxBidAmount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              className="w-16"
                              value={assignment.priority}
                              onChange={(e) => 
                                updateTargetAssignment(target.id, { priority: parseInt(e.target.value) || 1 })
                              }
                              disabled={!assignment.active}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={assignment.active}
                              onCheckedChange={(checked) => 
                                updateTargetAssignment(target.id, { active: checked })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignmentSubmit}
                    disabled={updateAssignmentsMutation.isPending}
                  >
                    {updateAssignmentsMutation.isPending ? 'Saving...' : 'Save Assignments'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}