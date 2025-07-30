import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Phone, Globe, Edit, Trash2, Settings, Target as TargetIcon, Navigation, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { insertTargetSchema } from "@shared/schema";
import type { Target, Buyer } from "@shared/schema";

// Hours of Operation Component
interface HoursOfOperationProps {
  value: string;
  onChange: (value: string) => void;
}

const HoursOfOperationComponent = ({ value, onChange }: HoursOfOperationProps) => {
  const [isEnabled, setIsEnabled] = useState(value !== "Always Open");
  const [mode, setMode] = useState<"Basic" | "Advanced">("Basic");
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [currentBreakDay, setCurrentBreakDay] = useState<string>("");
  const [breakStartTime, setBreakStartTime] = useState("12:00");
  const [breakDuration, setBreakDuration] = useState("60");
  const [basicHours, setBasicHours] = useState({
    openTime: "09:00 AM",
    closeTime: "09:00 PM",
    breaks: [] as Array<{ start: string; duration: number }>
  });
  const [advancedHours, setAdvancedHours] = useState({
    Sunday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Monday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Tuesday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Wednesday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Thursday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Friday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> },
    Saturday: { enabled: true, openTime: "09:00 AM", closeTime: "09:00 PM", breaks: [] as Array<{ start: string; duration: number }> }
  });

  useEffect(() => {
    if (!isEnabled) {
      onChange("Always Open");
    } else if (mode === "Basic") {
      onChange(`Basic: ${basicHours.openTime} - ${basicHours.closeTime}`);
    } else {
      onChange(`Advanced: ${JSON.stringify(advancedHours)}`);
    }
  }, [isEnabled, mode, basicHours, advancedHours, onChange]);

  const openBreakModal = (day?: string) => {
    setCurrentBreakDay(day || "basic");
    setBreakStartTime("12:00");
    setBreakDuration("60");
    setShowBreakModal(true);
  };

  const confirmBreak = () => {
    if (currentBreakDay === "basic") {
      setBasicHours(prev => ({
        ...prev,
        breaks: [...prev.breaks, { start: breakStartTime, duration: parseInt(breakDuration) }]
      }));
    } else {
      setAdvancedHours(prev => ({
        ...prev,
        [currentBreakDay]: {
          ...prev[currentBreakDay as keyof typeof prev],
          breaks: [...prev[currentBreakDay as keyof typeof prev].breaks, { start: breakStartTime, duration: parseInt(breakDuration) }]
        }
      }));
    }
    setShowBreakModal(false);
  };

  const cancelBreak = () => {
    setShowBreakModal(false);
  };

  if (!isEnabled) {
    return (
      <div className="border rounded p-3 bg-white">
        <div className="flex items-center space-x-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
          <span className="text-sm font-medium text-gray-600">Always Open</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded p-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <span className="text-sm font-medium">Hours of Operation</span>
          </div>
          <div className="flex space-x-1">
            <Button
              type="button"
              variant={mode === "Basic" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("Basic")}
              className="h-7 px-3 text-xs"
            >
              Basic
            </Button>
            <Button
              type="button"
              variant={mode === "Advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("Advanced")}
              className="h-7 px-3 text-xs"
            >
              Advanced
            </Button>
          </div>
        </div>

        {mode === "Basic" && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-600 block mb-1">Open</label>
              <Input
                type="time"
                value={basicHours.openTime.replace(/\s(AM|PM)/, '')}
                onChange={(e) => setBasicHours(prev => ({ ...prev, openTime: e.target.value + ' AM' }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-600 block mb-1">Close</label>
              <Input
                type="time"
                value={basicHours.closeTime.replace(/\s(AM|PM)/, '')}
                onChange={(e) => setBasicHours(prev => ({ ...prev, closeTime: e.target.value + ' PM' }))}
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openBreakModal()}
              className="h-8 px-2 text-xs"
            >
              + ADD BREAK
            </Button>
          </div>
        )}

        {mode === "Advanced" && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
              <span>Day</span>
              <span>Open</span>
              <span>Close</span>
              <span></span>
            </div>
            {Object.entries(advancedHours).map(([day, hours]) => (
              <div key={day} className="grid grid-cols-4 gap-2 items-center">
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={hours.enabled}
                    onCheckedChange={(checked) => 
                      setAdvancedHours(prev => ({
                        ...prev,
                        [day]: { ...prev[day as keyof typeof prev], enabled: checked }
                      }))
                    }
                  />
                  <span className="text-xs font-medium">{day.slice(0, 3)}</span>
                </div>
                <Input
                  type="time"
                  value={hours.openTime.replace(/\s(AM|PM)/, '')}
                  onChange={(e) => 
                    setAdvancedHours(prev => ({
                      ...prev,
                      [day]: { ...prev[day as keyof typeof prev], openTime: e.target.value + ' AM' }
                    }))
                  }
                  disabled={!hours.enabled}
                  className="h-7 text-xs"
                />
                <Input
                  type="time"
                  value={hours.closeTime.replace(/\s(AM|PM)/, '')}
                  onChange={(e) => 
                    setAdvancedHours(prev => ({
                      ...prev,
                      [day]: { ...prev[day as keyof typeof prev], closeTime: e.target.value + ' PM' }
                    }))
                  }
                  disabled={!hours.enabled}
                  className="h-7 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openBreakModal(day)}
                  disabled={!hours.enabled}
                  className="h-7 px-2 text-xs"
                >
                  + ADD BREAK
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Break Modal */}
      {showBreakModal && (
        <Dialog open={showBreakModal} onOpenChange={setShowBreakModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Break</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Start Time</label>
                <Input
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Duration (Min)</label>
                <Input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={cancelBreak}
              >
                CANCEL
              </Button>
              <Button
                type="button"
                onClick={confirmBreak}
              >
                SAVE
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default function Targets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery<Target[]>({
    queryKey: ['/api/targets'],
  });

  // Fetch buyers for dropdown
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ['/api/buyers'],
  });

  // Form setup with timezone and hours of operation in Basic tab
  const form = useForm<z.infer<typeof insertTargetSchema>>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: {
      userId: 2,
      name: "",
      buyerId: 0,
      phoneNumber: "",
      endpoint: "",
      timeZone: "(UTC-05:00) Eastern Time (US & Canada)",
      hoursOfOperation: "Always Open",
      status: "active",
    },
  });

  // Mutations
  const createTargetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/targets', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      form.reset();
      setIsCreateDialogOpen(false);
      toast({ title: "Target created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create target", variant: "destructive" });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/targets/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      form.reset();
      setEditingTarget(null);
      toast({ title: "Target updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update target", variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/targets/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({ title: "Target deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete target", variant: "destructive" });
    },
  });

  // Event handlers
  const onSubmit = (data: z.infer<typeof insertTargetSchema>) => {
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, ...data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    form.reset({
      name: target.name || "",
      buyerId: target.buyerId || 0,
      phoneNumber: target.phoneNumber || "",
      endpoint: target.endpoint || "",
      timeZone: target.timeZone || "EST",
      hoursOfOperation: target.hoursOfOperation || "Always Open",
      status: target.status || "active",
    });
  };

  const getBuyerName = (buyerId: number) => {
    const buyer = buyers.find((b: any) => b.id === buyerId);
    return buyer ? (buyer.companyName || buyer.name) : `Buyer ${buyerId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (targetsLoading || buyersLoading) {
    return <Layout><div className="p-6">Loading targets...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Targets</h1>
            <p className="text-gray-600 mt-1">
              Manage individual routing endpoints and destinations under buyers
            </p>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingTarget} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingTarget(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Target
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-3">
              <DialogHeader className="pb-2">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <TargetIcon className="h-4 w-4" />
                  {editingTarget ? "Edit Target" : "Create Target"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure your target endpoint with comprehensive settings and controls
                </DialogDescription>
              </DialogHeader>

              <TooltipProvider>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 pb-2">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="caps">Cap Settings</TabsTrigger>
                        <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
                        <TabsTrigger value="routing">Routing</TabsTrigger>
                        <TabsTrigger value="tags">Tags</TabsTrigger>
                      </TabsList>

                      {/* Basic Information Tab */}
                      <TabsContent value="basic" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TargetIcon className="h-4 w-4" />
                              Basic Information
                            </CardTitle>
                            <CardDescription>
                              Configure the target name, buyer assignment, and destination endpoint
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Target Name & Buyer */}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Name <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter target name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="buyerId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Buyer <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select buyer" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {buyers.map((buyer: any) => (
                                          <SelectItem key={buyer.id} value={buyer.id.toString()}>
                                            {buyer.companyName || buyer.name || `Buyer ${buyer.id}`}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Type & Destination */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <Select defaultValue="Number">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Number">Number</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Destination <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                      <Input placeholder="Phone number or endpoint" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Connection Timeout & Disable Recording */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Connection Timeout (seconds)</label>
                                <Input type="number" defaultValue="30" />
                                <p className="text-xs text-gray-500">Maximum time to wait for connection (1-300 seconds)</p>
                              </div>
                              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <label className="text-sm font-medium">Disable Recording</label>
                                  <p className="text-xs text-gray-500">Turn off call recording for this target</p>
                                </div>
                                <Switch />
                              </div>
                            </div>

                            {/* Timezone */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <FormField
                                control={form.control}
                                name="timeZone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium text-blue-800">Time Zone <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="border-blue-300">
                                          <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="(UTC-08:00) Pacific Time (US & Canada)">(UTC-08:00) Pacific Time (US & Canada)</SelectItem>
                                        <SelectItem value="(UTC-07:00) Mountain Time (US & Canada)">(UTC-07:00) Mountain Time (US & Canada)</SelectItem>
                                        <SelectItem value="(UTC-06:00) Central Time (US & Canada)">(UTC-06:00) Central Time (US & Canada)</SelectItem>
                                        <SelectItem value="(UTC-05:00) Eastern Time (US & Canada)">(UTC-05:00) Eastern Time (US & Canada)</SelectItem>
                                        <SelectItem value="(UTC-04:00) Atlantic Time (Canada)">(UTC-04:00) Atlantic Time (Canada)</SelectItem>
                                        <SelectItem value="(UTC-03:00) Brasilia">(UTC-03:00) Brasilia</SelectItem>
                                        <SelectItem value="(UTC-02:00) Mid-Atlantic">(UTC-02:00) Mid-Atlantic</SelectItem>
                                        <SelectItem value="(UTC-01:00) Azores">(UTC-01:00) Azores</SelectItem>
                                        <SelectItem value="(UTC+00:00) Greenwich Mean Time">(UTC+00:00) Greenwich Mean Time</SelectItem>
                                        <SelectItem value="(UTC+01:00) Central European Time">(UTC+01:00) Central European Time</SelectItem>
                                        <SelectItem value="(UTC+02:00) Eastern European Time">(UTC+02:00) Eastern European Time</SelectItem>
                                        <SelectItem value="(UTC+03:00) Moscow Time">(UTC+03:00) Moscow Time</SelectItem>
                                        <SelectItem value="(UTC+04:00) Gulf Standard Time">(UTC+04:00) Gulf Standard Time</SelectItem>
                                        <SelectItem value="(UTC+05:00) Pakistan Standard Time">(UTC+05:00) Pakistan Standard Time</SelectItem>
                                        <SelectItem value="(UTC+06:00) Bangladesh Standard Time">(UTC+06:00) Bangladesh Standard Time</SelectItem>
                                        <SelectItem value="(UTC+07:00) Thailand Standard Time">(UTC+07:00) Thailand Standard Time</SelectItem>
                                        <SelectItem value="(UTC+08:00) China Standard Time">(UTC+08:00) China Standard Time</SelectItem>
                                        <SelectItem value="(UTC+09:00) Japan Standard Time">(UTC+09:00) Japan Standard Time</SelectItem>
                                        <SelectItem value="(UTC+10:00) Australian Eastern Time">(UTC+10:00) Australian Eastern Time</SelectItem>
                                        <SelectItem value="(UTC+11:00) Solomon Islands Time">(UTC+11:00) Solomon Islands Time</SelectItem>
                                        <SelectItem value="(UTC+12:00) Fiji Time">(UTC+12:00) Fiji Time</SelectItem>
                                        <SelectItem value="(UTC+13:00) Tonga Time">(UTC+13:00) Tonga Time</SelectItem>
                                        <SelectItem value="(UTC+14:00) Line Islands Time">(UTC+14:00) Line Islands Time</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Hours of Operation */}
                            <FormField
                              control={form.control}
                              name="hoursOfOperation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Hours of Operation <span className="text-red-500">*</span></FormLabel>
                                  <HoursOfOperationComponent 
                                    value={field.value} 
                                    onChange={field.onChange}
                                  />
                                  <FormMessage />
                                </FormItem>
                              )}
                            />




                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Cap Settings Tab */}
                      <TabsContent value="caps" className="space-y-1 py-1">
                        <div className="space-y-1">
                          <div className="mb-1">
                            <h3 className="text-sm font-medium mb-0">Cap Settings</h3>
                            <p className="text-xs text-gray-600">Configure call capacity limits and daily caps</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Daily Cap</label>
                              <Input type="number" placeholder="Enter daily call limit" className="h-6 text-xs px-2 py-0" />
                              <p className="text-xs text-gray-500 mt-0">Maximum calls per day (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Weekly Cap</label>
                              <Input type="number" placeholder="Enter weekly call limit" className="h-6 text-xs px-2 py-0" />
                              <p className="text-xs text-gray-500 mt-0">Maximum calls per week (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Monthly Cap</label>
                              <Input type="number" placeholder="Enter monthly call limit" className="h-6 text-xs px-2 py-0" />
                              <p className="text-xs text-gray-500 mt-0">Maximum calls per month (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Cap Reset Time</label>
                              <Select defaultValue="12:00 PM">
                                <SelectTrigger className="h-6 text-xs px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="12:00 AM">12:00 AM</SelectItem>
                                  <SelectItem value="6:00 AM">6:00 AM</SelectItem>
                                  <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                                  <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="pt-0.5">
                            <div className="flex items-center space-x-2">
                              <Switch className="scale-75" />
                              <label className="text-xs">Pause target when cap is reached</label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="concurrency" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Concurrency Settings
                            </CardTitle>
                            <CardDescription>
                              Configure concurrent call limits and distribution
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Concurrent Call Limit</label>
                                <Input type="number" defaultValue="5" />
                                <p className="text-xs text-gray-500">Maximum simultaneous calls (1-50)</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Call Distribution</label>
                                <Select defaultValue="weighted">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="round_robin">Round Robin</SelectItem>
                                    <SelectItem value="weighted">Weighted Distribution</SelectItem>
                                    <SelectItem value="priority">Priority Based</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Priority Level</label>
                                <Select defaultValue="5">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 (Highest)</SelectItem>
                                    <SelectItem value="2">2 (High)</SelectItem>
                                    <SelectItem value="3">3 (Medium High)</SelectItem>
                                    <SelectItem value="4">4 (Medium)</SelectItem>
                                    <SelectItem value="5">5 (Medium Low)</SelectItem>
                                    <SelectItem value="6">6 (Low)</SelectItem>
                                    <SelectItem value="7">7 (Lowest)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Weight Percentage</label>
                                <Input type="number" defaultValue="100" min="1" max="100" />
                                <p className="text-xs text-gray-500">Distribution weight (1-100%)</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch />
                              <label className="text-sm font-medium">Enable failover routing</label>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="routing" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Navigation className="h-4 w-4" />
                              Routing Configuration
                            </CardTitle>
                            <CardDescription>
                              Configure advanced routing rules and conditions
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Routing Method</label>
                                <Select defaultValue="direct">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="direct">Direct</SelectItem>
                                    <SelectItem value="ivr">IVR Menu</SelectItem>
                                    <SelectItem value="conditional">Conditional</SelectItem>
                                    <SelectItem value="time_based">Time Based</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Fallback Target</label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fallback target" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="voicemail">Voicemail</SelectItem>
                                    <SelectItem value="hangup">Hangup</SelectItem>
                                    <SelectItem value="another_target">Another Target</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Answer Timeout (seconds)</label>
                                <Input type="number" defaultValue="30" min="5" max="120" />
                                <p className="text-xs text-gray-500">Time to wait for answer (5-120 seconds)</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Retry Attempts</label>
                                <Input type="number" defaultValue="3" min="0" max="10" />
                                <p className="text-xs text-gray-500">Number of retry attempts (0-10)</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Switch />
                                <label className="text-sm font-medium">Screen calls before connecting</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch />
                                <label className="text-sm font-medium">Record caller ID for reporting</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch />
                                <label className="text-sm font-medium">Enable call whisper</label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="tags" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Tags & Metadata
                            </CardTitle>
                            <CardDescription>
                              Configure tags and custom metadata for tracking and reporting
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Target Tags</label>
                              <Input placeholder="Enter tags separated by commas (e.g., insurance, health, premium)" />
                              <p className="text-xs text-gray-500">Tags help organize and filter targets in reports</p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Campaign Categories</label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select primary category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="insurance">Insurance</SelectItem>
                                  <SelectItem value="healthcare">Healthcare</SelectItem>
                                  <SelectItem value="finance">Finance</SelectItem>
                                  <SelectItem value="automotive">Automotive</SelectItem>
                                  <SelectItem value="education">Education</SelectItem>
                                  <SelectItem value="real_estate">Real Estate</SelectItem>
                                  <SelectItem value="legal">Legal</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Lead Source</label>
                                <Input placeholder="e.g., Google Ads, Facebook, Organic" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Vertical</label>
                                <Input placeholder="e.g., Auto Insurance, Life Insurance" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Quality Score</label>
                                <Select defaultValue="5">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 - Poor</SelectItem>
                                    <SelectItem value="2">2 - Below Average</SelectItem>
                                    <SelectItem value="3">3 - Average</SelectItem>
                                    <SelectItem value="4">4 - Good</SelectItem>
                                    <SelectItem value="5">5 - Excellent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Expected LTV</label>
                                <Input type="number" placeholder="0.00" step="0.01" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Notes</label>
                              <textarea 
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Additional notes or special instructions for this target..."
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="concurrency" className="space-y-2 py-2">
                        <div className="space-y-2">
                          <div>
                            <h3 className="text-sm font-medium">Cap Settings</h3>
                            <p className="text-xs text-gray-600">Configure call capacity limits and daily caps</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Daily Cap</label>
                              <Input type="number" placeholder="Enter daily call limit" className="h-7 text-xs px-2" />
                              <p className="text-xs text-gray-500 mt-0.5">Maximum calls per day (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Weekly Cap</label>
                              <Input type="number" placeholder="Enter weekly call limit" className="h-7 text-xs px-2" />
                              <p className="text-xs text-gray-500 mt-0.5">Maximum calls per week (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Monthly Cap</label>
                              <Input type="number" placeholder="Enter monthly call limit" className="h-7 text-xs px-2" />
                              <p className="text-xs text-gray-500 mt-0.5">Maximum calls per month (0 = unlimited)</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-0.5">Cap Reset Time</label>
                              <Select defaultValue="12:00 PM">
                                <SelectTrigger className="h-7 text-xs px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="12:00 AM">12:00 AM</SelectItem>
                                  <SelectItem value="6:00 AM">6:00 AM</SelectItem>
                                  <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                                  <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="pt-1">
                            <div className="flex items-center space-x-2">
                              <Switch id="pause-target" className="scale-75" />
                              <label htmlFor="pause-target" className="text-xs">Pause target when cap is reached</label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="routing" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Routing Settings</CardTitle>
                            <CardDescription>Configure how calls are routed to this target</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Routing Priority</label>
                                  <Select defaultValue="5">
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1 - Highest Priority</SelectItem>
                                      <SelectItem value="2">2 - High Priority</SelectItem>
                                      <SelectItem value="3">3 - Medium Priority</SelectItem>
                                      <SelectItem value="4">4 - Low Priority</SelectItem>
                                      <SelectItem value="5">5 - Lowest Priority</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Weight (%)</label>
                                  <Input type="number" placeholder="100" min="0" max="100" />
                                  <p className="text-xs text-gray-600">Percentage of calls to route here</p>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Timeout (seconds)</label>
                                  <Input type="number" placeholder="30" min="5" max="120" />
                                  <p className="text-xs text-gray-600">How long to ring before timeout</p>
                                </div>
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Retry Attempts</label>
                                  <Select defaultValue="2">
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">No retries</SelectItem>
                                      <SelectItem value="1">1 retry</SelectItem>
                                      <SelectItem value="2">2 retries</SelectItem>
                                      <SelectItem value="3">3 retries</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                  <Switch id="failover-enabled" />
                                  <label htmlFor="failover-enabled" className="text-sm">Enable failover routing</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch id="recording-enabled" defaultChecked />
                                  <label htmlFor="recording-enabled" className="text-sm">Record calls to this target</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch id="transcription-enabled" />
                                  <label htmlFor="transcription-enabled" className="text-sm">Auto-transcribe recordings</label>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="tags" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Tags & Filters</CardTitle>
                            <CardDescription>Organize and filter calls with custom tags</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Default Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Insurance</Badge>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">Healthcare</Badge>
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">Premium</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Input placeholder="Add new tag..." className="flex-1" />
                                  <Button variant="outline" size="sm">Add Tag</Button>
                                </div>
                              </div>
                              
                              <div className="border-t pt-4">
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Call Quality Filters</label>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex items-center space-x-2">
                                        <Switch id="min-duration" />
                                        <label htmlFor="min-duration" className="text-sm">Minimum duration filter</label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input type="number" placeholder="30" className="w-20" min="1" />
                                        <span className="text-sm text-gray-600">seconds</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Geographic Filters</label>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select allowed regions..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Regions</SelectItem>
                                        <SelectItem value="us">United States Only</SelectItem>
                                        <SelectItem value="ca">Canada Only</SelectItem>
                                        <SelectItem value="us-ca">US & Canada</SelectItem>
                                        <SelectItem value="custom">Custom Filter</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Time-based Filters</label>
                                    <div className="flex items-center space-x-2">
                                      <Switch id="business-hours-only" />
                                      <label htmlFor="business-hours-only" className="text-sm">Business hours only</label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingTarget(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                      >
                        {editingTarget ? "Update Target" : "Create Target"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TooltipProvider>
            </DialogContent>
          </Dialog>
        </div>

        {/* Targets List */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Name</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Time Zone</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((target: any) => (
                  <TableRow key={target.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>{getBuyerName(target.buyerId)}</TableCell>
                    <TableCell>
                      {target.phoneNumber ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="font-mono text-sm">{target.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {target.endpoint ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="text-sm truncate max-w-48" title={target.endpoint}>
                            {target.endpoint}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{target.timeZone || "EST"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{target.hoursOfOperation || "Always Open"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(target.status)}>
                        {target.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(target)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTargetMutation.mutate(target.id)}
                          disabled={deleteTargetMutation.isPending}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}