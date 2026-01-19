'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { Menu, Plus, Settings, Database, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionWarningBanner } from '@/components/subscription-warning-banner';
const providerNames = {
  kit: 'Kit',
  beehiiv: 'beehiiv',
  mailchimp: 'Mailchimp',
};
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const [connections, setConnections] = useState([]);
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
    return _jsxs('div', {
      className: 'flex flex-col h-full',
      children: [
        _jsx('div', {
          className: 'p-4 border-b',
          children: _jsx(Link, {
            href: '/dashboard',
            onClick: () => setMobileOpen(false),
            children: _jsxs('div', {
              className: cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                isDashboardActive
                  ? 'bg-primary/10 border-l-4 border-primary text-primary font-medium'
                  : 'hover:bg-accent'
              ),
              children: [
                _jsx(LayoutDashboard, { className: 'h-4 w-4' }),
                _jsx('span', { className: 'text-sm', children: 'Dashboard' }),
              ],
            }),
          }),
        }),
        _jsx('div', {
          className: 'flex-1 overflow-y-auto p-4',
          children: _jsxs('div', {
            className: 'space-y-1',
            children: [
              _jsxs('div', {
                className: 'px-3 py-2 flex items-center justify-between',
                children: [
                  _jsx('div', {
                    className: 'text-sm font-semibold text-muted-foreground',
                    children: 'Connections',
                  }),
                  _jsx(Link, {
                    href: '/dashboard/esp/new',
                    children: _jsxs(Button, {
                      variant: 'secondary',
                      size: 'sm',
                      className: 'h-7',
                      children: [
                        _jsx(Plus, { className: 'h-3 w-3 mr-1' }),
                        'New',
                      ],
                    }),
                  }),
                ],
              }),
              loading
                ? _jsx('div', {
                    className: 'space-y-2',
                    children: [1, 2, 3].map((i) =>
                      _jsx(
                        'div',
                        {
                          className: 'h-10 bg-secondary rounded animate-pulse',
                        },
                        i
                      )
                    ),
                  })
                : connections.length === 0
                  ? _jsx('div', {
                      className: 'px-3 py-4 text-sm text-muted-foreground',
                      children: 'No connections yet',
                    })
                  : connections.map((connection) => {
                      const isActive =
                        pathname === `/dashboard/esp/${connection.id}`;
                      return _jsx(
                        Link,
                        {
                          href: `/dashboard/esp/${connection.id}`,
                          onClick: () => setMobileOpen(false),
                          children: _jsxs('div', {
                            className: cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                              isActive
                                ? 'bg-primary/10 border-l-4 border-primary text-primary font-medium'
                                : 'hover:bg-accent'
                            ),
                            children: [
                              _jsx(Database, { className: 'h-4 w-4' }),
                              _jsxs('div', {
                                className: 'flex-1 truncate',
                                children: [
                                  _jsx('div', {
                                    className: 'text-sm truncate',
                                    children:
                                      providerNames[connection.espType] ||
                                      connection.espType,
                                  }),
                                  _jsx('div', {
                                    className: cn(
                                      'text-xs truncate',
                                      isActive
                                        ? 'text-primary/70'
                                        : 'text-muted-foreground'
                                    ),
                                    children: connection.publicationId,
                                  }),
                                ],
                              }),
                            ],
                          }),
                        },
                        connection.id
                      );
                    }),
            ],
          }),
        }),
        _jsx(Separator, {}),
        _jsx('div', {
          className: 'p-4',
          children: _jsx(Link, {
            href: '/dashboard/settings',
            children: _jsxs(Button, {
              variant: 'ghost',
              className: 'w-full justify-start',
              onClick: () => setMobileOpen(false),
              children: [
                _jsx(Settings, { className: 'h-4 w-4 mr-2' }),
                'Settings',
              ],
            }),
          }),
        }),
      ],
    });
  };
  return _jsxs('div', {
    className: 'flex min-h-screen',
    children: [
      _jsx('aside', {
        className:
          'hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background',
        children: _jsx(SidebarContent, {}),
      }),
      _jsxs(Sheet, {
        open: mobileOpen,
        onOpenChange: setMobileOpen,
        children: [
          _jsx(SheetTrigger, {
            asChild: true,
            children: _jsx(Button, {
              variant: 'outline',
              size: 'icon',
              className: 'md:hidden fixed top-4 left-4 z-40',
              children: _jsx(Menu, { className: 'h-5 w-5' }),
            }),
          }),
          _jsx(SheetContent, {
            side: 'left',
            className: 'w-64 p-0',
            children: _jsx(SidebarContent, {}),
          }),
        ],
      }),
      _jsxs('main', {
        className: 'flex-1 md:ml-64',
        children: [
          _jsx('div', {
            className: 'p-6 pb-0',
            children: _jsx(SubscriptionWarningBanner, {}),
          }),
          children,
        ],
      }),
    ],
  });
}
