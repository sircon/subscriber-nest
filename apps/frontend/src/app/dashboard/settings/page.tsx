'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to billing settings by default
    router.replace('/dashboard/settings/billing');
  }, [router]);

  return null;
}
