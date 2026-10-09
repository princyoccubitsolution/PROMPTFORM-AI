"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Plus, FileText, BarChart3, Users, Settings, LogOut, 
  Folder, LayoutGrid, Bot, Palette, Sun, Moon,
  Search, Bell, ChevronDown, Menu, X, Trash2,
  Inbox, Zap, CheckCheck, Filter, ExternalLink
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
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

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
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        setNotifications([]);
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
      <header className="h-16 md:h-18 border-b border-border/70 dark:border-white/10 bg-white/70 dark:bg-black/60 backdrop-blur-2xl px-5 md:px-8 flex items-center justify-between flex-shrink-0 relative z-40 transition-all duration-300 shadow-xs">
        
        {/* Left: Logo */}
        <div className="flex items-center justify-start min-w-0">
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
        <div className="flex items-center justify-end space-x-2 min-w-0">
          
          {/* Search Action Icon */}
          <button 
            onClick={() => setSearchModalOpen(true)}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs relative group"
            title="Search... (Ctrl+K)"
          >
            <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
          </button>

          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-muted-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            aria-label="Toggle theme mode"
          >
            {mounted && theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-foreground/80" />}
          </button>

          <div className="relative" ref={notificationsRef}>
            {(() => {
              const unreadCount = notifications.filter(n => !n.read).length;
              return (
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="w-9 h-9 sm:w-8.5 sm:h-8.5 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/80 dark:bg-zinc-900/80 hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground transition-all flex items-center justify-center relative cursor-pointer shadow-2xs group"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4 text-foreground/80 group-hover:text-primary transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-extrabold text-white rounded-full flex items-center justify-center ring-2 ring-background shadow-md shadow-indigo-500/30 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })()}
            
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-96 sm:w-[420px] bg-card dark:bg-zinc-950 rounded-3xl border border-border dark:border-zinc-800 shadow-2xl shadow-black/10 dark:shadow-black/50 z-50 p-4 select-none overflow-hidden"
                >
                  {/* Top Bar Header */}
                  <div className="flex justify-between items-center mb-3.5 pb-2.5 border-b border-border/60 dark:border-zinc-800/60">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-foreground dark:text-zinc-100 block">
                          Notifications
                        </span>
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                          Live Activity Feed
                        </span>
                      </div>
                    </div>

                    {notifications.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <button 
                          onClick={async () => {
                            try {
                              await api.post('/forms/notifications/live/read-all');
                              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            } catch (err) {}
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] text-primary font-semibold hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Read All</span>
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await api.delete('/forms/notifications/live');
                              setNotifications([]);
                            } catch (err) {}
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] text-destructive font-semibold hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Clear all alerts"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  {notifications.length > 0 && (
                    <div className="flex items-center space-x-1 mb-3 p-1 rounded-xl bg-muted/60 dark:bg-zinc-900/60 text-[11px] font-semibold">
                      <button
                        onClick={() => setFilterUnreadOnly(false)}
                        className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                          !filterUnreadOnly 
                            ? 'bg-card dark:bg-zinc-800 text-foreground dark:text-zinc-100 shadow-2xs font-bold' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All Alerts ({notifications.length})
                      </button>
                      <button
                        onClick={() => setFilterUnreadOnly(true)}
                        className={`flex-1 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                          filterUnreadOnly 
                            ? 'bg-card dark:bg-zinc-800 text-foreground dark:text-zinc-100 shadow-2xs font-bold' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Unread ({notifications.filter(n => !n.read).length})
                      </button>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-0.5">
                    {(() => {
                      const displayedList = filterUnreadOnly 
                        ? notifications.filter(n => !n.read) 
                        : notifications;

                      if (displayedList.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-muted/50 dark:bg-zinc-900/50 flex items-center justify-center text-muted-foreground/60">
                              <Bell className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-foreground dark:text-zinc-200">
                              {filterUnreadOnly ? "No Unread Notifications" : "No Alerts Yet"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {filterUnreadOnly ? "You're all caught up!" : "New submissions and form activity will appear here live."}
                            </p>
                          </div>
                        );
                      }

                      return displayedList.map(n => {
                        const isResponse = n.text?.toLowerCase().includes('response') || n.text?.toLowerCase().includes('submission');
                        const isTeam = /team|member|invite|workspace|joined/i.test(n.text || '');
                        const isTest = n.text?.toLowerCase().includes('test');

                        return (
                          <div 
                            key={n.id} 
                            onClick={async () => {
                              if (!n.read) {
                                try {
                                  await api.post(`/forms/notifications/live/${n.id}/read`);
                                  setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                                } catch (err) {}
                              }
                              if (n.formId) {
                                setNotificationsOpen(false);
                                router.push(`/builder/${n.formId}?tab=responses`);
                              }
                            }}
                            className={`p-3 rounded-2xl text-xs transition-colors border relative group cursor-pointer ${
                              n.read
                                ? 'bg-card dark:bg-zinc-950 border-border/50 dark:border-zinc-800/60 text-muted-foreground hover:bg-muted/50 dark:hover:bg-zinc-900'
                                : 'bg-primary/[0.06] dark:bg-primary/10 border-primary/25 text-foreground hover:bg-primary/10'
                            }`}
                          >
                            {!n.read && (
                              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary ring-2 ring-card dark:ring-zinc-950" aria-label="Unread" />
                            )}
                            <div className="flex items-start space-x-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isResponse ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                isTeam ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                isTest ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-violet-500/10 text-violet-500 border border-violet-500/20'
                              }`}>
                                {isResponse ? <Inbox className="w-4 h-4" /> :
                                 isTeam ? <Users className="w-4 h-4" /> :
                                 isTest ? <Zap className="w-4 h-4" /> :
                                 <Sparkles className="w-4 h-4" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1.5 pr-3">
                                  <p className={`leading-snug break-words [overflow-wrap:anywhere] line-clamp-3 ${n.read ? 'font-medium text-foreground/75 dark:text-zinc-300' : 'font-semibold text-foreground dark:text-zinc-100'}`}>
                                    {n.text}
                                  </p>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await api.delete(`/forms/notifications/live/${n.id}`);
                                        setNotifications(prev => prev.filter(item => item.id !== n.id));
                                      } catch (err) {}
                                    }}
                                    className="opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 -mt-0.5 rounded-md hover:bg-destructive/10 transition-opacity cursor-pointer shrink-0"
                                    title="Remove alert"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {n.time || 'Just now'}
                                  </span>
                                  {n.formId && (
                                    <span className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5">
                                      View Responses <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Bottom Footer Quick Action */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 dark:border-zinc-800/60 flex items-center justify-between">
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.post('/forms/notifications/live/test');
                          if (res?.notification) {
                            setNotifications(prev => [res.notification, ...prev]);
                          }
                        } catch (err) {}
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-muted/80 hover:bg-accent dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-bold text-foreground dark:text-zinc-100 transition-all cursor-pointer flex items-center justify-center gap-2 border border-border/50 shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                      <span>Trigger Test Notification</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative ml-1" ref={userPopoverRef}>
            <button 
              onClick={() => setUserPopoverOpen(!userPopoverOpen)}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 select-none border border-border/80 dark:border-zinc-800"
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
            className="md:hidden w-9 h-9 sm:w-8 sm:h-8 rounded-xl border border-border/80 dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted text-muted-foreground transition-all flex items-center justify-center ml-1"
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
            className="md:hidden border-b border-border/80 bg-card max-h-[calc(100vh-4.5rem)] overflow-y-auto flex-shrink-0 z-10"
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
