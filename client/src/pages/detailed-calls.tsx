import { ExpandableCallDetails } from "@/components/reporting/ExpandableCallDetails";
import Layout from "@/components/Layout";

export default function DetailedCalls() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detailed Call Views</h1>
          <p className="text-muted-foreground">
            Comprehensive call tracking with expandable details, IVR flow events, routing decisions, and RTB auction information.
          </p>
        </div>
        
        <ExpandableCallDetails />
      </div>
    </Layout>
  );
}