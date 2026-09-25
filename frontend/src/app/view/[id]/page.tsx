"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ViewFormRedirect() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  useEffect(() => {
    if (formId) {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(`/f/${formId}${search}`);
    }
  }, [formId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        <span className="text-xs text-muted-foreground font-medium">Opening form...</span>
      </div>
    </div>
  );
}
