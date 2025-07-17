import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Clock, Phone, Filter, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface Phase3AdvancedFilteringDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  currentConfig?: any;
}

export default function Phase3AdvancedFilteringDialog({
  isOpen,
  onClose,
  onSave,
  currentConfig
}: Phase3AdvancedFilteringDialogProps) {
  const [config, setConfig] = useState({
    // Call Quality Management
    enableCallQuality: currentConfig?.enableCallQuality || false,
    minCallDuration: currentConfig?.minCallDuration || 30,
    maxCallDuration: currentConfig?.maxCallDuration || 1800,
    allowedCallTypes: currentConfig?.allowedCallTypes || ['mobile', 'landline'],
    blockedCallTypes: currentConfig?.blockedCallTypes || ['voip', 'tollfree'],
    qualityThreshold: currentConfig?.qualityThreshold || 0.8,
    
    // Caller History Tracking
    enableCallerHistory: currentConfig?.enableCallerHistory || false,
    lookbackDays: currentConfig?.lookbackDays || 30,
    maxCallsPerDay: currentConfig?.maxCallsPerDay || 5,
    maxCallsPerWeek: currentConfig?.maxCallsPerWeek || 15,
    blacklistDuration: currentConfig?.blacklistDuration || 7,
    
    // Dynamic Filtering
    enableDynamicFiltering: currentConfig?.enableDynamicFiltering || false,
    filterRules: currentConfig?.filterRules || [],
    
    // Performance Optimization
    enablePerformanceOptimization: currentConfig?.enablePerformanceOptimization || false,
    responseTimeThreshold: currentConfig?.responseTimeThreshold || 2000,
    successRateThreshold: currentConfig?.successRateThreshold || 0.9,
    
    // Advanced Security
    enableAdvancedSecurity: currentConfig?.enableAdvancedSecurity || false,
    fraudDetectionRules: currentConfig?.fraudDetectionRules || [],
    securityLevel: currentConfig?.securityLevel || 'medium'
  });

  const [newFilterRule, setNewFilterRule] = useState({
    name: '',
    condition: '',
    action: 'block',
    priority: 1
  });

  const addFilterRule = () => {
    if (newFilterRule.name && newFilterRule.condition) {
      setConfig(prev => ({
        ...prev,
        filterRules: [...prev.filterRules, { ...newFilterRule, id: Date.now() }]
      }));
      setNewFilterRule({ name: '', condition: '', action: 'block', priority: 1 });
    }
  };

  const removeFilterRule = (ruleId: number) => {
    setConfig(prev => ({
      ...prev,
      filterRules: prev.filterRules.filter((rule: any) => rule.id !== ruleId)
    }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Phase 3: Advanced Filtering Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="call-quality" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="call-quality">Call Quality</TabsTrigger>
            <TabsTrigger value="caller-history">Caller History</TabsTrigger>
            <TabsTrigger value="dynamic-filtering">Dynamic Filtering</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="call-quality" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <Label htmlFor="enable-call-quality">Enable Call Quality Management</Label>
              </div>
              <Switch
                id="enable-call-quality"
                checked={config.enableCallQuality}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableCallQuality: checked }))}
              />
            </div>

            {config.enableCallQuality && (
              <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-call-duration">Min Call Duration (seconds)</Label>
                    <Input
                      id="min-call-duration"
                      type="number"
                      value={config.minCallDuration}
                      onChange={(e) => setConfig(prev => ({ ...prev, minCallDuration: parseInt(e.target.value) }))}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-call-duration">Max Call Duration (seconds)</Label>
                    <Input
                      id="max-call-duration"
                      type="number"
                      value={config.maxCallDuration}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxCallDuration: parseInt(e.target.value) }))}
                      placeholder="1800"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="quality-threshold">Quality Threshold (0-1)</Label>
                  <Input
                    id="quality-threshold"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.qualityThreshold}
                    onChange={(e) => setConfig(prev => ({ ...prev, qualityThreshold: parseFloat(e.target.value) }))}
                    placeholder="0.8"
                  />
                </div>

                <div>
                  <Label>Allowed Call Types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['mobile', 'landline', 'voip', 'tollfree'].map(type => (
                      <Badge
                        key={type}
                        variant={config.allowedCallTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setConfig(prev => ({
                            ...prev,
                            allowedCallTypes: prev.allowedCallTypes.includes(type)
                              ? prev.allowedCallTypes.filter((t: string) => t !== type)
                              : [...prev.allowedCallTypes, type]
                          }));
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="caller-history" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Label htmlFor="enable-caller-history">Enable Caller History Tracking</Label>
              </div>
              <Switch
                id="enable-caller-history"
                checked={config.enableCallerHistory}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableCallerHistory: checked }))}
              />
            </div>

            {config.enableCallerHistory && (
              <div className="space-y-4 border-l-2 border-green-200 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lookback-days">Lookback Period (days)</Label>
                    <Input
                      id="lookback-days"
                      type="number"
                      value={config.lookbackDays}
                      onChange={(e) => setConfig(prev => ({ ...prev, lookbackDays: parseInt(e.target.value) }))}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blacklist-duration">Blacklist Duration (days)</Label>
                    <Input
                      id="blacklist-duration"
                      type="number"
                      value={config.blacklistDuration}
                      onChange={(e) => setConfig(prev => ({ ...prev, blacklistDuration: parseInt(e.target.value) }))}
                      placeholder="7"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-calls-per-day">Max Calls Per Day</Label>
                    <Input
                      id="max-calls-per-day"
                      type="number"
                      value={config.maxCallsPerDay}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxCallsPerDay: parseInt(e.target.value) }))}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-calls-per-week">Max Calls Per Week</Label>
                    <Input
                      id="max-calls-per-week"
                      type="number"
                      value={config.maxCallsPerWeek}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxCallsPerWeek: parseInt(e.target.value) }))}
                      placeholder="15"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dynamic-filtering" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <Label htmlFor="enable-dynamic-filtering">Enable Dynamic Filtering</Label>
              </div>
              <Switch
                id="enable-dynamic-filtering"
                checked={config.enableDynamicFiltering}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableDynamicFiltering: checked }))}
              />
            </div>

            {config.enableDynamicFiltering && (
              <div className="space-y-4 border-l-2 border-purple-200 pl-4">
                <div className="space-y-2">
                  <Label>Add Filter Rule</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Rule name"
                      value={newFilterRule.name}
                      onChange={(e) => setNewFilterRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Condition (e.g., caller.state === 'CA')"
                      value={newFilterRule.condition}
                      onChange={(e) => setNewFilterRule(prev => ({ ...prev, condition: e.target.value }))}
                    />
                    <Select
                      value={newFilterRule.action}
                      onValueChange={(value) => setNewFilterRule(prev => ({ ...prev, action: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="route">Route</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addFilterRule} size="sm">Add</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Active Filter Rules</Label>
                  {config.filterRules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{rule.name}</span>
                        <span className="text-sm text-gray-500 ml-2">{rule.condition}</span>
                        <Badge variant="outline" className="ml-2">{rule.action}</Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFilterRule(rule.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <Label htmlFor="enable-performance-optimization">Enable Performance Optimization</Label>
              </div>
              <Switch
                id="enable-performance-optimization"
                checked={config.enablePerformanceOptimization}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enablePerformanceOptimization: checked }))}
              />
            </div>

            {config.enablePerformanceOptimization && (
              <div className="space-y-4 border-l-2 border-yellow-200 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="response-time-threshold">Response Time Threshold (ms)</Label>
                    <Input
                      id="response-time-threshold"
                      type="number"
                      value={config.responseTimeThreshold}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseTimeThreshold: parseInt(e.target.value) }))}
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="success-rate-threshold">Success Rate Threshold (0-1)</Label>
                    <Input
                      id="success-rate-threshold"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={config.successRateThreshold}
                      onChange={(e) => setConfig(prev => ({ ...prev, successRateThreshold: parseFloat(e.target.value) }))}
                      placeholder="0.9"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <Label htmlFor="enable-advanced-security">Enable Advanced Security</Label>
              </div>
              <Switch
                id="enable-advanced-security"
                checked={config.enableAdvancedSecurity}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableAdvancedSecurity: checked }))}
              />
            </div>

            {config.enableAdvancedSecurity && (
              <div className="space-y-4 border-l-2 border-red-200 pl-4">
                <div>
                  <Label htmlFor="security-level">Security Level</Label>
                  <Select
                    value={config.securityLevel}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, securityLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="maximum">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fraud Detection Rules</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Rapid dialing detection', 'Caller ID spoofing', 'Geographic anomalies', 'Pattern recognition'].map(rule => (
                      <div key={rule} className="flex items-center space-x-2">
                        <Switch
                          id={`fraud-${rule}`}
                          checked={config.fraudDetectionRules.includes(rule)}
                          onCheckedChange={(checked) => {
                            setConfig(prev => ({
                              ...prev,
                              fraudDetectionRules: checked
                                ? [...prev.fraudDetectionRules, rule]
                                : prev.fraudDetectionRules.filter((r: string) => r !== rule)
                            }));
                          }}
                        />
                        <Label htmlFor={`fraud-${rule}`} className="text-sm">{rule}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}