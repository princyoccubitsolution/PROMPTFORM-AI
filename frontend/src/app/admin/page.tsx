"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ShieldCheck, Users, FileText, Award, Plus, 
  HelpCircle, Trash2, Mail, BadgeCheck, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Template form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("education");

  // New Coupon form state
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newDiscountPercent, setNewDiscountPercent] = useState("");
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadAdminDetails();
  }, []);

  const loadAdminDetails = async () => {
    setIsLoading(true);
    try {
      // 1. Verify User Profile role is admin
      const profile = await api.get('/auth/me');
      if (profile.role !== 'admin') {
        alert("Access Denied. Admin credentials required.");
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);

      // 2. Fetch Templates
      const tmplList = await api.get('/templates');
      setTemplates(tmplList);

      // 3. Fetch Coupons
      const couponList = await api.get('/auth/coupons');
      setCoupons(couponList);

      // 4. Mock users list matching database seed accounts for local control
      setUsersList([
        { id: "1", name: "PromptForm Admin", email: "admin@promptform.ai", role: "admin", plan: "enterprise", credits: 9999 },
        { id: "2", name: "Jane Doe", email: "user@promptform.ai", role: "user", plan: "pro", credits: 250 }
      ]);
    } catch (err: any) {
      alert("Error loading administrative systems: " + err.message);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newDiscountPercent) return;
    
    setIsSubmittingCoupon(true);
    try {
      await api.post('/auth/coupons', {
        code: newCouponCode,
        discountPercent: parseFloat(newDiscountPercent)
      });
      alert("New promo coupon code created successfully!");
      setNewCouponCode("");
      setNewDiscountPercent("");
      
      const couponList = await api.get('/auth/coupons');
      setCoupons(couponList);
    } catch (err: any) {
      alert("Failed to create coupon: " + err.message);
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo coupon?")) return;
    try {
      await api.delete(`/auth/coupons/${id}`);
      const couponList = await api.get('/auth/coupons');
      setCoupons(couponList);
    } catch (err: any) {
      alert("Failed to delete coupon: " + err.message);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const mockStructure = {
      questions: [
        { type: "short_text", label: "Full Name", required: true, options: [] },
        { type: "rating", label: "Rate your satisfaction level:", required: true, options: [] }
      ]
    };

    try {
      await api.post('/templates', {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        structure: mockStructure
      });
      alert("New starter template added to marketplace successfully!");
      setNewTitle("");
      setNewDesc("");
      loadAdminDetails();
    } catch (err: any) {
      alert("Failed to create template: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <span>Admin Control Panel</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">PromptForm AI SaaS Management console</p>
            </div>
          </div>
        </div>

        {/* OVERVIEW STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Users</p>
                <p className="text-3xl font-bold mt-1 text-foreground">{usersList.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marketplace Templates</p>
                <p className="text-3xl font-bold mt-1 text-foreground">{templates.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Status</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <BadgeCheck className="w-4 h-4" />
                  <span>Online & Healthy</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* USERS LIST TABLE */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Platform Registrations</CardTitle>
              <CardDescription>Monitor credentials, subscription tiers, and credits.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User Identity</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Role</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tier Plan</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">AI Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{usr.name || "Member"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{usr.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={usr.role === 'admin' ? 'primary' : 'default'}>
                            {usr.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 capitalize font-medium text-foreground">{usr.plan}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{usr.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT SIDEBAR ACTIONS */}
          <div className="space-y-6 md:col-span-1">
            {/* ADD TEMPLATE WIDGET */}
            <Card>
              <CardHeader>
                <CardTitle>Deploy Starter Template</CardTitle>
                <CardDescription>Seed pre-built form questions for public marketplace lists.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTemplate} className="space-y-4">
                  <Input
                    label="Template Title"
                    placeholder="e.g. Contact Form"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />

                  <Input
                    label="Description"
                    placeholder="e.g. Capture visitor details"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Marketplace Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3.5 pr-10 text-sm border border-border rounded-lg bg-card text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
                    >
                      <option value="education">Education / Testing</option>
                      <option value="business">Business / HR</option>
                      <option value="feedback">CSAT Feedback</option>
                      <option value="personal">Personal / RSVP</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full">
                    Deploy Template
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* PROMO COUPONS MANAGER WIDGET */}
            <Card>
              <CardHeader>
                <CardTitle>Promo Coupons Manager</CardTitle>
                <CardDescription>Create dynamic coupons and track their live usage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coupon creation form */}
                <form onSubmit={handleAddCoupon} className="space-y-3 pb-4 border-b border-border text-left">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="e.g. DIWALI30"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      required
                      className="text-xs uppercase"
                    />
                    <Input
                      type="number"
                      placeholder="e.g. 30 (for 30%)"
                      value={newDiscountPercent}
                      onChange={(e) => setNewDiscountPercent(e.target.value)}
                      required
                      min="1"
                      max="100"
                      className="text-xs"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmittingCoupon} className="w-full">
                    {isSubmittingCoupon ? 'Creating...' : 'Create Coupon'}
                  </Button>
                </form>

                {/* Coupons list */}
                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Promo Codes</h4>
                  {coupons.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No coupons found in database.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {coupons.map((cp) => (
                        <div key={cp.id} className="flex justify-between items-center text-sm p-2.5 rounded-lg bg-muted/50 border border-border">
                          <div>
                            <span className="font-mono font-semibold text-primary">{cp.code}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground font-medium">({cp.discountPercent}% Off)</span>
                            <span className="block text-xs text-muted-foreground">Used: {cp.usedCount} times</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(cp.id)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
