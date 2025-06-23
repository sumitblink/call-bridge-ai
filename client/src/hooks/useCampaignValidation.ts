import { useQuery } from "@tanstack/react-query";
import { Campaign, Buyer, PhoneNumber } from "@shared/schema";

export interface CampaignValidation {
  isValid: boolean;
  canActivate: boolean;
  completionPercentage: number;
  issues: ValidationIssue[];
  steps: ValidationStep[];
}

export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  action?: string;
}

export interface ValidationStep {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

export function useCampaignValidation(campaignId: number) {
  // Fetch campaign data
  const { data: campaign } = useQuery<Campaign>({
    queryKey: [`/api/campaigns/${campaignId}`],
  });

  // Fetch campaign buyers
  const { data: buyers = [] } = useQuery<Buyer[]>({
    queryKey: [`/api/campaigns/${campaignId}/buyers`],
  });

  // Fetch phone numbers
  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers"],
  });

  const validation = useQuery<CampaignValidation>({
    queryKey: [`/api/campaigns/${campaignId}/validation`, campaign, buyers, phoneNumbers],
    queryFn: () => validateCampaign(campaign, buyers, phoneNumbers),
    enabled: !!campaign,
  });

  return validation;
}

function validateCampaign(
  campaign: Campaign | undefined,
  buyers: Buyer[],
  phoneNumbers: PhoneNumber[]
): CampaignValidation {
  if (!campaign) {
    return {
      isValid: false,
      canActivate: false,
      completionPercentage: 0,
      issues: [{ type: "error", message: "Campaign not found" }],
      steps: [],
    };
  }

  const issues: ValidationIssue[] = [];
  const steps: ValidationStep[] = [];

  // Step 1: Basic Info
  const hasBasicInfo = !!(campaign.name && campaign.name.trim());
  steps.push({
    id: "basic-info",
    label: "Basic Info",
    completed: hasBasicInfo,
    required: true,
  });

  if (!hasBasicInfo) {
    issues.push({
      type: "error",
      message: "Campaign name is required",
      action: "Add a campaign name in General Settings",
    });
  }

  // Step 2: Phone Numbers
  const hasPhoneStrategy = !!(
    (campaign.routingType === "direct" && campaign.phoneNumber) ||
    (campaign.routingType === "pool" && campaign.poolId)
  );
  steps.push({
    id: "phone-numbers",
    label: "Phone Numbers",
    completed: hasPhoneStrategy,
    required: true,
  });

  if (!hasPhoneStrategy) {
    if (campaign.routingType === "direct") {
      issues.push({
        type: "error",
        message: "No phone number selected for direct routing",
        action: "Select a phone number in General Settings",
      });
    } else if (campaign.routingType === "pool") {
      issues.push({
        type: "error",
        message: "No number pool selected for pool routing",
        action: "Select a number pool in General Settings",
      });
    } else {
      issues.push({
        type: "error",
        message: "No routing type configured",
        action: "Configure routing type in General Settings",
      });
    }
  }

  // Step 3: Buyers Added
  const hasBuyers = buyers.length > 0;
  steps.push({
    id: "buyers-added",
    label: "Buyers Added",
    completed: hasBuyers,
    required: true,
  });

  if (!hasBuyers) {
    issues.push({
      type: "error",
      message: "No buyers added to receive calls",
      action: "Add at least one buyer in the Buyers tab",
    });
  }

  // Step 4: Routing Configuration
  const hasValidRouting = !!(
    campaign.callRoutingStrategy && 
    campaign.maxConcurrentCalls > 0 &&
    campaign.callCap > 0
  );
  steps.push({
    id: "routing-config",
    label: "Routing Configuration",
    completed: hasValidRouting,
    required: true,
  });

  if (!hasValidRouting) {
    if (!campaign.callRoutingStrategy) {
      issues.push({
        type: "error",
        message: "Call routing strategy not configured",
        action: "Set routing strategy in General Settings",
      });
    }
    if (!campaign.maxConcurrentCalls || campaign.maxConcurrentCalls <= 0) {
      issues.push({
        type: "warning",
        message: "Max concurrent calls should be greater than 0",
        action: "Set max concurrent calls in General Settings",
      });
    }
    if (!campaign.callCap || campaign.callCap <= 0) {
      issues.push({
        type: "warning",
        message: "Daily call cap should be greater than 0",
        action: "Set daily call cap in General Settings",
      });
    }
  }

  // Step 5: Activation
  const isActivated = campaign.status === "active";
  steps.push({
    id: "activation",
    label: "Campaign Activated",
    completed: isActivated,
    required: false,
  });

  // Calculate completion percentage
  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Check if can activate
  const requiredSteps = steps.filter(step => step.required);
  const completedRequiredSteps = requiredSteps.filter(step => step.completed);
  const canActivate = completedRequiredSteps.length === requiredSteps.length;

  // Overall validation
  const criticalIssues = issues.filter(issue => issue.type === "error");
  const isValid = criticalIssues.length === 0;

  return {
    isValid,
    canActivate,
    completionPercentage,
    issues,
    steps,
  };
}