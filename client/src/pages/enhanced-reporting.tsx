import ComprehensiveReporting from "@/components/reporting/ComprehensiveReporting";
import Layout from "@/components/Layout";

export default function EnhancedReporting() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced Reporting</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive call tracking with advanced RedTrack-style filtering and attribution analytics
            </p>
          </div>
        </div>

        <ComprehensiveReporting />
      </div>
    </Layout>
  );
}