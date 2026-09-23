"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, FileText, Sparkles, LayoutGrid, BarChart3, Settings, 
  CreditCard, Shield, Users, ArrowRight, X, Layers, Plus, CheckCircle
} from 'lucide-react';
import { api } from '@/lib/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'Forms' | 'Templates' | 'Navigation' | 'Actions';
  icon: any;
  action: () => void;
  badge?: string;
}

export function GlobalSearchModal({ isOpen, onClose, initialQuery = "" }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [userForms, setUserForms] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      
      // Fetch user forms for search
      const fetchForms = async () => {
        try {
          const token = localStorage.getItem('promptform_access_token');
          if (token) {
            const forms = await api.get('/forms');
            setUserForms(forms || []);
          }
        } catch (e) {
          // Ignore
        }
      };
      fetchForms();
    }
  }, [isOpen, initialQuery]);

  // Static Navigation Items
  const navItems: SearchItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      description: 'View form metrics, response counts, and recent activity',
      category: 'Navigation',
      icon: LayoutGrid,
      action: () => { router.push('/dashboard'); onClose(); },
      badge: 'Page'
    },
    {
      id: 'nav-ai-generator',
      title: 'AI Form Generator',
      description: 'Generate complete forms & quizzes from natural language prompts',
      category: 'Actions',
      icon: Sparkles,
      action: () => { router.push('/dashboard?tab=ai_generator'); onClose(); },
      badge: 'AI Tool'
    },
    {
      id: 'nav-create-form',
      title: 'Create Blank Form',
      description: 'Start building a new form from scratch with drag & drop',
      category: 'Actions',
      icon: Plus,
      action: async () => {
        try {
          const newForm = await api.post('/forms', { title: "Untitled Form", description: "Created from search bar." });
          router.push(`/builder/${newForm.id}`);
        } catch (e) {
          router.push('/dashboard');
        }
        onClose();
      },
      badge: 'Action'
    },
    {
      id: 'nav-templates',
      title: 'Form Templates Library',
      description: 'Explore 30+ pre-built intake forms, quizzes, and surveys',
      category: 'Navigation',
      icon: Layers,
      action: () => { router.push('/templates'); onClose(); },
      badge: 'Page'
    },
    {
      id: 'nav-analytics',
      title: 'Analytics & Reports',
      description: 'Analyze submission trends, completion rates, and insights',
      category: 'Navigation',
      icon: BarChart3,
      action: () => { router.push('/dashboard?tab=analytics'); onClose(); },
      badge: 'Page'
    },
    {
      id: 'nav-billing',
      title: 'Billing & Plan Upgrade',
      description: 'Manage subscription plans, invoices, and AI credits',
      category: 'Navigation',
      icon: CreditCard,
      action: () => { router.push('/billing'); onClose(); },
      badge: 'Settings'
    },
    {
      id: 'nav-settings',
      title: 'Account & API Settings',
      description: 'Manage user profile, API keys, and workspace preferences',
      category: 'Navigation',
      icon: Settings,
      action: () => { router.push('/dashboard?tab=settings'); onClose(); },
      badge: 'Settings'
    },
    {
      id: 'nav-security',
      title: 'Security & Anti-Cheat Exam Mode',
      description: 'Configure proctoring rules, timers, and tab-switch limits',
      category: 'Actions',
      icon: Shield,
      action: () => { router.push('/security'); onClose(); },
      badge: 'Pro'
    }
  ];

  // Static Templates Items
  const templateItems: SearchItem[] = [
    {
      id: 'tmpl-dentistry',
      title: 'Patient Intake Form (Dentistry Clinic)',
      description: 'Dental medical history, insurance info, and consent fields',
      category: 'Templates',
      icon: FileText,
      action: () => { router.push('/templates?category=healthcare'); onClose(); },
      badge: 'Medical'
    },
    {
      id: 'tmpl-js-quiz',
      title: 'JavaScript Developer Skill Quiz',
      description: 'Anti-cheat 5-question code assessment with timer',
      category: 'Templates',
      icon: FileText,
      action: () => { router.push('/templates?category=education'); onClose(); },
      badge: 'Exam'
    },
    {
      id: 'tmpl-nps',
      title: 'Customer Satisfaction & NPS Survey',
      description: 'Net Promoter Score rating with logic branching',
      category: 'Templates',
      icon: FileText,
      action: () => { router.push('/templates?category=feedback'); onClose(); },
      badge: 'Feedback'
    },
    {
      id: 'tmpl-event',
      title: 'Tech Launch Event Registration',
      description: 'Attendee RSVP, T-shirt size selector, and dietary choices',
      category: 'Templates',
      icon: FileText,
      action: () => { router.push('/templates?category=events'); onClose(); },
      badge: 'Event'
    }
  ];

  // User Forms Items
  const formItems: SearchItem[] = userForms.map(f => ({
    id: `user-form-${f.id}`,
    title: f.title || "Untitled Form",
    description: f.description || `Form with ${f.questions?.length || 0} questions`,
    category: 'Forms',
    icon: FileText,
    action: () => { router.push(`/builder/${f.id}`); onClose(); },
    badge: f.isPublished ? 'Live' : 'Draft'
  }));

  // Combine all searchable items
  const allItems: SearchItem[] = [...formItems, ...navItems, ...templateItems];

  // Filter items based on query
  const filteredItems = query.trim() === "" 
    ? allItems 
    : allItems.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
        />

        {/* Search Modal Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top Search Input Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-border/80 dark:border-zinc-800 bg-muted/20 dark:bg-zinc-950/60">
            <Search className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
            <input 
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search forms, templates, AI prompts, pages... (Try 'Intake' or 'Quiz')"
              className="w-full bg-transparent text-sm md:text-base text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg bg-muted/60 dark:bg-zinc-800 text-xs font-semibold"
            >
              ESC
            </button>
          </div>

          {/* Results Container */}
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Search className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No matching results found for "{query}"</p>
                <p className="text-xs text-muted-foreground">Try searching for 'Forms', 'Quiz', 'Pricing', or 'Templates'</p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const IconComponent = item.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary/10 dark:bg-primary/20 text-foreground border border-primary/30' 
                        : 'hover:bg-muted/40 dark:hover:bg-zinc-800/50 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                        isSelected 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-secondary dark:bg-zinc-800 text-foreground'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-semibold truncate ${isSelected ? 'text-foreground font-bold' : 'text-foreground'}`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800 text-muted-foreground border border-border/50">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      <span className="text-[11px] font-medium text-muted-foreground/70 hidden sm:inline">
                        {item.category}
                      </span>
                      <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-primary' : 'text-muted-foreground/40'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts Info */}
          <div className="px-4 py-2.5 bg-muted/30 dark:bg-zinc-950/80 border-t border-border/80 dark:border-zinc-800 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted dark:bg-zinc-800 border border-border font-sans font-bold">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted dark:bg-zinc-800 border border-border font-sans font-bold">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted dark:bg-zinc-800 border border-border font-sans font-bold">ESC</kbd>
                <span>Close</span>
              </span>
            </div>
            <span className="font-semibold text-primary">PromptForm AI Search</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
