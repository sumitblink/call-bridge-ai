import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Tag, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PhoneNumber, PhoneNumberTag, InsertPhoneNumberTag } from "@shared/schema";

const tagFormSchema = z.object({
  phoneNumberId: z.number({ required_error: "Phone number is required" }),
  tagName: z.string().min(1, "Tag name is required"),
  tagCategory: z.enum(["traffic-source", "publisher", "campaign-type", "geographic", "quality"]),
  tagValue: z.string().optional(),
  priority: z.number().min(1).max(10).default(1),
});

type TagFormData = z.infer<typeof tagFormSchema>;

export function PhoneNumberTagsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<PhoneNumberTag | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      tagCategory: "traffic-source",
      priority: 1,
    },
  });

  // Fetch phone numbers for dropdown
  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers"],
  });

  // Fetch existing tags
  const { data: tags = [], isLoading } = useQuery<PhoneNumberTag[]>({
    queryKey: ["/api/phone-number-tags"],
  });

  // Create/Update tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (data: InsertPhoneNumberTag) => {
      if (editingTag) {
        return apiRequest(`/api/phone-number-tags/${editingTag.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/phone-number-tags", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-number-tags"] });
      setIsDialogOpen(false);
      setEditingTag(null);
      form.reset();
      toast({
        title: "Success",
        description: `Tag ${editingTag ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingTag ? 'update' : 'create'} tag: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      return apiRequest(`/api/phone-number-tags/${tagId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-number-tags"] });
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete tag: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TagFormData) => {
    createTagMutation.mutate(data);
  };

  const handleEdit = (tag: PhoneNumberTag) => {
    setEditingTag(tag);
    form.setValue("phoneNumberId", tag.phoneNumberId);
    form.setValue("tagName", tag.tagName);
    form.setValue("tagCategory", tag.tagCategory as any);
    form.setValue("tagValue", tag.tagValue || "");
    form.setValue("priority", tag.priority || 1);
    setIsDialogOpen(true);
  };

  const handleDelete = (tagId: number) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      deleteTagMutation.mutate(tagId);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "traffic-source": "bg-blue-100 text-blue-800",
      "publisher": "bg-green-100 text-green-800",
      "campaign-type": "bg-purple-100 text-purple-800",
      "geographic": "bg-yellow-100 text-yellow-800",
      "quality": "bg-red-100 text-red-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Phone Number Tags
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTag ? 'Edit Phone Number Tag' : 'Add Phone Number Tag'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phoneNumberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phone number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {phoneNumbers.map((number) => (
                              <SelectItem key={number.id} value={number.id.toString()}>
                                {number.phoneNumber} ({number.friendlyName || 'No name'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tagName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tag Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., google-ads, facebook, affiliate-123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tagCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="traffic-source">Traffic Source</SelectItem>
                            <SelectItem value="publisher">Publisher</SelectItem>
                            <SelectItem value="campaign-type">Campaign Type</SelectItem>
                            <SelectItem value="geographic">Geographic</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tagValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tag Value (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional tag information" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-10)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createTagMutation.isPending}
                      className="flex-1"
                    >
                      {createTagMutation.isPending ? 'Saving...' : (editingTag ? 'Update Tag' : 'Add Tag')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingTag(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No phone number tags configured yet. Add some tags to enable advanced call attribution.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Tag Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const phoneNumber = phoneNumbers.find(p => p.id === tag.phoneNumberId);
                  return (
                    <TableRow key={tag.id}>
                      <TableCell className="font-mono">
                        {phoneNumber?.phoneNumber || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tag.tagName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(tag.tagCategory || 'quality')}>
                          {tag.tagCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tag.tagValue || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tag.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{tag.callCount || 0} calls</div>
                          <div className="text-gray-500">
                            ${(tag.totalRevenue || 0).toFixed(2)} revenue
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(tag)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(tag.id)}
                            disabled={deleteTagMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}