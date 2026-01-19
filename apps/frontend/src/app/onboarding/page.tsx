'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { espConfigs, type EspType } from '@/lib/esp-config';

export default function OnboardingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [checkingConnections, setCheckingConnections] = useState(true);

  useEffect(() => {
    const checkExistingConnections = async () => {
      if (!token) {
        setCheckingConnections(false);
        return;
      }

      try {
        const connections = await espConnectionApi.getUserConnections(
          token,
          () => {
            // Handle 401: redirect to login
            router.push('/login');
          }
        );

        // If user already has connections, skip to Stripe step
        if (connections.length > 0) {
          router.push('/onboarding/stripe');
          return;
        }
      } catch (err) {
        // If there's an error, just show the provider selection
        console.error('Failed to check existing connections:', err);
      }

      setCheckingConnections(false);
    };

    checkExistingConnections();
  }, [token, router]);

  const handleProviderSelect = (provider: EspType) => {
    router.push(`/onboarding/api-key?provider=${provider}`);
  };

  // Show loading state while checking for existing connections
  if (checkingConnections) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-secondary rounded w-2/3 mx-auto mb-4"></div>
              <div className="h-4 bg-secondary rounded w-1/2 mx-auto"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="animate-pulse">
                    <div className="h-6 bg-secondary rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="h-10 bg-secondary rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2">
            Select your email service provider
          </h1>
          <p className="text-muted-foreground">
            Choose the provider you use to manage your email subscribers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {espConfigs.map((provider) => {
            return (
              <Card
                key={provider.id}
                className="cursor-pointer hover:border-primary transition-colors group"
                onClick={() => handleProviderSelect(provider.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{provider.name}</CardTitle>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProviderSelect(provider.id);
                    }}
                  >
                    Select {provider.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
