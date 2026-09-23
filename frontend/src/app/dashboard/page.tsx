"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, FileText, BarChart3, Trash2, Users, Settings, LogOut, 
  MessageSquare, UserPlus, Folder, Calendar, ArrowRight, ShieldCheck, Mail, Sun, Moon,
  Search, Bell, ChevronLeft, ChevronRight, ChevronDown, Copy, Check, ExternalLink, Bot, Palette, Link as LinkIcon,
  CreditCard, Key, Send, CheckCircle2, AlertCircle, RefreshCw, BarChart2, Info, Activity, Globe, Monitor, Smartphone, Tablet, LayoutGrid, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { api } from '@/lib/api';
import { BrandedLogo } from '@/components/NavigationHeader';
import { UpgradeModal } from '@/components/UpgradeModal';
import { AssistantChat } from '@/components/AssistantChat';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [accentColor, setAccentColor] = useState("mocha");

  useEffect(() => {
    // Whenever theme or accentColor changes, update root primary color variables
    const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const colors = {
      mocha:  { light: "#8B6B55", dark: "#B99A80", glow: "rgba(139,107,85,0.12)" },
      purple: { light: "#8B6B55", dark: "#B99A80", glow: "rgba(139,107,85,0.12)" },
      green:  { light: "#30A46C", dark: "#30A46C", glow: "rgba(48,164,108,0.12)" },
      orange: { light: "#EA580C", dark: "#F97316", glow: "rgba(249,115,22,0.12)" },
      red:    { light: "#E5484D", dark: "#E5484D", glow: "rgba(229,72,77,0.12)" },
    };
    const active = colors[accentColor as keyof typeof colors] || colors.mocha;
    const value = isDark ? active.dark : active.light;
    document.documentElement.style.setProperty('--primary', value);
    document.documentElement.style.setProperty('--ring', value);
    document.documentElement.style.setProperty('--primary-glow', active.glow);
  }, [theme, accentColor]);

  const changeAccent = (color: string) => {
    setAccentColor(color);
  };

  // Layout States
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState<boolean>(false);

  // Data States
  const [user, setUser] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Action States
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");

  // Notifications Mock
  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, text: "New response received for Event Registration Form.", time: "10m ago", read: false },
    { id: 2, text: "Colleague admin@promptform.ai joined workspace team.", time: "2h ago", read: false },
    { id: 3, text: "Form template Satisfactory Review was cloned successfully.", time: "1d ago", read: true }
  ]);

  // AI Generator Tab Local States
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [isGeneratingForm, setIsGeneratingForm] = useState(false);
  const [activeRestriction, setActiveRestriction] = useState<any | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [generatedFormPreview, setGeneratedFormPreview] = useState<any>(null);

  // AI Assistant Chatbot Local States
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I am your PromptForm AI assistant. How can I help you create forms, build layouts, or analyze your responses today?" }
  ]);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Theme Builder Local States
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [themeFont, setThemeFont] = useState("Inter");
  const [themeStyle, setThemeStyle] = useState("rounded");

  // Integrations Local States
  const [integrations, setIntegrations] = useState<any[]>([
    { id: "sheets", name: "Google Sheets", desc: "Sync responses directly to spreadsheets in real-time.", icon: Globe, connected: false },
    { id: "slack", name: "Slack", desc: "Notify team channels instantly upon new form submissions.", icon: MessageSquare, connected: false },
    { id: "zapier", name: "Zapier", desc: "Connect form response webhooks to 5,000+ custom integrations.", icon: LinkIcon, connected: false },
    { id: "webhooks", name: "Custom Webhooks", desc: "Send HTTP POST payloads directly to custom API servers.", icon: Activity, connected: false }
  ]);

  // Settings Local States (API Keys)
  const [apiKeys, setApiKeys] = useState<any[]>([
    { id: "key_1", name: "Production Webhook Key", token: "vyn_live_4a8bc39d821eef00ad8bc7", createdAt: "2026-05-10" }
  ]);
  const [newKeyName, setNewKeyName] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === "ai_generator") {
        router.push('/dashboard/ai');
        return;
      }
      const validTabs = ["overview", "my_forms", "templates", "analytics", "ai_assistant", "theme_builder", "team", "integrations", "settings"];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab("overview");
    }
  }, [searchParams, router]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const savedColor = localStorage.getItem('promptform_theme_color');
    const savedFont = localStorage.getItem('promptform_theme_font');
    const savedStyle = localStorage.getItem('promptform_theme_style');
    if (savedColor) setThemeColor(savedColor);
    if (savedFont) setThemeFont(savedFont);
    if (savedStyle) setThemeStyle(savedStyle);

    const initialPrompt = localStorage.getItem('promptform_initial_ai_prompt');
    if (initialPrompt) {
      router.push('/dashboard/ai');
      return;
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [profileData, formsData, teamsData, templatesData, analyticsData] = await Promise.all([
        api.get('/auth/me'),
        api.get('/forms'),
        api.get('/teams'),
        api.get('/templates'),
        api.get('/analytics/workspace?range=7')
      ]);

      setUser(profileData);
      setForms(formsData);
      setTeams(teamsData);
      setTemplates(templatesData);
      setWorkspaceAnalytics(analyticsData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load dashboard workspace. Please retry.");
      if (err.status === 401 || err.message?.includes('expired') || err.message?.includes('Authentication')) {
        localStorage.removeItem('promptform_access_token');
        localStorage.removeItem('promptform_refresh_token');
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {}
    localStorage.removeItem('promptform_access_token');
    localStorage.removeItem('promptform_refresh_token');
    localStorage.removeItem('promptform_user_email');
    localStorage.removeItem('promptform_user_name');
    router.push('/login');
  };

  const handleCreateBlankForm = async () => {
    try {
      const newForm = await api.post('/forms', {
        title: "Untitled Form",
        description: "Created in PromptForm AI Dashboard."
      });
      router.push(`/builder/${newForm.id}`);
    } catch (err: any) {
      if (err.status === 403 && err.data?.status === 'restricted') {
        setActiveRestriction(err.data);
        setIsUpgradeModalOpen(true);
        return;
      }
      alert(err.message || "Failed to create form.");
    }
  };

  const handleGenerateAIFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorPrompt.trim()) return;
    setIsGeneratingForm(true);
    try {
      const data = await api.post('/ai/generate', { prompt: generatorPrompt });
      if (user) {
        setUser({ ...user, credits: data.creditsRemaining });
      }
      setGeneratedFormPreview(data.form);
    } catch (err: any) {
      if (err.status === 403 && err.data?.status === 'restricted') {
        setActiveRestriction(err.data);
        setIsUpgradeModalOpen(true);
        return;
      }
      alert(err.message || "AI Form generation failed.");
    } finally {
      setIsGeneratingForm(false);
    }
  };

  const handlePublishGeneratedForm = () => {
    if (!generatedFormPreview) return;
    router.push(`/builder/${generatedFormPreview.id}`);
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await api.post('/teams', { name: newTeamName });
      setIsCreateTeamOpen(false);
      setNewTeamName("");
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to create team.");
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await api.post(`/teams/${selectedTeamId}/members`, {
        email: inviteEmail,
        role: inviteRole
      });
      setIsInviteOpen(false);
      setInviteEmail("");
      loadDashboardData();
      alert("Invite sent successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to invite member.");
    }
  };

  const handleCloneTemplate = async (template: any) => {
    try {
      const form = await api.post('/forms', {
        title: template.title,
        description: template.description
      });
      if (template.structure?.questions?.length > 0) {
        await api.put(`/forms/${form.id}/questions`, template.structure.questions);
      }
      
      const themeConfig = template.structure?.theme || {
        theme_name: template.category || "default",
        layoutType: "compact-grid",
        primary_color: template.category === 'education' ? '#4f46e5' : template.category === 'health' ? '#0d9488' : '#3b82f6',
        background_color: '#f8fafc',
        font_family: "Inter",
        rtl: false,
        banner_url: template.thumbnail || null
      };

      await api.put(`/forms/${form.id}`, {
        title: template.title,
        description: template.description,
        theme: themeConfig,
        settings: template.structure?.settings || {}
      });

      router.push(`/builder/${form.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to clone template.");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? All responses will be deleted.")) return;
    try {
      await api.delete(`/forms/${formId}`);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to delete form.");
    }
  };

  // AI Assistant Chatbot
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatTyping(true);

    setTimeout(() => {
      let reply = "I can help with that! You can edit questions directly in the 'My Forms' page, or create templates inside the Builder visual playground.";
      const query = chatInput.toLowerCase();
      if (query.includes("create") || query.includes("generate")) {
        reply = "To generate a form using natural language, head over to the ✨ AI Form Generator tab, enter a description, and let PromptForm AI write questions instantly!";
      } else if (query.includes("theme") || query.includes("color")) {
        reply = "You can customize form colors, fonts, and borders in the 🎨 Theme Builder tab. The theme will apply automatically to all questions.";
      } else if (query.includes("settings") || query.includes("api")) {
        reply = "API webhook keys and account plans can be configured in the ⚙️ Settings panel. Check the Developer keys section.";
      } else if (query.includes("response") || query.includes("responses")) {
        reply = "Response counts and individual answers are populated in the My Forms data section. Click 'Data' on any form card to view.";
      }

      setChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setIsChatTyping(false);
    }, 1200);
  };

  // Toggle Integrations connection
  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.connected;
        alert(`${item.name} is now ${nextState ? 'connected' : 'disconnected'}.`);
        return { ...item, connected: nextState };
      }
      return item;
    }));
  };

  // Generate mock API keys
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      token: `vyn_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setApiKeys(prev => [...prev, newKey]);
    setNewKeyName("");
  };

  // Delete API key
  const handleDeleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
  };

  // SVG Chart Generators
  const totalSubmissions = forms.reduce((acc, f) => acc + (f._count?.responses || 0), 0);
  const totalAIForms = forms.filter(f => f.description?.toLowerCase().includes("ai") || f.isTemplate).length || 3;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <span className="text-sm font-medium text-muted-foreground">Loading enterprise suite...</span>
        </div>
      </div>
    );
  }

  // Filtered forms list
  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filtered templates list
  const filteredTemplates = templates.filter(tmpl => {
    const matchesSearch = tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (tmpl.description && tmpl.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tmpl.category && tmpl.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeCategoryFilter === "all") return matchesSearch;
    return matchesSearch && tmpl.category?.toLowerCase() === activeCategoryFilter.toLowerCase();
  });

  return (
    <DashboardLayout activeTab={activeTab}>
        {/* CONTAINER PAGE VIEWS BODY */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 md:p-8 md:pt-4 scrollbar-thin">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-8"
            >
              
              {/* TAB 1: OVERVIEW DASHBOARD */}
              {activeTab === "overview" && (
                <>
                  {/* Greeting header */}
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground dark:text-foreground flex items-center space-x-2">
                      <span>Welcome back, {user?.name || "Creator"}</span>
                      <Sparkles className="w-6 h-6 text-primary animate-bounce" />
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Here is a summary of your workspace activities and form metrics.</p>
                  </div>

                  {/* PREMIUM METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { title: "Total Forms", value: `${forms.length} Projects`, desc: "Created in workspace", icon: FileText },
                      { title: "Total Responses", value: `${totalSubmissions} Responses`, desc: "Registered submissions", icon: MessageSquare },
                      { title: "AI Generated Forms", value: `${totalAIForms} Templates`, desc: "Built using prompt assistants", icon: Sparkles },
                      { title: "Workspace Members", value: `${teams.reduce((acc, t) => acc + (t.members?.length || 0), 0) || 1} Collaborators`, desc: "Active members in teams", icon: Users }
                    ].map((card, idx) => (
                      <Card key={idx} className="relative overflow-hidden group hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.title}</span>
                            <card.icon className="w-5 h-5 text-primary flex-shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h3 className="text-2xl font-bold text-foreground tracking-tight">{card.value}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* QUICK CREATE OPTIONS ROW */}
                  <Card className="bg-card border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Quick Start Playground</CardTitle>
                      <CardDescription>Launch form configurations with templates, prompt generators, or manual builder.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 pt-2">
                      <Button onClick={handleCreateBlankForm} className="space-x-1.5 text-xs">
                        <Plus className="w-4 h-4" />
                        <span>Create Blank Form</span>
                      </Button>
                      <Button onClick={() => router.push('/dashboard/ai')} variant="outline" className="space-x-1.5 text-xs border-primary/30 hover:border-primary/50 text-primary">
                        <Sparkles className="w-4 h-4" />
                        <span>Prompt with AI</span>
                      </Button>
                      <Button onClick={() => setActiveTab("templates")} variant="outline" className="space-x-1.5 text-xs">
                        <LayoutGrid className="w-4 h-4" />
                        <span>Browse Templates marketplace</span>
                      </Button>
                    </CardContent>
                  </Card>

                  {/* GRAPHS AND RECENT PROJECTS ROW */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* SVG Analytics Graph */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-1.5">
                          <BarChart2 className="w-5 h-5 text-primary" />
                          <span>Submission Trend Insights</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex flex-col justify-between">
                          {/* SVG Line Graph */}
                          <svg className="w-full h-full" viewBox="0 0 500 200">
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            <path 
                              d="M 50 150 Q 120 120 190 70 T 330 90 T 450 40" 
                              fill="none" 
                              stroke="#6366f1" 
                              strokeWidth="3.5" 
                              strokeLinecap="round" 
                            />
                            <path 
                              d="M 50 150 Q 120 120 190 70 T 330 90 T 450 40 L 450 180 L 50 180 Z" 
                              fill="url(#chartGradient)" 
                            />
                            {/* Grid Lines */}
                            <line x1="50" y1="180" x2="450" y2="180" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
                            <line x1="50" y1="100" x2="450" y2="100" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4" />
                            {/* Axis Labels */}
                            <text x="45" y="185" className="text-xs fill-slate-400 font-bold font-mono">May</text>
                            <text x="185" y="185" className="text-xs fill-slate-400 font-bold font-mono">Jun</text>
                            <text x="325" y="185" className="text-xs fill-slate-400 font-bold font-mono">Jul</text>
                            <text x="445" y="185" className="text-xs fill-slate-400 font-bold font-mono">Aug</text>
                          </svg>
                          <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold px-4 pt-2">
                            <span>Avg Views: 3.5k</span>
                            <span>Total responses aggregated: {totalSubmissions}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Recommendations Panel */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-1.5">
                          <Bot className="w-5 h-5 text-primary" />
                          <span>AI Recommendations</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { text: "Your form 'Customer Review Form' has a high dropout on rating question. Try making it optional.", priority: "high" },
                          { text: "Create a Student Registration quiz layout using Event template to save 15 minutes.", priority: "medium" },
                          { text: "Add Slack webhook integration to automate notifications for new submissions.", priority: "low" }
                        ].map((rec, idx) => (
                          <div key={idx} className="p-3 bg-background dark:bg-background border border-border dark:border-border rounded-lg flex items-start space-x-3 text-xs">
                            <Info className={`w-4 h-4 mt-0.5 ${rec.priority === 'high' ? 'text-destructive' : 'text-primary'}`} />
                            <p className="text-foreground dark:text-muted-foreground leading-relaxed">{rec.text}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* RECENT FORMS PREVIEW */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Workspaces Forms</CardTitle>
                      <CardDescription>Latest forms updated in your cloud registry.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                              <th className="py-3 px-4 font-extrabold">Form Title</th>
                              <th className="py-3 px-4 font-extrabold">Status</th>
                              <th className="py-3 px-4 font-extrabold">Responses</th>
                              <th className="py-3 px-4 font-extrabold">Updated</th>
                              <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {filteredForms.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-10 text-center text-muted-foreground font-medium">
                                  No forms found matching "{searchQuery}"
                                </td>
                              </tr>
                            ) : (
                              filteredForms.slice(0, 4).map((form) => (
                                <tr key={form.id} className="group hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150">
                                  <td className="py-3.5 px-4 font-bold text-foreground truncate max-w-[240px] group-hover:text-primary transition-colors">
                                    {form.title}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide inline-flex items-center ${
                                      form.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                      form.status === 'CLOSED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                                      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                                    }`}>
                                      {form.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-foreground">{form._count?.responses || 0}</td>
                                  <td className="py-3.5 px-4 text-muted-foreground">{new Date(form.updatedAt).toLocaleDateString()}</td>
                                  <td className="py-3.5 px-4 text-right">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 px-3 text-xs font-bold border-border/80 text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-150 cursor-pointer shadow-2xs" 
                                      onClick={() => router.push(`/builder/${form.id}`)}
                                    >
                                      Edit
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* TAB 2: AI FORM GENERATOR */}
              {activeTab === "ai_generator" && (
                <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto text-white shadow-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Conversational AI Form Creator</h2>
                    <p className="text-muted-foreground dark:text-slate-450 text-sm max-w-md mx-auto">
                      Step into a fully dedicated, distraction-free ChatGPT-style workspace to design complete quizzes, forms, and business workflows naturally.
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push('/dashboard/ai')}
                    className="px-6 py-3 rounded-2xl bg-primary hover:bg-[#795D49] text-white font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5"
                  >
                    <span>Launch Conversational AI Studio</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* TAB 3: MY FORMS */}
              {activeTab === "my_forms" && (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Active Forms Library</h2>
                      <p className="text-muted-foreground dark:text-slate-450 text-sm mt-1">Review status checks, view responses, or duplicate layouts.</p>
                    </div>
                    <Button onClick={handleCreateBlankForm} className="space-x-1 text-xs">
                      <Plus className="w-4 h-4" />
                      <span>New blank form</span>
                    </Button>
                  </div>

                  {/* Forms Grid View */}
                  {filteredForms.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border dark:border-border rounded-lg bg-card dark:bg-background">
                      <FileText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                      <h4 className="font-bold text-foreground dark:text-muted-foreground text-sm">No Forms Found</h4>
                      <p className="text-xs text-muted-foreground mt-1">Try resetting search filters or generate with AI.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredForms.map((form) => (
                        <Card key={form.id} className="premium-shadow-card flex flex-col justify-between">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start space-x-2">
                              <CardTitle className="text-sm font-semibold truncate max-w-[170px]">{form.title}</CardTitle>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                form.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                form.status === 'CLOSED' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-350'
                              }`}>
                                {form.status}
                              </span>
                            </div>
                            <CardDescription className="line-clamp-2 text-xs mt-1 leading-normal">{form.description || "No description provided."}</CardDescription>
                          </CardHeader>
                          
                          <CardContent className="py-2 flex items-center space-x-4 text-xs text-muted-foreground border-t border-border dark:border-border/80 pt-3">
                            <span className="flex items-center space-x-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{form._count?.responses || 0} Responses</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(form.updatedAt).toLocaleDateString()}</span>
                            </span>
                          </CardContent>

                          <CardContent className="pt-3 border-t border-border dark:border-border/80 flex items-center justify-between gap-1 pb-3">
                            <div className="flex gap-1.5">
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => router.push(`/builder/${form.id}`)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => router.push(`/responses/${form.id}`)}>
                                Data
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => router.push(`/analytics/${form.id}`)}>
                                Charts
                              </Button>
                            </div>
                            <Button variant="ghost" size="sm" className="p-2 h-7 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/10" onClick={() => handleDeleteForm(form.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 4: TEMPLATES MARKETPLACE */}
              {activeTab === "templates" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Templates Marketplace</h2>
                      <p className="text-muted-foreground text-sm mt-1">Select preconfigured layouts. Clone to your workspace in one click.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 py-1">
                    {[
                      { id: "all", label: "🔥 All Templates" },
                      { id: "education", label: "🧠 Education & Quizzes" },
                      { id: "business", label: "🏢 Business & HR" },
                      { id: "feedback", label: "💬 Feedback & Surveys" },
                      { id: "health", label: "🏥 Health & Wellness" },
                      { id: "personal", label: "🎉 Personal & RSVPs" }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategoryFilter(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer select-none outline-none focus:outline-none focus:ring-0 ${
                          activeCategoryFilter === cat.id
                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                            : "bg-card border-border text-foreground hover:bg-secondary hover:border-primary/40"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border dark:border-border rounded-lg bg-card dark:bg-background col-span-full">
                      <FileText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                      <h4 className="font-bold text-foreground dark:text-muted-foreground text-sm">No Templates Found</h4>
                      <p className="text-xs text-muted-foreground mt-1">Try resetting search filters.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {filteredTemplates.map(tmpl => (
                        <div 
                          key={tmpl.id} 
                          onClick={() => handleCloneTemplate(tmpl)}
                          className="group border border-border rounded-2xl overflow-hidden bg-card hover:shadow-md hover:-translate-y-0.5 hover:border-primary cursor-pointer transition-all duration-200 flex flex-col justify-between"
                        >
                          <div>
                            <div className="h-32 bg-background dark:bg-background relative flex items-center justify-center text-muted-foreground overflow-hidden">
                              {tmpl.thumbnail ? (
                                <img src={tmpl.thumbnail} alt={tmpl.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <FileText className="w-10 h-10 text-muted-foreground dark:text-foreground" />
                              )}
                              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-primary text-white text-xs font-bold uppercase tracking-wider">
                                {tmpl.category}
                              </span>
                            </div>
                            <div className="p-4">
                              <h4 className="font-bold text-sm text-foreground dark:text-foreground truncate group-hover:text-primary transition-colors">{tmpl.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                            </div>
                          </div>
                          <div className="px-4 pb-4">
                            <span className="text-xs text-primary font-bold flex items-center space-x-1">
                              <span>Use Template</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 5: ANALYTICS INSIGHTS */}
              {activeTab === "analytics" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Workspace Analytics Hub</h2>
                    <p className="text-muted-foreground text-sm mt-1">Aggregated statistics, dropout analyses, and device breakdowns.</p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { 
                        label: "Completion Rate", 
                        value: workspaceAnalytics ? `${workspaceAnalytics.completionRate}%` : "0%", 
                        desc: "Submissions per total view" 
                      },
                      { 
                        label: "Average Submission Time", 
                        value: workspaceAnalytics 
                          ? `${Math.floor(workspaceAnalytics.averageSubmissionTime / 60)}m ${workspaceAnalytics.averageSubmissionTime % 60}s` 
                          : "0s", 
                        desc: "Average responder fill-time" 
                      },
                      { 
                        label: "Total Views", 
                        value: workspaceAnalytics ? `${workspaceAnalytics.totalViews.toLocaleString()} views` : "0 views", 
                        desc: "Across all published routes" 
                      }
                    ].map((m, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{m.label}</span>
                        </CardHeader>
                        <CardContent>
                          <h3 className="text-2xl font-bold text-foreground dark:text-foreground">{m.value}</h3>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{m.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Historical trend Area Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Workspace Traffic & Submissions Trend</CardTitle>
                      <CardDescription>Daily activity aggregated across all forms.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      {workspaceAnalytics?.trends && workspaceAnalytics.trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={workspaceAnalytics.trends}>
                            <defs>
                              <linearGradient id="workspaceViews" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C6AFA" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#7C6AFA" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="workspaceSubs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#30A46C" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#30A46C" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.3)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                            <Area type="monotone" dataKey="views" stroke="#7C6AFA" strokeWidth={2} fillOpacity={1} fill="url(#workspaceViews)" name="Views" />
                            <Area type="monotone" dataKey="submissions" stroke="#30A46C" strokeWidth={2} fillOpacity={1} fill="url(#workspaceSubs)" name="Submissions" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                          No trend data available for this range.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Charts funnel */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Device breakdown Pie/Donut Chart via Recharts */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-1">
                          <Monitor className="w-5 h-5 text-primary" />
                          <span>Device View Statistics</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[160px]">
                        {workspaceAnalytics?.deviceStats && 
                        (workspaceAnalytics.deviceStats.desktop > 0 || 
                         workspaceAnalytics.deviceStats.mobile > 0 || 
                         workspaceAnalytics.deviceStats.tablet > 0) ? (
                          <>
                            <div className="h-28 w-28 relative">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Desktop', value: workspaceAnalytics.deviceStats.desktop || 0, color: '#7C6AFA' },
                                      { name: 'Mobile', value: workspaceAnalytics.deviceStats.mobile || 0, color: '#E5A519' },
                                      { name: 'Tablet', value: workspaceAnalytics.deviceStats.tablet || 0, color: '#E5A519' }
                                    ].filter(d => d.value > 0)}
                                    innerRadius={28}
                                    outerRadius={44}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                    {[
                                      { color: '#7C6AFA' },
                                      { color: '#E5A519' },
                                      { color: '#E5A519' }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="w-3 h-3 rounded-full bg-primary" />
                                <span className="font-bold text-foreground dark:text-muted-foreground">
                                  Desktop: {workspaceAnalytics.deviceStats.desktop} views
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="w-3 h-3 rounded-full bg-primary/80" />
                                <span className="font-bold text-foreground dark:text-muted-foreground">
                                  Mobile: {workspaceAnalytics.deviceStats.mobile} views
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="w-3 h-3 rounded-full bg-primary/60" />
                                <span className="font-bold text-foreground dark:text-muted-foreground">
                                  Tablet: {workspaceAnalytics.deviceStats.tablet} views
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground w-full">
                            No device traffic data recorded yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top performing forms */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performing Forms</CardTitle>
                        <CardDescription>Responders sheet submissions per form.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3.5 min-h-[160px] flex flex-col justify-center">
                        {forms && forms.length > 0 ? (
                          forms.slice(0, 4).map((f: any, idx: number) => {
                            const fSubmissions = f._count?.responses || 0;
                            const maxSubmissions = Math.max(...forms.map((form: any) => form._count?.responses || 1));
                            const pct = Math.max(5, Math.round((fSubmissions / maxSubmissions) * 100));
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-foreground dark:text-muted-foreground">
                                  <span>{f.title}</span>
                                  <span className="font-mono text-muted-foreground">{fSubmissions} responses</span>
                                </div>
                                <div className="w-full bg-secondary dark:bg-card h-2 rounded-lg overflow-hidden">
                                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-xs text-muted-foreground">
                            Create a form to see performing conversion rates.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* TAB 6: AI ASSISTANT CHATBOT */}
              {activeTab === "ai_assistant" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center space-x-2">
                      <Bot className="w-6 h-6 text-primary" />
                      <span>Inline AI Chat Assistant</span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Query recommendations, generate layout questions, or request summaries.</p>
                  </div>

                  <Card className="h-[480px] flex flex-col justify-between border border-border dark:border-border">
                    <CardHeader className="border-b border-border dark:border-border py-3">
                      <CardTitle className="text-sm font-semibold flex items-center space-x-1.5">
                        <Bot className="w-4 h-4 text-primary" />
                        <span>PromptForm AI Bot Copilot</span>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-primary text-white rounded-br-none shadow-sm'
                              : 'bg-secondary dark:bg-background text-foreground dark:text-slate-200 rounded-bl-none border border-border/60 dark:border-border'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {isChatTyping && (
                        <div className="flex justify-start">
                          <div className="p-3 bg-secondary text-muted-foreground rounded-2xl rounded-bl-none text-xs flex items-center space-x-1 border border-border">
                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardContent className="p-3 border-t border-border dark:border-border">
                      <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="e.g. How do I make questions optional? Add Slack Webhooks..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="h-9 text-xs rounded-lg focus:ring-1"
                          required
                        />
                        <Button type="submit" size="sm" className="h-9 w-10 flex items-center justify-center p-0">
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}



              {/* TAB 8: TEAM WORKSPACES */}
              {activeTab === "team" && (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Workspace Teams</h2>
                      <p className="text-muted-foreground dark:text-slate-450 text-sm mt-1">Concurrently edit forms, share response tables, and track activity logs.</p>
                    </div>
                    <Button onClick={() => setIsCreateTeamOpen(true)} className="space-x-1 text-xs">
                      <Plus className="w-4 h-4" />
                      <span>Create Team</span>
                    </Button>
                  </div>

                  {/* Teams List */}
                  {teams.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <Users className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                        <h4 className="font-bold text-foreground dark:text-muted-foreground text-sm">No collaboration teams created yet.</h4>
                        <p className="text-xs text-muted-foreground mt-1">Create a team and invite editors to start concurrent reviews.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {teams.map(team => (
                        <Card key={team.id} className="border border-border dark:border-border flex flex-col justify-between">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-base font-semibold">{team.name}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                  Owner: {team.owner?.email === user?.email ? "You" : team.owner?.name || team.owner?.email}
                                </CardDescription>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { setSelectedTeamId(team.id); setIsInviteOpen(true); }}
                                className="space-x-1 h-7 px-2.5 text-xs text-primary dark:text-primary"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Invite</span>
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Members ({team.members?.length || 0}):</p>
                            <div className="flex flex-wrap gap-2">
                              {team.members?.map((m: any) => (
                                <span key={m.id} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-secondary dark:bg-background text-xs font-bold border border-border dark:border-border text-foreground dark:text-muted-foreground">
                                  <span>{m.user?.name || m.user?.email.split('@')[0]}</span>
                                  <span className="text-xs text-slate-450 uppercase">({m.role})</span>
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Mock Activity Tracking Logs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Collaborator Activity logs</CardTitle>
                      <CardDescription>Recent actions logged by workspace collaborators.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { actor: "You", action: "modified forms settings password code", target: "Customer Review Form", time: "20m ago" },
                        { actor: "admin@promptform.ai", action: "joined marketing workspace team", target: "Marketing Team", time: "2h ago" },
                        { actor: "editor@promptform.ai", action: "created new rating question", target: "Product Feedback quiz", time: "1d ago" }
                      ].map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-border dark:border-border pb-3 text-xs last:border-none">
                          <div>
                            <span className="font-bold text-foreground dark:text-foreground">{log.actor}</span>
                            <span className="text-muted-foreground mx-1">{log.action} on</span>
                            <span className="font-semibold text-primary">{log.target}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* TAB 9: INTEGRATIONS */}
              {activeTab === "integrations" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Workspace Integrations</h2>
                    <p className="text-muted-foreground text-sm mt-1">Connect PromptForm Forms to external channels, database logs, and spreadsheets.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    {integrations.map(item => (
                      <Card key={item.id} className="border border-border dark:border-border flex justify-between items-start p-5 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-start space-x-3.5">
                          <div className="p-3 bg-primary/10 text-primary rounded-xl">
                            <item.icon className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-foreground dark:text-foreground">{item.name}</h4>
                            <p className="text-xs text-muted-foreground leading-normal max-w-xs">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={item.connected}
                          onChange={() => handleToggleIntegration(item.id)}
                        />
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 10: SETTINGS PANEL & THEME CUSTOMIZER */}
              {activeTab === "settings" && (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Settings className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Workspace Settings & Customization</h2>
                      </div>
                      <p className="text-muted-foreground text-sm mt-1">Configure global workspace font styles, primary themes, API developer tokens, and billing tiers.</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/60 p-2 rounded-xl border border-border/50 text-xs font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Live Realtime Theme Engine Active</span>
                    </div>
                  </div>

                  {/* SECTION 1: WORKSPACE THEME & TYPOGRAPHY STUDIO */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2 border-b border-border/40 pb-2">
                      <Palette className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Workspace Theme & Typography Studio</h3>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                      {/* Select Controls & Font Cards */}
                      <div className="lg:col-span-7 space-y-6">
                        <Card className="border border-border/80 dark:border-border/60 shadow-sm">
                          <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>Font Typography Selection</span>
                              <span className="text-xs font-normal text-muted-foreground">Click card or dropdown to apply</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Select from featured premium font styles or full typography library</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-5">

                            {/* Featured Premium Font Selector Cards */}
                            <div className="space-y-2.5">
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">⭐ Featured Theme Fonts</label>
                              <div className="grid sm:grid-cols-3 gap-3">

                                {/* 1. Manrope */}
                                <div
                                  onClick={() => setThemeFont("Manrope")}
                                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                    themeFont === "Manrope"
                                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/40"
                                      : "border-border/80 dark:border-white/10 hover:border-primary/50 bg-card hover:bg-muted/30"
                                  }`}
                                >
                                  {themeFont === "Manrope" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-1.5">
                                      ⭐ Premium + AI
                                    </span>
                                    <h4 className="text-base font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                      Manrope
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                      ⭐ Premium + modern + AI
                                    </p>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-border/40 text-xs font-semibold text-foreground/90" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    Aa Bb Cc 123
                                  </div>
                                </div>

                                {/* 2. Inter */}
                                <div
                                  onClick={() => setThemeFont("Inter")}
                                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                    themeFont === "Inter"
                                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/40"
                                      : "border-border/80 dark:border-white/10 hover:border-primary/50 bg-card hover:bg-muted/30"
                                  }`}
                                >
                                  {themeFont === "Inter" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-1.5">
                                      ⭐ Clean + Readable
                                    </span>
                                    <h4 className="text-base font-bold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                                      Inter
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                      ⭐ Clean + professional + highly readable
                                    </p>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-border/40 text-xs font-semibold text-foreground/90" style={{ fontFamily: "'Inter', sans-serif" }}>
                                    Aa Bb Cc 123
                                  </div>
                                </div>

                                {/* 3. Plus Jakarta Sans */}
                                <div
                                  onClick={() => setThemeFont("Plus Jakarta Sans")}
                                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                    themeFont === "Plus Jakarta Sans"
                                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-2 ring-primary/40"
                                      : "border-border/80 dark:border-white/10 hover:border-primary/50 bg-card hover:bg-muted/30"
                                  }`}
                                >
                                  {themeFont === "Plus Jakarta Sans" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-1.5">
                                      ⭐ Stylish & Friendly
                                    </span>
                                    <h4 className="text-base font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      Plus Jakarta Sans
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                      ⭐ Stylish + friendly + modern
                                    </p>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-border/40 text-xs font-semibold text-foreground/90" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Aa Bb Cc 123
                                  </div>
                                </div>

                              </div>
                            </div>

                            {/* Full Typography Dropdown Select */}
                            <div className="space-y-1.5 pt-1">
                              <label className="block text-xs font-semibold text-muted-foreground">Or Pick From All Typography Fonts</label>
                              <select
                                value={themeFont}
                                onChange={(e) => setThemeFont(e.target.value)}
                                className="w-full px-4 py-2.5 border border-border bg-card rounded-xl text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/25 focus:border-primary focus:outline-none shadow-xs cursor-pointer"
                              >
                                <option value="Manrope">Manrope — ⭐ Premium + modern + AI</option>
                                <option value="Inter">Inter — ⭐ Clean + professional + highly readable</option>
                                <option value="Plus Jakarta Sans">Plus Jakarta Sans — ⭐ Stylish + friendly + modern</option>
                                <option value="Poppins">Poppins — Modern Geometric & Smooth</option>
                                <option value="Outfit">Outfit — Contemporary & Sleek</option>
                                <option value="Roboto">Roboto — Clean Material Design</option>
                                <option value="Space Grotesk">Space Grotesk — Tech & Monospace Grotesque</option>
                                <option value="Playfair Display">Playfair Display — Elegant Serif</option>
                                <option value="Georgia">Georgia — Classic Serif</option>
                                <option value="Courier New">Courier New — Monospace Code</option>
                              </select>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border border-border shadow-xs">
                          <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-base">Color & Border Customizer</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-5">
                            {/* Primary Color Pick */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-semibold text-muted-foreground">Primary Accent Color</label>
                              <div className="flex flex-wrap items-center gap-3">
                                <input
                                  type="color"
                                  value={themeColor}
                                  onChange={(e) => setThemeColor(e.target.value)}
                                  className="w-12 h-10 border border-border rounded-xl cursor-pointer bg-transparent p-0.5"
                                />
                                <Input
                                  type="text"
                                  value={themeColor}
                                  onChange={(e) => setThemeColor(e.target.value)}
                                  className="h-10 text-xs max-w-[150px] font-mono font-bold"
                                />
                                <div className="flex items-center space-x-1.5">
                                  {["#8B6B55", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"].map((hex) => (
                                    <button
                                      key={hex}
                                      type="button"
                                      onClick={() => setThemeColor(hex)}
                                      className="w-7 h-7 rounded-full border border-white/20 transition-transform hover:scale-110 shadow-xs cursor-pointer"
                                      style={{ backgroundColor: hex }}
                                      title={hex}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Layout Border Style */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-semibold text-muted-foreground">Component Corner Style</label>
                              <select
                                value={themeStyle}
                                onChange={(e) => setThemeStyle(e.target.value)}
                                className="w-full px-4 py-2.5 border border-border bg-card rounded-xl text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/25 focus:border-primary focus:outline-none shadow-xs cursor-pointer"
                              >
                                <option value="rounded">Rounded Corners (Modern SaaS design)</option>
                                <option value="sharp">Sharp Edges (Formal & Minimalist)</option>
                                <option value="glass">Glassmorphism Card Backgrounds</option>
                              </select>
                            </div>

                            <Button 
                              onClick={() => {
                                localStorage.setItem('promptform_theme_color', themeColor);
                                localStorage.setItem('promptform_theme_font', themeFont);
                                localStorage.setItem('promptform_theme_style', themeStyle);
                                window.dispatchEvent(new Event('promptform_theme_update'));
                                alert(`Workspace Theme Updated! Active Font set to "${themeFont}".`);
                              }} 
                              className="mt-4 w-full h-11 rounded-xl bg-primary hover:opacity-90 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] font-bold space-x-2 text-primary-foreground cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Apply Theme Settings Workspace-Wide</span>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Realtime Live Preview Column */}
                      <div className="lg:col-span-5 sticky top-6">
                        <Card className="border border-border shadow-lg bg-card p-6 rounded-3xl relative overflow-hidden">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5 text-primary" />
                              Live Theme Preview Studio
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                              Font: {themeFont}
                            </span>
                          </div>

                          {/* Interactive Form Card Preview */}
                          <div 
                            className={`w-full bg-card border border-border p-6 shadow-xl space-y-5 transition-all duration-300 ${
                              themeStyle === 'rounded' ? 'rounded-2xl' : 
                              themeStyle === 'sharp' ? 'rounded-none' : 
                              'rounded-2xl backdrop-blur-xl bg-card/60'
                            }`}
                            style={{ 
                              fontFamily: themeFont === 'Manrope' ? "'Manrope', sans-serif" :
                                          themeFont === 'Plus Jakarta Sans' ? "'Plus Jakarta Sans', sans-serif" :
                                          themeFont === 'Inter' ? "'Inter', sans-serif" :
                                          themeFont === 'Poppins' ? "'Poppins', sans-serif" :
                                          themeFont === 'Outfit' ? "'Outfit', sans-serif" :
                                          themeFont === 'Space Grotesk' ? "'Space Grotesk', sans-serif" :
                                          themeFont === 'Georgia' ? "Georgia, serif" :
                                          themeFont === 'Courier New' ? "'Courier New', monospace" :
                                          themeFont 
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="h-3.5 w-16 rounded-full shadow-xs" style={{ backgroundColor: themeColor }} />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Accent Indicator</span>
                            </div>

                            <div>
                              <h3 className="text-xl font-bold text-foreground tracking-tight">
                                Customer Satisfaction Survey
                              </h3>
                              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                This live preview reflects your chosen typography font (<span className="font-semibold text-foreground">{themeFont}</span>), primary color, and border style.
                              </p>
                            </div>

                            <div className="space-y-3 pt-1">
                              <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                  Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  defaultValue="Alex Morgan"
                                  className={`w-full px-3 py-2 border bg-background text-xs text-foreground focus:outline-none ${themeStyle === 'rounded' ? 'rounded-lg' : 'rounded-none'}`}
                                  style={{ borderColor: themeColor }}
                                  readOnly
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                  Typography Rendering Test
                                </label>
                                <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
                                  <p className="font-normal text-muted-foreground">Regular 400: The quick brown fox jumps over the lazy dog</p>
                                  <p className="font-semibold text-foreground">SemiBold 600: The quick brown fox jumps over the lazy dog</p>
                                  <p className="font-bold text-foreground">Bold 700: The quick brown fox jumps over the lazy dog</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`w-full py-2.5 px-4 text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                                  themeStyle === 'rounded' ? 'rounded-xl' : 'rounded-none'
                                }`}
                                style={{ backgroundColor: themeColor }}
                              >
                                Submit Form Response
                              </button>
                            </div>
                          </div>

                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: DEVELOPER API KEYS & BILLING */}
                  <div className="pt-6 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-border/40 pb-2">
                      <Key className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Developer API & Subscription Billing</h3>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Column 1: API keys */}
                      <Card className="lg:col-span-2 space-y-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Developer API Webhook Keys</CardTitle>
                          <CardDescription>Generate tokens to push form responses directly to custom API endpoints.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <form onSubmit={handleCreateApiKey} className="flex gap-2">
                            <Input
                              placeholder="e.g. Production hook Token"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              className="h-9 text-xs rounded-lg focus:ring-1"
                              required
                            />
                            <Button type="submit" size="sm" className="h-9 text-xs whitespace-nowrap">
                              Generate key
                            </Button>
                          </form>

                          <div className="space-y-2.5 pt-2">
                            {apiKeys.map(k => (
                              <div key={k.id} className="p-3 bg-background border border-border rounded-lg flex items-center justify-between text-xs font-mono">
                                <div className="space-y-1 font-sans">
                                  <p className="font-bold font-mono text-foreground dark:text-foreground">{k.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{k.token}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 p-2 h-auto" onClick={() => handleDeleteApiKey(k.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Column 2: Billing / Plan info */}
                      <Card className="relative overflow-hidden border-border">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-xs font-bold uppercase rounded-bl-xl tracking-wider">active</div>
                        <CardHeader>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">billing plan tier</span>
                          <CardTitle className="text-2xl font-bold text-foreground dark:text-foreground capitalize mt-1">
                            {user?.subscriptionPlan === 'free' ? 'Starter suite' : 'Enterprise PRO'}
                          </CardTitle>
                          <CardDescription>Renews on Aug 25, 2026</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-slate-705 dark:text-muted-foreground">
                              <span>Dynamic forms count:</span>
                              <span className="font-bold">Unlimited</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-705 dark:text-muted-foreground">
                              <span>Team seats maximum:</span>
                              <span className="font-bold">12 Users</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-705 dark:text-muted-foreground">
                              <span>SaaS template marketplaces:</span>
                              <span className="font-bold">Fully unlocked</span>
                            </div>
                          </div>

                          {user?.subscriptionPlan === 'free' && (
                            <Button 
                              onClick={async () => {
                                try {
                                  await api.put('/auth/profile', { subscriptionPlan: 'pro' });
                                  alert("Upgraded to Enterprise PRO tier successfully!");
                                  loadDashboardData();
                                } catch(e) {}
                              }} 
                              className="w-full text-xs h-9"
                            >
                              Upgrade subscription
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Column 3: Appearance Settings */}
                  <Card className="mt-8">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Appearance Settings</CardTitle>
                      <CardDescription>Customize the application theme mode and accent color dynamically.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-8 pt-4">
                      {/* Theme Select */}
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground">Theme Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: "light", label: "Light Mode", icon: Sun },
                            { id: "dark", label: "Dark Mode", icon: Moon },
                            { id: "system", label: "System Mode", icon: Monitor }
                          ].map(t => {
                            const IconComponent = t.icon;
                            const isActive = theme === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-[20px] border transition-all duration-200 ${
                                  isActive
                                    ? "border-primary bg-primary/5 text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                }`}
                              >
                                <IconComponent className="w-5 h-5 mb-2" />
                                <span className="text-xs font-semibold">{t.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Accent Colors */}
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground">Accent Color</label>
                        <div className="flex flex-wrap gap-3 pt-1">
                          {[
                            { id: "blue", label: "Classic Blue", hex: "#2563EB" },
                            { id: "purple", label: "Vivid Purple", hex: "#7C3AED" },
                            { id: "green", label: "Emerald Green", hex: "#059669" },
                            { id: "orange", label: "Bright Orange", hex: "#EA580C" },
                            { id: "red", label: "Bold Red", hex: "#DC2626" }
                          ].map(c => {
                            const isActive = accentColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => changeAccent(c.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-200 ${
                                  isActive
                                    ? "border-primary bg-primary/5 text-foreground font-semibold"
                                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                                <span className="text-xs">{c.label} {c.id === "blue" && "(Default)"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      {/* MODAL: CREATE TEAM */}
      <Modal 
        isOpen={isCreateTeamOpen} 
        onClose={() => setIsCreateTeamOpen(false)} 
        title="Create Collaboration Team"
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
          <Input
            label="Team Workspace Name"
            placeholder="e.g., Marketing surveys"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)}>Cancel</Button>
            <Button type="submit">Create Team</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: INVITE MEMBER */}
      <Modal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        title="Invite Collaborator"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Email Address"
            placeholder="colleague@company.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-305 mb-1">Collaborator Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-background rounded-lg text-sm focus-visible:ring-ring focus:outline-none"
            >
              <option value="editor">Editor (Can edit questions/settings)</option>
              <option value="admin">Admin (Can invite members and delete forms)</option>
              <option value="viewer">Viewer (Can view response tables only)</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          loadDashboardData();
        }}
        restriction={activeRestriction}
      />
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
