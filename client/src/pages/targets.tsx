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
import { Plus, Phone, Globe, Edit, Trash2, Settings, Target as TargetIcon, Tag } from "lucide-react";
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
          <div className="space-y-3">
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
            
            {/* Breaks Display */}
            {basicHours.breaks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">Breaks</div>
                {basicHours.breaks.map((breakItem, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-xs text-gray-700">
                      {breakItem.start} for {breakItem.duration} minutes
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBasicHours(prev => ({
                          ...prev,
                          breaks: prev.breaks.filter((_, i) => i !== index)
                        }));
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
              <div key={day} className="space-y-2">
                <div className="grid grid-cols-4 gap-2 items-center">
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
                
                {/* Breaks Display for this day */}
                {hours.breaks.length > 0 && (
                  <div className="ml-8 space-y-1">
                    <div className="text-xs font-medium text-gray-600">Breaks</div>
                    {hours.breaks.map((breakItem, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-xs">
                        <span className="text-gray-700">
                          {breakItem.start} for {breakItem.duration} minutes
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdvancedHours(prev => ({
                              ...prev,
                              [day]: {
                                ...prev[day as keyof typeof prev],
                                breaks: prev[day as keyof typeof prev].breaks.filter((_, i) => i !== index)
                              }
                            }));
                          }}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
  
  // Concurrency toggle states
  const [maxConcurrencyEnabled, setMaxConcurrencyEnabled] = useState(false);
  const [hourlyConcurrencyEnabled, setHourlyConcurrencyEnabled] = useState(false);
  const [weeklySettingsEnabled, setWeeklySettingsEnabled] = useState(false);
  
  // Predictive routing states
  const [useEstimatedRevenue, setUseEstimatedRevenue] = useState(false);

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery<Target[]>({
    queryKey: ['/api/targets'],
  });

  // Fetch buyers for dropdown
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ['/api/buyers'],
  });

  // Fetch predictive routing configurations
  const { data: predictiveRoutingConfigs = [], isLoading: loadingConfigs } = useQuery<any[]>({
    queryKey: ['/api/settings/predictive-routing'],
    enabled: useEstimatedRevenue,
    staleTime: 0,
    refetchOnWindowFocus: false
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
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="caps">Cap Settings</TabsTrigger>
                        <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
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
                      <TabsContent value="caps" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Cap Settings
                            </CardTitle>
                            <CardDescription>
                              Configure call capacity limits and daily caps
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Daily Cap</label>
                                <Input type="number" placeholder="Enter daily call limit" />
                                <p className="text-xs text-gray-500">Maximum calls per day (0 = unlimited)</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Weekly Cap</label>
                                <Input type="number" placeholder="Enter weekly call limit" />
                                <p className="text-xs text-gray-500">Maximum calls per week (0 = unlimited)</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Monthly Cap</label>
                                <Input type="number" placeholder="Enter monthly call limit" />
                                <p className="text-xs text-gray-500">Maximum calls per month (0 = unlimited)</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Cap Reset Time</label>
                                <Select defaultValue="12:00 PM">
                                  <SelectTrigger>
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
                            <div className="flex items-center space-x-2">
                              <Switch />
                              <label className="text-sm font-medium">Pause target when cap is reached</label>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="concurrency" className="space-y-6">
                        <Card className="bg-slate-50 dark:bg-slate-900">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Concurrency Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Max Concurrency Toggle */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-medium">Max Concurrency</div>
                                  <div className="text-sm text-muted-foreground">None</div>
                                </div>
                                <Switch 
                                  checked={maxConcurrencyEnabled}
                                  onCheckedChange={setMaxConcurrencyEnabled}
                                />
                              </div>
                              
                              {/* Max Concurrency Input - Only show when enabled */}
                              {maxConcurrencyEnabled && (
                                <div className="pl-4">
                                  <div className="flex items-center space-x-3">
                                    <label className="text-sm font-medium min-w-[120px]">Maximum Calls:</label>
                                    <Input 
                                      type="number" 
                                      placeholder="Enter max concurrent calls"
                                      className="h-9 w-40"
                                      min="1"
                                      max="100"
                                      defaultValue="5"
                                    />
                                    <span className="text-xs text-muted-foreground">concurrent calls</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Hourly Concurrency Toggle */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <div className="text-sm font-medium">Hourly Concurrency</div>
                                  <div className="text-sm text-muted-foreground">None</div>
                                </div>
                                <Switch 
                                  checked={hourlyConcurrencyEnabled}
                                  onCheckedChange={setHourlyConcurrencyEnabled}
                                />
                              </div>

                              {/* 24-Hour Concurrency Table - Only show when enabled */}
                              {hourlyConcurrencyEnabled && (
                                <>
                                  <Card className="border">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">Daily Hourly Limits</CardTitle>
                                      <CardDescription className="text-xs">Set concurrency limits for each hour of the day</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-3">
                                      <div className="grid grid-cols-6 gap-2 text-xs">
                                        {/* Hour headers and inputs */}
                                        {Array.from({ length: 24 }, (_, i) => (
                                          <div key={i} className="space-y-1">
                                            <div className="text-center font-medium text-muted-foreground">
                                              {String(i).padStart(2, '0')}:00
                                            </div>
                                            <Input 
                                              type="number" 
                                              placeholder="0"
                                              className="h-8 text-center text-xs"
                                              min="0"
                                              max="100"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {/* Quick Set Options */}
                                      <div className="flex gap-2 mt-4 pt-3 border-t">
                                        <Button variant="outline" size="sm" className="text-xs">
                                          Set All to 5
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs">
                                          Business Hours Only
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs">
                                          Clear All
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Advanced Weekly Settings */}
                                  <Card className="border">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <CardTitle className="text-sm">Advanced</CardTitle>
                                          <CardDescription className="text-xs">Weekly concurrency patterns</CardDescription>
                                        </div>
                                        <Switch 
                                          checked={weeklySettingsEnabled}
                                          onCheckedChange={setWeeklySettingsEnabled}
                                        />
                                      </div>
                                    </CardHeader>
                                    {weeklySettingsEnabled && (
                                      <CardContent className="p-3">
                                        <div className="space-y-3">
                                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                            <div key={day} className="flex items-center justify-between">
                                              <div className="flex items-center space-x-2">
                                                <Switch />
                                                <span className="text-sm font-medium">{day}</span>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Input 
                                                  type="number" 
                                                  placeholder="0"
                                                  className="h-8 w-16 text-center text-xs"
                                                  min="0"
                                                  max="100"
                                                />
                                                <span className="text-xs text-muted-foreground">calls/hour</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        <div className="flex gap-2 mt-4 pt-3 border-t">
                                          <Button variant="outline" size="sm" className="text-xs">
                                            Copy from Daily
                                          </Button>
                                          <Button variant="outline" size="sm" className="text-xs">
                                            Weekdays Only
                                          </Button>
                                        </div>
                                      </CardContent>
                                    )}
                                  </Card>
                                </>
                              )}
                            </div>

                            {/* Restrict Duplicate Calls Settings */}
                            <div className="space-y-4 border-t pt-4">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Restrict Duplicate Calls Settings</h3>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Restrict Duplicate</label>
                                <Select defaultValue="buyer_settings">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="buyer_settings">Buyer Settings (Do not Restrict)</SelectItem>
                                    <SelectItem value="restrict">Restrict</SelectItem>
                                    <SelectItem value="do_not_restrict">Do Not Restrict</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Predictive Routing Settings */}
                            <div className="space-y-4 border-t pt-4">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Predictive Routing Settings</h3>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Estimated Revenue</label>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant={!useEstimatedRevenue ? "default" : "outline"} 
                                      size="sm" 
                                      className="text-xs"
                                      onClick={() => setUseEstimatedRevenue(false)}
                                    >
                                      Use Campaign Setting
                                    </Button>
                                    <Button 
                                      variant={useEstimatedRevenue ? "default" : "outline"} 
                                      size="sm" 
                                      className="text-xs"
                                      onClick={() => setUseEstimatedRevenue(true)}
                                    >
                                      Use Estimated Revenue
                                    </Button>
                                  </div>
                                </div>

                                {/* Predictive Routing Configuration - Only show when Use Estimated Revenue is selected */}
                                {useEstimatedRevenue && (
                                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-medium">Predictive Routing Configuration</h4>
                                      <span className="text-xs text-red-500 font-medium">Required</span>
                                      {!loadingConfigs && Array.isArray(predictiveRoutingConfigs) && (
                                        <span className="text-xs text-muted-foreground">
                                          ({predictiveRoutingConfigs.length} available)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Select defaultValue="none">
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Choose a configuration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">No Configuration</SelectItem>
                                          {loadingConfigs ? (
                                            <SelectItem value="loading" disabled>Loading configurations...</SelectItem>
                                          ) : Array.isArray(predictiveRoutingConfigs) && predictiveRoutingConfigs.length > 0 ? (
                                            predictiveRoutingConfigs.map((config: any) => (
                                              <SelectItem key={config.id} value={config.id.toString()}>
                                                {config.name} ({config.type})
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="notfound" disabled>No configurations found</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Priority Bump</label>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>-10</span>
                                      <span>Default</span>
                                      <span>+10</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-10" 
                                      max="10" 
                                      defaultValue="0"
                                      className="w-full h-2 bg-gradient-to-r from-blue-500 via-gray-300 to-green-500 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>
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
                              Shareable Tags
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Override Shareable Tags Toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <div className="text-sm font-medium">Override Shareable Tags</div>
                                <div className="text-sm text-muted-foreground">None</div>
                              </div>
                              <Switch />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Tag Routing Filters
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="h-4 w-4 mr-2" />
                              ADD FILTER
                            </Button>
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