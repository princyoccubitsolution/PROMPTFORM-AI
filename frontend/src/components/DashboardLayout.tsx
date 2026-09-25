"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, FileText, BarChart3, Users, Settings, LogOut, 
  Folder, LayoutGrid, Bot, Palette, Sun, Moon,
  Search, Bell, ChevronDown, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandedLogo } from '@/components/NavigationHeader';
import { api } from '@/lib/api';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

export function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Layout States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);

  // User Data
  const [user, setUser] = useState<any>({ name: "User", email: "", subscriptionPlan: "free", credits: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const userPopoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userPopoverRef.current && !userPopoverRef.current.contains(event.target as Node)) {
        setUserPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('promptform_access_token');
      if (!token) return;
      try {
        const profile = await api.get('/auth/me');
        if (profile) {
          setUser({
            name: profile.name || profile.email?.split('@')[0] || "User",
            email: profile.email || "",
            subscriptionPlan: profile.subscriptionPlan || "free",
            credits: profile.credits ?? 0
          });
        }
      } catch (err) {
        // Fallback silently if offline or token expired
      }
    };

    const fetchLiveNotifications = async () => {
      const token = localStorage.getItem('promptform_access_token');
      if (!token) return;
      try {
        const data = await api.get('/forms/notifications/live');
        setNotifications(data);
      } catch (err) {
        // Fallback to empty if not logged in or backend fails
      }
    };

    fetchUserProfile();
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('promptform_access_token');
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
      alert(err.message || "Failed to create form.");
    }
  };

  const handleNavigation = (id: string, customAction?: () => void) => {
    if (customAction) {
      customAction();
    } else {
      router.push(`/dashboard?tab=${id}`);
    }
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground flex flex-col overflow-hidden h-screen">
      
      {/* GLOBAL TOP HEADER */}
      <header className="h-16 md:h-18 border-b border-border/70 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl px-5 md:px-8 flex items-center justify-between flex-shrink-0 z-30 transition-all duration-300 shadow-xs">
        
        {/* Left: Logo */}
        <div className="flex items-center justify-start min-w-[170px]">
          <BrandedLogo size="md" showTagline={false} />
        </div>

        {/* Center: Tab Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 mx-6">
          <div className="flex items-center space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "my_forms", label: "Forms" },
              { id: "ai_generator", label: "AI Generator", action: () => router.push('/dashboard/ai') },
              { id: "templates", label: "Templates" },
              { id: "analytics", label: "Analytics" },
              { id: "team", label: "Team" },
              { id: "settings", label: "Settings" }
            ].map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.action)}
                  className={`relative flex items-center py-2 text-base md:text-[15px] tracking-tight transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'text-primary font-bold scale-[1.02]' 
                      : 'text-muted-foreground/90 font-semibold hover:text-foreground hover:scale-[1.01]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="headerActiveTab" 
                      className="absolute -bottom-2.5 left-0 right-0 h-[3px] rounded-t-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Actions & Profile */}
        <div className="flex items-center justify-end space-x-2 min-w-[150px]">
          
          {/* Search Action Icon */}
          <button 
            onClick={() => setSearchModalOpen(true)}
            className="w-8 h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs relative group"
            title="Search... (Ctrl+K)"
          >
            <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
          </button>

          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-muted-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            aria-label="Toggle theme mode"
          >
            {mounted && theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-foreground/80" />}
          </button>

          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-8 h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground transition-all flex items-center justify-center relative cursor-pointer shadow-2xs"
            >
              <Bell className="w-4 h-4 text-foreground/80" />
              <span className="w-2 h-2 rounded-full bg-primary absolute right-1.5 top-1.5 ring-2 ring-background" />
            </button>
            
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-card dark:bg-card rounded-2xl border border-border dark:border-border shadow-xl z-50 p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-sm text-foreground dark:text-foreground">Recent Alerts</span>
                    <button 
                      onClick={async () => {
                        try {
                          await api.post('/forms/notifications/live/read-all');
                          setNotifications(prev => prev.map(n => ({...n, read: true})));
                        } catch (err) {}
                      }}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2.5 rounded-lg text-xs transition-colors border ${n.read ? 'bg-transparent border-transparent text-muted-foreground dark:text-muted-foreground' : 'bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground'}`}>
                        <p className="leading-normal font-medium">{n.text}</p>
                        <span className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative ml-1" ref={userPopoverRef}>
            <button 
              onClick={() => setUserPopoverOpen(!userPopoverOpen)}
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 select-none border border-border/80 dark:border-zinc-800"
            >
              {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "U"}
            </button>

            {userPopoverOpen && (
              <div className="absolute right-0 mt-2 w-56 z-50 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="truncate pb-2 border-b border-border dark:border-border">
                  <p className="text-xs font-bold text-foreground dark:text-foreground truncate">{user?.name || 'Suite Member'}</p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">{user?.email}</p>
                </div>

                {(() => {
                  const maxCredits = user?.subscriptionPlan === 'pro' ? 500 : user?.subscriptionPlan === 'enterprise' ? 9999 : 100;
                  return (
                    <div className="bg-muted dark:bg-muted p-2.5 rounded-lg border border-border dark:border-border text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">Tier:</span>
                        <span className="font-bold text-primary capitalize">{user?.subscriptionPlan || 'Free'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">Credits:</span>
                        <span className="font-bold text-foreground dark:text-foreground">{user?.credits || 0} / {maxCredits}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col space-y-1">
                  <button 
                    onClick={() => {
                      setUserPopoverOpen(false);
                      handleNavigation("settings");
                    }}
                    className="flex items-center space-x-2 w-full px-2 py-1.5 rounded-lg text-left text-xs text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      setUserPopoverOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center space-x-2 w-full px-2 py-1.5 rounded-lg text-left text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden w-8 h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted text-muted-foreground transition-all flex items-center justify-center ml-1"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE SUB-NAVBAR DROPDOWN */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-border/80 bg-card overflow-hidden flex-shrink-0 z-10"
          >
            <div className="p-3 space-y-1">
              {[
                { id: "overview", label: "Overview", icon: Folder },
                { id: "my_forms", label: "Forms", icon: FileText },
                { id: "ai_generator", label: "AI Generator", icon: Sparkles, action: () => router.push('/dashboard/ai') },
                { id: "create_form", label: "Create Blank Form", icon: Plus, action: handleCreateBlankForm },
                { id: "templates", label: "Templates", icon: LayoutGrid },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "ai_assistant", label: "AI Assistant", icon: Bot },
                { id: "team", label: "Team", icon: Users },
                { id: "settings", label: "Settings", icon: Settings }
              ].map(item => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id, item.action)}
                    className={`flex items-center space-x-3 w-full p-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT WORKSPACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background/50 dark:bg-background/50 relative">
        {/* Floating Create Form Button */}
        {activeTab !== 'ai_generator' && (
          <div className="fixed bottom-6 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button 
              onClick={handleCreateBlankForm} 
              className="rounded-full h-14 w-14 shadow-2xl shadow-primary/40 flex items-center justify-center p-0 hover:scale-105 active:scale-95 group"
            >
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </Button>
          </div>
        )}

        {children}
      </main>

      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
        initialQuery={searchQuery}
      />
    </div>
  );
}
