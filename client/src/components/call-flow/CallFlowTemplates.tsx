import { useState } from 'react';
import { ArrowLeft, GitBranch, Clock, Users, Filter, Zap, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CallFlowTemplatesProps {
  onSelectTemplate: (template: any) => void;
  onClose: () => void;
}

export function CallFlowTemplates({ onSelectTemplate, onClose }: CallFlowTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const templates = [
    {
      id: 'basic-routing',
      name: 'Basic Priority Routing',
      description: 'Simple call routing based on buyer priority and availability',
      category: 'routing',
      complexity: 'Basic',
      icon: <Users className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'check-hours', type: 'condition', x: 300, y: 100, data: { label: 'Check Business Hours', config: { conditionType: 'time' } } },
          { id: 'route-priority', type: 'action', x: 500, y: 100, data: { label: 'Route to Priority Buyer', config: { actionType: 'route' } } },
          { id: 'voicemail', type: 'action', x: 500, y: 200, data: { label: 'Send to Voicemail', config: { actionType: 'play' } } },
          { id: 'end', type: 'end', x: 700, y: 150, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'check-hours', label: 'Start' },
          { id: 'conn2', source: 'check-hours', target: 'route-priority', label: 'Business Hours' },
          { id: 'conn3', source: 'check-hours', target: 'voicemail', label: 'After Hours' },
          { id: 'conn4', source: 'route-priority', target: 'end', label: 'Complete' },
          { id: 'conn5', source: 'voicemail', target: 'end', label: 'Complete' }
        ]
      }
    },
    {
      id: 'rtb-auction',
      name: 'RTB Auction Flow',
      description: 'Real-time bidding auction with fallback routing',
      category: 'rtb',
      complexity: 'Advanced',
      icon: <Zap className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'check-rtb', type: 'condition', x: 300, y: 100, data: { label: 'RTB Enabled?', config: { conditionType: 'rtb' } } },
          { id: 'rtb-auction', type: 'action', x: 500, y: 100, data: { label: 'RTB Auction', config: { actionType: 'rtb' } } },
          { id: 'fallback-route', type: 'action', x: 500, y: 200, data: { label: 'Fallback Routing', config: { actionType: 'route' } } },
          { id: 'route-winner', type: 'action', x: 700, y: 100, data: { label: 'Route to Winner', config: { actionType: 'route' } } },
          { id: 'end', type: 'end', x: 900, y: 150, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'check-rtb', label: 'Start' },
          { id: 'conn2', source: 'check-rtb', target: 'rtb-auction', label: 'RTB Enabled' },
          { id: 'conn3', source: 'check-rtb', target: 'fallback-route', label: 'RTB Disabled' },
          { id: 'conn4', source: 'rtb-auction', target: 'route-winner', label: 'Winner Found' },
          { id: 'conn5', source: 'rtb-auction', target: 'fallback-route', label: 'No Winner' },
          { id: 'conn6', source: 'route-winner', target: 'end', label: 'Complete' },
          { id: 'conn7', source: 'fallback-route', target: 'end', label: 'Complete' }
        ]
      }
    },
    {
      id: 'time-based-routing',
      name: 'Time-Based Routing',
      description: 'Route calls based on time zones and business hours',
      category: 'routing',
      complexity: 'Intermediate',
      icon: <Clock className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'check-timezone', type: 'condition', x: 300, y: 100, data: { label: 'Check Time Zone', config: { conditionType: 'time' } } },
          { id: 'east-coast', type: 'action', x: 500, y: 50, data: { label: 'East Coast Team', config: { actionType: 'route' } } },
          { id: 'west-coast', type: 'action', x: 500, y: 150, data: { label: 'West Coast Team', config: { actionType: 'route' } } },
          { id: 'overflow', type: 'action', x: 500, y: 250, data: { label: 'Overflow Queue', config: { actionType: 'route' } } },
          { id: 'end', type: 'end', x: 700, y: 150, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'check-timezone', label: 'Start' },
          { id: 'conn2', source: 'check-timezone', target: 'east-coast', label: 'EST/CST' },
          { id: 'conn3', source: 'check-timezone', target: 'west-coast', label: 'MST/PST' },
          { id: 'conn4', source: 'check-timezone', target: 'overflow', label: 'Other' },
          { id: 'conn5', source: 'east-coast', target: 'end', label: 'Complete' },
          { id: 'conn6', source: 'west-coast', target: 'end', label: 'Complete' },
          { id: 'conn7', source: 'overflow', target: 'end', label: 'Complete' }
        ]
      }
    },
    {
      id: 'capacity-overflow',
      name: 'Capacity & Overflow Management',
      description: 'Handle high call volumes with overflow and queuing',
      category: 'capacity',
      complexity: 'Advanced',
      icon: <Filter className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'check-capacity', type: 'condition', x: 300, y: 100, data: { label: 'Check Capacity', config: { conditionType: 'capacity' } } },
          { id: 'primary-route', type: 'action', x: 500, y: 50, data: { label: 'Primary Buyers', config: { actionType: 'route' } } },
          { id: 'queue-call', type: 'action', x: 500, y: 150, data: { label: 'Queue Call', config: { actionType: 'queue' } } },
          { id: 'overflow-route', type: 'action', x: 500, y: 250, data: { label: 'Overflow Buyers', config: { actionType: 'route' } } },
          { id: 'end', type: 'end', x: 700, y: 150, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'check-capacity', label: 'Start' },
          { id: 'conn2', source: 'check-capacity', target: 'primary-route', label: 'Available' },
          { id: 'conn3', source: 'check-capacity', target: 'queue-call', label: 'Queue' },
          { id: 'conn4', source: 'check-capacity', target: 'overflow-route', label: 'Overflow' },
          { id: 'conn5', source: 'primary-route', target: 'end', label: 'Complete' },
          { id: 'conn6', source: 'queue-call', target: 'end', label: 'Complete' },
          { id: 'conn7', source: 'overflow-route', target: 'end', label: 'Complete' }
        ]
      }
    },
    {
      id: 'caller-screening',
      name: 'Caller Screening & Qualification',
      description: 'Screen and qualify callers before routing',
      category: 'qualification',
      complexity: 'Intermediate',
      icon: <Shield className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'collect-info', type: 'action', x: 300, y: 100, data: { label: 'Collect Info', config: { actionType: 'collect' } } },
          { id: 'qualify-caller', type: 'condition', x: 500, y: 100, data: { label: 'Qualify Caller', config: { conditionType: 'caller' } } },
          { id: 'route-qualified', type: 'action', x: 700, y: 50, data: { label: 'Route to Sales', config: { actionType: 'route' } } },
          { id: 'route-unqualified', type: 'action', x: 700, y: 150, data: { label: 'Route to Support', config: { actionType: 'route' } } },
          { id: 'end', type: 'end', x: 900, y: 100, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'collect-info', label: 'Start' },
          { id: 'conn2', source: 'collect-info', target: 'qualify-caller', label: 'Info Collected' },
          { id: 'conn3', source: 'qualify-caller', target: 'route-qualified', label: 'Qualified' },
          { id: 'conn4', source: 'qualify-caller', target: 'route-unqualified', label: 'Unqualified' },
          { id: 'conn5', source: 'route-qualified', target: 'end', label: 'Complete' },
          { id: 'conn6', source: 'route-unqualified', target: 'end', label: 'Complete' }
        ]
      }
    },
    {
      id: 'emergency-routing',
      name: 'Emergency & Failover Routing',
      description: 'Handle system failures and emergency routing',
      category: 'failover',
      complexity: 'Advanced',
      icon: <Settings className="h-5 w-5" />,
      flowDefinition: {
        nodes: [
          { id: 'start', type: 'start', x: 100, y: 100, data: { label: 'Call Start', config: {} } },
          { id: 'health-check', type: 'condition', x: 300, y: 100, data: { label: 'System Health', config: { conditionType: 'system' } } },
          { id: 'normal-route', type: 'action', x: 500, y: 50, data: { label: 'Normal Routing', config: { actionType: 'route' } } },
          { id: 'failover-route', type: 'action', x: 500, y: 150, data: { label: 'Failover Routing', config: { actionType: 'route' } } },
          { id: 'emergency-route', type: 'action', x: 500, y: 250, data: { label: 'Emergency Line', config: { actionType: 'route' } } },
          { id: 'end', type: 'end', x: 700, y: 150, data: { label: 'End Call', config: {} } }
        ],
        connections: [
          { id: 'conn1', source: 'start', target: 'health-check', label: 'Start' },
          { id: 'conn2', source: 'health-check', target: 'normal-route', label: 'Healthy' },
          { id: 'conn3', source: 'health-check', target: 'failover-route', label: 'Degraded' },
          { id: 'conn4', source: 'health-check', target: 'emergency-route', label: 'Emergency' },
          { id: 'conn5', source: 'normal-route', target: 'end', label: 'Complete' },
          { id: 'conn6', source: 'failover-route', target: 'end', label: 'Complete' },
          { id: 'conn7', source: 'emergency-route', target: 'end', label: 'Complete' }
        ]
      }
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'routing', label: 'Routing' },
    { value: 'rtb', label: 'RTB' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'failover', label: 'Failover' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Basic': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectTemplate = (template: any) => {
    const flowData = {
      name: template.name,
      description: template.description,
      status: 'draft',
      isTemplate: false,
      flowDefinition: template.flowDefinition
    };
    onSelectTemplate(flowData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Flows
          </Button>
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-2xl font-semibold text-gray-900">Call Flow Templates</h1>
            <p className="text-gray-600 mt-1">
              Choose from pre-built templates to get started quickly
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      {template.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getComplexityColor(template.complexity)}>
                          {template.complexity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{template.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Nodes: {template.flowDefinition.nodes.length}</span>
                    <span>Connections: {template.flowDefinition.connections.length}</span>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    Use This Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <GitBranch className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Template Usage Tips</h3>
            <p className="text-sm text-blue-700 mt-1">
              These templates provide a starting point for your call flows. After selecting a template, 
              you can customize the nodes, connections, and settings to match your specific requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}