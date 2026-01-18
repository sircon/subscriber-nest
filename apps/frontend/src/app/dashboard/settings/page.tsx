'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type SettingsSection = 'general' | 'billing' | 'account';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure your general application preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  General settings will be available here in a future update.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Coming soon:</span> Notification preferences, language settings, and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'billing':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Billing features are not yet available.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Coming soon:</span> Subscription plans, payment methods, billing history, and invoices.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'account':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Account settings will be available here in a future update.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Coming soon:</span> Profile information, password change, email preferences, and account deletion.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your application preferences and account</p>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Settings Navigation Menu */}
        <div className="w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Menu</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <Button
                  variant={activeSection === 'general' ? 'secondary' : 'ghost'}
                  className="justify-start rounded-none"
                  onClick={() => setActiveSection('general')}
                >
                  General
                </Button>
                <Separator />
                <Button
                  variant={activeSection === 'billing' ? 'secondary' : 'ghost'}
                  className="justify-start rounded-none"
                  onClick={() => setActiveSection('billing')}
                >
                  Billing
                </Button>
                <Separator />
                <Button
                  variant={activeSection === 'account' ? 'secondary' : 'ghost'}
                  className="justify-start rounded-none"
                  onClick={() => setActiveSection('account')}
                >
                  Account
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
