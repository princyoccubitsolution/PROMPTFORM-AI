"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { 
  Sparkles, ArrowRight, Building, GraduationCap, Briefcase, 
  Palette, User, Compass, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import { BrandedLogo } from '@/components/NavigationHeader';
import { api } from '@/lib/api';

const ROLES = [
  { id: 'creator', label: 'Creator / Designer', icon: Palette, description: 'Design engaging forms & surveys' },
  { id: 'developer', label: 'Developer / Engineer', icon: User, description: 'Integrate API & logic workflows' },
  { id: 'educator', label: 'Educator / Teacher', icon: GraduationCap, description: 'Conduct quiz & proctored exams' },
  { id: 'business', label: 'Business Owner', icon: Building, description: 'Manage customer feedback & leads' },
  { id: 'recruiter', label: 'HR / Recruiter', icon: Briefcase, description: 'Recruit talent & gather applications' },
  { id: 'other', label: 'Other', icon: Compass, description: 'Explore various form builder tools' }
];

const GOALS = [
  { id: 'ai_gen', label: 'Generate forms with AI ⚡' },
  { id: 'proctor', label: 'Anti-cheat online exams 🔒' },
  { id: 'analytics', label: 'Analyze responses & feedback 📊' },
  { id: 'theme', label: 'Customize premium themes 🎨' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-fill default workspace name based on localStorage
    const userName = localStorage.getItem('promptform_user_name');
    if (userName) {
      setWorkspaceName(`${userName.split(' ')[0]}'s Workspace`);
    } else {
      setWorkspaceName('My Workspace');
    }
  }, []);

  const handleToggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError("Please provide a workspace name.");
      return;
    }
    if (!selectedRole) {
      setError("Please select your primary role.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Create team workspace in the database using backend API
      await api.post('/teams', { name: workspaceName.trim() });
      
      // Onboarding complete flag
      localStorage.setItem('promptform_needs_onboarding', 'false');
      
      // Redirect to main dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to complete workspace configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background dark:bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-25%] left-[30%] w-[500px] h-[500px] bg-primary/6 dark:bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[400px] h-[400px] bg-primary/5 dark:bg-primary/2 rounded-full blur-[100px] pointer-events-none" />

      {/* Onboarding Card */}
      <div className="w-full max-w-[520px] bg-card dark:bg-card border border-border dark:border-border rounded-3xl shadow-xl dark:shadow-black/80 p-8 space-y-6 relative z-10 transition-colors duration-200">
        
        {/* Brand & Progress */}
        <div className="flex justify-between items-center pb-2 border-b border-border dark:border-border">
          <div className="flex items-center space-x-2">
            <BrandedLogo size="sm" />
            <span className="font-extrabold text-sm tracking-tight text-foreground dark:text-foreground ml-2">Workspace Configuration</span>
          </div>
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase bg-primary/10 px-2.5 py-0.5 rounded-full">
            Onboarding
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-foreground">Customize your workspace</h1>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
            Let's configure your PromptForm AI workspace to suit your workflows and business goals.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCompleteSetup} className="space-y-5">
          {/* Workspace Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
              Workspace / Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. My Team Workspace"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              className="w-full px-4 h-10 text-[12px] font-medium rounded-lg bg-muted dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground placeholder-muted-foreground dark:placeholder-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>

          {/* Role Grid Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
              What is your primary role?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map(role => {
                const isSelected = selectedRole === role.id;
                const IconComponent = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setError(null);
                    }}
                    className={`flex items-start text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/5 border-primary shadow-[0_2px_10px_rgba(37,99,235,0.1)]'
                        : 'bg-muted dark:bg-muted/10 border-border dark:border-border hover:bg-accent dark:hover:bg-accent hover:border-border dark:hover:border-border'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg mr-2.5 transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted dark:bg-muted text-muted-foreground'}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground dark:text-foreground'}`}>
                        {role.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground dark:text-muted-foreground truncate mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals Checklist */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
              What do you plan to achieve? (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(goal => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleToggleGoal(goal.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-muted dark:bg-muted/10 border-border dark:border-border text-muted-foreground hover:bg-accent dark:hover:bg-accent hover:border-border dark:hover:border-border'
                    }`}
                  >
                    {goal.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-full font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10 transition-all duration-200 flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer pt-0.5"
          >
            <span>{isLoading ? 'Creating workspace...' : 'Complete Setup'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
