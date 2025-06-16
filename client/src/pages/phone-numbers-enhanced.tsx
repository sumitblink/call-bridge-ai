import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Phone, Plus, MoreHorizontal, Search, Filter, Download, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { apiRequest } from '@/lib/queryClient';

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string;
  formattedNumber: string;
  country: string;
  region: string;
  city: string;
  numberType: string;
  carrier: string;
  status: string;
  campaignId: number | null;
  publisherId: number | null;
  numberPool: string;
  isAllocated: boolean;
  isRouted: boolean;
  monthlyFee: string;
  totalCallsReceived: number;
  lastUsed: string | null;
}

export default function PhoneNumbersEnhanced() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ['/api/phone-numbers'],
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
    retry: false,
  });

  const { data: publishers = [] } = useQuery({
    queryKey: ['/api/publishers'],
    retry: false,
  });

  const createNumberMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/phone-numbers/purchase', 'POST', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({ title: "Success", description: "Phone number purchased successfully" });
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignNumberMutation = useMutation({
    mutationFn: async ({ numberId, campaignId, publisherId }: any) => {
      const response = await apiRequest(`/api/phone-numbers/${numberId}/assign`, 'PATCH', {
        campaignId,
        publisherId
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({ title: "Success", description: "Number assigned successfully" });
      setAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredNumbers = Array.isArray(phoneNumbers) ? phoneNumbers.filter((number: any) => {
    const matchesSearch = number.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         number.friendlyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || number.status === filterStatus;
    const matchesCountry = filterCountry === 'all' || number.country === filterCountry;
    return matchesSearch && matchesStatus && matchesCountry;
  }) : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'allocated':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'available' ? 'default' : 
                   status === 'allocated' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatPhoneNumber = (number: string) => {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return number;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Numbers</h1>
            <p className="text-gray-600 mt-1">Purchase and manage phone numbers for your campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  CREATE NUMBER
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Purchase New Number</DialogTitle>
                </DialogHeader>
                <PurchaseNumberForm 
                  onSubmit={(data) => createNumberMutation.mutate(data)}
                  isLoading={createNumberMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Numbers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Numbers ({filteredNumbers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Formatted</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Routed</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Number Pool</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNumbers.map((number: any) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium">
                        {number.phoneNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {number.country}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{number.friendlyName || '-'}</TableCell>
                      <TableCell>{formatPhoneNumber(number.phoneNumber)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(number.isAllocated ? 'allocated' : 'available')}
                          <span className="text-sm">
                            {number.isAllocated ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(number.isRouted ? 'allocated' : 'available')}
                          <span className="text-sm">
                            {number.isRouted ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {number.campaignId ? (
                          <span className="text-sm text-blue-600">
                            Campaign #{number.campaignId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {number.numberPool || 'Default'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {number.publisherId ? (
                          <span className="text-sm text-green-600">
                            Publisher #{number.publisherId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(number.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedNumber(number);
                                setAssignDialogOpen(true);
                              }}
                            >
                              Assign Publisher
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              View Usage
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Release Number
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Publisher</DialogTitle>
            </DialogHeader>
            <AssignPublisherForm
              number={selectedNumber}
              campaigns={campaigns}
              publishers={publishers}
              onSubmit={(data) => assignNumberMutation.mutate({
                numberId: selectedNumber?.id,
                ...data
              })}
              isLoading={assignNumberMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function PurchaseNumberForm({ onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    country: 'US',
    numberType: 'local',
    areaCode: '',
    friendlyName: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="country">Country</Label>
        <Select 
          value={formData.country} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="CA">Canada</SelectItem>
            <SelectItem value="UK">United Kingdom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="numberType">Number Type</Label>
        <Select 
          value={formData.numberType} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, numberType: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="toll-free">Toll-Free</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="areaCode">Area Code (Optional)</Label>
        <Input
          id="areaCode"
          value={formData.areaCode}
          onChange={(e) => setFormData(prev => ({ ...prev, areaCode: e.target.value }))}
          placeholder="e.g., 555"
        />
      </div>

      <div>
        <Label htmlFor="friendlyName">Friendly Name</Label>
        <Input
          id="friendlyName"
          value={formData.friendlyName}
          onChange={(e) => setFormData(prev => ({ ...prev, friendlyName: e.target.value }))}
          placeholder="e.g., Main Support Line"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Purchasing...' : 'CREATE NUMBER'}
        </Button>
      </div>
    </form>
  );
}

function AssignPublisherForm({ number, campaigns, publishers, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    campaignId: '',
    publisherId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      campaignId: formData.campaignId ? parseInt(formData.campaignId) : null,
      publisherId: formData.publisherId ? parseInt(formData.publisherId) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded">
        <p className="text-sm text-gray-600">
          Assigning: <strong>{number?.phoneNumber}</strong>
        </p>
      </div>

      <div>
        <Label htmlFor="campaignId">Campaign</Label>
        <Select 
          value={formData.campaignId} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, campaignId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select campaign..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No Campaign</SelectItem>
            {Array.isArray(campaigns) && campaigns.map((campaign: any) => (
              <SelectItem key={campaign.id} value={campaign.id.toString()}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="publisherId">Publisher</Label>
        <Select 
          value={formData.publisherId} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, publisherId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select publisher..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No Publisher</SelectItem>
            {Array.isArray(publishers) && publishers.map((publisher: any) => (
              <SelectItem key={publisher.id} value={publisher.id.toString()}>
                {publisher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Assigning...' : 'ASSIGN'}
        </Button>
      </div>
    </form>
  );
}