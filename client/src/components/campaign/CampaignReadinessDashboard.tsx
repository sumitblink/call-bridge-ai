import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Circle, Zap } from "lucide-react";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CampaignReadinessDashboardProps {
  campaignId: number;
  campaignStatus: string;
}

export function CampaignReadinessDashboard({ campaignId, campaignStatus }: CampaignReadinessDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: validation, isLoading } = useCampaignValidation(campaignId);

  const activateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/campaigns/${campaignId}`, "PATCH", { status: "active" });
    },
    onSuccess: () => {
      toast({
        title: "Campaign Activated",
        description: "Your campaign is now live and ready to receive calls",
      });
      // Invalidate all campaign-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/validation`] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: () => {
      toast({
        title: "Activation Failed",
        description: "Unable to activate campaign. Please check your configuration.",
        variant: "destructive",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/campaigns/${campaignId}`, "PATCH", { status: "paused" });
    },
    onSuccess: () => {
      toast({
        title: "Campaign Paused",
        description: "Your campaign has been paused and will not receive calls",
      });
      // Invalidate all campaign-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/validation`] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  if (isLoading || !validation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Setup</CardTitle>
          <CardDescription>Loading validation status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (completed: boolean, required: boolean) => {
    if (completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (required) {
      return <Circle className="h-4 w-4 text-gray-400" />;
    }
    return <Circle className="h-4 w-4 text-gray-300" />;
  };

  const getStatusColor = () => {
    if (campaignStatus === "active") return "green";
    if (validation.canActivate) return "yellow";
    return "gray";
  };

  const getStatusText = () => {
    if (campaignStatus === "active") return "Live";
    if (campaignStatus === "paused") return "Paused";
    if (validation.canActivate) return "Ready to Launch";
    return "Setup Required";
  };

  return (
    <div className="space-y-4">
      {/* For active campaigns, show compact status bar instead of full setup progress */}
      {campaignStatus === "active" ? (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Live
                </Badge>
                <span className="text-sm text-gray-600">Campaign is active and receiving calls</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? "Pausing..." : "Pause Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Full setup progress for non-active campaigns */
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Campaign Setup Progress
                  <Badge variant={getStatusColor() as any}>{getStatusText()}</Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  Complete all required steps to activate your campaign
                </CardDescription>
              </div>
              <Button 
                onClick={() => activateMutation.mutate()}
                disabled={!validation.canActivate || activateMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {activateMutation.isPending ? "Activating..." : "Activate Campaign"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{validation.completionPercentage}% Complete</span>
              </div>
              <Progress 
                value={validation.completionPercentage} 
                className="h-1.5"
              />
            </div>

            {/* Setup Steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {validation.steps.map((step) => (
                <div 
                  key={step.id}
                  className={`flex items-center gap-1.5 p-2 rounded-md border ${
                    step.completed 
                      ? "bg-green-50 border-green-200" 
                      : step.required 
                      ? "bg-yellow-50 border-yellow-200" 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {getStatusIcon(step.completed, step.required)}
                  <span className={`text-xs font-medium ${
                    step.completed ? "text-green-800" : "text-gray-700"
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Issues */}
      {validation.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Setup Issues
            </CardTitle>
            <CardDescription>
              Address these issues to improve your campaign setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validation.issues.map((issue, index) => (
              <Alert key={index} variant={issue.type === "error" ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{issue.message}</div>
                    {issue.action && (
                      <div className="text-sm text-muted-foreground">
                        {issue.action}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ready to Launch */}
      {validation.canActivate && campaignStatus !== "active" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 text-sm">Ready to Launch!</h3>
                <p className="text-xs text-green-700">
                  Your campaign is properly configured and ready to receive calls.
                </p>
              </div>
              <Button 
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Zap className="h-3 w-3 mr-1" />
                {activateMutation.isPending ? "Activating..." : "Go Live"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}