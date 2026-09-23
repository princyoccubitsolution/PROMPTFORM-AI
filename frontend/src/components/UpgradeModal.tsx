import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Clock, CheckCircle2, X, ShieldAlert, CreditCard, Lock, ShieldCheck, FileText, Check, ArrowRight, Smartphone, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '@/lib/api';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  restriction: {
    reason: 'LIMIT_REACHED' | 'TRIAL_EXPIRED';
    message: string;
    plan: string;
  } | null;
  currency?: 'USD' | 'INR' | 'EUR' | 'GBP';
}

export function UpgradeModal({ isOpen, onClose, onSuccess, restriction, currency = 'USD' }: UpgradeModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment states
  const [paymentStep, setPaymentStep] = useState<'benefits' | 'checkout' | 'otp' | 'success'>('benefits');
  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'paypal'>('card');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP'>('USD');
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    if (currency) {
      setActiveCurrency(currency);
    }
  }, [currency]);

  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  
  // UPI QR Code countdown timer
  const [upiTimer, setUpiTimer] = useState(300); // 5 minutes

  // Promo code states
  const [couponCode, setCouponCode] = useState('');
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // UPI Countdown timer hook
  useEffect(() => {
    if (!isOpen || activeTab !== 'upi' || paymentStep !== 'checkout' || upiTimer <= 0) return;
    const interval = setInterval(() => {
      setUpiTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, paymentStep, upiTimer]);

  const formatUpiTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  // Formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 4);
    let formatted = value.length >= 3 ? `${value.slice(0, 2)}/${value.slice(2)}` : value;
    setCardExpiry(formatted);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 3);
    setCardCvc(value);
  };

  // Promo Code validator
  const handleApplyCoupon = async () => {
    setCouponError(null);
    setIsValidatingCoupon(true);
    try {
      const cleanCode = couponCode.trim().toUpperCase();
      const res = await api.post('/auth/coupons/validate', { code: cleanCode });
      if (res.success) {
        setIsCouponApplied(true);
        setCouponDiscount(res.discountPercent);
      } else {
        setCouponError(res.error || 'Invalid or inactive coupon.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Coupon verification failed.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Pricing calculations
  const getCurrencySymbol = (curr: string) => {
    if (curr === 'INR') return '₹';
    if (curr === 'EUR') return '€';
    if (curr === 'GBP') return '£';
    return '$';
  };
  const getBasePrice = (curr: string, cycle: 'monthly' | 'yearly') => {
    if (curr === 'INR') return cycle === 'yearly' ? 799 : 999;
    if (curr === 'EUR') return cycle === 'yearly' ? 14 : 18;
    if (curr === 'GBP') return cycle === 'yearly' ? 12 : 16;
    return cycle === 'yearly' ? 15 : 19;
  };

  const currencySymbol = getCurrencySymbol(activeCurrency);
  const basePrice = getBasePrice(activeCurrency, billingCycle);
  const discountMultiplier = isCouponApplied ? (100 - couponDiscount) / 100 : 1;
  const finalPrice = basePrice * discountMultiplier;
  const totalBilled = billingCycle === 'yearly' ? finalPrice * 12 : finalPrice;

  // Dynamic subscription period preview
  const startPreview = new Date();
  const endPreview = new Date();
  if (billingCycle === 'yearly') {
    endPreview.setFullYear(endPreview.getFullYear() + 1);
  } else {
    endPreview.setDate(endPreview.getDate() + 30);
  }
  const formattedStartPrev = startPreview.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedEndPrev = endPreview.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Initialize Payment -> opens OTP screen
  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvc) {
      setError('Please fill in all card details.');
      return;
    }
    setError(null);
    setIsUpgrading(true);
    setTimeout(() => {
      setIsUpgrading(false);
      setPaymentStep('otp');
    }, 1000);
  };

  // OTP Verification -> calls backend API and completes upgrade
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!otpCode) {
      setOtpError('Please enter the 4-digit code.');
      return;
    }

    setIsUpgrading(true);
    try {
      // Call mock upgrade API endpoint with payment parameters
      const res = await api.post('/auth/upgrade', {
        plan: 'pro',
        billingPeriod: billingCycle,
        amount: totalBilled.toFixed(2),
        currency: activeCurrency,
        paymentMethod: 'card',
        couponCode: isCouponApplied ? couponCode : null
      });
      
      // Store the new tokens which contain the updated "pro" subscription plan
      if (res.accessToken) localStorage.setItem('promptform_access_token', res.accessToken);
      if (res.refreshToken) localStorage.setItem('promptform_refresh_token', res.refreshToken);
      if (res.user) {
        localStorage.setItem('promptform_user_name', res.user.name || '');
        localStorage.setItem('promptform_user_email', res.user.email || '');
      }

      setTransactionData(res.transaction);
      setPaymentStep('success');
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setOtpError(err.message || 'Upgrade failed. Please check network and try again.');
      setIsUpgrading(false);
    }
  };

  // UPI payment simulation trigger
  const handleUpiPaySimulation = async () => {
    setError(null);
    setIsUpgrading(true);
    try {
      const res = await api.post('/auth/upgrade', {
        plan: 'pro',
        billingPeriod: billingCycle,
        amount: totalBilled.toFixed(2),
        currency: activeCurrency,
        paymentMethod: 'upi',
        couponCode: isCouponApplied ? couponCode : null
      });

      if (res.accessToken) localStorage.setItem('promptform_access_token', res.accessToken);
      if (res.refreshToken) localStorage.setItem('promptform_refresh_token', res.refreshToken);
      
      setTransactionData(res.transaction);
      setPaymentStep('success');
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // PayPal payment simulation trigger
  const handlePayPalSimulation = async () => {
    setError(null);
    setIsUpgrading(true);
    try {
      const res = await api.post('/auth/upgrade', {
        plan: 'pro',
        billingPeriod: billingCycle,
        amount: totalBilled.toFixed(2),
        currency: activeCurrency,
        paymentMethod: 'paypal',
        couponCode: isCouponApplied ? couponCode : null
      });

      if (res.accessToken) localStorage.setItem('promptform_access_token', res.accessToken);
      if (res.refreshToken) localStorage.setItem('promptform_refresh_token', res.refreshToken);

      setTransactionData(res.transaction);
      setPaymentStep('success');
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'PayPal simulation failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Invoice downloader using live database transaction data
  const handleDownloadInvoice = () => {
    const txn = transactionData || {
      receiptNumber: 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      createdAt: new Date(),
      plan: 'pro',
      billingPeriod: billingCycle,
      amount: totalBilled,
      currency: activeCurrency,
      paymentMethod: activeTab,
      couponCode: isCouponApplied ? couponCode : null
    };

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
    const txnCurrency = txn.currency || activeCurrency;
    
    const getInvoiceCost = (curr: string, billing: string) => {
      if (curr === 'INR') return billing === 'yearly' ? { original: '₹9,588.00', discount: '₹4,794.00', symbol: '₹' } : { original: '₹999.00', discount: '₹499.50', symbol: '₹' };
      if (curr === 'EUR') return billing === 'yearly' ? { original: '€168.00', discount: '€84.00', symbol: '€' } : { original: '€18.00', discount: '€9.00', symbol: '€' };
      if (curr === 'GBP') return billing === 'yearly' ? { original: '£144.00', discount: '£72.00', symbol: '£' } : { original: '£16.00', discount: '£8.00', symbol: '£' };
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

  const handleClose = () => {
    setPaymentStep('benefits');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvc('');
    setCouponCode('');
    setIsCouponApplied(false);
    setOtpCode('');
    setIsSuccess(false);
    setUpiTimer(300);
    onClose();
  };

  // Custom Inline styles for 3D card rotation
  const cardContainerStyle = { perspective: '1000px' };
  const cardInnerStyle = {
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 0.6s',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };
  const cardSideStyle = { backfaceVisibility: 'hidden' as const };
  const cardBackStyle = {
    backfaceVisibility: 'hidden' as const,
    transform: 'rotateY(180deg)',
  };

  const isLimitReached = restriction?.reason === 'LIMIT_REACHED';
  const isTrialExpired = restriction?.reason === 'TRIAL_EXPIRED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-200">
      <div 
        className="relative w-full max-w-md bg-card dark:bg-zinc-900 border border-border dark:border-border rounded-3xl p-6 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isUpgrading && paymentStep === 'otp'}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-accent dark:hover:bg-zinc-800 text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {paymentStep === 'benefits' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Icon Block */}
            <div className="flex items-center space-x-3.5 border-b border-border dark:border-border pb-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50/60 dark:bg-primary/10/20 flex items-center justify-center text-indigo-650 dark:text-primary border border-indigo-100 dark:border-indigo-900/30">
                <Sparkles className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-foreground dark:text-foreground tracking-tight">
                  Upgrade to PromptForm PRO
                </h3>
                <span className="text-xs bg-indigo-50/60 dark:bg-primary/10/30 text-indigo-650 dark:text-primary font-bold uppercase px-2 py-0.5 rounded-lg">
                  Pro Studio Features
                </span>
              </div>
            </div>

            {isLimitReached && (
              <div className="flex items-start space-x-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-2xl text-left text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>You have reached your 5 AI forms limit. Upgrade to continue creating forms.</span>
              </div>
            )}

            {isTrialExpired && (
              <div className="flex items-start space-x-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-2xl text-left text-xs font-semibold text-rose-700 dark:text-rose-450">
                <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Your free trial has expired. Upgrade to unlock all forms and response history.</span>
              </div>
            )}

            {/* List of Benefits */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-foreground dark:text-foreground uppercase tracking-wider">What you unlock with PRO:</h4>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground dark:text-foreground">Unlimited AI Forms</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Build as many AI forms, quizzes, and exams as you need without limits.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground dark:text-foreground">Anti-Cheat Proctoring Mode</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Advanced security settings including tab-switch tracking and session locks.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground dark:text-foreground">Custom Markshet PDFs & Exports</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Print customized marksheets with logos and export all submissions to CSV/Excel.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground dark:text-foreground">AI Analytics & Automated Workflows</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Auto-email alerts, dropout-rate analysis, and user sentiment summaries.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => setPaymentStep('checkout')}
                className="w-full py-3 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all duration-150 active:scale-[0.97]"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg text-xs font-semibold"
              >
                Continue with limited access
              </Button>
            </div>
          </div>
        ) : paymentStep === 'success' ? (
          <div className="text-center py-8 space-y-6 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto text-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground dark:text-foreground">Upgrade Successful!</h3>
              <p className="text-xs text-muted-foreground dark:text-zinc-450 leading-relaxed max-w-[280px] mx-auto font-semibold">
                Welcome to PromptForm PRO! Your account features and database limits have been upgraded successfully.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 max-w-[240px] mx-auto">
              <Button
                onClick={handleDownloadInvoice}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Download Invoice PDF</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        ) : paymentStep === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3.5 border-b border-zinc-100 dark:border-border pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-primary/10/20 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground dark:text-foreground">3D Secure Checkout</h3>
                <span className="text-xs text-muted-foreground font-semibold block">Authentication Required</span>
              </div>
            </div>

            <div className="bg-muted dark:bg-zinc-950/50 p-4 border border-border dark:border-border rounded-2xl text-left space-y-2">
              <p className="text-xs text-muted-foreground dark:text-zinc-350 leading-relaxed font-medium">
                We've sent a 4-digit verification code via SMS to your registered phone ending in <strong>*4500</strong>.
              </p>
              <p className="text-xs text-muted-foreground font-semibold">
                (Sandbox mode: Enter any 4-digit code e.g. <strong className="text-indigo-650">1234</strong> to proceed).
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label htmlFor="otp-input" className="text-xs font-bold text-zinc-450 uppercase">One-Time Password (OTP)</label>
              <input
                id="otp-input"
                type="text"
                placeholder="••••"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 text-center tracking-widest text-lg font-bold rounded-2xl border border-border dark:border-border bg-muted dark:bg-zinc-900 text-foreground dark:text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {otpError && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-3 py-2 rounded-lg text-left">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{otpError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                disabled={isUpgrading}
                className="w-full py-3 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all duration-150 active:scale-[0.97]"
              >
                {isUpgrading ? 'Verifying transaction...' : 'Verify & Complete Payment'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPaymentStep('checkout')}
                disabled={isUpgrading}
                className="w-full py-2.5 rounded-lg text-xs font-bold"
              >
                Back to card details
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header Icon Block */}
            <div className="flex items-center space-x-3.5 border-b border-border dark:border-border pb-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-primary/10/20 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                <CreditCard className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-foreground dark:text-foreground tracking-tight">
                  PromptForm Secure Checkout
                </h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs bg-indigo-50 dark:bg-primary/10/30 text-indigo-650 dark:text-primary font-bold uppercase px-2 py-0.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                    Pro Studio plan
                  </span>
                </div>
              </div>
            </div>

            {/* Billing cycle & Currency selection inside checkout */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted dark:bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-100 dark:border-border">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Billing</span>
                <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-card dark:bg-zinc-900 text-zinc-950 dark:text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billingCycle === 'yearly' ? 'bg-card dark:bg-zinc-900 text-zinc-950 dark:text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Yearly (-20%)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-4 border-t sm:border-t-0 border-border/50 dark:border-border/80 pt-2 sm:pt-0">
                <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">Currency</span>
                <div className="relative">
                  <select
                    value={activeCurrency}
                    onChange={(e) => setActiveCurrency(e.target.value as any)}
                    className="px-3 py-1 pr-6 rounded-lg text-xs font-bold bg-zinc-200/50 dark:bg-zinc-800 border border-border/50 dark:border-border text-zinc-700 dark:text-foreground focus:outline-none cursor-pointer appearance-none shadow-xs"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                  <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT TABS SELECTOR */}
            <div className="flex border-b border-border dark:border-border mb-2">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'card'
                    ? 'border-primary text-primary dark:text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                Card Payment
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'upi'
                    ? 'border-primary text-primary dark:text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                UPI / QR Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paypal')}
                className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'paypal'
                    ? 'border-primary text-primary dark:text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                PayPal
              </button>
            </div>

            {/* TAB CONTENTS */}

            {activeTab === 'card' && (
              <form onSubmit={handleStartPayment} className="space-y-4 text-left animate-in fade-in duration-200">
                {/* VIRTUAL CREDIT CARD */}
                <div className="w-full h-40 relative mb-4" style={cardContainerStyle}>
                  <div className="w-full h-full rounded-2xl relative" style={cardInnerStyle}>
                    
                    {/* Front Side */}
                    <div className="absolute w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900/90 via-indigo-950/80 to-slate-950/90 backdrop-blur-md border border-white/10 p-4 text-white flex flex-col justify-between shadow-lg" style={cardSideStyle}>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold tracking-widest text-indigo-300 uppercase">PROMPTCARD</div>
                          {/* Golden metallic chip */}
                          <div className="w-8 h-6 rounded bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 border border-amber-500/40 relative overflow-hidden shadow-xs mt-1">
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px opacity-40">
                              <div className="border border-zinc-950/20" />
                              <div className="border border-zinc-950/20" />
                              <div className="border border-zinc-950/20" />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Lock className="w-4 h-4 text-primary" />
                          {/* Visa logo with holographic gradient */}
                          <div className="text-xs font-bold italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-200 to-indigo-300">VISA</div>
                        </div>
                      </div>
                      <div className="text-base font-mono tracking-widest py-2.5 text-center font-bold text-white drop-shadow-md">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex justify-between items-center text-xs uppercase font-semibold">
                        <div className="text-left">
                          <span className="text-indigo-200/60 block text-[6.5px] font-bold">Card Holder</span>
                          <span className="truncate max-w-[170px] inline-block font-bold text-white">{cardName || 'YOUR NAME'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-indigo-200/60 block text-[6.5px] font-bold">Expires</span>
                          <span className="font-bold text-white">{cardExpiry || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900/90 via-indigo-950/80 to-slate-950/90 backdrop-blur-md border border-white/10 p-4 text-white flex flex-col justify-between shadow-lg" style={cardBackStyle}>
                      <div className="w-full h-8 bg-zinc-950 absolute top-4 left-0" />
                      <div className="mt-12 flex justify-between items-center px-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[6.5px] uppercase font-bold text-indigo-200/60">CVC</span>
                          <div className="bg-card text-foreground font-mono text-xs px-2.5 py-0.5 rounded italic font-bold">
                            {cardCvc || '•••'}
                          </div>
                        </div>
                        <div className="text-xs font-bold italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-200 to-indigo-300">VISA</div>
                      </div>
                      <div className="text-xs text-muted-foreground text-center tracking-tight leading-none mt-2 font-semibold">
                        Simulated Sandbox Payment Card
                      </div>
                    </div>

                  </div>
                </div>

                {/* Card input forms */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1 col-span-2">
                    <label htmlFor="card-number" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Card Number</label>
                    <input
                      id="card-number"
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-semibold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label htmlFor="card-name" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Card Holder Name</label>
                    <input
                      id="card-name"
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-semibold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="card-expiry" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Expiry Date</label>
                    <input
                      id="card-expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-semibold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="card-cvc" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Security Code (CVC)</label>
                    <input
                      id="card-cvc"
                      type="text"
                      placeholder="•••"
                      maxLength={3}
                      value={cardCvc}
                      onChange={handleCvcChange}
                      onFocus={() => setIsFlipped(true)}
                      onBlur={() => setIsFlipped(false)}
                      className="w-full p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-semibold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Promo Code section */}
                <div className="space-y-1 text-left border-t border-zinc-100 dark:border-border pt-3">
                  <label htmlFor="coupon-input" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Promo Code / Coupon</label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-input"
                      type="text"
                      placeholder="PROMPT50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isCouponApplied}
                      className="flex-1 p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-bold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCouponApplied || !couponCode.trim() || isValidatingCoupon}
                      className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-650/10"
                    >
                      {isValidatingCoupon ? 'Checking...' : (isCouponApplied ? 'Applied ✓' : 'Apply')}
                    </button>
                  </div>
                  {isCouponApplied && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      Discount Activated: {couponDiscount}% discount will be applied!
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-rose-500 font-semibold">{couponError}</p>
                  )}
                </div>

                {/* Pricing total check out */}
                <div className="border-t border-border dark:border-border pt-3.5">
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-muted dark:bg-zinc-950 border border-zinc-100 dark:border-border/60 mb-3 text-xs text-muted-foreground font-semibold text-left">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-pulse" />
                    <span>
                      Subscription Period: <strong className="text-foreground dark:text-foreground">{formattedStartPrev}</strong> to <strong className="text-foreground dark:text-foreground">{formattedEndPrev}</strong> ({billingCycle === 'yearly' ? '1 Year' : '30 Days'})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs mb-3">
                    <span className="text-muted-foreground">Total Billed:</span>
                    <span className="font-bold text-foreground dark:text-foreground">
                      {isCouponApplied ? (
                        <>
                          <span className="line-through text-muted-foreground mr-1.5">
                            {currencySymbol}{billingCycle === 'yearly' ? (basePrice * 12).toFixed(2) : basePrice.toFixed(2)}
                          </span>
                          <span className="text-emerald-500 font-extrabold">
                            {currencySymbol}{totalBilled.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        `${currencySymbol}${totalBilled.toFixed(2)}`
                      )}
                      <span className="text-xs text-muted-foreground font-semibold ml-1">
                        ({billingCycle === 'yearly' ? 'billed annually' : 'billed monthly'})
                      </span>
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isUpgrading}
                    className="w-full py-3 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all duration-150 active:scale-[0.97]"
                  >
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>{isUpgrading ? 'Contacting bank...' : `Pay Securely ${currencySymbol}${totalBilled.toFixed(2)}`}</span>
                  </Button>
                </div>
              </form>
            )}

            {activeTab === 'upi' && (
              <div className="space-y-4 py-2 animate-in fade-in duration-200 text-center">
                <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground block">Scan QR code using GooglePay, PhonePe or Paytm</span>
                
                {/* Custom scanner animation keyframes */}
                <style>{`
                  @keyframes scan-loop {
                    0% { top: 4%; }
                    50% { top: 96%; }
                    100% { top: 4%; }
                  }
                `}</style>

                {/* Mock QR Container */}
                <div className="w-36 h-36 border-2 border-indigo-500/30 dark:border-indigo-400/30 rounded-2xl mx-auto flex items-center justify-center bg-card p-2.5 relative shadow-lg shadow-indigo-500/5 group overflow-hidden">
                  {/* Neon pulsing glow outline */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/20 animate-pulse pointer-events-none" />
                  {/* Laser green scanning line */}
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 pointer-events-none"
                    style={{
                      animation: 'scan-loop 2s infinite ease-in-out',
                      top: '0%'
                    }}
                  />
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=promptform@bank%26pn=PromptForm%2520AI%26am=${totalBilled.toFixed(2)}%26cu=USD`}
                    alt="Payment QR Code" 
                    className="w-full h-full object-contain filter contrast-125 select-none"
                  />
                </div>

                {/* Countdown Timer */}
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50/80 dark:bg-amber-950/20 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>QR Expires in: {formatUpiTime(upiTimer)}</span>
                </div>

                {/* Promo Code section */}
                <div className="space-y-1 text-left border-t border-zinc-100 dark:border-border pt-3">
                  <label htmlFor="coupon-input" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Promo Code / Coupon</label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-input"
                      type="text"
                      placeholder="PROMPT50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isCouponApplied}
                      className="flex-1 p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-bold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCouponApplied || !couponCode.trim() || isValidatingCoupon}
                      className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-650/10"
                    >
                      {isValidatingCoupon ? 'Checking...' : (isCouponApplied ? 'Applied ✓' : 'Apply')}
                    </button>
                  </div>
                  {isCouponApplied && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      Discount Activated: {couponDiscount}% discount will be applied!
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-rose-500 font-semibold">{couponError}</p>
                  )}
                </div>

                <div className="border-t border-border dark:border-border pt-3.5 text-left">
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-muted dark:bg-zinc-950 border border-zinc-100 dark:border-border/60 mb-3 text-xs text-muted-foreground font-semibold text-left">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-pulse" />
                    <span>
                      Subscription Period: <strong className="text-foreground dark:text-foreground">{formattedStartPrev}</strong> to <strong className="text-foreground dark:text-foreground">{formattedEndPrev}</strong> ({billingCycle === 'yearly' ? '1 Year' : '30 Days'})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs mb-3">
                    <span className="text-muted-foreground">Billed Amount:</span>
                    <span className="font-bold text-foreground dark:text-foreground font-mono">
                      {isCouponApplied ? (
                        <>
                          <span className="line-through text-muted-foreground mr-1.5">
                            {currencySymbol}{billingCycle === 'yearly' ? (basePrice * 12).toFixed(2) : basePrice.toFixed(2)}
                          </span>
                          <span className="text-emerald-500 font-extrabold">{currencySymbol}{totalBilled.toFixed(2)}</span>
                        </>
                      ) : (
                        `${currencySymbol}${totalBilled.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  <Button
                    onClick={handleUpiPaySimulation}
                    disabled={isUpgrading}
                    className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all duration-150 active:scale-[0.97]"
                  >
                    <Smartphone className="w-4.5 h-4.5" />
                    <span>{isUpgrading ? 'Processing Scan...' : `Simulate UPI Scan & Pay`}</span>
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'paypal' && (
              <div className="space-y-5 py-3 text-center animate-in fade-in duration-200">
                <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground block">Click below to open secure PayPal gateway login portal</span>
                
                {/* Promo Code section */}
                <div className="space-y-1 text-left border-t border-zinc-100 dark:border-border pt-3">
                  <label htmlFor="coupon-input" className="text-[9.5px] font-extrabold text-muted-foreground dark:text-muted-foreground tracking-wider uppercase">Promo Code / Coupon</label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-input"
                      type="text"
                      placeholder="PROMPT50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isCouponApplied}
                      className="flex-1 p-2.5 rounded-lg border border-border dark:border-border/80 bg-muted/50 dark:bg-zinc-950/40 text-xs font-bold text-foreground dark:text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all duration-200 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCouponApplied || !couponCode.trim() || isValidatingCoupon}
                      className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-650/10"
                    >
                      {isValidatingCoupon ? 'Checking...' : (isCouponApplied ? 'Applied ✓' : 'Apply')}
                    </button>
                  </div>
                  {isCouponApplied && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      Discount Activated: {couponDiscount}% discount will be applied!
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-rose-500 font-semibold">{couponError}</p>
                  )}
                </div>

                <div className="border-t border-border dark:border-border pt-3.5 text-left">
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-muted dark:bg-zinc-950 border border-zinc-100 dark:border-border/60 mb-3 text-xs text-muted-foreground font-semibold text-left">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-pulse" />
                    <span>
                      Subscription Period: <strong className="text-foreground dark:text-foreground">{formattedStartPrev}</strong> to <strong className="text-foreground dark:text-foreground">{formattedEndPrev}</strong> ({billingCycle === 'yearly' ? '1 Year' : '30 Days'})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs mb-4">
                    <span className="text-muted-foreground">PayPal billing sum:</span>
                    <span className="font-bold text-foreground dark:text-foreground">
                      {isCouponApplied ? (
                        <>
                          <span className="line-through text-muted-foreground mr-1.5">
                            {currencySymbol}{billingCycle === 'yearly' ? (basePrice * 12).toFixed(2) : basePrice.toFixed(2)}
                          </span>
                          <span className="text-emerald-500 font-extrabold">{currencySymbol}{totalBilled.toFixed(2)}</span>
                        </>
                      ) : (
                        `${currencySymbol}${totalBilled.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  <Button
                    onClick={handlePayPalSimulation}
                    disabled={isUpgrading}
                    className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md flex items-center justify-center space-x-1.5 border-none"
                  >
                    <span>{isUpgrading ? 'Launching PayPal Express...' : 'Express Checkout with PayPal'}</span>
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-3 py-2 rounded-lg text-left">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Security Notice Footer */}
            <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground font-semibold mt-2 border-t border-zinc-100 dark:border-border pt-3">
              <Lock className="w-3 h-3 text-primary" />
              <span>SSL Encrypted simulated payment gateway</span>
            </div>

            <button
              onClick={() => setPaymentStep('benefits')}
              className="text-xs font-bold text-indigo-650 hover:underline block mx-auto cursor-pointer"
            >
              Back to feature list
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpgradeModal;

