# Dashboard & Widgets - Gap Analysis

## 1. Design Requirements

Based on the documentation in [`docs/features/README.md`](../docs/features/README.md) and the platform architecture, the Dashboard & Widgets system should provide:

### Core Dashboard Features
- **Drag-and-Drop Interface**: Intuitive widget management with real-time layout updates
- **Responsive Grid System**: Adaptive layouts across different screen sizes
- **Widget Catalog**: Comprehensive library of pre-built and custom widgets
- **Persistent Layouts**: User-specific dashboard configurations saved to backend
- **Real-time Updates**: Live data refresh and widget synchronization
- **Customizable Widgets**: Configurable widget settings and appearance

### Widget System Architecture
- **Widget Framework**: Standardized widget development and integration
- **Data Binding**: Automatic data fetching and real-time updates
- **Event System**: Inter-widget communication and coordination
- **Performance Optimization**: Lazy loading and efficient rendering
- **Security**: Secure data access and permission-based widget visibility

### Standard Widget Types
- **Token Statistics**: Real-time token metrics and analytics
- **Recent Tokens**: Latest token activities and transactions
- **User Metrics**: User engagement and activity statistics
- **Activity Feed**: System-wide activity and notifications
- **Quick Actions**: Common tasks and shortcuts
- **Chart Widgets**: Data visualization and analytics
- **Installed Apps**: App management and quick access

### Integration Features
- **Multi-tenant Support**: Organization-specific dashboard configurations
- **Role-based Access**: Permission-controlled widget visibility
- **API Integration**: Seamless backend data connectivity
- **Export Capabilities**: Dashboard and widget data export
- **Mobile Responsive**: Optimized mobile experience

## 2. Current Implementation Status

### ✅ Implemented Features

#### Core Dashboard Framework
- **Grid Layout System** ([`src/components/dashboard/GridLayout.tsx`](../src/components/dashboard/GridLayout.tsx))
  - React Grid Layout integration with responsive breakpoints
  - Drag-and-drop functionality with edit mode
  - Responsive column constraints (lg: 12, md: 10, sm: 6, xs: 4, xxs: 2)
  - Vertical compacting and layout optimization

- **Dashboard Store** ([`src/store/dashboardStore.ts`](../src/store/dashboardStore.ts))
  - Zustand-based state management with persistence
  - Widget and layout management functions
  - Local storage persistence with versioning
  - Backend integration for save/load operations

- **Widget Renderer** ([`src/components/dashboard/WidgetRenderer.tsx`](../src/components/dashboard/WidgetRenderer.tsx))
  - Centralized widget rendering system
  - Edit mode controls (settings, remove)
  - Error handling for unknown widget types
  - Consistent card-based UI wrapper

#### Widget Implementations
- **Token Stats Widget** ([`src/components/dashboard/widgets/TokenStatsWidget.tsx`](../src/components/dashboard/widgets/TokenStatsWidget.tsx))
  - Real-time token metrics calculation
  - Growth rate analysis and visualization
  - Error handling and loading states
  - Auto-refresh every 5 minutes

- **Additional Widgets** (7 total widget types)
  - RecentTokensWidget, UserMetricsWidget, ActivityFeedWidget
  - QuickActionsWidget, ChartWidget, InstalledAppsWidget
  - Legacy metric widget support

#### Backend Integration
- **Dashboard API** ([`src/services/api/dashboard.ts`](../src/services/api/dashboard.ts))
  - Complete API service with cloud function integration
  - Save/load dashboard layouts with user/org context
  - Chart data, metrics, and activity endpoints
  - Error handling and response transformation

- **Cloud Functions** ([`parse-server/cloud/functions/dashboard/`](../parse-server/cloud/functions/dashboard/))
  - Complete backend implementation with multiple modules
  - Configuration management (config.js)
  - Chart data generation (charts.js)
  - Activity feed (activity.js)
  - Metrics and analytics (metrics.js)
  - Database queries (queries.js)

#### Database Schema
- **DashboardConfig Model** ([`parse-server/cloud/schema/Dashboard.js`](../parse-server/cloud/schema/Dashboard.js))
  - User-specific dashboard configurations
  - Layout and widget persistence
  - Organization-based isolation
  - Audit logging integration

### 🔄 Partially Implemented Features

#### Widget Configuration System
- **Status**: Basic configuration support exists but limited
- **Current**: Widget config prop passed but minimal usage
- **Missing**: Advanced widget configuration UI and persistence

#### Real-time Updates
- **Status**: Manual refresh implemented but no real-time sync
- **Current**: 5-minute auto-refresh in TokenStatsWidget
- **Missing**: WebSocket/SSE integration for live updates

#### Widget Catalog
- **Status**: Widget types defined but no catalog UI
- **Current**: Widget types in store, renderer supports all types
- **Missing**: User-friendly widget selection interface

## 3. Gap Analysis

### 🚨 Critical Gaps (Must Fix for Beta)

#### 1. Missing Widget Catalog Interface
**Issue**: No user interface for adding widgets to dashboard
- **Expected**: Drag-and-drop widget catalog with preview
- **Current**: Widget types defined but no UI to add them
- **Impact**: Users cannot customize their dashboards
- **Missing**:
  - Widget catalog component
  - Add widget functionality
  - Widget preview system

#### 2. Incomplete Widget Configuration
**Issue**: Widget settings and customization not fully implemented
- **Expected**: Per-widget configuration with settings panel
- **Current**: Basic config prop exists but minimal usage
- **Impact**: Limited widget customization capabilities
- **Missing**:
  - Widget settings panels
  - Configuration persistence
  - Advanced widget options

#### 3. Missing Real-time Data Updates
**Issue**: Dashboard data not updated in real-time
- **Expected**: Live data updates across all widgets
- **Current**: Manual refresh and periodic polling only
- **Impact**: Stale data and poor user experience
- **Missing**:
  - WebSocket integration
  - Real-time event system
  - Live data synchronization

### ⚠️ High Priority Gaps (Important for Beta)

#### 1. Incomplete Error Handling
**Issue**: Limited error recovery and user feedback
- **Expected**: Graceful error handling with recovery options
- **Current**: Basic error states in individual widgets
- **Impact**: Poor user experience when widgets fail
- **Missing**:
  - Global error boundary
  - Error recovery mechanisms
  - User-friendly error messages

#### 2. Missing Performance Optimization
**Issue**: No lazy loading or performance optimization
- **Expected**: Efficient widget loading and rendering
- **Current**: All widgets load simultaneously
- **Impact**: Slow dashboard performance with many widgets
- **Missing**:
  - Lazy widget loading
  - Virtual scrolling
  - Performance monitoring

#### 3. Limited Mobile Experience
**Issue**: Mobile responsiveness needs improvement
- **Expected**: Optimized mobile dashboard experience
- **Current**: Basic responsive grid but limited mobile UX
- **Impact**: Poor mobile user experience
- **Missing**:
  - Mobile-specific layouts
  - Touch-optimized interactions
  - Mobile widget variants

### 📋 Medium Priority Gaps (Enhances Beta)

#### 1. Missing Widget Marketplace
**Issue**: No system for third-party or custom widgets
- **Expected**: Extensible widget system with marketplace
- **Current**: Fixed set of built-in widgets
- **Impact**: Limited extensibility and customization
- **Missing**:
  - Widget development framework
  - Widget marketplace integration
  - Custom widget support

#### 2. Incomplete Analytics Integration
**Issue**: Limited analytics and usage tracking
- **Expected**: Comprehensive dashboard analytics
- **Current**: Basic audit logging only
- **Impact**: No insights into dashboard usage
- **Missing**:
  - Usage analytics
  - Performance metrics
  - User behavior tracking

#### 3. Missing Export Capabilities
**Issue**: No dashboard or widget data export
- **Expected**: Export dashboard layouts and data
- **Current**: No export functionality
- **Impact**: Limited data portability
- **Missing**:
  - Dashboard export/import
  - Widget data export
  - Layout sharing

## 4. Priority Assessment

### Critical (Must Complete for Beta)
1. **Implement Widget Catalog** - 4 days
2. **Complete Widget Configuration** - 3 days
3. **Add Real-time Updates** - 5 days
4. **Improve Error Handling** - 2 days

### High (Important for Beta)
1. **Performance Optimization** - 3 days
2. **Mobile Experience Enhancement** - 4 days
3. **Advanced Widget Features** - 3 days

### Medium (Enhances Beta)
1. **Widget Marketplace Framework** - 5 days
2. **Analytics Integration** - 3 days
3. **Export Capabilities** - 2 days

### Low (Future Enhancement)
1. **Advanced Customization** - 4 days
2. **Collaboration Features** - 5 days
3. **Advanced Analytics** - 3 days

## 5. Implementation Recommendations

### Phase 1: Core Functionality (Critical - 14 days)

#### 1. Implement Widget Catalog
```typescript
// src/components/dashboard/WidgetCatalog.tsx
export interface WidgetCatalogItem {
  type: WidgetType;
  title: string;
  description: string;
  icon: React.ComponentType;
  category: string;
  preview?: string;
  defaultSize: { w: number; h: number };
}

export const WidgetCatalog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { addWidget } = useDashboardStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const widgetCatalog: WidgetCatalogItem[] = [
    {
      type: 'tokenStats',
      title: 'Token Statistics',
      description: 'Display token metrics and growth analytics',
      icon: DollarSign,
      category: 'analytics',
      defaultSize: { w: 3, h: 2 }
    },
    {
      type: 'recentTokens',
      title: 'Recent Tokens',
      description: 'Show latest token activities and transactions',
      icon: Clock,
      category: 'activity',
      defaultSize: { w: 6, h: 6 }
    },
    // ... more widgets
  ];

  const handleAddWidget = (widgetType: WidgetType) => {
    addWidget(widgetType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 h-full">
          <div className="w-48 border-r pr-4">
            <h3 className="font-medium mb-2">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-2 py-1 rounded text-sm ${
                    selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {filteredWidgets.map(widget => (
                <Card key={widget.type} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <widget.icon className="h-8 w-8 text-primary mt-1" />
                      <div className="flex-1">
                        <h4 className="font-medium">{widget.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {widget.description}
                        </p>
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => handleAddWidget(widget.type)}
                        >
                          Add Widget
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// src/components/dashboard/DashboardControls.tsx
export const DashboardControls: React.FC<{ isEditing: boolean; onToggleEdit: () => void }> = ({ 
  isEditing, 
  onToggleEdit 
}) => {
  const [showCatalog, setShowCatalog] = useState(false);
  const { resetDashboard, saveDashboardLayout } = useDashboardStore();

  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant={isEditing ? "default" : "outline"}
        onClick={onToggleEdit}
      >
        {isEditing ? "Done Editing" : "Edit Dashboard"}
      </Button>
      
      {isEditing && (
        <>
          <Button
            variant="outline"
            onClick={() => setShowCatalog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
          
          <Button
            variant="outline"
            onClick={saveDashboardLayout}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
          
          <Button
            variant="destructive"
            onClick={resetDashboard}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </>
      )}
      
      <WidgetCatalog 
        isOpen={showCatalog} 
        onClose={() => setShowCatalog(false)} 
      />
    </div>
  );
};
```

#### 2. Complete Widget Configuration System
```typescript
// src/components/dashboard/WidgetSettings.tsx
export interface WidgetSettingsProps {
  widget: Widget;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Record<string, any>) => void;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({ 
  widget, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [config, setConfig] = useState(widget.config || {});

  const renderSettingsForm = () => {
    switch (widget.type) {
      case 'tokenStats':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="refreshInterval">Refresh Interval (minutes)</Label>
              <Input
                id="refreshInterval"
                type="number"
                value={config.refreshInterval || 5}
                onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="showGrowthRate">Show Growth Rate</Label>
              <Switch
                id="showGrowthRate"
                checked={config.showGrowthRate !== false}
                onCheckedChange={(checked) => setConfig({ ...config, showGrowthRate: checked })}
              />
            </div>
            <div>
              <Label htmlFor="chartType">Chart Type</Label>
              <Select
                value={config.chartType || 'bar'}
                onValueChange={(value) => setConfig({ ...config, chartType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'chartWidget':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dataSource">Data Source</Label>
              <Select
                value={config.dataSource || 'tokens'}
                onValueChange={(value) => setConfig({ ...config, dataSource: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokens">Tokens</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeRange">Time Range</Label>
              <Select
                value={config.timeRange || '7d'}
                onValueChange={(value) => setConfig({ ...config, timeRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center text-muted-foreground">
            No settings available for this widget type.
          </div>
        );
    }
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {widget.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {renderSettingsForm()}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced WidgetRenderer with settings
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, isEditing }) => {
  const { removeWidget, updateWidgetConfig } = useDashboardStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveSettings = (config: Record<string, any>) => {
    updateWidgetConfig(widget.id, config);
  };

  return (
    <>
      <Card className="h-full overflow-hidden">
        <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          {isEditing && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeWidget(widget.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 h-[calc(100%-48px)] overflow-auto">
          {renderWidgetContent()}
        </CardContent>
      </Card>
      
      <WidgetSettings
        widget={widget}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />
    </>
  );
};
```

#### 3. Add Real-time Updates
```typescript
// src/hooks/useRealTimeData.ts
export const useRealTimeData = (endpoint: string, refreshInterval: number = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let wsConnection: WebSocket | null = null;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(endpoint);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up WebSocket for real-time updates if available
    if (process.env.NEXT_PUBLIC_WS_URL) {
      wsConnection = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
      
      wsConnection.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'data_update' && message.endpoint === endpoint) {
          setData(message.data);
        }
      };

      wsConnection.onerror = () => {
        console.warn('WebSocket connection failed, falling back to polling');
        // Fall back to polling
        intervalId = setInterval(fetchData, refreshInterval);
      };
    } else {
      // Use polling if WebSocket not available
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (wsConnection) wsConnection.close();
    };
  }, [endpoint, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
};

// Enhanced TokenStatsWidget with real-time updates
export const TokenStatsWidget: React.FC<TokenStatsWidgetProps> = ({ id, config }) => {
  const refreshInterval = (config?.refreshInterval || 5) * 60 * 1000; // Convert to milliseconds
  const { data: tokens, loading, error } = useRealTimeData('/api/tokens', refreshInterval);

  // Rest of component logic...
};
```

### Phase 2: Enhanced Features (High - 10 days)

#### 1. Performance Optimization
```typescript
// src/components/dashboard/LazyWidget.tsx
export const LazyWidget: React.FC<{ widget: Widget; isEditing: boolean }> = ({ widget, isEditing }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="widget-container">
      {isVisible ? (
        <WidgetRenderer widget={widget} isEditing={isEditing} />
      ) : (
        <div className="h-full bg-muted animate-pulse rounded-md" />
      )}
    </div>
  );
};

// src/hooks/useWidgetPerformance.ts
export const useWidgetPerformance = (widgetId: string) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    errorCount: 0
  });

  const recordLoadTime = useCallback((time: number) => {
    setMetrics(prev => ({ ...prev, loadTime: time }));
  }, []);

  const recordError = useCallback(() => {
    setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
  }, []);

  return { metrics, recordLoadTime, recordError };
};
```

#### 2. Mobile Experience Enhancement
```typescript
// src/components/dashboard/MobileDashboard.tsx
export const MobileDashboard: React.FC<{ widgets: Widget[] }> = ({ widgets }) => {
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  return (
    <div className="md:hidden">
      <div className="space-y-4">
        {widgets.map(widget => (
          <Card key={widget.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setActiveWidget(activeWidget === widget.id ? null : widget.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{widget.title}</CardTitle>
                <ChevronDown 
                  className={`h-4 w-4 transition-transform ${
                    activeWidget === widget.id ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </CardHeader>
            {activeWidget === widget.id && (
              <CardContent className="pt-0">
                <WidgetRenderer widget={widget} isEditing={false} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

// Enhanced GridLayout with mobile support
export const GridLayout: React.FC<GridLayoutProps> = ({ isEditing }) => {
  const { layouts, widgets, updateLayout } = useDashboardStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileDashboard widgets={widgets} />;
  }

  // Desktop grid layout...
};
```

## 6. Testing Requirements

### Unit Tests Needed
- [ ] Dashboard store functionality
- [ ] Widget rendering and configuration
- [ ] Grid layout responsiveness
- [ ] Real-time data updates

### Integration Tests Needed
- [ ] Widget catalog and addition flow
- [ ] Dashboard save/load operations
- [ ] Backend API integration
- [ ] Mobile responsive behavior

### Performance Tests Needed
- [ ] Widget loading performance
- [ ] Dashboard with many widgets
- [ ] Real-time update efficiency
- [ ] Mobile performance

## 7. Success Criteria

### For Beta Release
- [ ] Widget catalog allowing easy widget addition
- [ ] Complete widget configuration system
- [ ] Real-time data updates across all widgets
- [ ] Responsive mobile experience
- [ ] Persistent dashboard layouts
- [ ] Error handling and recovery

### Performance Targets
- Dashboard load time: < 2 seconds
- Widget addition: < 500ms
- Real-time update latency: < 1 second
- Mobile responsiveness: All breakpoints working

---

**Analysis Date**: January 2025  
**Estimated Total Effort**: 34 days  
**Critical Path**: Widget Catalog → Configuration → Real-time Updates  
**Risk Level**: Low (solid foundation exists, mainly UI enhancements needed)