'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
export default function SettingsLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === '/dashboard/settings/billing') {
      return 'billing';
    }
    if (pathname === '/dashboard/settings/account') {
      return 'account';
    }
    // Default to billing if on base settings page
    return 'billing';
  };
  const handleTabChange = (value) => {
    if (value === 'billing') {
      router.push('/dashboard/settings/billing');
    } else if (value === 'account') {
      router.push('/dashboard/settings/account');
    }
  };
  return _jsxs('div', {
    className: 'p-8',
    children: [
      _jsxs('div', {
        className: 'mb-6',
        children: [
          _jsx('h1', { className: 'text-3xl font-bold', children: 'Settings' }),
          _jsx('p', {
            className: 'text-gray-600',
            children: 'Manage your application preferences and account',
          }),
        ],
      }),
      _jsx(Tabs, {
        value: getActiveTab(),
        onValueChange: handleTabChange,
        className: 'w-full',
        children: _jsxs(TabsList, {
          className: 'mb-6',
          children: [
            _jsx(TabsTrigger, { value: 'billing', children: 'Billing' }),
            _jsx(TabsTrigger, { value: 'account', children: 'Account' }),
          ],
        }),
      }),
      _jsx('div', { className: 'mt-6', children: children }),
    ],
  });
}
