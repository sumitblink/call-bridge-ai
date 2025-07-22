import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDownIcon, ChevronRightIcon, Settings2Icon, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { COLUMN_DEFINITIONS, getColumnsByCategory, type ColumnDefinition } from "@shared/column-definitions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ColumnCustomizerProps {
  tableType: string;
  onColumnsChange: (visibleColumns: string[]) => void;
}

interface ColumnPreferences {
  visibleColumns: string[];
  columnOrder: string[] | null;
  columnWidths: Record<string, number>;
}

export function ColumnCustomizer({ tableType, onColumnsChange }: ColumnCustomizerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Popular', 'Call']));
  // Initialize with the actual default visible columns from CallActivity
  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>([
    'campaign', 'publisher', 'target', 'buyer', 'callDate', 'callerId', 'dialedNumber',
    'duration', 'connectedCallLength', 'duplicate', 'previouslyConnected', 'revenue', 
    'profit', 'status', 'fromNumber', 'toNumber', 'actions'
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const columnsByCategory = getColumnsByCategory();

  // Fetch user's column preferences (disabled for demonstration)
  const { data: preferences, isLoading } = useQuery<ColumnPreferences>({
    queryKey: ['/api/column-preferences', tableType],
    enabled: false // Disable to avoid auth issues in demonstration
  });

  // Save preferences mutation (disabled for demonstration)
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ColumnPreferences>) => {
      // Mock save for demonstration
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Columns Updated", 
        description: "Your column preferences have been saved."
      });
      onColumnsChange(localVisibleColumns);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save column preferences.",
        variant: "destructive"
      });
    }
  });

  // Reset preferences mutation (disabled for demonstration)
  const resetMutation = useMutation({
    mutationFn: async (): Promise<ColumnPreferences> => {
      // Mock reset for demonstration
      return { 
        visibleColumns: ['inbound_call_id', 'call_date', 'caller_id', 'dialed_number', 'call_duration', 'call_status'],
        columnOrder: [],
        columnWidths: {}
      };
    },
    onSuccess: (data: ColumnPreferences) => {
      setLocalVisibleColumns(data.visibleColumns);
      queryClient.invalidateQueries({ queryKey: ['/api/column-preferences', tableType] });
      toast({
        title: "Columns Reset",
        description: "Column preferences have been reset to defaults."
      });
      onColumnsChange(data.visibleColumns);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset column preferences.",
        variant: "destructive"
      });
    }
  });

  // Initialize local state when preferences load or on component mount
  useEffect(() => {
    if (preferences) {
      setLocalVisibleColumns(preferences.visibleColumns);
    } else {
      // Set default visible columns based on what's actually shown in the table
      const defaultColumns = [
        'campaign', 'publisher', 'target', 'buyer', 'callDate', 'callerId', 'dialedNumber',
        'duration', 'connectedCallLength', 'duplicate', 'previouslyConnected', 'revenue', 
        'profit', 'status', 'fromNumber', 'toNumber', 'actions'
      ];
      setLocalVisibleColumns(defaultColumns);
      // Notify parent component about the initial columns
      onColumnsChange(defaultColumns);
    }
  }, [preferences, onColumnsChange]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleColumn = (columnId: string) => {
    console.log('=== TOGGLE COLUMN START ===');
    console.log('Toggling column:', columnId);
    console.log('Current visible columns:', localVisibleColumns);
    console.log('Current visible length:', localVisibleColumns.length);
    
    const isCurrentlyVisible = localVisibleColumns.includes(columnId);
    console.log('Is currently visible:', isCurrentlyVisible);
    
    const newVisible = isCurrentlyVisible
      ? localVisibleColumns.filter(id => id !== columnId)
      : [...localVisibleColumns, columnId];
    
    console.log('New visible columns:', newVisible);
    console.log('New visible length:', newVisible.length);
    
    // Ensure at least one column remains visible
    if (newVisible.length === 0) {
      console.log('WARNING: Attempting to hide all columns');
      toast({
        title: "Warning",
        description: "At least one column must remain visible.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Setting new visible columns...');
    setLocalVisibleColumns(newVisible);
    
    console.log('Calling onColumnsChange...');
    onColumnsChange(newVisible);
    console.log('=== TOGGLE COLUMN END ===');
  };

  const handleSave = () => {
    // Immediately apply changes to the table
    onColumnsChange(localVisibleColumns);
    
    // Mock save for demonstration
    saveMutation.mutate({
      visibleColumns: localVisibleColumns,
      columnOrder: null,
      columnWidths: {}
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const getVisibleColumnCount = (category: string) => {
    const categoryColumns = columnsByCategory[category] || [];
    return categoryColumns.filter(col => localVisibleColumns.includes(col.id)).length;
  };

  const getTotalColumnCount = (category: string) => {
    return (columnsByCategory[category] || []).length;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2Icon className="h-4 w-4" />
          Columns ({localVisibleColumns.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px]" side="right">
        <SheetHeader>
          <SheetTitle>Customize Columns</SheetTitle>
          <SheetDescription>
            Select which columns to display in your {tableType.replace('_', ' ')} table.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            {localVisibleColumns.length} of {COLUMN_DEFINITIONS.length} columns selected
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[calc(100vh-200px)] py-4">
          {Object.entries(columnsByCategory).map(([category, columns]) => (
            <div key={category} className="mb-4">
              <Collapsible
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md">
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category) ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                    <span>{category}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getVisibleColumnCount(category)}/{getTotalColumnCount(category)}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2 pb-4">
                  {(columns as ColumnDefinition[]).map((column: ColumnDefinition) => (
                    <div key={column.id} className="flex items-center space-x-2 pl-8">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`checkbox-${column.id}`}
                          checked={localVisibleColumns.includes(column.id)}
                          onChange={(e) => {
                            console.log('=== CHECKBOX CHANGE EVENT ===');
                            console.log('Column ID:', column.id);
                            console.log('Target checked:', e.target.checked);
                            console.log('Current localVisibleColumns:', localVisibleColumns);
                            console.log('Includes check:', localVisibleColumns.includes(column.id));
                            e.stopPropagation();
                            toggleColumn(column.id);
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <label
                          htmlFor={`checkbox-${column.id}`}
                          className="flex-1 text-sm cursor-pointer leading-none"
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('Label clicked for:', column.id);
                            toggleColumn(column.id);
                          }}
                        >
                          <div className="font-medium">{column.label}</div>
                          {column.description && (
                            <div className="text-xs text-muted-foreground">{column.description}</div>
                          )}
                        </label>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {column.dataType}
                      </Badge>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}