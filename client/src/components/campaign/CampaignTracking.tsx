import { CallTrackingTags } from "./CallTrackingTags";

interface CampaignTrackingProps {
  campaignId: number;
  campaign: any;
}

export default function CampaignTracking({ campaignId, campaign }: CampaignTrackingProps) {
  return <CallTrackingTags campaignId={campaignId} />;
}