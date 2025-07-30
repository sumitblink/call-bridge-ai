import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Ban, 
  Tag, 
  DollarSign, 
  X, 
  AlertTriangle,
  MessageSquare,
  UserX
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BulkCallActionsProps {
  selectedCalls: any[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

interface BulkAction {
  type: 'transcribe' | 'annotate' | 'block' | 'adjust';
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}

const bulkActions: BulkAction[] = [
  {
    type: 'transcribe',
    icon: FileText,
    label: 'Transcribe',
    description: 'Generate transcripts for selected call recordings',
    color: 'blue'
  },
  {
    type: 'annotate',
    icon: Tag,
    label: 'Annotate',
    description: 'Add custom tags and notes to selected calls',
    color: 'green'
  },
  {
    type: 'block',
    icon: Ban,
    label: 'Block Caller',
    description: 'Block phone numbers from calling again',
    color: 'red'
  },
  {
    type: 'adjust',
    icon: DollarSign,
    label: 'Request Adjustment',
    description: 'Request payout or conversion adjustments',
    color: 'purple'
  }
];

export function BulkCallActions({ 
  selectedCalls, 
  onClearSelection, 
  onActionComplete 
}: BulkCallActionsProps) {
  const [showActionDialog, setShowActionDialog] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({
    annotation: { name: '', value: '' },
    blocking: { reason: '', duration: '30' },
    adjustment: { type: 'payout', reason: '', amount: '' },
    transcription: { confirmCost: false }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data: any }) => {
      return apiRequest('/api/reporting/bulk-actions', 'POST', {
        action,
        callIds: selectedCalls.map(call => call.id),
        data
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reporting'] });
      
      setShowActionDialog(null);
      onActionComplete();
      
      const actionLabels = {
        transcribe: 'transcribed',
        annotate: 'annotated',
        block: 'blocked',
        adjust: 'adjustment requested for'
      };
      
      toast({
        title: "Bulk action completed",
        description: `Successfully ${actionLabels[variables.action as keyof typeof actionLabels]} ${selectedCalls.length} calls.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk action failed",
        description: error.message || "Failed to complete bulk action",
        variant: "destructive"
      });
    }
  });

  const handleActionClick = (actionType: string) => {
    setShowActionDialog(actionType);
  };

  const handleSubmitAction = () => {
    const action = showActionDialog;
    if (!action) return;

    let data = {};
    
    switch (action) {
      case 'transcribe':
        if (!actionForm.transcription.confirmCost) {
          toast({
            title: "Confirmation required",
            description: "Please confirm you understand transcription costs apply",
            variant: "destructive"
          });
          return;
        }
        data = {};
        break;
        
      case 'annotate':
        if (!actionForm.annotation.name.trim()) {
          toast({
            title: "Validation error",
            description: "Annotation name is required",
            variant: "destructive"
          });
          return;
        }
        data = {
          name: actionForm.annotation.name,
          value: actionForm.annotation.value
        };
        break;
        
      case 'block':
        data = {
          reason: actionForm.blocking.reason,
          duration: parseInt(actionForm.blocking.duration)
        };
        break;
        
      case 'adjust':
        if (!actionForm.adjustment.reason.trim() || !actionForm.adjustment.amount) {
          toast({
            title: "Validation error",
            description: "Reason and amount are required for adjustments",
            variant: "destructive"
          });
          return;
        }
        data = {
          type: actionForm.adjustment.type,
          reason: actionForm.adjustment.reason,
          amount: parseFloat(actionForm.adjustment.amount)
        };
        break;
    }

    bulkActionMutation.mutate({ action, data });
  };

  const getDialogContent = () => {
    const action = showActionDialog;
    if (!action) return null;

    switch (action) {
      case 'transcribe':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Transcription Cost Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Transcribing calls incurs additional fees based on call duration. 
                    Calls without recordings or previously transcribed calls will be skipped.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Selected calls:</strong> {selectedCalls.length}
              </div>
              <div className="text-sm text-gray-600">
                Calls with recordings: {selectedCalls.filter(call => call.hasRecording).length}
              </div>
              <div className="text-sm text-gray-600">
                Already transcribed: {selectedCalls.filter(call => call.hasTranscript).length}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-cost"
                checked={actionForm.transcription.confirmCost}
                onCheckedChange={(checked) => 
                  setActionForm(prev => ({
                    ...prev,
                    transcription: { confirmCost: !!checked }
                  }))
                }
              />
              <Label htmlFor="confirm-cost" className="text-sm">
                I confirm the list of calls to transcribe is correct and understand transcription costs apply
              </Label>
            </div>
          </div>
        );
        
      case 'annotate':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="annotation-name">Annotation Name *</Label>
              <Input
                id="annotation-name"
                value={actionForm.annotation.name}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  annotation: { ...prev.annotation, name: e.target.value }
                }))}
                placeholder="Enter annotation name"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="annotation-value">Annotation Value</Label>
              <Textarea
                id="annotation-value"
                value={actionForm.annotation.value}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  annotation: { ...prev.annotation, value: e.target.value }
                }))}
                placeholder="Enter annotation value (optional)"
                maxLength={512}
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                {actionForm.annotation.value.length}/512 characters
              </div>
            </div>
            <div className="text-sm text-gray-600">
              This annotation will be added to all {selectedCalls.length} selected calls.
            </div>
          </div>
        );
        
      case 'block':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserX className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Block Caller IDs</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This will prevent the following phone numbers from calling again for the specified duration.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Phone Numbers to Block</Label>
              <div className="mt-2 space-y-1">
                {[...new Set(selectedCalls.map(call => call.fromNumber))].map(number => (
                  <Badge key={number} variant="outline">{number}</Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="block-reason">Block Reason</Label>
              <Select 
                value={actionForm.blocking.reason} 
                onValueChange={(value) => setActionForm(prev => ({
                  ...prev,
                  blocking: { ...prev.blocking, reason: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam/Unwanted</SelectItem>
                  <SelectItem value="fraud">Fraudulent Activity</SelectItem>
                  <SelectItem value="abuse">Abusive Behavior</SelectItem>
                  <SelectItem value="quality">Poor Call Quality</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="block-duration">Block Duration (days)</Label>
              <Select 
                value={actionForm.blocking.duration} 
                onValueChange={(value) => setActionForm(prev => ({
                  ...prev,
                  blocking: { ...prev.blocking, duration: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                  <SelectItem value="0">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'adjust':
        return (
          <div className="space-y-4">
            <div>
              <Label>Adjustment Type</Label>
              <Select 
                value={actionForm.adjustment.type} 
                onValueChange={(value) => setActionForm(prev => ({
                  ...prev,
                  adjustment: { ...prev.adjustment, type: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payout">Payout Adjustment</SelectItem>
                  <SelectItem value="conversion">Conversion Adjustment</SelectItem>
                  <SelectItem value="revenue">Revenue Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="adjust-amount">Adjustment Amount ($)</Label>
              <Input
                id="adjust-amount"
                type="number"
                step="0.01"
                value={actionForm.adjustment.amount}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  adjustment: { ...prev.adjustment, amount: e.target.value }
                }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="adjust-reason">Reason for Adjustment *</Label>
              <Textarea
                id="adjust-reason"
                value={actionForm.adjustment.reason}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  adjustment: { ...prev.adjustment, reason: e.target.value }
                }))}
                placeholder="Explain why this adjustment is needed"
                rows={3}
                maxLength={500}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              Adjustment will be requested for {selectedCalls.length} calls.
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (selectedCalls.length === 0) {
    return null;
  }

  const selectedAction = bulkActions.find(a => a.type === showActionDialog);

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-blue-600">
              {selectedCalls.length} calls selected
            </Badge>
            <div className="flex gap-2">
              {bulkActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleActionClick(action.type)}
                    className="h-8"
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Selection
          </Button>
        </div>
      </div>

      <Dialog open={!!showActionDialog} onOpenChange={() => setShowActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && <selectedAction.icon className="h-5 w-5" />}
              {selectedAction?.label} {selectedCalls.length} Calls
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {getDialogContent()}
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowActionDialog(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitAction}
                disabled={bulkActionMutation.isPending}
                className={selectedAction?.color === 'red' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {bulkActionMutation.isPending ? 'Processing...' : `${selectedAction?.label} Calls`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BulkCallActions;