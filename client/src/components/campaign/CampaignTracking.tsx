import { CallTrackingTags } from "./CallTrackingTags";
import UTMCodeManager from "./UTMCodeManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Link } from "lucide-react";

interface CampaignTrackingProps {
  campaignId: number;
  campaign: any;
}

export default function CampaignTracking({ campaignId, campaign }: CampaignTrackingProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="call-tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="call-tracking" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Call Tracking Tags
          </TabsTrigger>
          <TabsTrigger value="utm-codes" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            UTM Campaign Codes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="call-tracking" className="mt-6">
          <CallTrackingTags campaignId={campaignId} />
        </TabsContent>
        
        <TabsContent value="utm-codes" className="mt-6">
          <UTMCodeManager campaignId={campaignId} campaignName={campaign.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}