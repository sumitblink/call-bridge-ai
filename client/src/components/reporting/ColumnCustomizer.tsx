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
  visibleColumns: string[];
  onColumnsChange: (visibleColumns: string[]) => void;
}

interface ColumnPreferences {
  visibleColumns: string[];
  columnOrder: string[] | null;
  columnWidths: Record<string, number>;
}

export function ColumnCustomizer({ visibleColumns, onColumnsChange }: ColumnCustomizerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Popular', 'Call']));
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't use local state for visible columns - use parent state directly to prevent conflicts

  // Fetch URL parameters to add as dynamic column options
  const { data: urlParameters } = useQuery({
    queryKey: ['/api/integrations/url-parameters'],
    queryFn: () => fetch('/api/integrations/url-parameters').then(res => res.json()),
    refetchOnWindowFocus: false, // Disable refetch to prevent interference
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes to reduce requests
  });

  // Completely disable URL parameter cleanup to prevent interference with drag-and-drop
  // This was causing the infinite loop and column reversion
  // useEffect(() => {
  //   // URL parameter cleanup disabled to allow drag-and-drop to work properly
  // }, [urlParameters]);

  // Convert URL parameters to column definitions
  const urlParameterColumns: ColumnDefinition[] = (urlParameters || []).map((param: any) => {
    return {
      id: param.parameterName,
      label: param.reportName, // Show just the report name in customizer
      category: param.reportingMenuName,
      dataType: param.parameterType as any,
      defaultVisible: false,
      width: 150,
      sortable: true,  
      filterable: true,
      description: `URL parameter: ${param.parameterName}`
    };
  });

  // Merge static columns with dynamic URL parameter columns
  const allColumnDefinitions = [...COLUMN_DEFINITIONS, ...urlParameterColumns];
  
  // Get columns by category with dynamic columns included
  const getColumnsByCategoryWithDynamic = () => {
    const categories: Record<string, ColumnDefinition[]> = {};
    
    allColumnDefinitions.forEach(column => {
      if (!categories[column.category]) {
        categories[column.category] = [];
      }
      categories[column.category].push(column);
    });
    
    return categories;
  };

  const columnsByCategory = getColumnsByCategoryWithDynamic();

  // Fetch user's column preferences from localStorage
  const { data: preferences, isLoading } = useQuery<ColumnPreferences>({
    queryKey: ['/api/column-preferences', 'call_details'],
    queryFn: async () => {
      const saved = localStorage.getItem('call-details-column-preferences');
      if (saved) {
        return JSON.parse(saved);
      }
      return {
        visibleColumns: ['campaign', 'buyer', 'callDate', 'callerId', 'dialedNumber', 'duration', 'status', 'actions'],
        columnOrder: null,
        columnWidths: {}
      };
    }
  });

  // Save preferences mutation with localStorage persistence
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ColumnPreferences>) => {
      const currentPrefs = preferences || {
        visibleColumns: [],
        columnOrder: null,
        columnWidths: {}
      };
      
      const updatedPrefs = { ...currentPrefs, ...data };
      localStorage.setItem('call-details-column-preferences', JSON.stringify(updatedPrefs));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Columns Updated", 
        description: "Your column preferences have been saved."
      });
      // Ensure actions column is always at the right end
      const actionsIndex = visibleColumns.indexOf('actions');
      if (actionsIndex > -1) {
        const columnsWithoutActions = visibleColumns.filter(col => col !== 'actions');
        onColumnsChange([...columnsWithoutActions, 'actions']);
      } else {
        onColumnsChange(visibleColumns);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save column preferences.",
        variant: "destructive"
      });
    }
  });

  // Reset preferences mutation with localStorage
  const resetMutation = useMutation({
    mutationFn: async (): Promise<ColumnPreferences> => {
      const defaultPrefs = { 
        visibleColumns: ['campaign', 'publisherName', 'buyer', 'callDate', 'callerId', 'dialedNumber', 'duration', 'status', 'actions'],
        columnOrder: null,
        columnWidths: {}
      };
      localStorage.setItem('call-details-column-preferences', JSON.stringify(defaultPrefs));
      return defaultPrefs;
    },
    onSuccess: (data: ColumnPreferences) => {
      queryClient.invalidateQueries({ queryKey: ['/api/column-preferences', 'call_details'] });
      toast({
        title: "Columns Reset",
        description: "Column preferences have been reset to defaults."
      });
      // Ensure actions column is always at the right end
      const actionsIndex = data.visibleColumns.indexOf('actions');
      if (actionsIndex > -1) {
        const columnsWithoutActions = data.visibleColumns.filter(col => col !== 'actions');
        onColumnsChange([...columnsWithoutActions, 'actions']);
      } else {
        onColumnsChange(data.visibleColumns);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset column preferences.",
        variant: "destructive"
      });
    }
  });

  // Load preferences only once on mount - no infinite loops
  useEffect(() => {
    // Only initialize once when preferences are first loaded
    if (preferences && preferences.visibleColumns.length > 0 && visibleColumns.length <= 8) {
      const actionsIndex = preferences.visibleColumns.indexOf('actions');
      let targetColumns = preferences.visibleColumns;
      if (actionsIndex > -1) {
        const columnsWithoutActions = preferences.visibleColumns.filter(col => col !== 'actions');
        targetColumns = [...columnsWithoutActions, 'actions'];
      }
      onColumnsChange(targetColumns);
    }
  }, [preferences?.visibleColumns?.length]); // Only depend on length to prevent loops

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
    const isCurrentlyVisible = visibleColumns.includes(columnId);
    const newVisible = isCurrentlyVisible
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    
    // Ensure at least one column remains visible
    if (newVisible.length === 0) {
      toast({
        title: "Warning",
        description: "At least one column must remain visible.",
        variant: "destructive"
      });
      return;
    }
    
    // Auto-save the column preferences immediately
    const updatedPrefs = {
      visibleColumns: newVisible,
      columnOrder: preferences?.columnOrder || null,
      columnWidths: preferences?.columnWidths || {}
    };
    localStorage.setItem('call-details-column-preferences', JSON.stringify(updatedPrefs));
    queryClient.invalidateQueries({ queryKey: ['/api/column-preferences', 'call_details'] });
    
    // Apply changes immediately to the table
    onColumnsChange(newVisible);
  };

  const handleSave = () => {
    // Mock save for demonstration
    saveMutation.mutate({
      visibleColumns: visibleColumns,
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
    return categoryColumns.filter(col => visibleColumns.includes(col.id)).length;
  };

  const getTotalColumnCount = (category: string) => {
    return (columnsByCategory[category] || []).length;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2Icon className="h-4 w-4" />
          Columns ({visibleColumns.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px]" side="right">
        <SheetHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 border-b border-blue-200 -mx-6 -mt-6 px-6 pt-6 pb-4 mb-4 shadow-sm">
          <SheetTitle className="text-white font-bold text-lg">Customize Columns</SheetTitle>
          <SheetDescription className="text-blue-50">
            Select which columns to display in your call details table.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            {visibleColumns.length} of {allColumnDefinitions.length} columns selected
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

        <ScrollArea className="h-[calc(100vh-200px)] py-2">
          {Object.entries(columnsByCategory).map(([category, columns]) => (
            <div key={category} className="mb-1.5">
              <Collapsible
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md">
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
                <CollapsibleContent className="space-y-0.5 pt-1 pb-2">
                  {(columns as ColumnDefinition[]).map((column: ColumnDefinition) => (
                    <div key={column.id} className="flex items-center space-x-2 pl-8 py-0.5">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`checkbox-${column.id}`}
                          checked={localVisibleColumns.includes(column.id)}
                          onChange={(e) => {

                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Immediately update the checkbox state to prevent revert
                            const isCurrentlyChecked = localVisibleColumns.includes(column.id);
                            if (e.target.checked !== isCurrentlyChecked) {
                              toggleColumn(column.id);
                            }
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <label
                          htmlFor={`checkbox-${column.id}`}
                          className="flex-1 text-sm cursor-pointer leading-none"
                          onClick={(e) => {
                            e.preventDefault();

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

        <div className="flex items-center justify-between pt-2 border-t">
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