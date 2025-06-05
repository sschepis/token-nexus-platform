import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Database, 
  Globe, 
  Server, 
  Users, 
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface AppFooterProps {
  className?: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ className = '' }) => {
  const { user, orgId, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  
  // Get current time
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // Determine connection status (simplified - could be enhanced with actual connectivity checks)
  const isOnline = navigator.onLine;
  
  // Parse server status (could be enhanced with actual health checks)
  const parseServerStatus = 'Connected';

  return (
    <footer className={`
      fixed bottom-0 left-0 right-0 z-50
      bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
      border-t border-border
      px-4 py-2
      flex items-center justify-between
      text-xs text-muted-foreground
      ${className}
    `}>
      {/* Left section - User and Organization info */}
      <div className="flex items-center gap-3">
        {isAuthenticated && user && (
          <>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{user.firstName} {user.lastName}</span>
            </div>
            
            <Separator orientation="vertical" className="h-4" />
            
            {currentOrg && (
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>{currentOrg.name}</span>
                {currentOrg.status && currentOrg.status !== 'Active' && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    {currentOrg.status}
                  </Badge>
                )}
              </div>
            )}
            
            {orgId && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground/70">Org ID:</span>
                  <code className="text-xs bg-muted px-1 rounded">{orgId}</code>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Center section - System status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Server className="h-3 w-3" />
          <span>Parse: {parseServerStatus}</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <div className="flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 text-green-600" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-red-600" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Right section - Time and environment info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          <span>{process.env.NODE_ENV || 'development'}</span>
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{currentTime}</span>
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;