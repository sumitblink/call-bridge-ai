import { useState } from "react";
import { Plus, Settings as SettingsIcon, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PredictiveConfig {
  id: string;
  name: string;
  type: 'Use Revenue' | 'Advanced';
  newTargetPriority: number;
  underperformingTargetPriority: number;
  trainingRequirement: number;
}

export default function PredictiveRouting() {
  const [configs, setConfigs] = useState<PredictiveConfig[]>([
    { id: '1', name: 'Predictive 1.0', type: 'Advanced', newTargetPriority: 0, underperformingTargetPriority: 0, trainingRequirement: 0 },
    { id: '2', name: 'ACA', type: 'Advanced', newTargetPriority: 0, underperformingTargetPriority: 0, trainingRequirement: 0 },
    { id: '3', name: 'ACA REV MAX', type: 'Use Revenue', newTargetPriority: 0, underperformingTargetPriority: 0, trainingRequirement: 0 }
  ]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<PredictiveConfig>>({
    name: '',
    type: 'Use Revenue',
    newTargetPriority: 0,
    underperformingTargetPriority: 0,
    trainingRequirement: 50
  });

  const handleCreateConfig = () => {
    if (newConfig.name) {
      const config: PredictiveConfig = {
        id: Date.now().toString(),
        name: newConfig.name,
        type: newConfig.type || 'Use Revenue',
        newTargetPriority: newConfig.newTargetPriority || 0,
        underperformingTargetPriority: newConfig.underperformingTargetPriority || 0,
        trainingRequirement: newConfig.trainingRequirement || 50
      };
      setConfigs([...configs, config]);
      setIsCreating(false);
      setNewConfig({
        name: '',
        type: 'Use Revenue',
        newTargetPriority: 0,
        underperformingTargetPriority: 0,
        trainingRequirement: 50
      });
    }
  };

  const handleDeleteConfig = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Predictive Routing</h1>
          </div>
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            CREATE CONFIGURATION
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Create Configuration Form */}
        {isCreating && (
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Create New Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">Name *</Label>
                <Input
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter configuration name"
                />
              </div>

              {/* Type Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-300">Type</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Use Revenue</span>
                    <Switch 
                      checked={newConfig.type === 'Advanced'}
                      onCheckedChange={(checked) => 
                        setNewConfig({...newConfig, type: checked ? 'Advanced' : 'Use Revenue'})
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <span className="text-sm text-gray-400">Advanced</span>
                  </div>
                </div>
              </div>

              {/* Priority Sliders */}
              <div className="space-y-6">
                {/* New Target Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">New Target Priority</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Low</span>
                      <span>Default</span>
                      <span>High</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="range" 
                        min="-10" 
                        max="10" 
                        value={newConfig.newTargetPriority}
                        onChange={(e) => setNewConfig({...newConfig, newTargetPriority: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-gray-400 to-green-500 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div 
                        className="absolute top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full transform -translate-y-1 cursor-pointer"
                        style={{ left: `${((newConfig.newTargetPriority || 0) + 10) * 5}%`, transform: 'translateX(-50%) translateY(-25%)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Underperforming Target Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Underperforming Target Priority</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Low</span>
                      <span>Default</span>
                      <span>High</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="range" 
                        min="-10" 
                        max="10" 
                        value={newConfig.underperformingTargetPriority}
                        onChange={(e) => setNewConfig({...newConfig, underperformingTargetPriority: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-gray-400 to-green-500 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div 
                        className="absolute top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full transform -translate-y-1 cursor-pointer"
                        style={{ left: `${((newConfig.underperformingTargetPriority || 0) + 10) * 5}%`, transform: 'translateX(-50%) translateY(-25%)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Training Requirement */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Training Requirement</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Less Calls</span>
                      <span>50</span>
                      <span>More Calls</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={newConfig.trainingRequirement}
                        onChange={(e) => setNewConfig({...newConfig, trainingRequirement: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-gray-400 to-green-500 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div 
                        className="absolute top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full transform -translate-y-1 cursor-pointer"
                        style={{ left: `${(newConfig.trainingRequirement || 50)}%`, transform: 'translateX(-50%) translateY(-25%)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCreateConfig}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  CREATE
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  CANCEL
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configurations Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-700 text-sm font-medium text-gray-300">
            <div>Name</div>
            <div>Type</div>
            <div className="col-span-3"></div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {configs.map((config) => (
            <div key={config.id} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-750">
              <div className="text-white">{config.name}</div>
              <div>
                <Badge 
                  variant={config.type === 'Advanced' ? 'default' : 'secondary'}
                  className={config.type === 'Advanced' ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'}
                >
                  {config.type}
                </Badge>
              </div>
              <div className="col-span-3"></div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConfig(config.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 50%;
          cursor: pointer;
          appearance: none;
        }
      `}</style>
    </div>
  );
}