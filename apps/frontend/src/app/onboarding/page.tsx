'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Provider = 'kit' | 'beehiiv' | 'mailchimp';

const providers: { id: Provider; name: string; description: string }[] = [
  {
    id: 'kit',
    name: 'Kit',
    description: 'Connect your Kit account to sync subscribers',
  },
  {
    id: 'beehiiv',
    name: 'beehiiv',
    description: 'Connect your beehiiv account to sync subscribers',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Connect your Mailchimp account to sync subscribers',
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const handleProviderSelect = (provider: Provider) => {
    router.push(`/onboarding/api-key?provider=${provider}`);
  };

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleProviderSelect(provider.id)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{provider.name}</CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent>
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
          ))}
        </div>
      </div>
    </div>
  );
}
