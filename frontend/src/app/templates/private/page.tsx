"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivateTemplatesPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login?redirect=templates/private');
    } else {
      router.push('/dashboard?tab=templates');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
    </div>
  );
}
