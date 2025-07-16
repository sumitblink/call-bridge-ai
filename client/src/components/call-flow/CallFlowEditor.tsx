import { useState, useCallback, useRef } from 'react';
import { Save, X, Play, Settings, Plus, Trash2, Move, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CallFlow, Campaign } from '@shared/schema';

interface CallFlowEditorProps {
  flow: CallFlow | null;
  campaigns: Campaign[];
  onSave: (flowData: any) => void;
  onCancel: () => void;
}

interface FlowNode {
  id: string;
  type: 'start' | 'condition' | 'action' | 'menu' | 'gather' | 'play' | 'hours' | 'router' | 'splitter' | 'pixel' | 'javascript' | 'end';
  x: number;
  y: number;
  data: {
    label: string;
    config: any;
  };
}

interface FlowConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export function CallFlowEditor({ flow, campaigns, onSave, onCancel }: CallFlowEditorProps) {
  const [name, setName] = useState(flow?.name || '');
  const [description, setDescription] = useState(flow?.description || '');
  const [campaignId, setCampaignId] = useState(flow?.campaignId?.toString() || '');
  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: 'start',
      type: 'start',
      x: 100,
      y: 100,
      data: { label: 'Call Start', config: {} }
    }
  ]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configNode, setConfigNode] = useState<FlowNode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load existing flow data
  useState(() => {
    if (flow?.flowDefinition) {
      const definition = typeof flow.flowDefinition === 'string' 
        ? JSON.parse(flow.flowDefinition) 
        : flow.flowDefinition;
      if (definition.nodes) setNodes(definition.nodes);
      if (definition.connections) setConnections(definition.connections);
    }
  }, [flow]);

  const nodeTypes = [
    { type: 'condition', label: 'Condition', icon: '🔀', color: 'bg-yellow-100 border-yellow-300' },
    { type: 'action', label: 'Action', icon: '⚡', color: 'bg-blue-100 border-blue-300' },
    { type: 'menu', label: 'IVR Menu', icon: '📞', color: 'bg-purple-100 border-purple-300' },
    { type: 'gather', label: 'Gather Input', icon: '🎤', color: 'bg-green-100 border-green-300' },
    { type: 'play', label: 'Play Audio', icon: '🔊', color: 'bg-orange-100 border-orange-300' },
    { type: 'hours', label: 'Business Hours', icon: '🕐', color: 'bg-indigo-100 border-indigo-300' },
    { type: 'router', label: 'Advanced Router', icon: '🚀', color: 'bg-pink-100 border-pink-300' },
    { type: 'splitter', label: 'Traffic Splitter', icon: '🔀', color: 'bg-teal-100 border-teal-300' },
    { type: 'pixel', label: 'Tracking Pixel', icon: '📊', color: 'bg-cyan-100 border-cyan-300' },
    { type: 'javascript', label: 'Custom Logic', icon: '⚙️', color: 'bg-gray-100 border-gray-300' },
    { type: 'end', label: 'End', icon: '🏁', color: 'bg-red-100 border-red-300' }
  ];

  const handleAddNode = (type: string) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: type as FlowNode['type'],
      x: 300,
      y: 200,
      data: { 
        label: `New ${type}`, 
        config: getDefaultConfig(type) 
      }
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'condition':
        return {
          conditionType: 'time',
          operator: 'between',
          value: { start: '09:00', end: '17:00' }
        };
      case 'action':
        return {
          actionType: 'route',
          destination: 'buyer',
          buyerId: null
        };
      case 'menu':
        return {
          menuType: 'ivr',
          welcomeMessage: 'Please press 1 for sales, 2 for support',
          options: [
            { key: '1', label: 'Sales', action: 'route' },
            { key: '2', label: 'Support', action: 'route' }
          ],
          timeout: 10,
          retries: 3
        };
      case 'gather':
        return {
          gatherType: 'digits',
          prompt: 'Please enter your phone number',
          numDigits: 10,
          timeout: 5,
          finishOnKey: '#'
        };
      case 'play':
        return {
          audioType: 'tts',
          message: 'Please hold while we connect you',
          audioUrl: '',
          voice: 'alice',
          language: 'en-US'
        };
      case 'hours':
        return {
          timezone: 'America/New_York',
          businessHours: {
            monday: { open: '09:00', close: '17:00', enabled: true },
            tuesday: { open: '09:00', close: '17:00', enabled: true },
            wednesday: { open: '09:00', close: '17:00', enabled: true },
            thursday: { open: '09:00', close: '17:00', enabled: true },
            friday: { open: '09:00', close: '17:00', enabled: true },
            saturday: { open: '10:00', close: '16:00', enabled: false },
            sunday: { open: '10:00', close: '16:00', enabled: false }
          },
          holidayHandling: 'closed'
        };
      case 'router':
        return {
          routingType: 'priority',
          rtbEnabled: false,
          capacityLimits: true,
          failoverEnabled: true,
          targets: []
        };
      case 'splitter':
        return {
          splitType: 'percentage',
          targets: [
            { name: 'Route A', percentage: 50, destination: '' },
            { name: 'Route B', percentage: 50, destination: '' }
          ]
        };
      case 'pixel':
        return {
          pixelType: 'postback',
          url: 'https://example.com/postback',
          method: 'POST',
          parameters: [
            { name: 'caller_id', value: '{caller_number}' },
            { name: 'campaign_id', value: '{campaign_id}' }
          ]
        };
      case 'javascript':
        return {
          code: '// Custom JavaScript logic\n// Available variables: caller, campaign, context\n\nreturn {\n  route: "default",\n  data: {}\n};',
          timeout: 5000
        };
      case 'end':
        return {
          endType: 'hangup',
          message: 'Thank you for calling'
        };
      default:
        return {};
    }
  };

  const handleNodeClick = (node: FlowNode) => {
    // Cancel any ongoing label editing
    if (editingNodeId) {
      handleFinishLabelEdit();
    }
    
    if (isConnecting && connectionSource && connectionSource !== node.id) {
      // Create connection
      const newConnection: FlowConnection = {
        id: `conn-${Date.now()}`,
        source: connectionSource,
        target: node.id,
        label: 'Default'
      };
      setConnections([...connections, newConnection]);
      setIsConnecting(false);
      setConnectionSource(null);
    } else {
      setSelectedNode(node);
      setIsConnecting(false);
      setConnectionSource(null);
    }
  };

  const handleNodeDoubleClick = (node: FlowNode) => {
    if (node.type !== 'start') {
      setConfigNode(node);
      setConfigDialogOpen(true);
    }
  };

  const handleConfigSave = (updatedConfig: any) => {
    if (configNode) {
      const updatedNodes = nodes.map(node =>
        node.id === configNode.id
          ? { ...node, data: { ...node.data, config: updatedConfig } }
          : node
      );
      setNodes(updatedNodes);
      setConfigDialogOpen(false);
      setConfigNode(null);
    }
  };

  const handleStartConnection = (nodeId: string) => {
    setIsConnecting(true);
    setConnectionSource(nodeId);
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button === 0) { // Left click
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          setDraggedNode(nodeId);
          setDragOffset({
            x: e.clientX - rect.left - node.x,
            y: e.clientY - rect.top - node.y
          });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;
        
        setNodes(nodes.map(node => 
          node.id === draggedNode 
            ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
            : node
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'start') {
      toast({
        title: "Cannot delete",
        description: "Start node cannot be deleted",
        variant: "destructive"
      });
      return;
    }
    
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.source !== nodeId && c.target !== nodeId));
    setSelectedNode(null);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(connections.filter(c => c.id !== connectionId));
  };

  const handleStartLabelEdit = (node: FlowNode) => {
    setEditingNodeId(node.id);
    setEditingLabel(node.data.label);
  };

  const handleLabelChange = (value: string) => {
    setEditingLabel(value);
  };

  const handleFinishLabelEdit = () => {
    if (editingNodeId && editingLabel.trim()) {
      setNodes(nodes.map(node => 
        node.id === editingNodeId 
          ? { ...node, data: { ...node.data, label: editingLabel.trim() } }
          : node
      ));
    }
    setEditingNodeId(null);
    setEditingLabel('');
  };

  const handleCancelLabelEdit = () => {
    setEditingNodeId(null);
    setEditingLabel('');
  };

  const handleSave = () => {
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Flow name is required",
        variant: "destructive"
      });
      return;
    }

    const flowData = {
      name,
      description,
      campaignId: campaignId && campaignId !== 'none' ? parseInt(campaignId) : null,
      status: 'draft',
      isActive: false,
      flowDefinition: {
        nodes,
        connections
      }
    };

    onSave(flowData);
  };

  const renderNode = (node: FlowNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isSource = connectionSource === node.id;
    
    let bgColor = 'bg-white';
    let borderColor = 'border-gray-300';
    
    const nodeConfig = nodeTypes.find(nt => nt.type === node.type);
    if (node.type === 'start') {
      bgColor = 'bg-green-100';
      borderColor = 'border-green-300';
    } else if (nodeConfig) {
      bgColor = nodeConfig.color.split(' ')[0];
      borderColor = nodeConfig.color.split(' ')[1];
    }

    return (
      <div
        key={node.id}
        className={`absolute cursor-move border-2 rounded-lg p-3 min-w-[120px] text-center ${bgColor} ${borderColor} ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        } ${isSource ? 'ring-2 ring-green-500' : ''}`}
        style={{ left: node.x, top: node.y }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onClick={() => handleNodeClick(node)}
        onDoubleClick={() => handleNodeDoubleClick(node)}
      >
        {editingNodeId === node.id ? (
          <input
            type="text"
            value={editingLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onBlur={handleFinishLabelEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFinishLabelEdit();
              } else if (e.key === 'Escape') {
                handleCancelLabelEdit();
              }
            }}
            className="text-sm font-medium bg-transparent border-none outline-none text-center w-full"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <div 
            className="text-sm font-medium cursor-pointer hover:bg-black/5 rounded px-1 py-0.5"
            onClick={(e) => {
              e.stopPropagation();
              handleStartLabelEdit(node);
            }}
          >
            {node.data.label}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">{node.type}</div>
        
        {/* Connection handle */}
        <div
          className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full cursor-pointer hover:bg-blue-100"
          onClick={(e) => {
            e.stopPropagation();
            handleStartConnection(node.id);
          }}
        />
        
        {/* Delete button */}
        {node.id !== 'start' && (
          <div
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full cursor-pointer flex items-center justify-center text-xs hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNode(node.id);
            }}
          >
            ×
          </div>
        )}
      </div>
    );
  };

  const renderConnection = (connection: FlowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;
    
    const startX = sourceNode.x + 120; // Right edge of source node
    const startY = sourceNode.y + 30;
    const endX = targetNode.x; // Left edge of target node
    const endY = targetNode.y + 30;
    
    // Create curved path for better visibility
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const pathData = `M ${startX} ${startY} Q ${midX} ${midY - 20} ${endX} ${endY}`;
    
    return (
      <g key={connection.id}>
        <path
          d={pathData}
          stroke="#3b82f6"
          strokeWidth="3"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="drop-shadow-sm"
        />
        {connection.label && (
          <text
            x={midX}
            y={midY - 25}
            textAnchor="middle"
            className="text-xs fill-blue-600 font-medium bg-white px-2 py-1 rounded"
          >
            {connection.label}
          </text>
        )}
        <circle
          cx={midX}
          cy={midY}
          r="6"
          fill="red"
          className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
          onClick={() => handleDeleteConnection(connection.id)}
        />
      </g>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {flow ? 'Edit Call Flow' : 'Create Call Flow'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test Flow
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Flow
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Flow Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flow Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Flow Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter flow name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter flow description"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign">Campaign</Label>
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Add Nodes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {nodeTypes.map((nodeType) => (
                    <Button
                      key={nodeType.type}
                      variant="outline"
                      onClick={() => handleAddNode(nodeType.type)}
                      className="justify-start"
                    >
                      <span className="mr-2">{nodeType.icon}</span>
                      {nodeType.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Node Properties */}
            {selectedNode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Node Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Node Type</Label>
                    <Badge variant="outline">{selectedNode.type}</Badge>
                  </div>
                  <div>
                    <Label htmlFor="nodeLabel">Label</Label>
                    <Input
                      id="nodeLabel"
                      value={selectedNode.data.label}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node =>
                          node.id === selectedNode.id
                            ? { ...node, data: { ...node.data, label: e.target.value } }
                            : node
                        );
                        setNodes(updatedNodes);
                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: e.target.value } });
                      }}
                    />
                  </div>
                  
                  {/* Node-specific configuration */}
                  {selectedNode.type === 'condition' && (
                    <div>
                      <Label>Condition Type</Label>
                      <Select 
                        value={selectedNode.data.config.conditionType} 
                        onValueChange={(value) => {
                          const updatedNodes = nodes.map(node =>
                            node.id === selectedNode.id
                              ? { ...node, data: { ...node.data, config: { ...node.data.config, conditionType: value } } }
                              : node
                          );
                          setNodes(updatedNodes);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">Time Based</SelectItem>
                          <SelectItem value="caller">Caller Info</SelectItem>
                          <SelectItem value="capacity">Capacity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {selectedNode.type === 'action' && (
                    <div>
                      <Label>Action Type</Label>
                      <Select 
                        value={selectedNode.data.config.actionType} 
                        onValueChange={(value) => {
                          const updatedNodes = nodes.map(node =>
                            node.id === selectedNode.id
                              ? { ...node, data: { ...node.data, config: { ...node.data.config, actionType: value } } }
                              : node
                          );
                          setNodes(updatedNodes);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="route">Route to Buyer</SelectItem>
                          <SelectItem value="play">Play Message</SelectItem>
                          <SelectItem value="collect">Collect Input</SelectItem>
                          <SelectItem value="rtb">RTB Auction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedNode.type === 'menu' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Welcome Message</Label>
                        <Textarea
                          value={selectedNode.data.config.welcomeMessage || ''}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, welcomeMessage: e.target.value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                          placeholder="Enter welcome message"
                        />
                      </div>
                      <div>
                        <Label>Timeout (seconds)</Label>
                        <Input
                          type="number"
                          value={selectedNode.data.config.timeout || 10}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, timeout: parseInt(e.target.value) } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'gather' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Gather Type</Label>
                        <Select 
                          value={selectedNode.data.config.gatherType} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, gatherType: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digits">Digits</SelectItem>
                            <SelectItem value="speech">Speech</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Prompt</Label>
                        <Textarea
                          value={selectedNode.data.config.prompt || ''}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, prompt: e.target.value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                          placeholder="Enter prompt message"
                        />
                      </div>
                      <div>
                        <Label>Number of Digits</Label>
                        <Input
                          type="number"
                          value={selectedNode.data.config.numDigits || 10}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, numDigits: parseInt(e.target.value) } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'play' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Audio Type</Label>
                        <Select 
                          value={selectedNode.data.config.audioType} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, audioType: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tts">Text-to-Speech</SelectItem>
                            <SelectItem value="url">Audio URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedNode.data.config.audioType === 'tts' ? (
                        <div>
                          <Label>Message</Label>
                          <Textarea
                            value={selectedNode.data.config.message || ''}
                            onChange={(e) => {
                              const updatedNodes = nodes.map(node =>
                                node.id === selectedNode.id
                                  ? { ...node, data: { ...node.data, config: { ...node.data.config, message: e.target.value } } }
                                  : node
                              );
                              setNodes(updatedNodes);
                            }}
                            placeholder="Enter message to speak"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label>Audio URL</Label>
                          <Input
                            value={selectedNode.data.config.audioUrl || ''}
                            onChange={(e) => {
                              const updatedNodes = nodes.map(node =>
                                node.id === selectedNode.id
                                  ? { ...node, data: { ...node.data, config: { ...node.data.config, audioUrl: e.target.value } } }
                                  : node
                              );
                              setNodes(updatedNodes);
                            }}
                            placeholder="https://example.com/audio.mp3"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.type === 'hours' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Timezone</Label>
                        <Select 
                          value={selectedNode.data.config.timezone} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, timezone: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Holiday Handling</Label>
                        <Select 
                          value={selectedNode.data.config.holidayHandling} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, holidayHandling: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="reduced">Reduced Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'router' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Routing Type</Label>
                        <Select 
                          value={selectedNode.data.config.routingType} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, routingType: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="priority">Priority Based</SelectItem>
                            <SelectItem value="round-robin">Round Robin</SelectItem>
                            <SelectItem value="capacity">Capacity Based</SelectItem>
                            <SelectItem value="rtb">Real-Time Bidding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="rtbEnabled"
                          checked={selectedNode.data.config.rtbEnabled || false}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, rtbEnabled: e.target.checked } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        />
                        <Label htmlFor="rtbEnabled">Enable RTB</Label>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'splitter' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Split Type</Label>
                        <Select 
                          value={selectedNode.data.config.splitType} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, splitType: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="weight">Weight Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Traffic Split</Label>
                        <div className="text-sm text-gray-600">Route A: 50% | Route B: 50%</div>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'pixel' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Pixel Type</Label>
                        <Select 
                          value={selectedNode.data.config.pixelType} 
                          onValueChange={(value) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, pixelType: value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="postback">Postback</SelectItem>
                            <SelectItem value="pixel">Tracking Pixel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>URL</Label>
                        <Input
                          value={selectedNode.data.config.url || ''}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, url: e.target.value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                          placeholder="https://example.com/postback"
                        />
                      </div>
                    </div>
                  )}

                  {selectedNode.type === 'javascript' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Custom JavaScript Code</Label>
                        <Textarea
                          value={selectedNode.data.config.code || ''}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, code: e.target.value } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                          placeholder="// Your custom JavaScript code here"
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label>Timeout (ms)</Label>
                        <Input
                          type="number"
                          value={selectedNode.data.config.timeout || 5000}
                          onChange={(e) => {
                            const updatedNodes = nodes.map(node =>
                              node.id === selectedNode.id
                                ? { ...node, data: { ...node.data, config: { ...node.data.config, timeout: parseInt(e.target.value) } } }
                                : node
                            );
                            setNodes(updatedNodes);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => {
              // Cancel editing if clicking on canvas (not on a node)
              if (e.target === canvasRef.current && editingNodeId) {
                handleFinishLabelEdit();
              }
            }}
          >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ddd' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#3b82f6"
                  />
                </marker>
              </defs>
              {connections.map(renderConnection)}
            </svg>
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              {connections.map(renderConnection)}
            </svg>
            
            {/* Nodes */}
            <div className="relative" style={{ zIndex: 2 }}>
              {nodes.map(renderNode)}
            </div>
            
            {/* Instructions */}
            {nodes.length === 1 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gray-500">
                <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Build Your Call Flow</p>
                <p className="text-sm">
                  Add nodes from the sidebar and connect them by clicking the connection handle.<br/>
                  Double-click any node to configure its settings.
                </p>
              </div>
            )}
            
            {/* Connection instructions */}
            {isConnecting && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
                Click on a node to connect to it
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure {configNode?.data.label || 'Node'}
            </DialogTitle>
          </DialogHeader>
          {configNode && (
            <NodeConfigurationDialog 
              node={configNode} 
              onSave={handleConfigSave}
              onCancel={() => setConfigDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Configuration Dialog Component
function NodeConfigurationDialog({ node, onSave, onCancel }: {
  node: FlowNode;
  onSave: (config: any) => void;
  onCancel: () => void;
}) {
  const [config, setConfig] = useState(node.data.config || {});

  const handleSave = () => {
    onSave(config);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const renderConfigContent = () => {
    switch (node.type) {
      case 'menu':
        return (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="options">Menu Options</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={config.welcomeMessage || ''}
                  onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                  placeholder="Please press 1 for sales, 2 for support"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.timeout || 10}
                    onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="retries">Max Retries</Label>
                  <Input
                    id="retries"
                    type="number"
                    value={config.retries || 3}
                    onChange={(e) => updateConfig('retries', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4">
              <div>
                <Label>Menu Options</Label>
                <div className="space-y-2">
                  {(config.options || []).map((option: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Key"
                        value={option.key || ''}
                        onChange={(e) => {
                          const newOptions = [...(config.options || [])];
                          newOptions[index] = { ...option, key: e.target.value };
                          updateConfig('options', newOptions);
                        }}
                        className="w-16"
                      />
                      <Input
                        placeholder="Label"
                        value={option.label || ''}
                        onChange={(e) => {
                          const newOptions = [...(config.options || [])];
                          newOptions[index] = { ...option, label: e.target.value };
                          updateConfig('options', newOptions);
                        }}
                        className="flex-1"
                      />
                      <Select
                        value={option.action || 'route'}
                        onValueChange={(value) => {
                          const newOptions = [...(config.options || [])];
                          newOptions[index] = { ...option, action: value };
                          updateConfig('options', newOptions);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="route">Route</SelectItem>
                          <SelectItem value="play">Play</SelectItem>
                          <SelectItem value="gather">Gather</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = (config.options || []).filter((_, i) => i !== index);
                          updateConfig('options', newOptions);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newOptions = [...(config.options || []), { key: '', label: '', action: 'route' }];
                      updateConfig('options', newOptions);
                    }}
                  >
                    Add Option
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label htmlFor="invalidRetryMessage">Invalid Input Message</Label>
                <Textarea
                  id="invalidRetryMessage"
                  value={config.invalidRetryMessage || ''}
                  onChange={(e) => updateConfig('invalidRetryMessage', e.target.value)}
                  placeholder="Invalid selection. Please try again."
                  rows={2}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="allowRepeat"
                  checked={config.allowRepeat || false}
                  onCheckedChange={(checked) => updateConfig('allowRepeat', checked)}
                />
                <Label htmlFor="allowRepeat">Allow menu repeat</Label>
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'gather':
        return (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="gatherType">Gather Type</Label>
                <Select
                  value={config.gatherType || 'digits'}
                  onValueChange={(value) => updateConfig('gatherType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digits">Digits</SelectItem>
                    <SelectItem value="speech">Speech</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="prompt">Prompt Message</Label>
                <Textarea
                  id="prompt"
                  value={config.prompt || ''}
                  onChange={(e) => updateConfig('prompt', e.target.value)}
                  placeholder="Please enter your phone number"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numDigits">Number of Digits</Label>
                  <Input
                    id="numDigits"
                    type="number"
                    value={config.numDigits || 10}
                    onChange={(e) => updateConfig('numDigits', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.timeout || 5}
                    onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="validation" className="space-y-4">
              <div>
                <Label htmlFor="finishOnKey">Finish on Key</Label>
                <Input
                  id="finishOnKey"
                  value={config.finishOnKey || '#'}
                  onChange={(e) => updateConfig('finishOnKey', e.target.value)}
                  placeholder="#"
                  maxLength={1}
                />
              </div>
              
              <div>
                <Label htmlFor="validationPattern">Validation Pattern (Regex)</Label>
                <Input
                  id="validationPattern"
                  value={config.validationPattern || ''}
                  onChange={(e) => updateConfig('validationPattern', e.target.value)}
                  placeholder="^[0-9]{10}$"
                />
              </div>
              
              <div>
                <Label htmlFor="invalidMessage">Invalid Input Message</Label>
                <Textarea
                  id="invalidMessage"
                  value={config.invalidMessage || ''}
                  onChange={(e) => updateConfig('invalidMessage', e.target.value)}
                  placeholder="Invalid input. Please try again."
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'play':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="audioType">Audio Type</Label>
              <Select
                value={config.audioType || 'tts'}
                onValueChange={(value) => updateConfig('audioType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tts">Text-to-Speech</SelectItem>
                  <SelectItem value="url">Audio URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {config.audioType === 'tts' ? (
              <>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={config.message || ''}
                    onChange={(e) => updateConfig('message', e.target.value)}
                    placeholder="Please hold while we connect you"
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="voice">Voice</Label>
                    <Select
                      value={config.voice || 'alice'}
                      onValueChange={(value) => updateConfig('voice', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alice">Alice</SelectItem>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="woman">Woman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={config.language || 'en-US'}
                      onValueChange={(value) => updateConfig('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="audioUrl">Audio URL</Label>
                <Input
                  id="audioUrl"
                  value={config.audioUrl || ''}
                  onChange={(e) => updateConfig('audioUrl', e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="loop"
                checked={config.loop || false}
                onCheckedChange={(checked) => updateConfig('loop', checked)}
              />
              <Label htmlFor="loop">Loop audio</Label>
            </div>
          </div>
        );

      case 'hours':
        return (
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="holidays">Holidays</TabsTrigger>
            </TabsList>
            
            <TabsContent value="schedule" className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={config.timezone || 'America/New_York'}
                  onValueChange={(value) => updateConfig('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Business Hours</Label>
                <div className="space-y-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Switch
                        checked={config.businessHours?.[day]?.enabled || false}
                        onCheckedChange={(checked) => {
                          const newHours = { ...config.businessHours };
                          newHours[day] = { ...newHours[day], enabled: checked };
                          updateConfig('businessHours', newHours);
                        }}
                      />
                      <Label className="w-20 capitalize">{day}</Label>
                      <Input
                        type="time"
                        value={config.businessHours?.[day]?.open || '09:00'}
                        onChange={(e) => {
                          const newHours = { ...config.businessHours };
                          newHours[day] = { ...newHours[day], open: e.target.value };
                          updateConfig('businessHours', newHours);
                        }}
                        className="w-24"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={config.businessHours?.[day]?.close || '17:00'}
                        onChange={(e) => {
                          const newHours = { ...config.businessHours };
                          newHours[day] = { ...newHours[day], close: e.target.value };
                          updateConfig('businessHours', newHours);
                        }}
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="holidays" className="space-y-4">
              <div>
                <Label htmlFor="holidayHandling">Holiday Handling</Label>
                <Select
                  value={config.holidayHandling || 'closed'}
                  onValueChange={(value) => updateConfig('holidayHandling', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="reduced">Reduced Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="closedMessage">Closed Message</Label>
                <Textarea
                  id="closedMessage"
                  value={config.closedMessage || ''}
                  onChange={(e) => updateConfig('closedMessage', e.target.value)}
                  placeholder="We are currently closed. Please call back during business hours."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'router':
        return (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="rtb">RTB Settings</TabsTrigger>
              <TabsTrigger value="targets">Targets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="routingType">Routing Type</Label>
                <Select
                  value={config.routingType || 'priority'}
                  onValueChange={(value) => updateConfig('routingType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Priority Based</SelectItem>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="capacity">Capacity Based</SelectItem>
                    <SelectItem value="rtb">Real-Time Bidding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="capacityLimits"
                  checked={config.capacityLimits || false}
                  onCheckedChange={(checked) => updateConfig('capacityLimits', checked)}
                />
                <Label htmlFor="capacityLimits">Enforce capacity limits</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="failoverEnabled"
                  checked={config.failoverEnabled || false}
                  onCheckedChange={(checked) => updateConfig('failoverEnabled', checked)}
                />
                <Label htmlFor="failoverEnabled">Enable failover</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="rtb" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="rtbEnabled"
                  checked={config.rtbEnabled || false}
                  onCheckedChange={(checked) => updateConfig('rtbEnabled', checked)}
                />
                <Label htmlFor="rtbEnabled">Enable RTB</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bidTimeout">Bid Timeout (ms)</Label>
                  <Input
                    id="bidTimeout"
                    type="number"
                    value={config.bidTimeout || 1000}
                    onChange={(e) => updateConfig('bidTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="minBid">Minimum Bid</Label>
                  <Input
                    id="minBid"
                    type="number"
                    step="0.01"
                    value={config.minBid || 0}
                    onChange={(e) => updateConfig('minBid', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="targets" className="space-y-4">
              <div>
                <Label>Routing Targets</Label>
                <div className="text-sm text-gray-600 mb-2">
                  Configure routing targets and their priorities
                </div>
                <div className="space-y-2">
                  {(config.targets || []).map((target: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Target Name"
                        value={target.name || ''}
                        onChange={(e) => {
                          const newTargets = [...(config.targets || [])];
                          newTargets[index] = { ...target, name: e.target.value };
                          updateConfig('targets', newTargets);
                        }}
                      />
                      <Input
                        placeholder="Priority"
                        type="number"
                        value={target.priority || 1}
                        onChange={(e) => {
                          const newTargets = [...(config.targets || [])];
                          newTargets[index] = { ...target, priority: parseInt(e.target.value) };
                          updateConfig('targets', newTargets);
                        }}
                        className="w-24"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTargets = (config.targets || []).filter((_, i) => i !== index);
                          updateConfig('targets', newTargets);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newTargets = [...(config.targets || []), { name: '', priority: 1 }];
                      updateConfig('targets', newTargets);
                    }}
                  >
                    Add Target
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'splitter':
        return (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="strategy">Distribution Strategy</Label>
                <Select
                  value={config.strategy || 'percentage'}
                  onValueChange={(value) => updateConfig('strategy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Distribution</SelectItem>
                    <SelectItem value="weighted">Weighted Distribution</SelectItem>
                    <SelectItem value="time_based">Time-based Rules</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Split Configuration</Label>
                <div className="space-y-2">
                  {(config.splits || []).map((split: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Split Name"
                          value={split.name || ''}
                          onChange={(e) => {
                            const newSplits = [...(config.splits || [])];
                            newSplits[index] = { ...split, name: e.target.value };
                            updateConfig('splits', newSplits);
                          }}
                        />
                        <Input
                          placeholder={config.strategy === 'weighted' ? 'Weight' : 'Percentage'}
                          type="number"
                          value={config.strategy === 'weighted' ? (split.weight || 1) : (split.percentage || 0)}
                          onChange={(e) => {
                            const newSplits = [...(config.splits || [])];
                            const fieldName = config.strategy === 'weighted' ? 'weight' : 'percentage';
                            newSplits[index] = { ...split, [fieldName]: parseFloat(e.target.value) };
                            updateConfig('splits', newSplits);
                          }}
                          className="w-24"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSplits = (config.splits || []).filter((_, i) => i !== index);
                            updateConfig('splits', newSplits);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      
                      {config.strategy === 'time_based' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Hour Range</Label>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="Start"
                                value={split.timeRules?.hourRange?.[0] || ''}
                                onChange={(e) => {
                                  const newSplits = [...(config.splits || [])];
                                  newSplits[index] = { 
                                    ...split, 
                                    timeRules: { 
                                      ...split.timeRules, 
                                      hourRange: [parseInt(e.target.value), split.timeRules?.hourRange?.[1] || 23] 
                                    } 
                                  };
                                  updateConfig('splits', newSplits);
                                }}
                                className="w-16"
                              />
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="End"
                                value={split.timeRules?.hourRange?.[1] || ''}
                                onChange={(e) => {
                                  const newSplits = [...(config.splits || [])];
                                  newSplits[index] = { 
                                    ...split, 
                                    timeRules: { 
                                      ...split.timeRules, 
                                      hourRange: [split.timeRules?.hourRange?.[0] || 0, parseInt(e.target.value)] 
                                    } 
                                  };
                                  updateConfig('splits', newSplits);
                                }}
                                className="w-16"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Days of Week</Label>
                            <Input
                              placeholder="0,1,2,3,4,5,6"
                              value={split.timeRules?.daysOfWeek?.join(',') || ''}
                              onChange={(e) => {
                                const newSplits = [...(config.splits || [])];
                                newSplits[index] = { 
                                  ...split, 
                                  timeRules: { 
                                    ...split.timeRules, 
                                    daysOfWeek: e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
                                  } 
                                };
                                updateConfig('splits', newSplits);
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newSplits = [...(config.splits || []), { 
                        name: '', 
                        percentage: 0, 
                        weight: 1,
                        nodeId: '',
                        timeRules: {}
                      }];
                      updateConfig('splits', newSplits);
                    }}
                  >
                    Add Split
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableFailover"
                  checked={config.enableFailover || false}
                  onCheckedChange={(checked) => updateConfig('enableFailover', checked)}
                />
                <Label htmlFor="enableFailover">Enable failover to backup splits</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTracking"
                  checked={config.enableTracking !== false}
                  onCheckedChange={(checked) => updateConfig('enableTracking', checked)}
                />
                <Label htmlFor="enableTracking">Enable split tracking</Label>
              </div>
              
              <div>
                <Label htmlFor="resetInterval">Reset Interval (minutes)</Label>
                <Input
                  id="resetInterval"
                  type="number"
                  value={config.resetInterval || 60}
                  onChange={(e) => updateConfig('resetInterval', parseInt(e.target.value))}
                  placeholder="60"
                />
                <div className="text-sm text-gray-600 mt-1">
                  How often to reset round-robin counters and weighted distribution
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableAnalytics"
                  checked={config.enableAnalytics !== false}
                  onCheckedChange={(checked) => updateConfig('enableAnalytics', checked)}
                />
                <Label htmlFor="enableAnalytics">Enable detailed analytics</Label>
              </div>
              
              <div>
                <Label htmlFor="analyticsEndpoint">Analytics Endpoint</Label>
                <Input
                  id="analyticsEndpoint"
                  value={config.analyticsEndpoint || ''}
                  onChange={(e) => updateConfig('analyticsEndpoint', e.target.value)}
                  placeholder="https://analytics.example.com/track"
                />
              </div>
              
              <div>
                <Label>Tracked Events</Label>
                <div className="space-y-2">
                  {['split_assignment', 'split_success', 'split_failure', 'split_timeout'].map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Switch
                        id={event}
                        checked={config.trackedEvents?.[event] !== false}
                        onCheckedChange={(checked) => updateConfig('trackedEvents', {
                          ...config.trackedEvents,
                          [event]: checked
                        })}
                      />
                      <Label htmlFor={event} className="text-sm">{event.replace(/_/g, ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'pixel':
        return (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="pixelType">Pixel Type</Label>
                <Select
                  value={config.pixelType || 'postback'}
                  onValueChange={(value) => updateConfig('pixelType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postback">Postback</SelectItem>
                    <SelectItem value="pixel">Tracking Pixel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={config.url || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  placeholder="https://example.com/postback"
                />
              </div>
              
              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select
                  value={config.method || 'POST'}
                  onValueChange={(value) => updateConfig('method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="parameters" className="space-y-4">
              <div>
                <Label>Parameters</Label>
                <div className="space-y-2">
                  {(config.parameters || []).map((param: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Parameter Name"
                        value={param.name || ''}
                        onChange={(e) => {
                          const newParams = [...(config.parameters || [])];
                          newParams[index] = { ...param, name: e.target.value };
                          updateConfig('parameters', newParams);
                        }}
                      />
                      <Input
                        placeholder="Value (use {variable} for dynamic)"
                        value={param.value || ''}
                        onChange={(e) => {
                          const newParams = [...(config.parameters || [])];
                          newParams[index] = { ...param, value: e.target.value };
                          updateConfig('parameters', newParams);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newParams = (config.parameters || []).filter((_, i) => i !== index);
                          updateConfig('parameters', newParams);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newParams = [...(config.parameters || []), { name: '', value: '' }];
                      updateConfig('parameters', newParams);
                    }}
                  >
                    Add Parameter
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Available Variables</Label>
                <div className="text-sm text-gray-600">
                  {'{caller_number}'}, {'{campaign_id}'}, {'{call_duration}'}, {'{call_status}'}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'javascript':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Custom JavaScript Code</Label>
              <Textarea
                id="code"
                value={config.code || ''}
                onChange={(e) => updateConfig('code', e.target.value)}
                placeholder="// Your custom JavaScript code here&#10;// Available variables: caller, campaign, context&#10;&#10;return {&#10;  route: 'default',&#10;  data: {}&#10;};"
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout || 5000}
                onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label>Available Variables</Label>
              <div className="text-sm text-gray-600 space-y-1">
                <div><code>caller</code> - Caller information (number, location, etc.)</div>
                <div><code>campaign</code> - Campaign data and settings</div>
                <div><code>context</code> - Call context and previous node data</div>
              </div>
            </div>
            
            <div>
              <Label>Return Format</Label>
              <div className="text-sm text-gray-600">
                Return an object with <code>route</code> (string) and optional <code>data</code> (object)
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label>Configuration</Label>
              <div className="text-sm text-gray-600">
                No specific configuration available for this node type.
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderConfigContent()}
      
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}