'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const handleTabChange = (value: string) => {
    if (value === 'billing') {
      router.push('/dashboard/settings/billing');
    } else if (value === 'account') {
      router.push('/dashboard/settings/account');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">
          Manage your application preferences and account
        </p>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        value={getActiveTab()}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
