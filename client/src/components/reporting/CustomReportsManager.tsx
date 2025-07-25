import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Save, 
  Copy, 
  Trash2, 
  Edit3, 
  Share2, 
  User, 
  FolderOpen,
  Clock,
  Download
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CustomReport {
  id: number;
  name: string;
  description?: string;
  config: {
    filters: any[];
    dateRange: string;
    viewAs: string;
    timezone: string;
    visibleColumns: Record<string, boolean>;
    groupBy?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  isShared: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: number;
    username: string;
  };
}

interface CustomReportsManagerProps {
  currentConfig: any;
  onLoadReport: (config: any) => void;
  onSaveReport: (name: string, description: string, isShared: boolean) => void;
}

export default function CustomReportsManager({ 
  currentConfig, 
  onLoadReport, 
  onSaveReport 
}: CustomReportsManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [saveForm, setSaveForm] = useState({
    name: "",
    description: "",
    isShared: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customReports = [], isLoading } = useQuery({
    queryKey: ['/api/reporting/custom-reports'],
    queryFn: async () => {
      const response = await fetch('/api/reporting/custom-reports');
      return response.json();
    }
  });

  const saveReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingReport ? 'PUT' : 'POST';
      const url = editingReport 
        ? `/api/reporting/custom-reports/${editingReport.id}`
        : '/api/reporting/custom-reports';
      
      return apiRequest(url, method, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reporting/custom-reports'] });
      setShowSaveDialog(false);
      setEditingReport(null);
      setSaveForm({ name: "", description: "", isShared: false });
      toast({
        title: editingReport ? "Report updated" : "Report saved",
        description: `Custom report "${saveForm.name}" has been ${editingReport ? 'updated' : 'saved'} successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save report",
        variant: "destructive"
      });
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest(`/api/reporting/custom-reports/${reportId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reporting/custom-reports'] });
      toast({
        title: "Report deleted",
        description: "Custom report has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete report",
        variant: "destructive"
      });
    }
  });

  const copyReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest(`/api/reporting/custom-reports/${reportId}/copy`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reporting/custom-reports'] });
      toast({
        title: "Report copied",
        description: "Custom report has been copied successfully."
      });
    }
  });

  const handleSaveReport = () => {
    if (!saveForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Report name is required",
        variant: "destructive"
      });
      return;
    }

    const reportData = {
      name: saveForm.name,
      description: saveForm.description,
      config: currentConfig,
      isShared: saveForm.isShared
    };

    saveReportMutation.mutate(reportData);
  };

  const handleLoadReport = (report: CustomReport) => {
    onLoadReport(report.config);
    setShowManageDialog(false);
    toast({
      title: "Report loaded",
      description: `Loaded configuration from "${report.name}"`
    });
  };

  const handleEditReport = (report: CustomReport) => {
    setEditingReport(report);
    setSaveForm({
      name: report.name,
      description: report.description || "",
      isShared: report.isShared
    });
    setShowSaveDialog(true);
  };

  const exportReport = (report: CustomReport) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const personalReports = customReports.filter((r: CustomReport) => !r.isShared);
  const sharedReports = customReports.filter((r: CustomReport) => r.isShared);

  return (
    <div className="flex gap-2">
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Update Report' : 'Save Custom Report'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-name">Report Name *</Label>
              <Input
                id="report-name"
                value={saveForm.name}
                onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
              />
            </div>
            <div>
              <Label htmlFor="report-description">Description</Label>
              <Input
                id="report-description"
                value={saveForm.description}
                onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-shared"
                checked={saveForm.isShared}
                onChange={(e) => setSaveForm(prev => ({ ...prev, isShared: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is-shared" className="text-sm">
                Share with other users
              </Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveReport}
                disabled={saveReportMutation.isPending}
              >
                {saveReportMutation.isPending ? 'Saving...' : 'Save Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Manage Reports
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Custom Reports</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList>
              <TabsTrigger value="personal">Personal ({personalReports.length})</TabsTrigger>
              <TabsTrigger value="shared">Shared ({sharedReports.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-4">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personalReports.map((report: CustomReport) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {report.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleLoadReport(report)}
                            >
                              Load
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditReport(report)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyReportMutation.mutate(report.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => exportReport(report)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deleteReportMutation.mutate(report.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {personalReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          No personal reports saved yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="shared" className="mt-4">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedReports.map((report: CustomReport) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Share2 className="h-4 w-4 text-blue-500" />
                            {report.name}
                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {report.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.createdByUser?.username || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleLoadReport(report)}
                            >
                              Load
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyReportMutation.mutate(report.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => exportReport(report)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sharedReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No shared reports available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}