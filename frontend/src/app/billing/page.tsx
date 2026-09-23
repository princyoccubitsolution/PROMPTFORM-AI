"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, CreditCard, Calendar, FileText, CheckCircle2, ShieldCheck, Download, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { SiteHeader } from '@/components/SiteHeader';
import { useTheme } from 'next-themes';

export default function BillingPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login?redirect=billing');
      return;
    }

    async function loadBillingData() {
      try {
        setIsLoading(true);
        // Fetch current user details
        const userData = await api.get('/auth/me');
        setProfile(userData);

        // Fetch transaction history
        const txData = await api.get('/auth/transactions');
        setTransactions(txData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load billing information.');
      } finally {
        setIsLoading(false);
      }
    }

    loadBillingData();
  }, [router]);

  // Invoice downloader identical to the premium printed invoice structure
  const handlePrintInvoice = (txn: any) => {
    const startDate = new Date(txn.createdAt);
    const endDate = new Date(txn.createdAt);
    if (txn.billingPeriod === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    const formattedStart = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedEnd = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let methodDisplay = txn.paymentMethod.toUpperCase();
    if (txn.paymentMethod === 'card') {
      methodDisplay = 'Credit Card (Visa ending in **** 4111)';
    } else if (txn.paymentMethod === 'upi') {
      methodDisplay = 'UPI (Simulated Mobile QR Payment)';
    } else if (txn.paymentMethod === 'paypal') {
      methodDisplay = 'PayPal Express Gate Checkout';
    }

    const invoiceDate = startDate.toLocaleDateString();
    const txnCurrency = txn.currency || 'USD';
    
    const getInvoiceCost = (curr: string, billing: string) => {
      if (curr === 'INR') return billing === 'yearly' ? { original: '₹9,588.00', discount: '₹4,794.00', symbol: '₹' } : { original: '₹999.00', discount: '₹499.50', symbol: '₹' };
      if (curr === 'EUR') return billing === 'yearly' ? { original: '€168.00', discount: '€84.00', symbol: '€' } : { original: '€18.00', discount: '€9.00', symbol: '€' };
      if (curr === 'GBP') return billing === 'yearly' ? { original: '£144.00', discount: '£72.00', symbol: '£' } : { original: '£16.00', discount: '£8.05', symbol: '£' };
      return billing === 'yearly' ? { original: '$180.00', discount: '$90.00', symbol: '$' } : { original: '$19.00', discount: '$9.50', symbol: '$' };
    };

    const costDetails = getInvoiceCost(txnCurrency, txn.billingPeriod);
    const txnSymbol = costDetails.symbol;
    const originalCost = costDetails.original;
    const amountPaid = `${txnSymbol}${parseFloat(txn.amount).toFixed(2)}`;
    const discountAmount = txn.couponCode
      ? costDetails.discount
      : `${txnSymbol}0.00`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - PromptForm AI</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1f2937; line-height: 1.5; background-color: #ffffff; -webkit-print-color-adjust: exact; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f3f4f6; padding-bottom: 30px; align-items: flex-start; }
            .logo { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.025em; }
            .invoice-details { text-align: right; font-size: 11px; color: #4b5563; line-height: 1.6; }
            .invoice-title { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 8px; }
            .paid-badge { display: inline-block; font-size: 9px; font-weight: 800; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.05em; }
            .section { margin-top: 45px; font-size: 12px; display: flex; justify-content: space-between; }
            .billing-col { width: 45%; }
            .section strong { color: #6b7280; font-weight: 700; font-size: 10px; text-transform: uppercase; tracking-wider; display: block; margin-bottom: 8px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 35px; }
            .table th, .table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: left; font-size: 13px; }
            .table th { background-color: #f9fafb; font-weight: 700; color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            .table td { color: #374151; }
            .totals { width: 40%; margin-left: auto; margin-top: 40px; font-size: 13px; line-height: 2; border-top: 2px solid #f3f4f6; padding-top: 15px; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; color: #4b5563; }
            .total-bold { font-weight: 800; font-size: 18px; color: #111827; border-top: 1px solid #f3f4f6; padding-top: 12px; margin-top: 8px; font-family: 'JetBrains Mono', monospace; }
            .barcode-container { margin-top: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border-top: 1px dashed #e5e7eb; padding-top: 30px; }
            .barcode-lines { display: flex; gap: 2.5px; height: 32px; width: 160px; justify-content: center; }
            .barcode-line { height: 100%; background-color: #1f2937; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #9ca3af; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">PromptForm AI Inc.</div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 4px; font-weight: 600;">San Francisco, CA, USA</div>
              <div class="paid-badge">PAID • SECURE</div>
            </div>
            <div class="invoice-details">
              <div class="invoice-title">RECEIPT</div>
              Invoice No: <strong>${txn.receiptNumber}</strong><br/>
              Date: ${invoiceDate}<br/>
              Payment Method: ${methodDisplay}
            </div>
          </div>

          <div class="section">
            <div class="billing-col">
              <strong>Billed To</strong>
              ${localStorage.getItem('promptform_user_name') || 'Valued Customer'}<br/>
              ${localStorage.getItem('promptform_user_email') || 'user@promptform.ai'}
            </div>
            <div class="billing-col" style="text-align: right;">
              <strong>Subscription Coverage</strong>
              Coverage Period: ${formattedStart} to ${formattedEnd}<br/>
              Plan Tier: Pro Studio (${txn.billingPeriod === 'yearly' ? 'Annual' : 'Monthly'})
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Cycle</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 600;">Pro Studio Plan Subscription Upgrade</td>
                <td>${txn.billingPeriod === 'yearly' ? 'Annual' : 'Monthly'}</td>
                <td style="text-align: right; font-weight: 600;">${originalCost}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${originalCost}</span>
            </div>
            ${txn.couponCode ? `
            <div class="totals-row" style="color: #059669; font-weight: 600;">
              <span>Promo Code Applied (${txn.couponCode}):</span>
              <span>- ${discountAmount}</span>
            </div>
            ` : ''}
            <div class="totals-row total-bold">
              <span>Total Paid:</span>
              <span>${amountPaid}</span>
            </div>
          </div>

          <div class="barcode-container">
            <div class="barcode-lines">
              <div class="barcode-line" style="width: 2px;"></div>
              <div class="barcode-line" style="width: 4px;"></div>
              <div class="barcode-line" style="width: 1px;"></div>
              <div class="barcode-line" style="width: 3px;"></div>
              <div class="barcode-line" style="width: 1px;"></div>
              <div class="barcode-line" style="width: 5px;"></div>
              <div class="barcode-line" style="width: 2px;"></div>
              <div class="barcode-line" style="width: 1px;"></div>
              <div class="barcode-line" style="width: 4px;"></div>
              <div class="barcode-line" style="width: 2px;"></div>
              <div class="barcode-line" style="width: 3px;"></div>
              <div class="barcode-line" style="width: 1px;"></div>
              <div class="barcode-line" style="width: 5px;"></div>
            </div>
            <div style="font-size: 8px; font-family: 'JetBrains Mono', monospace; color: #9ca3af; font-weight: 700; letter-spacing: 0.1em;">
              TXN-${txn.receiptNumber}-SECURE
            </div>
          </div>

          <div class="footer">
            Thank you for upgrading to PromptForm PRO! If you have any billing questions, contact billing@promptform.ai.<br/>
            PromptForm AI Inc. &copy; 2026. All rights reserved.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-primary"></div>
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Loading subscription profiles...</span>
        </div>
      </div>
    );
  }

  // Get active subscription dates from the latest success transaction
  const latestTx = transactions.find((tx) => tx.status === 'success');
  
  let subStartDate = 'N/A';
  let subEndDate = 'N/A';
  let cycleText = 'Free Trial';
  let billingCost = '$0.00';
  let payMethodText = 'None';

  if (latestTx) {
    const start = new Date(latestTx.createdAt);
    const end = new Date(latestTx.createdAt);
    const getSymbol = (curr: string) => {
      if (curr === 'INR') return '₹';
      if (curr === 'EUR') return '€';
      if (curr === 'GBP') return '£';
      return '$';
    };
    const latestSymbol = getSymbol(latestTx.currency);
    if (latestTx.billingPeriod === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
      cycleText = 'Billed Annually';
      billingCost = `${latestSymbol}${parseFloat(latestTx.amount).toFixed(2)}/Yr`;
    } else {
      end.setDate(end.getDate() + 30);
      cycleText = 'Billed Monthly';
      billingCost = `${latestSymbol}${parseFloat(latestTx.amount).toFixed(2)}/Mo`;
    }
    subStartDate = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    subEndDate = end.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (latestTx.paymentMethod === 'card') {
      payMethodText = 'Visa Card ending in •••• 4111';
    } else if (latestTx.paymentMethod === 'upi') {
      payMethodText = 'UPI Scanner (GooglePay/Paytm)';
    } else if (latestTx.paymentMethod === 'paypal') {
      payMethodText = 'PayPal Gateway Account';
    }
  }

  const isPro = profile?.subscriptionPlan === 'pro' || profile?.subscriptionPlan === 'enterprise';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-200">
      <SiteHeader />
      <div className="flex-1 p-6 md:p-12 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border dark:border-border pb-5">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-card dark:bg-card border border-border dark:border-border hover:bg-accent dark:hover:bg-accent transition-all cursor-pointer text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-foreground">Billing & Subscriptions</h1>
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground uppercase tracking-widest font-bold mt-0.5">Manage plan details and transaction invoices</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SSL SECURE PAYMENTS</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-sm font-semibold text-left">
            {error}
          </div>
        )}

        {/* Current Active Plan Status */}
        <div className="grid md:grid-cols-12 gap-6">
          <div className={`md:col-span-8 bg-card dark:bg-card/40 border border-border dark:border-border rounded-3xl p-6 relative overflow-hidden backdrop-blur-md transition-all duration-200 ${
            isPro ? 'border-l-4 border-l-primary shadow-sm' : ''
          }`}>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border dark:border-border pb-5">
              <div className="text-left space-y-1">
                <span className="text-[9px] bg-primary/10 text-primary font-bold uppercase px-2 py-0.5 rounded-lg border border-primary/20">
                  Current Tier
                </span>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 text-foreground dark:text-foreground">
                  {profile?.subscriptionPlan?.toUpperCase() === 'FREE' ? 'Free Starter Plan' : 'Pro Studio Plan'}
                  {isPro && <Sparkles className="w-5 h-5 text-primary dark:text-primary animate-pulse" />}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-wider block">Billing Sum</span>
                <span className="text-xl font-bold text-primary dark:text-primary">{isPro ? billingCost : '$0.00 / Free'}</span>
              </div>
            </div>

            {/* Plan coverage parameters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 text-left">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Start Date</span>
                </span>
                <p className="text-sm font-bold text-foreground dark:text-foreground">{isPro ? subStartDate : 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Expiry Date</span>
                </span>
                <p className="text-sm font-bold text-foreground dark:text-foreground">{isPro ? subEndDate : 'Unlimited'}</p>
              </div>

              <div className="space-y-1 col-span-2 md:col-span-1">
                <span className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Payment Mode</span>
                </span>
                <p className="text-sm font-bold text-foreground dark:text-foreground truncate">{isPro ? payMethodText : 'None'}</p>
              </div>
            </div>

            {isPro && (
              <div className="mt-6 flex items-center space-x-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold text-left shadow-[0_2px_10px_rgba(16,185,129,0.02)] animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Your subscription is active and in good standing. Expiry updates automatically upon renewal.</span>
              </div>
            )}
          </div>

          <div className="md:col-span-4 bg-card dark:bg-card/40 border border-border dark:border-border rounded-3xl p-6 flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-md">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">AI Generation Credits</h3>
              <div className="space-y-1">
                <div className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">{profile?.credits}</div>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold">Credits remain valid forever and reset dynamically on renewal.</p>
              </div>
            </div>

            {!isPro && (
              <Button
                onClick={() => router.push('/dashboard?action=upgrade')}
                className="w-full mt-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm flex items-center justify-center space-x-1 transition-all active:scale-[0.97]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade to PRO Plan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Transaction History Log Table */}
        <div className="bg-card dark:bg-card/40 border border-border dark:border-border rounded-3xl p-6 backdrop-blur-md text-left">
          <div className="border-b border-border dark:border-border pb-4 mb-4">
            <h3 className="text-sm font-bold text-foreground dark:text-foreground tracking-tight">Receipt & Invoice History</h3>
            <p className="text-[9px] text-muted-foreground dark:text-muted-foreground font-bold uppercase mt-0.5">Click download icon to retrieve full business PDF receipts</p>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-bold uppercase tracking-wider space-y-2">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground opacity-60" />
              <p>No billing transactions found inside database logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-muted-foreground border-b border-border dark:border-border uppercase tracking-wider font-bold">
                    <th className="pb-3 font-bold text-[10px]">Billing Date</th>
                    <th className="pb-3 font-bold text-[10px] hidden md:table-cell">Receipt No.</th>
                    <th className="pb-3 font-bold text-[10px]">Tier Plan</th>
                    <th className="pb-3 font-bold text-[10px] hidden sm:table-cell">Method</th>
                    <th className="pb-3 font-bold text-[10px] text-right">Paid sum</th>
                    <th className="pb-3 font-bold text-[10px] text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border font-semibold text-foreground dark:text-foreground">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent dark:hover:bg-accent/20 transition-colors">
                      <td className="py-3.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3.5 font-mono text-[10px] text-muted-foreground dark:text-muted-foreground hidden md:table-cell">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-3.5">
                        <span className="capitalize">{tx.plan}</span>
                        <span className="text-[9px] text-muted-foreground ml-1.5 uppercase">
                          ({tx.billingPeriod === 'yearly' ? 'Annual' : 'Monthly'})
                        </span>
                      </td>
                      <td className="py-3.5 capitalize text-muted-foreground dark:text-muted-foreground hidden sm:table-cell">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3.5 text-right font-bold text-foreground dark:text-foreground font-mono">
                        {(() => {
                          if (tx.currency === 'INR') return '₹';
                          if (tx.currency === 'EUR') return '€';
                          if (tx.currency === 'GBP') return '£';
                          return '$';
                        })()}{parseFloat(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handlePrintInvoice(tx)}
                          className="p-1.5 rounded-lg bg-card dark:bg-card border border-border dark:border-border hover:bg-accent dark:hover:bg-accent text-primary dark:text-primary hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                          title="Print Receipt"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
