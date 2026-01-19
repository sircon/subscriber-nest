'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, EspConnection } from '@/lib/api';
import { Menu, Plus, Settings, Database, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionWarningBanner } from '@/components/subscription-warning-banner';
import { getEspName, EspType } from '@/lib/esp-config';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const [connections, setConnections] = useState<EspConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await espConnectionApi.getUserConnections(token, () => {
          router.push('/login');
        });
        setConnections(data);
      } catch (err) {
        console.error('Failed to fetch connections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [token, router]);

  const SidebarContent = () => {
    const isDashboardActive = pathname === '/dashboard';

    return (
      <div className="flex flex-col h-full">
        {/* Dashboard Navigation Item */}
        <div className="p-4 border-b">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                isDashboardActive
                  ? 'bg-primary/10 border-l-4 border-primary text-primary font-medium'
                  : 'hover:bg-accent'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </div>
          </Link>
        </div>

        {/* ESP Connections List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-muted-foreground">
                Connections
              </div>
              <Link href="/dashboard/esp/new">
                <Button variant="secondary" size="sm" className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-secondary rounded animate-pulse"
                  />
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No connections yet
              </div>
            ) : (
              connections.map((connection) => {
                const isActive = pathname === `/dashboard/esp/${connection.id}`;
                
                // Helper function to get list names for display (with fallback to IDs)
                const getListNames = (): string[] => {
                  if (connection.listNames && connection.listNames.length > 0) {
                    return connection.listNames;
                  }
                  // Fallback to IDs if names not available
                  if (connection.publicationIds && connection.publicationIds.length > 0) {
                    return connection.publicationIds;
                  }
                  if (connection.publicationId) {
                    return [connection.publicationId];
                  }
                  return [];
                };

                // Helper function to format list names for display
                const formatListNames = (listNames: string[]): string => {
                  if (listNames.length === 0) return 'No lists';
                  if (listNames.length === 1) return listNames[0];
                  if (listNames.length <= 2) return listNames.join(', ');
                  return `${listNames.length} lists`;
                };

                const listNames = getListNames();
                const listDisplay = formatListNames(listNames);
                const espDisplayName = getEspName(connection.espType as EspType);

                return (
                  <Link
                    key={connection.id}
                    href={`/dashboard/esp/${connection.id}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                        isActive
                          ? 'bg-primary/10 border-l-4 border-primary text-primary font-medium'
                          : 'hover:bg-accent'
                      )}
                    >
                      <Database className="h-4 w-4" />
                      <div className="flex-1 truncate">
                        <div className="text-sm truncate">
                          {espDisplayName}
                        </div>
                        <div
                          className={cn(
                            'text-xs truncate',
                            isActive
                              ? 'text-primary/70'
                              : 'text-muted-foreground'
                          )}
                        >
                          {listDisplay}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <Separator />

        {/* Settings Button */}
        <div className="p-4">
          <Link href="/dashboard/settings">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setMobileOpen(false)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64">
        <div className="p-6 pb-0">
          <SubscriptionWarningBanner />
        </div>
        {children}
      </main>
    </div>
  );
}
