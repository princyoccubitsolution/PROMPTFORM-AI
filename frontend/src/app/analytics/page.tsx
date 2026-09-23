"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsRootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login?redirect=analytics');
    } else {
      router.push('/dashboard?tab=analytics');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );
}
