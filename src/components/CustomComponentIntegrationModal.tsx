import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import {
  Plus, Trash2, Database,
  Mail,
  CreditCard,
  Info,
  AlertCircle,
  X,
  Code2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// Common typo correction function
const correctCommonTypos = (columnName: string): string => {
  const commonCorrections: Record<string, string> = {
    'uername': 'username',
    'usrname': 'username',
    'usernm': 'username',
    'user_name': 'username',
    'user-id': 'user_id',
    'userid': 'user_id',
    'emailadress': 'email',
    'email_address': 'email',
    'fristname': 'firstname',
    'firstname': 'first_name',
    'lastname': 'last_name',
    'createdat': 'created_at',
    'updatedat': 'updated_at',
    'phonenumber': 'phone_number',
    'phno': 'phone_number'
  };
  
  return commonCorrections[columnName.toLowerCase()] || columnName;
};


// Helper component for stable mapping edits
function MappingRow({
  column,
  value,
  discoveredElements,
  columns = [],
  isLoading = false,
  onUpdate,
  onDelete
}: {
  column: string;
  value: any;
  discoveredElements: any[];
  columns?: string[];
  isLoading?: boolean;
  onUpdate: (oldCol: string, newCol: string, newVal: any) => void;
  onDelete: (col: string) => void;
}) {

  const [localColumn, setLocalColumn] = useState(column);

  // Sync local column when external column changes (but not while typing)
  useEffect(() => {
    setLocalColumn(column);
  }, [column]);

  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1">
        <Select
          value={String(value).replace('formData.', '')}
          onValueChange={(newVal) => {
            onUpdate(column, localColumn, `formData.${newVal}`);
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
            <SelectValue placeholder="Select Element" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty">-- None --</SelectItem>
            {discoveredElements.filter(el => el.id).map((el, eIdx) => (
              <SelectItem key={eIdx} value={el.id!}>
                {el.tag}#{el.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-muted-foreground">
        <ChevronRight className="w-3 h-3" />
      </div>
      <div className="flex-1">
        <Select
          value={localColumn}
          onValueChange={(val) => {
            setLocalColumn(val);
            onUpdate(column, val, value);
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
            <SelectValue placeholder="DB Column" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="_loading" disabled>Loading columns...</SelectItem>
            ) : (
              columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))
            )}
            {!isLoading && columns.length === 0 && (
              <SelectItem value="_none" disabled>No columns found</SelectItem>
            )}
            <SelectItem value="_manual" className="text-[10px] text-blue-600 font-bold hover:bg-blue-50 cursor-pointer">
              + TYPE MANUALLY BELOW
            </SelectItem>
          </SelectContent>

        </Select>
        {(localColumn === '_manual' || (!columns.includes(localColumn) && localColumn)) && (
          <Input
            value={localColumn === '_manual' ? '' : localColumn}
            autoFocus={localColumn === '_manual'}
            placeholder="Manual Column"
            onChange={(e) => setLocalColumn(e.target.value)}
            onBlur={() => {
              if (localColumn !== column) {
                onUpdate(column, localColumn, value);
              }
            }}
            className="h-7 text-[10px] mt-1 border-slate-300"
          />
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground group-hover:text-destructive"
        onClick={() => onDelete(column)}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

interface CustomIntegration {
  id: string;
  type: 'supabase' | 'resend' | 'paymongo';
  name: string;
  config: {
    triggerButton?: string;
    // Supabase config
    table?: string;
    operation?: 'insert' | 'update' | 'delete' | 'select';
    selectTarget?: 'table' | 'single';
    data?: Record<string, string>;
    filters?: { column: string; operator: string; value: string }[];
    selectColumns?: string;

    // Resend config
    to?: string;
    subject?: string;
    template?: string;

    // PayMongo config
    amount?: number;
    description?: string;
    currency?: string;
  };
}

interface CustomComponentIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentIntegrations: CustomIntegration[];
  onSaveIntegrations: (integrations: CustomIntegration[]) => void;
  componentCode?: string;
  componentJs?: string;
  onUpdateJavascript?: (js: string) => void;
}

export function CustomComponentIntegrationModal({
  isOpen,
  onClose,
  componentIntegrations,
  onSaveIntegrations,
  componentCode = '',
  componentJs = '',
  onUpdateJavascript
}: CustomComponentIntegrationModalProps) {
  const [integrations, setIntegrations] = useState<CustomIntegration[]>([]);
  const [activeTab, setActiveTab] = useState('list');
  const [jsonStrings, setJsonStrings] = useState<Record<string, string>>({});

  // Metadata states
  const [tables, setTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);




  // Parse componentCode for IDs and Classes
  const discoveredElements = React.useMemo(() => {
    if (!componentCode) return [];

    const elements: { id?: string; classes: string[]; tag: string; label: string }[] = [];

    // Simple regex to find tags with id or class
    const tagRegex = /<(\w+)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(componentCode)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();

      // Skip common layout tags unless they have an ID
      if (['div', 'section', 'span', 'p'].includes(tagName) && !fullTag.includes('id=')) continue;

      const idMatch = /id=["']([^"']+)["']/.exec(fullTag);
      const classMatch = /class=["']([^"']+)["']/.exec(fullTag);

      const id = idMatch ? idMatch[1] : undefined;
      const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];

      if (id || classes.length > 0) {
        elements.push({
          id,
          classes,
          tag: tagName,
          label: id ? `#${id}` : `.${classes[0]}`
        });
      }
    }

    return elements;
  }, [componentCode]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialIntegrations = componentIntegrations || [];
      setIntegrations(initialIntegrations);

      // Initialize JSON strings for each integration
      const initialJsonStrings: Record<string, string> = {};
      initialIntegrations.forEach(integration => {
        initialJsonStrings[integration.id] = JSON.stringify(integration.config.data || {}, null, 2);
      });
      setJsonStrings(initialJsonStrings);

      setActiveTab('list');

      // Fetch tables if credentials exist
      fetchTables();

      // Also fetch columns for any existing tables in integrations
      initialIntegrations.forEach(i => {
        if (i.type === 'supabase' && i.config.table) {
          fetchColumns(i.config.table);
        }
      });
    }
  }, [isOpen]);


  const fetchTables = React.useCallback(async () => {
    const url = localStorage.getItem('target_supabase_url');
    const key = localStorage.getItem('target_supabase_key');

    if (!url || !key || !isOpen) return;

    setIsLoadingMetadata(true);
    try {
      // Use standard fetch to avoid creating multiple client instances for simple metadata
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.paths && isMounted.current && isOpen) {
          const tableNames = Object.keys(data.paths)
            .filter(path => path !== '/' && !path.includes('{'))
            .map(path => path.replace(/^\//, ''));
          setTables(tableNames);
        }
      } else {
        // Fallback: use existing integrations tables
        if (isMounted.current && isOpen) {
          const existingTables = componentIntegrations
            .filter(i => i.type === 'supabase' && i.config.table)
            .map(i => i.config.table!);
          if (existingTables.length > 0) {
            setTables(Array.from(new Set(existingTables)));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      if (isMounted.current) setIsLoadingMetadata(false);
    }
  }, [isOpen, componentIntegrations]);

  const fetchColumns = React.useCallback(async (tableName: string) => {
    if (!tableName || !isOpen) return;

    // Check if we already have it (but allow re-fetch if currently empty)
    if (tableColumns[tableName] && tableColumns[tableName].length > 0) return;

    if (isMounted.current && isOpen) {
      setLoadingColumns(prev => ({ ...prev, [tableName]: true }));
    }

    const url = localStorage.getItem('target_supabase_url');
    const key = localStorage.getItem('target_supabase_key');

    if (!url || !key) {
      if (isMounted.current) setLoadingColumns(prev => ({ ...prev, [tableName]: false }));
      return;
    }

    try {
      const client = createClient(url, key);

      // Method 1: Try to fetch 1 row to get columns from data keys
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0 && isMounted.current && isOpen) {
        let columns = Object.keys(data[0]);
        // Apply typo correction to column names
        columns = columns.map(col => correctCommonTypos(col));
        setTableColumns(prev => ({ ...prev, [tableName]: columns }));
        return;
      }

      // Method 2: If table is empty or fetch failed, use the OpenAPI schema
      const schemaResponse = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (schemaResponse.ok) {
        const schema = await schemaResponse.json();
        const path = `/${tableName.replace(/"/g, '')}`;
        const normalizedPath = Object.keys(schema.paths).find(p =>
          p.toLowerCase() === path.toLowerCase() ||
          p.replace(/"/g, '').toLowerCase() === path.toLowerCase()
        );

        if (normalizedPath && isMounted.current && isOpen) {
          const pathInfo = schema.paths[normalizedPath];
          const definitionName = pathInfo?.get?.responses?.['200']?.schema?.items?.['$ref']?.split('/')?.pop()
            || pathInfo?.post?.parameters?.[0]?.schema?.['$ref']?.split('/')?.pop();

          if (definitionName && schema.definitions?.[definitionName]?.properties) {
            let columns = Object.keys(schema.definitions[definitionName].properties);
            // Apply typo correction to column names
            columns = columns.map(col => correctCommonTypos(col));
            setTableColumns(prev => ({ ...prev, [tableName]: columns }));
            return;
          }
        }
      }

      // Fallback
      if (isMounted.current && isOpen) {
        const existingCols = integrations
          .filter(i => i.type === 'supabase' && i.config.table === tableName && i.config.data)
          .flatMap(i => Object.keys(i.config.data || {}));

        if (existingCols.length > 0) {
          let correctedCols = existingCols.map(col => correctCommonTypos(col));
          setTableColumns(prev => ({ ...prev, [tableName]: Array.from(new Set(correctedCols)) }));
        }
      }
    } catch (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
    } finally {
      if (isMounted.current) {
        setLoadingColumns(prev => ({ ...prev, [tableName]: false }));
      }
    }
  }, [isOpen, tableColumns, integrations]);





  const addIntegration = (type: 'supabase' | 'resend' | 'paymongo') => {
    const id = Date.now().toString();
    const newIntegration: CustomIntegration = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Integration ${integrations.filter(i => i.type === type).length + 1}`,
      config: type === 'supabase' ? { operation: 'insert' } : {}
    };
    setIntegrations([...integrations, newIntegration]);
    setJsonStrings((prev: Record<string, string>) => ({ ...prev, [id]: '{}' }));
    setActiveTab(type);

  };

  const updateIntegration = (id: string, updates: Partial<CustomIntegration>) => {
    setIntegrations(integrations.map(integration =>
      integration.id === id ? { ...integration, ...updates } : integration
    ));
  };

  const removeIntegration = (id: string) => {
    setIntegrations(integrations.filter(integration => integration.id !== id));
    setJsonStrings((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (activeTab === `config-${id}`) {
      setActiveTab('list');
    }
  };

  const handleJsonChange = (id: string, value: string) => {
    setJsonStrings(prev => ({ ...prev, [id]: value }));
    try {
      const data = JSON.parse(value);
      const integration = integrations.find(i => i.id === id);
      if (integration) {
        updateIntegration(id, {
          config: { ...integration.config, data }
        });
      }
    } catch (error) {
      // Invalid JSON, we keep the string state but don't update the integration config
    }
  };

  const handleSave = () => {
    // Perform final JSON validation before saving
    let hasError = false;
    integrations.forEach(integration => {
      const jsonStr = jsonStrings[integration.id] || '{}';
      try {
        JSON.parse(jsonStr);
      } catch (e) {
        hasError = true;
        toast.error(`Invalid JSON in ${integration.name}`);
      }
    });

    if (hasError) return;

    onSaveIntegrations(integrations);
    toast.success('Integrations saved successfully!');
    onClose();
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'supabase': return <Database className="w-4 h-4 text-green-600" />;
      case 'resend': return <Mail className="w-4 h-4 text-violet-600" />;
      case 'paymongo': return <CreditCard className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  const addFilter = (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    const currentFilters = integration.config.filters || [];
    updateIntegration(id, {
      config: {
        ...integration.config,
        filters: [...currentFilters, { column: '', operator: 'eq', value: '' }]
      }
    });
  };

  const updateFilter = (integrationId: string, index: number, updates: any) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const currentFilters = [...(integration.config.filters || [])];
    currentFilters[index] = { ...currentFilters[index], ...updates };
    updateIntegration(integrationId, {
      config: { ...integration.config, filters: currentFilters }
    });
  };

  const removeFilter = (integrationId: string, index: number) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const currentFilters = [...(integration.config.filters || [])];
    currentFilters.splice(index, 1);
    updateIntegration(integrationId, {
      config: { ...integration.config, filters: currentFilters }
    });
  };

  const getIntegrationColor = (type: string) => {
    switch (type) {
      case 'supabase': return 'bg-green-50 border-green-200 text-green-700';
      case 'resend': return 'bg-violet-50 border-violet-200 text-violet-700';
      case 'paymongo': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[85vh] flex flex-col"
        style={{ maxWidth: '1200px', width: '90vw' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Custom Component Integrations
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="list">Integrations ({integrations.length})</TabsTrigger>
            <TabsTrigger value="supabase">
              <Database className="w-4 h-4 mr-2" />Supabase
            </TabsTrigger>
            <TabsTrigger value="resend">
              <Mail className="w-4 h-4 mr-2" />Resend
            </TabsTrigger>
            <TabsTrigger value="paymongo">
              <CreditCard className="w-4 h-4 mr-2" />PayMongo
            </TabsTrigger>
          </TabsList>

          {discoveredElements.length > 0 && (
            <div className="px-4 py-2 bg-muted/30 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Discovered:</span>
                {discoveredElements.map((el, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] bg-white hover:bg-primary/5 border-primary/20"
                    onClick={() => {
                      const text = el.id ? `#${el.id}` : `.${el.classes[0]}`;
                      navigator.clipboard.writeText(text);
                      toast.info(`Copied ${text} to clipboard`);
                    }}
                  >
                    <span className="opacity-50 mr-1 font-mono">{el.tag}</span>
                    <span className="font-bold">{el.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* List Tab */}
            <TabsContent value="list" className="space-y-4 mt-4">
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addIntegration('supabase')}
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Add Supabase
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addIntegration('resend')}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Add Resend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addIntegration('paymongo')}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Add PayMongo
                </Button>
              </div>

              {integrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No integrations configured yet.</p>
                  <p className="text-sm">Add integrations to enable database operations, email sending, and payments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getIntegrationColor(integration.type)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getIntegrationIcon(integration.type)}
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm opacity-75 capitalize">{integration.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab(integration.type)}
                        >
                          Configure
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIntegration(integration.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Supabase Configuration */}
            <TabsContent value="supabase" className="space-y-4 mt-4">
              {integrations.filter(i => i.type === 'supabase').map((integration) => (
                <div key={integration.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Configuration: {integration.name}</h3>
                    <Badge variant="outline">{integration.id}</Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`supabase-name-${integration.id}`}>Integration Name</Label>
                      <Input
                        id={`supabase-name-${integration.id}`}
                        value={integration.name}
                        onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                        placeholder="e.g., Save User Data"
                        className="border-slate-300"
                      />
                    </div>

                    {integration.config.operation !== 'select' && (
                      <div>
                        <Label htmlFor={`supabase-trigger-${integration.id}`}>Trigger Element Selector</Label>
                        <Input
                          id={`supabase-trigger-${integration.id}`}
                          value={integration.config.triggerButton || ''}
                          onChange={(e) => updateIntegration(integration.id, {
                            config: { ...integration.config, triggerButton: e.target.value }
                          })}
                          placeholder="#submit-btn"
                          className="border-slate-300"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          The ID or class of the element that triggers this action on click.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`supabase-table-${integration.id}`}>Table Name</Label>
                        <Select
                          value={integration.config.table || ''}
                          onValueChange={(value) => {
                            updateIntegration(integration.id, {
                              config: { ...integration.config, table: value }
                            });
                            fetchColumns(value);
                          }}
                        >
                          <SelectTrigger id={`supabase-table-${integration.id}`} className="border-slate-300">
                            <SelectValue placeholder={isLoadingMetadata ? "Loading tables..." : "Select a table"} />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.length === 0 && !isLoadingMetadata && (
                              <SelectItem value="_no_tables" disabled>No tables found</SelectItem>
                            )}
                            {tables.map((tableName) => (
                              <SelectItem key={tableName} value={tableName}>
                                {tableName}
                              </SelectItem>
                            ))}
                            <SelectItem value="_manual" className="text-[10px] text-blue-600 font-bold hover:bg-blue-50 cursor-pointer">
                              + TYPE MANUALLY BELOW
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {(integration.config.table === '_manual' || (!tables.includes(integration.config.table || '') && integration.config.table)) && (
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              value={integration.config.table === '_manual' ? '' : integration.config.table}
                              autoFocus={integration.config.table === '_manual'}
                              onChange={(e) => updateIntegration(integration.id, {
                                config: { ...integration.config, table: e.target.value }
                              })}
                              className="h-7 text-xs border-slate-300"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => fetchColumns(integration.config.table!)}
                            >
                              Fetch Columns
                            </Button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`supabase-operation-${integration.id}`}>Operation</Label>
                        <Select
                          value={integration.config.operation || 'insert'}
                          onValueChange={(value) => updateIntegration(integration.id, {
                            config: { ...integration.config, operation: value as any }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="insert">Insert</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {integration.config.operation === 'select' && (
                        <div>
                          <Label htmlFor={`supabase-target-${integration.id}`}>Display Target</Label>
                          <Select
                            value={integration.config.selectTarget || 'table'}
                            onValueChange={(value) => updateIntegration(integration.id, {
                              config: { ...integration.config, selectTarget: value as 'table' | 'single' }
                            })}
                          >
                            <SelectTrigger className="border-slate-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="table">Table / List Container</SelectItem>
                              <SelectItem value="single">Single Inputs / Elements</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>


                    {integration.config.operation === 'select' && (
                      <div className="space-y-2">
                        <Label htmlFor={`supabase-columns-${integration.id}`}>Columns to Select</Label>
                        <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] bg-white border-slate-300">
                          {(!integration.config.selectColumns || integration.config.selectColumns === '*') ? (
                            <Badge variant="secondary" className="gap-1 bg-slate-100 pr-1">
                              * (All Columns)
                              <button
                                type="button"
                                className="ml-1 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  updateIntegration(integration.id, {
                                    config: { ...integration.config, selectColumns: '' }
                                  });
                                }}
                              >
                                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </Badge>

                          ) : (
                            integration.config.selectColumns.split(',').filter(Boolean).map((col, cIdx) => {
                              const trimmedCol = col.trim();
                              const isPotentialTypo = correctCommonTypos(trimmedCol) !== trimmedCol;
                              
                              return (
                                <Badge 
                                  key={cIdx} 
                                  variant="secondary" 
                                  className={`gap-1 pr-1 ${isPotentialTypo ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                                  title={isPotentialTypo ? `Potential typo detected: "${trimmedCol}" should be "${correctCommonTypos(trimmedCol)}"` : ''}
                                >
                                  {trimmedCol}
                                  {isPotentialTypo && <AlertCircle className="w-3 h-3 ml-1" />}
                                  <button
                                    type="button"
                                    className="ml-1 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const currentStr = integration.config.selectColumns || '';
                                      const cols = currentStr.split(',').filter(Boolean).map(c => c.trim());
                                      const newCols = cols.filter(c => c !== trimmedCol);
                                      updateIntegration(integration.id, {
                                        config: { ...integration.config, selectColumns: newCols.join(',') || '*' }
                                      });
                                    }}
                                  >
                                    <X className="w-3 h-3 text-blue-500 hover:text-destructive" />
                                  </button>
                                </Badge>
                              );
                            })
                          )}

                          <Select
                            onValueChange={(val) => {
                              if (val === '*') {
                                updateIntegration(integration.id, { config: { ...integration.config, selectColumns: '*' } });
                                return;
                              }
                              const currentCols = integration.config.selectColumns === '*' ? [] : (integration.config.selectColumns || '').split(',').filter(Boolean).map(c => c.trim());
                              if (!currentCols.includes(val)) {
                                updateIntegration(integration.id, {
                                  config: { ...integration.config, selectColumns: [...currentCols, val].join(',') }
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-6 w-auto min-w-[100px] text-[10px] border-dashed border-slate-300 bg-transparent">
                              <Plus className="w-3 h-3 mr-1" />
                              {loadingColumns[integration.config.table || ''] ? "Fetching..." : "Add Column"}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="*">* (All Columns)</SelectItem>
                              {loadingColumns[integration.config.table || ''] ? (
                                <SelectItem value="_loading" disabled>Loading columns...</SelectItem>
                              ) : (
                                (tableColumns[integration.config.table || ''] || []).map(col => {
                                  const correctedCol = correctCommonTypos(col);
                                  const hasTypo = correctedCol !== col;
                                  return (
                                    <SelectItem key={col} value={col}>
                                      <div className="flex items-center gap-2">
                                        {col}
                                        {hasTypo && (
                                          <span className="text-xs text-orange-600 bg-orange-50 px-1 rounded">
                                            Will be corrected to "{correctedCol}"
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })
                              )}
                              {!loadingColumns[integration.config.table || ''] && (tableColumns[integration.config.table || ''] || []).length === 0 && (
                                <SelectItem value="_loading" disabled>
                                  {integration.config.table ? "No columns found" : "Select a table first"}
                                </SelectItem>
                              )}
                            </SelectContent>

                          </Select>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Select the columns you want to retrieve. "*" gets everything.
                        </p>
                        <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          <div className="flex items-center gap-1 mb-1">
                            <Info className="w-3 h-3" />
                            <span className="font-medium">Auto-Correction Active</span>
                          </div>
                          Common typos are automatically corrected (e.g., "uername" → "username", "emailadress" → "email"). Orange badges indicate detected typos that will be fixed automatically.
                        </div>
                      </div>
                    )}


                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Filters</Label>
                        <Button variant="outline" size="sm" onClick={() => addFilter(integration.id)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Filter
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(integration.config.filters || []).map((filter, idx) => (
                          <div key={idx} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Select
                                value={filter.column}
                                onValueChange={(val) => updateFilter(integration.id, idx, { column: val })}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                                  <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loadingColumns[integration.config.table || ''] ? (
                                    <SelectItem value="_loading" disabled>Loading columns...</SelectItem>
                                  ) : (
                                    (tableColumns[integration.config.table || ''] || []).map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))
                                  )}
                                  {!loadingColumns[integration.config.table || ''] && (tableColumns[integration.config.table || ''] || []).length === 0 && (
                                    <SelectItem value="_none" disabled>
                                      {integration.config.table ? "No columns found" : "Select table first"}
                                    </SelectItem>
                                  )}
                                </SelectContent>

                              </Select>
                            </div>

                            <div className="w-24">
                              <Select
                                value={filter.operator}
                                onValueChange={(val) => updateFilter(integration.id, idx, { operator: val })}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="eq">=</SelectItem>
                                  <SelectItem value="neq">&lt;&gt;</SelectItem>
                                  <SelectItem value="gt">&gt;</SelectItem>
                                  <SelectItem value="lt">&lt;</SelectItem>
                                  <SelectItem value="gte">&gt;=</SelectItem>
                                  <SelectItem value="lte">&lt;=</SelectItem>
                                  <SelectItem value="like">Like</SelectItem>
                                  <SelectItem value="ilike">iLike</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 flex gap-1">
                              <Select
                                value={discoveredElements.find(e => `formData.${e.id}` === filter.value) ? filter.value.replace('formData.', '') : '_custom'}
                                onValueChange={(val) => {
                                  if (val !== '_custom') {
                                    updateFilter(integration.id, idx, { value: `formData.${val}` });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 w-[110px] text-xs px-2 bg-white border-slate-300">
                                  <SelectValue placeholder="Bind..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_custom">Custom Text</SelectItem>
                                  {discoveredElements.filter(el => el.id).map((el, eIdx) => (
                                    <SelectItem key={eIdx} value={el.id!}>
                                      {el.tag}#{el.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={filter.value}
                                onChange={(e) => updateFilter(integration.id, idx, { value: e.target.value })}
                                className="h-8 text-xs flex-1 border-slate-300"
                                placeholder="Value..."
                              />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeFilter(integration.id, idx)} className="h-8 w-8 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {integration.config.operation === 'select' && (integration.config.selectTarget || 'table') === 'table' ? (
                      <div className="mb-4">
                        <Label className="text-xs font-semibold">HTML Container ID</Label>
                        <Input
                          value={(() => {
                            try {
                              const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                              return (Object.values(mappings)[0] as string | undefined)?.replace('formData.', '') || '';
                            } catch (e) { return ''; }
                          })()}
                          onChange={(e) => {
                            const val = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                            // The exact format mapping relies on for extraction in generator snippet
                            handleJsonChange(integration.id, JSON.stringify({ "container": `formData.${val}` }, null, 2));
                          }}
                          placeholder="#users-table"
                          className="mt-1 border-slate-300"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Type the ID of the table or list container where the fetched data rows should be dynamically injected.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-semibold">Data Mapping</Label>
                          <Badge variant="outline" className="text-[10px]">JSON Configuration</Badge>
                        </div>

                        {/* Visual Mapper */}
                        <div className="mb-4 space-y-2 p-3 border rounded bg-muted/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Visual Mapper (Element $\rightarrow$ Column)</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[10px] text-destructive hover:text-destructive"
                              onClick={() => handleJsonChange(integration.id, '{}')}
                            >
                              Clear All
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {(() => {
                              try {
                                const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                                const mappingEntries = Object.entries(mappings);

                                if (mappingEntries.length === 0) {
                                  return <p className="text-[10px] text-muted-foreground italic py-2 text-center border border-dashed rounded">No mappings defined. Use the buttons below to start.</p>;
                                }

                                return mappingEntries.map(([column, value], idx) => (
                                  <MappingRow
                                    key={idx}
                                    column={column}
                                    value={value}
                                    discoveredElements={discoveredElements}
                                    columns={tableColumns[integration.config.table || ''] || []}
                                    isLoading={loadingColumns[integration.config.table || '']}
                                    onUpdate={(oldCol, newCol, newVal) => {


                                      const newMappings = { ...mappings };
                                      if (oldCol !== newCol) {
                                        delete newMappings[oldCol];
                                      }
                                      newMappings[newCol || `unnamed_${idx}`] = newVal;
                                      handleJsonChange(integration.id, JSON.stringify(newMappings, null, 2));
                                    }}
                                    onDelete={(col) => {
                                      const newMappings = { ...mappings };
                                      delete newMappings[col];
                                      handleJsonChange(integration.id, JSON.stringify(newMappings, null, 2));
                                    }}
                                  />
                                ));
                              } catch (e) {
                                return <p className="text-[10px] text-destructive">Invalid JSON structure. Fix it below manually.</p>
                              }
                            })()}

                            {/* Add New Row */}
                            <div className="flex items-center gap-2 pt-2 border-t mt-2">
                              <span className="text-[9px] font-bold text-muted-foreground"><ChevronRight className="w-3 h-3 mr-1" /></span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] flex-1 bg-white border-dashed"
                                onClick={() => {
                                  try {
                                    const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                                    const newKey = `new_column_${Object.keys(mappings).length + 1}`;
                                    mappings[newKey] = "formData.";
                                    handleJsonChange(integration.id, JSON.stringify(mappings, null, 2));
                                  } catch (e) {
                                    toast.error("Cannot add mapping while JSON is invalid");
                                  }
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Manual Mapping
                              </Button>

                              {discoveredElements.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] flex-1 bg-primary/5 hover:bg-primary/10 border-dashed border-primary/30"
                                  onClick={() => {
                                    try {
                                      const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                                      discoveredElements.filter(el => el.id && !Object.values(mappings).includes(`formData.${el.id}`)).forEach(el => {
                                        mappings[el.id!] = `formData.${el.id}`;
                                      });
                                      handleJsonChange(integration.id, JSON.stringify(mappings, null, 2));
                                      toast.success("Auto-mapped all discovered IDs");
                                    } catch (e) {
                                      toast.error("Cannot auto-map while JSON is invalid");
                                    }
                                  }}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" /> Auto-generate All
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor={`supabase-data-${integration.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Raw JSON Editor</Label>
                          {(() => {
                            try {
                              if (jsonStrings[integration.id]) {
                                JSON.parse(jsonStrings[integration.id]);
                                return <span className="text-[10px] text-green-600 font-medium">Valid JSON</span>;
                              }
                              return null;
                            } catch (e) {
                              return <span className="text-[10px] text-red-600 font-medium">Invalid JSON</span>;
                            }
                          })()}
                        </div>
                        <Textarea
                          id={`supabase-data-${integration.id}`}
                          value={jsonStrings[integration.id] || ''}
                          onChange={(e) => handleJsonChange(integration.id, e.target.value)}
                          placeholder='{"name": "formData.name"}'
                          rows={4}
                          className="font-mono text-xs border-slate-300"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Map form data to table columns. Use dot notation for nested data. Example: {'{"name": "formData.name"}'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {integrations.filter(i => i.type === 'supabase').length === 0 && (
                <p className="text-center py-8 text-muted-foreground italic">No Supabase integrations added yet.</p>
              )}
            </TabsContent>

            {/* Resend Configuration */}
            <TabsContent value="resend" className="space-y-4 mt-4">
              {integrations.filter(i => i.type === 'resend').map((integration) => (
                <div key={integration.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Configuration: {integration.name}</h3>
                    <Badge variant="outline">{integration.id}</Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`resend-name-${integration.id}`}>Integration Name</Label>
                      <Input
                        id={`resend-name-${integration.id}`}
                        value={integration.name}
                        onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                        placeholder="e.g., Contact Form Email"
                        className="border-slate-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`resend-trigger-${integration.id}`}>Trigger Element Selector</Label>
                      <Input
                        id={`resend-trigger-${integration.id}`}
                        value={integration.config.triggerButton || ''}
                        onChange={(e) => updateIntegration(integration.id, {
                          config: { ...integration.config, triggerButton: e.target.value }
                        })}
                        placeholder="#submit-btn"
                        className="border-slate-300"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        The ID or class of the element that triggers this email on click.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`resend-to-${integration.id}`}>Recipient Email</Label>
                      <Input
                        id={`resend-to-${integration.id}`}
                        value={integration.config.to || ''}
                        onChange={(e) => updateIntegration(integration.id, {
                          config: { ...integration.config, to: e.target.value }
                        })}
                        placeholder="contact@example.com"
                        className="border-slate-300"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold">Data Mapping</Label>
                        <Badge variant="outline" className="text-[10px]">JSON Configuration</Badge>
                      </div>

                      {/* Visual Mapper */}
                      <div className="mb-4 space-y-2 p-3 border rounded bg-muted/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Visual Mapper (Element $\rightarrow$ Email Field)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] text-destructive hover:text-destructive"
                            onClick={() => handleJsonChange(integration.id, '{}')}
                          >
                            Clear All
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {(() => {
                            try {
                              const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                              const mappingEntries = Object.entries(mappings);

                              if (mappingEntries.length === 0) {
                                return <p className="text-[10px] text-muted-foreground italic py-2 text-center border border-dashed rounded">No mappings defined. Use the buttons below to start.</p>;
                              }

                              return mappingEntries.map(([column, value], idx) => (
                                <MappingRow
                                  key={idx}
                                  column={column}
                                  value={value}
                                  discoveredElements={discoveredElements}
                                  columns={[]}
                                  isLoading={false}
                                  onUpdate={(oldCol, newCol, newVal) => {
                                    const newMappings = { ...mappings };
                                    if (oldCol !== newCol) {
                                      delete newMappings[oldCol];
                                    }
                                    newMappings[newCol || `unnamed_${idx}`] = newVal;
                                    handleJsonChange(integration.id, JSON.stringify(newMappings, null, 2));
                                  }}
                                  onDelete={(col) => {
                                    const newMappings = { ...mappings };
                                    delete newMappings[col];
                                    handleJsonChange(integration.id, JSON.stringify(newMappings, null, 2));
                                  }}
                                />
                              ));
                            } catch (e) {
                              return <p className="text-[10px] text-destructive">Invalid JSON structure. Fix it below manually.</p>
                            }
                          })()}

                          {/* Add New Row */}
                          <div className="flex items-center gap-2 pt-2 border-t mt-2">
                            <span className="text-[9px] font-bold text-muted-foreground"><ChevronRight className="w-3 h-3 mr-1" /></span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] flex-1 bg-white border-dashed"
                              onClick={() => {
                                try {
                                  const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                                  const newKey = `new_field_${Object.keys(mappings).length + 1}`;
                                  mappings[newKey] = "formData.";
                                  handleJsonChange(integration.id, JSON.stringify(mappings, null, 2));
                                } catch (e) {
                                  toast.error("Cannot add mapping while JSON is invalid");
                                }
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Manual Mapping
                            </Button>

                            {discoveredElements.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] flex-1 bg-primary/5 hover:bg-primary/10 border-dashed border-primary/30"
                                onClick={() => {
                                  try {
                                    const mappings = JSON.parse(jsonStrings[integration.id] || '{}');
                                    discoveredElements.filter(el => el.id && !Object.values(mappings).includes(`formData.${el.id}`)).forEach(el => {
                                      mappings[el.id!] = `formData.${el.id}`;
                                    });
                                    handleJsonChange(integration.id, JSON.stringify(mappings, null, 2));
                                    toast.success("Auto-mapped all discovered IDs");
                                  } catch (e) {
                                    toast.error("Cannot auto-map while JSON is invalid");
                                  }
                                }}
                              >
                                <Sparkles className="w-3 h-3 mr-1" /> Auto-generate All
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor={`resend-data-${integration.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Raw JSON Editor</Label>
                        {(() => {
                            try {
                              if (jsonStrings[integration.id]) {
                                JSON.parse(jsonStrings[integration.id]);
                                return <span className="text-[10px] text-green-600 font-medium">Valid JSON</span>;
                              }
                              return null;
                            } catch (e) {
                              return <span className="text-[10px] text-red-600 font-medium">Invalid JSON</span>;
                            }
                        })()}
                      </div>
                      <Textarea
                        id={`resend-data-${integration.id}`}
                        value={jsonStrings[integration.id] || ''}
                        onChange={(e) => handleJsonChange(integration.id, e.target.value)}
                        placeholder='{"Name": "formData.name"}'
                        rows={4}
                        className="font-mono text-xs border-slate-300"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Map form data variables. These fields will be shown in the email summary.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {integrations.filter(i => i.type === 'resend').length === 0 && (
                <p className="text-center py-8 text-muted-foreground italic">No Resend integrations added yet.</p>
              )}
            </TabsContent>

            {/* PayMongo Configuration */}
            <TabsContent value="paymongo" className="space-y-4 mt-4">
              {integrations.filter(i => i.type === 'paymongo').map((integration) => (
                <div key={integration.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Configuration: {integration.name}</h3>
                    <Badge variant="outline">{integration.id}</Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`paymongo-name-${integration.id}`}>Integration Name</Label>
                      <Input
                        id={`paymongo-name-${integration.id}`}
                        value={integration.name}
                        onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                        placeholder="e.g., Product Payment"
                        className="border-slate-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`paymongo-trigger-${integration.id}`}>Trigger Element Selector</Label>
                      <Input
                        id={`paymongo-trigger-${integration.id}`}
                        value={integration.config.triggerButton || ''}
                        onChange={(e) => updateIntegration(integration.id, {
                          config: { ...integration.config, triggerButton: e.target.value }
                        })}
                        placeholder="#checkout-btn"
                        className="border-slate-300"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        The ID or class of the element that triggers this payment on click.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`paymongo-amount-${integration.id}`}>Amount</Label>
                        <Input
                          id={`paymongo-amount-${integration.id}`}
                          type="number"
                          value={integration.config.amount || ''}
                          onChange={(e) => updateIntegration(integration.id, {
                            config: { ...integration.config, amount: Number(e.target.value) }
                          })}
                          placeholder="100"
                          className="border-slate-300"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`paymongo-currency-${integration.id}`}>Currency</Label>
                        <Select
                          value={integration.config.currency || 'PHP'}
                          onValueChange={(value) => updateIntegration(integration.id, {
                            config: { ...integration.config, currency: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PHP">PHP</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`paymongo-description-${integration.id}`}>Description</Label>
                      <Input
                        id={`paymongo-description-${integration.id}`}
                        value={integration.config.description || ''}
                        onChange={(e) => updateIntegration(integration.id, {
                          config: { ...integration.config, description: e.target.value }
                        })}
                        placeholder="Product purchase"
                        className="border-slate-300"
                      />

                      {discoveredElements.length > 0 && (
                        <div className="mt-2 p-2 border rounded bg-muted/20">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Quick Bind (IDs):</Label>
                          <div className="flex flex-wrap gap-1">
                            {discoveredElements.filter(el => el.id).map((el, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[9px] border hover:bg-white"
                                onClick={() => {
                                  // For PayMongo, we might want to map this to the amount or description?
                                  // For now, just copy to clipboard as a helper.
                                  const text = `#${el.id}`;
                                  navigator.clipboard.writeText(text);
                                  toast.info(`Copied ${text} to clipboard`);
                                }}
                              >
                                {el.tag}#{el.id}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {integrations.filter(i => i.type === 'paymongo').length === 0 && (
                <p className="text-center py-8 text-muted-foreground italic">No PayMongo integrations added yet.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Integration Trigger Helper */}
        {activeTab !== 'list' && (
          <div className="px-6 py-3 border-t bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">How to Trigger in JavaScript</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] max-w-[200px]">Copy these snippets into your custom component's JS editor to run this integration on events like button clicks.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              {integrations.filter(i => activeTab === 'list' ? true : i.type === activeTab).map(integration => (
                <div key={integration.id} className="flex items-center justify-between text-[11px] bg-white p-2 rounded border group">
                  <div className="flex flex-col">
                    <span className="font-medium text-muted-foreground">{integration.name}</span>
                    <code className="text-[10px] text-primary mt-1 font-mono">
                      (function() &#123; ... window.buildx.run('{integration.id}') &#125;)();
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const triggerSelector = integration.config?.triggerButton || (integration.type === 'supabase' ? '#submit-btn' : '#trigger-btn');
                        let snippet = '';
                        const isSelect = integration.type === 'supabase' && integration.config?.operation === 'select';
                        const selectTarget = integration.config?.selectTarget || 'table';

                        if (isSelect) {
                          const mappingsObj = integration.config?.data || {};

                          if (selectTarget === 'table') {
                            // --- TABLE / LIST TARGET SNIPPET ---
                            const firstMappedValue = Object.values(mappingsObj)[0] as string | undefined;

                            let containerId = 'data-container';
                            if (firstMappedValue) {
                              // Usually stored as formData.elementId
                              containerId = firstMappedValue.startsWith('formData.') ? firstMappedValue.replace('formData.', '') : firstMappedValue;
                            }

                            // Strip # for getElementById
                            const containerIdClean = containerId.startsWith('#') ? containerId.substring(1) : containerId;

                            snippet = `(function() {\n  (async () => {\n    console.log('[buildx] 🔄 Waiting for engine...');\n    while (typeof window.buildx === 'undefined') {\n      await new Promise(r => setTimeout(r, 50));\n    }\n    console.log('[buildx] 🔄 Fetching data on load...');\n    try {\n      const result = await window.buildx.run('${integration.id}', {});\n      if (result.success && result.data) {\n        console.log('[buildx] ✅ Data loaded successfully!', result.data);\n        \n        const container = document.getElementById('${containerIdClean}');\n        if (container) {\n          container.innerHTML = '';\n          \n          // Ensure data is an array before looping\n          const items = Array.isArray(result.data) ? result.data : (result.data.data && Array.isArray(result.data.data) ? result.data.data : []);\n          \n          if (items.length === 0) {\n            container.innerHTML = '<tr><td colspan="3">No data found</td></tr>';\n            return;\n          }\n\n          items.forEach(row => {\n            const item = document.createElement('tr');\n            item.innerHTML = \`\n              <td>\${row.id || Object.values(row)[0] || 'N/A'}</td>\n              <td>\${Object.values(row)[1] || 'N/A'}</td>\n              <td>\${Object.values(row)[2] || 'N/A'}</td>\n            \`;\n            container.appendChild(item);\n          });\n        } else {\n          console.warn('[buildx] ⚠️ Container #${containerIdClean} not found.');\n        }\n      } else {\n        console.error('[buildx] ❌ Failed to fetch data:', result.error || result.data?.message || 'Unknown error');\n      }\n    } catch (err) {\n      console.error('[buildx] ⚠️ System error:', err);\n    }\n  })();\n})();`;
                          } else {
                            // --- SINGLE INPUTS / ELEMENTS TARGET SNIPPET ---
                            const mappingsList = Object.entries(mappingsObj).map(([col, elem]) => {
                              const rawSelector = (elem as string).replace('formData.', '');
                              // $ uses querySelector, so it needs # for IDs
                              const selector = rawSelector.startsWith('#') || rawSelector.startsWith('.') ? rawSelector : `#${rawSelector}`;
                              return `const el_${col} = $('${selector}');\n        if (el_${col}) {\n          if (el_${col}.tagName === 'INPUT' || el_${col}.tagName === 'TEXTAREA' || el_${col}.tagName === 'SELECT') el_${col}.value = row.${col} || '';\n          else el_${col}.textContent = row.${col} || '';\n        }`;
                            }).join('\n        ');

                            // Handle empty mapping edge case
                            const mappingCodeBlock = Object.keys(mappingsObj).length > 0
                              ? mappingsList
                              : `// No columns mapped yet. Add Data Mappings in the integration settings!\n        // Example: if (document.getElementById('name_input')) document.getElementById('name_input').value = row.fullname || '';`;

                            snippet = `(function() {\n  (async () => {\n    console.log('[buildx] 🔄 Waiting for engine...');\n    while (typeof window.buildx === 'undefined') {\n      await new Promise(r => setTimeout(r, 50));\n    }\n    console.log('[buildx] 🔄 Fetching data on load...');\n    try {
      const result = await window.buildx.run('${integration.id}', {});
      if (result.success && result.data && result.data.length > 0) {
\n        console.log('[buildx] ✅ Data loaded successfully!', result.data);\n        \n        const row = result.data[0];\n        // 🔥 AUTO-FILL MAPPED INPUTS 🔥\n        ${mappingCodeBlock}\n      } else {\n        console.warn('[buildx] ⚠️ No data found or failed to fetch:', result.error);\n      }\n    } catch (err) {\n      console.error('[buildx] ⚠️ System error:', err);\n    }\n  })();\n})();`;
                          }
                        } else {
                          // $ uses querySelector
                          const cleanSelector = triggerSelector.startsWith('#') || triggerSelector.startsWith('.') ? triggerSelector : `#${triggerSelector}`;
                          snippet = `(function() {\n  // Trigger ${integration.name}\n  const btn = $('${cleanSelector}');\n  if (btn) {\n    btn.addEventListener('click', async (e) => {\n      if (e) e.preventDefault();\n      console.log('[buildx] 🖱️ Button clicked. Starting integration...');\n      \n      try {
        const result = await window.buildx.run('${integration.id}', {});
        if (result.success) {
\n           console.log('[buildx] ✅ Integration successful! Result:', result.data);\n           // 🔥 ADD YOUR CODE HERE for what happens after success!\n        } else {\n           console.error('[buildx] ❌ Integration failed:', result.error);\n        }\n      } catch (err) {\n        console.error('[buildx] ⚠️ System error in snippet:', err);\n      }\n    });\n    console.log('[buildx] ✅ Click listener attached to "${cleanSelector}"');\n  } else {\n    console.error('[buildx] ❌ Button with selector "${cleanSelector}" NOT FOUND. Check your HTML ID/Class!');\n  }\n})();`;
                        }
                        navigator.clipboard.writeText(snippet);
                        toast.success(`Copied robust snippet for ${integration.name}`);
                      }}
                    >
                      Copy
                    </Button>

                    {onUpdateJavascript && (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const triggerSelector = integration.config?.triggerButton || (integration.type === 'supabase' ? '#submit-btn' : '#trigger-btn');
                          let snippet = '';
                          const isSelect = integration.type === 'supabase' && integration.config?.operation === 'select';
                          const selectTarget = integration.config?.selectTarget || 'table';

                          if (isSelect) {
                            const mappingsObj = integration.config?.data || {};

                            if (selectTarget === 'table') {
                              // --- TABLE / LIST TARGET SNIPPET ---
                              const firstMappedValue = Object.values(mappingsObj)[0] as string | undefined;

                              let containerId = 'data-container';
                              if (firstMappedValue) {
                                // Usually stored as formData.elementId
                                containerId = firstMappedValue.startsWith('formData.') ? firstMappedValue.replace('formData.', '') : firstMappedValue;
                              }

                              // Strip # for getElementById
                              const containerIdClean = containerId.startsWith('#') ? containerId.substring(1) : containerId;

                              snippet = `(function() {
  (async () => {
    console.log('[buildx] 🔄 Waiting for engine...');
    while (typeof window.buildx === 'undefined') {
      await new Promise(r => setTimeout(r, 50));
    }\n    console.log('[buildx] 🔄 Fetching data on load...');
    try {
      const result = await window.buildx.run('${integration.id}', {});
      if (result.success && result.data) {
        console.log('[buildx] ✅ Data loaded successfully!', result.data);
        
        // 🔥 AUTO-RENDER TEMPLATE 🔥
        // Create an element in your HTML like: <tbody id="${containerIdClean}"></tbody>
        const container = document.getElementById('${containerIdClean}');
        if (container) {
          container.innerHTML = ''; // Clear loading state
          const items = Array.isArray(result.data) ? result.data : (result.data.data && Array.isArray(result.data.data) ? result.data.data : []);
          
          if (items.length === 0) {
            container.innerHTML = '<tr><td colspan="3">No data found</td></tr>';
            return;
          }
          
          items.forEach(row => {
            const item = document.createElement('tr'); // Change 'tr' to 'div' or 'li' if not a table
            
            // Modify these variables to match your database columns!
            item.innerHTML = \`
              <td>\${row.id || Object.values(row)[0] || 'N/A'}</td>
              <td>\${Object.values(row)[1] || 'N/A'}</td>
              <td>\${Object.values(row)[2] || 'N/A'}</td>
            \`;
            
            container.appendChild(item);
          });
        } else {
          console.warn('[buildx] ⚠️ Container #${containerIdClean} not found. Add it to your HTML to see the data!');
        }
      } else {
        console.error('[buildx] ❌ Failed to fetch data:', result.error);
      }
    } catch (err) {
      console.error('[buildx] ⚠️ System error:', err);
    }
  })();
})();`;
                            } else {
                              // --- SINGLE INPUTS / ELEMENTS TARGET SNIPPET ---
                              const mappingsList = Object.entries(mappingsObj).map(([col, elem]) => {
                                const rawSelector = (elem as string).replace('formData.', '');
                                // $ uses querySelector, so it needs # for IDs
                                const selector = rawSelector.startsWith('#') || rawSelector.startsWith('.') ? rawSelector : `#${rawSelector}`;
                                return `const el_${col} = $('${selector}');\n        if (el_${col}) {\n          if (el_${col}.tagName === 'INPUT' || el_${col}.tagName === 'TEXTAREA' || el_${col}.tagName === 'SELECT') el_${col}.value = row.${col} || '';\n          else el_${col}.textContent = row.${col} || '';\n        }`;
                              }).join('\n        ');

                              // Handle empty mapping edge case
                              const mappingCodeBlock = Object.keys(mappingsObj).length > 0
                                ? mappingsList
                                : `// No columns mapped yet. Add Data Mappings in the integration settings!\n        // Example: if (document.getElementById('name_input')) document.getElementById('name_input').value = row.fullname || '';`;

                              snippet = `(function() {
  (async () => {
    console.log('[buildx] 🔄 Waiting for engine...');
    while (typeof window.buildx === 'undefined') {
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('[buildx] 🔄 Fetching data on load...');
    try {
      const result = await window.buildx.run('${integration.id}', {});
      if (result.success && result.data && result.data.length > 0) {
        console.log('[buildx] ✅ Data loaded successfully!', result.data);
        
        const row = result.data[0];
        // 🔥 AUTO-FILL MAPPED INPUTS 🔥
        ${mappingCodeBlock}
      } else {
        console.warn('[buildx] ⚠️ No data found or failed to fetch:', result.error);
      }
    } catch (err) {
      console.error('[buildx] ⚠️ System error:', err);
    }
  })();
})();`;
                            }

                          } else {
                            const cleanSelector = triggerSelector.startsWith('#') || triggerSelector.startsWith('.') ? triggerSelector : `#${triggerSelector}`;
                            snippet = `(function() {
  // Trigger ${integration.name}
  const btn = $('${cleanSelector}');
  if (btn) {
    btn.addEventListener('click', async (e) => {
      if (e) e.preventDefault();
      console.log('[buildx] 🖱️ Button clicked. Starting integration...');
      
      try {
        const result = await window.buildx.run('${integration.id}', {});
        if (result.success) {
           console.log('[buildx] ✅ Integration successful! Result:', result.data);
           // 🔥 ADD YOUR CODE HERE for what happens after success!
        } else {
           console.error('[buildx] ❌ Integration failed:', result.error);
        }
      } catch (err) {
        console.error('[buildx] ⚠️ System error:', err);
      }
    });
    console.log('[buildx] ✅ Click listener attached to "${cleanSelector}"');
  } else {
    console.error('[buildx] ❌ Button with selector "${cleanSelector}" NOT FOUND. Check your HTML ID/Class!');
  }
})();`;
                          }

                          // Append to existing JS
                          const newJs = componentJs ? `${componentJs}\n\n${snippet}` : snippet;
                          onUpdateJavascript(newJs);
                          toast.success(`Code applied directly to Javascript editor!`);
                        }}
                      >
                        Apply to JS
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Integrations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
