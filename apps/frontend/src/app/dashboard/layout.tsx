'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, EspConnection } from '@/lib/api';
import { Menu, Plus, Settings, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const providerNames: Record<string, string> = {
  kit: 'Kit',
  beehiiv: 'beehiiv',
  mailchimp: 'Mailchimp',
};

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header with Connect ESP button */}
      <div className="p-4 border-b">
        <Link href="/onboarding">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Connect New ESP
          </Button>
        </Link>
      </div>

      {/* ESP Connections List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
            ESP Connections
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
              No ESP connections yet
            </div>
          ) : (
            connections.map((connection) => {
              const isActive = pathname === `/dashboard/esp/${connection.id}`;
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
                        {providerNames[connection.espType] ||
                          connection.espType}
                      </div>
                      <div
                        className={cn(
                          'text-xs truncate',
                          isActive
                            ? 'text-primary/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {connection.publicationId}
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
      <main className="flex-1 md:ml-64">{children}</main>
    </div>
  );
}
