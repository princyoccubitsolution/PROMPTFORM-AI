"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, FileText, BarChart3, Plus, ArrowLeft, Search, Filter,
  Settings, UserPlus, MoreVertical, ExternalLink, Edit3, Trash2,
  Activity, Shield, CheckCircle2, AlertCircle, Clock, Eye, MessageSquare, Loader2, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Modal } from '@/components/ui/Modal';
import { Toaster, useToasts } from '@/components/ui/Toaster';
import { TeamPeoplePanel, TeamInvitation } from './TeamPeoplePanel';
import { api } from '@/lib/api';

// Members, roles and invitations refresh this often while the workspace is open and visible
const LIVE_REFRESH_MS = 5000;

interface TeamDetailWorkspaceProps {
  teamId: string;
  onBack: () => void;
  currentUser: any;
}

export function TeamDetailWorkspace({ teamId, onBack, currentUser }: TeamDetailWorkspaceProps) {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'forms' | 'people' | 'activity'>('overview');
  const [team, setTeam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forms tab states
  const [forms, setForms] = useState<any[]>([]);
  const [formSearch, setFormSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('latest');
  const [isFormsLoading, setIsFormsLoading] = useState(false);

  // Activity tab states
  const [activities, setActivities] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  // Set when an invitation was created but its email could not be delivered
  const [undelivered, setUndelivered] = useState<{ message: string; url: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Invitations (owners and admins)
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const { toasts, notify, dismiss } = useToasts();
  const refreshInFlight = useRef(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Create Form in Team Modal
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  useEffect(() => {
    loadTeamDetail();
  }, [teamId]);

  useEffect(() => {
    if (activeSubTab === 'forms') {
      loadTeamForms();
    } else if (activeSubTab === 'activity') {
      loadTeamActivity();
    }
  }, [activeSubTab, formSearch, statusFilter, sortBy]);

  /** Loads the workspace; `silent` refreshes in place (live updates) without the full-page spinner. */
  const loadTeamDetail = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const data = await api.get(`/teams/${teamId}`);
      setTeam(data);
      if (!silent) {
        setEditName(data.name || '');
        setEditDescription(data.description || '');
        setForms(data.forms || []);
      }
      if (data.permissions?.canManageMembers) {
        const invites = await api.get(`/teams/${teamId}/invitations`).catch(() => null);
        if (Array.isArray(invites)) setInvitations(invites);
      } else {
        setInvitations([]);
      }
    } catch (err: any) {
      const msg: string = err.message || 'Failed to load team workspace.';
      // During live refresh only a lost membership is surfaced; transient errors retry on the next tick
      if (!silent || /not a member|not found/i.test(msg)) {
        setErrorMessage(/not a member/i.test(msg) ? 'You no longer have access to this workspace.' : msg);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const liveRefresh = useCallback(async () => {
    if (refreshInFlight.current || document.visibilityState !== 'visible') return;
    refreshInFlight.current = true;
    try {
      await loadTeamDetail(true);
      if (activeSubTab === 'activity') {
        const data = await api.get(`/teams/${teamId}/activity`).catch(() => null);
        if (Array.isArray(data)) setActivities(data);
      }
    } finally {
      refreshInFlight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, activeSubTab]);

  // Live updates: joins, role changes, removals and invitation status appear without reloading
  useEffect(() => {
    if (isLoading || errorMessage) return;
    const interval = setInterval(liveRefresh, LIVE_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') liveRefresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [liveRefresh, isLoading, errorMessage]);

  const loadTeamForms = async () => {
    setIsFormsLoading(true);
    try {
      const query = new URLSearchParams({
        search: formSearch,
        status: statusFilter,
        sort: sortBy
      });
      const data = await api.get(`/teams/${teamId}/forms?${query.toString()}`);
      setForms(data);
    } catch (err: any) {
      console.error('Failed to load team forms:', err);
    } finally {
      setIsFormsLoading(false);
    }
  };

  const loadTeamActivity = async () => {
    setIsActivityLoading(true);
    try {
      const data = await api.get(`/teams/${teamId}/activity`);
      setActivities(data);
    } catch (err: any) {
      console.error('Failed to load team activity:', err);
    } finally {
      setIsActivityLoading(false);
    }
  };

  const openInviteModal = () => {
    setInviteEmail('');
    setInviteRole('editor');
    setInviteError(null);
    setUndelivered(null);
    setIsInviteOpen(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setUndelivered(null);
    try {
      const res = await api.post(`/teams/${teamId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteEmail('');
      await loadTeamDetail(true);
      if (res?.emailSent === false) {
        // Keep the modal open so the link can be copied and shared another way
        setUndelivered({ message: res.message, url: res.inviteUrl });
      } else {
        setIsInviteOpen(false);
        notify(res?.message || 'Invitation sent.');
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!undelivered) return;
    try {
      await navigator.clipboard.writeText(undelivered.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the link stays visible and selectable
    }
  };

  const handleChangeMemberRole = async (memberId: string, role: string) => {
    try {
      const updated = await api.put(`/teams/${teamId}/members/${memberId}`, { role });
      await loadTeamDetail(true);
      notify(`${updated?.user?.name || updated?.user?.email || 'Member'} is now ${role === 'admin' ? 'an' : 'a'} ${role}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update member role.', 'error');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!confirm(`Remove ${member.user.email} from this workspace? They will lose access to its forms.`)) return;

    try {
      await api.delete(`/teams/${teamId}/members/${member.id}`);
      await loadTeamDetail(true);
      notify(`${member.user.email} was removed from the workspace.`);
    } catch (err: any) {
      notify(err.message || 'Failed to remove member.', 'error');
    }
  };

  const handleLeaveWorkspace = async (member: any) => {
    if (!confirm(`Leave "${team?.name}"? You will lose access to its forms unless you are invited again.`)) return;

    try {
      await api.delete(`/teams/${teamId}/members/${member.id}`);
      onBack();
    } catch (err: any) {
      notify(err.message || 'Failed to leave workspace.', 'error');
    }
  };

  const handleResendInvite = async (invite: TeamInvitation) => {
    setBusyInviteId(invite.id);
    try {
      const res = await api.post(`/teams/${teamId}/invitations/${invite.id}/resend`);
      setInvitations(prev => prev.map(i => (i.id === invite.id ? res.invitation : i)));
      if (res.emailSent === false) {
        setUndelivered({ message: res.message, url: res.inviteUrl });
        setInviteError(null);
        setIsInviteOpen(true);
      } else {
        notify(res.message || `Invitation resent to ${invite.email}.`);
      }
    } catch (err: any) {
      notify(err.message || 'Failed to resend invitation.', 'error');
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleCancelInvite = async (invite: TeamInvitation) => {
    if (!confirm(`Cancel the invitation for ${invite.email}? Their invitation link will stop working.`)) return;

    setBusyInviteId(invite.id);
    try {
      await api.delete(`/teams/${teamId}/invitations/${invite.id}`);
      setInvitations(prev => prev.map(i => (i.id === invite.id ? { ...i, status: 'revoked' } : i)));
      notify(`Invitation for ${invite.email} cancelled.`);
    } catch (err: any) {
      notify(err.message || 'Failed to cancel invitation.', 'error');
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSavingSettings(true);
    try {
      await api.put(`/teams/${teamId}`, {
        name: editName.trim(),
        description: editDescription.trim() || null
      });
      setIsSettingsOpen(false);
      await loadTeamDetail(true);
      notify('Team workspace updated successfully.');
    } catch (err: any) {
      notify(err.message || 'Failed to update team.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${team?.name}"? All associated team settings will be removed.`)) return;

    try {
      await api.delete(`/teams/${teamId}`);
      onBack();
    } catch (err: any) {
      notify(err.message || 'Failed to delete team.', 'error');
    }
  };

  const handleCreateFormInTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    setIsCreatingForm(true);
    try {
      const newForm = await api.post('/forms', {
        title: newFormTitle.trim(),
        description: newFormDescription.trim() || undefined,
        teamId: teamId
      });
      setIsCreateFormOpen(false);
      setNewFormTitle('');
      setNewFormDescription('');
      router.push(`/builder/${newForm.id}`);
    } catch (err: any) {
      notify(err.message || 'Failed to create form in team.', 'error');
    } finally {
      setIsCreatingForm(false);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'recently';
    const date = new Date(isoString);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff / 86400)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Opening team workspace...</p>
      </div>
    );
  }

  if (errorMessage || !team) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">Unable to load team workspace</h3>
        <p className="text-xs text-muted-foreground">{errorMessage || 'Workspace not found.'}</p>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Teams
        </Button>
      </div>
    );
  }

  const { permissions, stats } = team;
  // Viewers are read-only: they can open forms and responses but not create or edit forms
  const canCreateForms = Boolean(permissions.canCreateForms ?? permissions.canEditForms);
  const canEditForms = Boolean(permissions.canEditForms);

  return (
    <div className="space-y-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
            <span>Teams & Workspaces</span>
          </button>
          
          <div className="flex items-center space-x-3 pt-0.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{team.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
              {permissions.userRole}
            </span>
          </div>

          {team.description && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{team.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {canCreateForms && (
            <Button
              onClick={() => setIsCreateFormOpen(true)}
              size="sm"
              className="text-xs space-x-1.5 h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Create Form</span>
            </Button>
          )}

          {permissions.canManageMembers && (
            <Button
              onClick={openInviteModal}
              variant="outline"
              size="sm"
              className="text-xs space-x-1.5 h-9 border-border"
            >
              <UserPlus className="w-3.5 h-3.5 text-primary" />
              <span>Invite</span>
            </Button>
          )}

          {permissions.canManageMembers && (
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
              title="Team Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-border/70 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'forms', label: `Forms (${team.forms?.length || 0})`, icon: FileText },
          { id: 'people', label: `People (${team.members?.length || 0})`, icon: Users },
          { id: 'activity', label: 'Activity', icon: Activity },
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Forms</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalForms}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border border-border/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Responses</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalResponses}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border border-border/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Members</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalMembers}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Recently Active Forms */}
          <Card className="border border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recently Active Forms</CardTitle>
                  <CardDescription className="text-xs">Latest forms created or edited by team members</CardDescription>
                </div>
                {team.forms?.length > 0 && (
                  <Button
                    onClick={() => setActiveSubTab('forms')}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    View All ({team.forms.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {team.forms?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No forms in this workspace yet.</p>
                  {canCreateForms ? (
                    <>
                      <p className="text-xs">Create your first collaborative form to get started.</p>
                      <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="mt-2 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Create Form
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs">Forms created by editors and admins will appear here.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {team.forms.slice(0, 5).map((f: any) => (
                    <div key={f.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate" onClick={() => router.push(`/builder/${f.id}`)}>
                            {f.title}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            f.status === 'PUBLISHED' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <span>Created by {f.owner?.name || f.owner?.email.split('@')[0]}</span>
                          <span>•</span>
                          <span>{f.responseCount} {f.responseCount === 1 ? 'response' : 'responses'}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(f.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/builder/${f.id}`)}
                          className="h-8 text-xs font-semibold"
                        >
                          {canEditForms ? <Edit3 className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                          <span>{canEditForms ? 'Open' : 'View'}</span>
                        </Button>
                        {f.uniqueShareId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/f/${f.uniqueShareId}`, '_blank')}
                            className="h-8 text-xs text-muted-foreground"
                            title="Preview Public Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= TAB 2: FORMS ================= */}
      {activeSubTab === 'forms' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search team forms..."
                value={formSearch}
                onChange={(e) => setFormSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="w-32">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    { value: "ALL", label: "All Status" },
                    { value: "PUBLISHED", label: "Published" },
                    { value: "DRAFT", label: "Draft" },
                    { value: "CLOSED", label: "Closed" }
                  ]}
                  size="sm"
                />
              </div>

              <div className="w-36">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  options={[
                    { value: "latest", label: "Latest Updated" },
                    { value: "oldest", label: "Oldest Created" },
                    { value: "title", label: "Title (A-Z)" }
                  ]}
                  size="sm"
                />
              </div>

              {canCreateForms && (
                <Button
                  onClick={() => setIsCreateFormOpen(true)}
                  size="sm"
                  className="h-9 text-xs font-semibold whitespace-nowrap space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Form</span>
                </Button>
              )}
            </div>
          </div>

          {/* Forms List */}
          {isFormsLoading ? (
            <div className="py-16 text-center space-y-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs">Loading forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <Card className="text-center py-12 border border-dashed border-border">
              <CardContent className="space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h4 className="font-bold text-foreground text-sm">No forms match your search criteria</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {formSearch || statusFilter !== 'ALL'
                    ? 'Try clearing your filters or search terms.'
                    : canCreateForms
                    ? 'Start building collaborative dynamic forms for this workspace.'
                    : 'Forms created by editors and admins will appear here.'}
                </p>
                {canCreateForms && (
                  <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create First Form
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map(f => (
                <Card key={f.id} className="border border-border hover:border-primary/50 transition-all flex flex-col justify-between p-5 space-y-4 group">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 
                        onClick={() => router.push(`/builder/${f.id}`)}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                      >
                        {f.title}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        f.status === 'PUBLISHED' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {f.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {f.description || "No description provided."}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                      <span>{f.responseCount} responses</span>
                      <span className="text-[11px]">{formatRelativeTime(f.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                    <Button
                      onClick={() => router.push(`/builder/${f.id}`)}
                      size="sm"
                      className="w-full text-xs font-semibold h-8"
                    >
                      {canEditForms ? <Edit3 className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                      {canEditForms ? 'Edit' : 'View'}
                    </Button>
                    <Button
                      onClick={() => router.push(`/responses/${f.id}`)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold h-8 border-border"
                    >
                      <BarChart3 className="w-3 h-3 mr-1" /> Responses
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PEOPLE ================= */}
      {activeSubTab === 'people' && (
        <TeamPeoplePanel
          team={team}
          currentUserId={currentUser?.id}
          invitations={invitations}
          busyInviteId={busyInviteId}
          onInvite={openInviteModal}
          onChangeRole={handleChangeMemberRole}
          onRemoveMember={handleRemoveMember}
          onLeave={handleLeaveWorkspace}
          onResendInvite={handleResendInvite}
          onCancelInvite={handleCancelInvite}
        />
      )}

      {/* ================= TAB 4: ACTIVITY ================= */}
      {activeSubTab === 'activity' && (
        <Card className="border border-border animate-fade-in">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">Workspace Activity History</CardTitle>
            <CardDescription className="text-xs">Real-time actions logged by team members</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {isActivityLoading ? (
              <div className="py-12 text-center space-y-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs">Loading activity logs...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="font-semibold text-foreground">No activity recorded yet.</p>
                <p className="text-xs">Actions taken by team members will be logged here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs pb-3 border-b border-border/50 last:border-none">
                    <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] text-foreground">
                      {(act.user?.name || act.user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-snug">
                        <span className="font-bold">{act.user?.name || act.user?.email.split('@')[0]}</span>{' '}
                        <span className="text-muted-foreground">
                          {act.details || act.action.replace('_', ' ').toLowerCase()}
                        </span>
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: INVITE MEMBER */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={`Invite to ${team.name}`}
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Invite anyone by email. They'll get a link to join this workspace, which expires after 7 days.
          </p>

          <Input
            label="Email Address"
            placeholder="colleague@example.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Role in Workspace</label>
            <CustomSelect
              value={inviteRole}
              onChange={(val) => setInviteRole(val as any)}
              options={[
                { value: "viewer", label: "Viewer (Read-only: view forms and responses)" },
                { value: "editor", label: "Editor (Create, edit and share forms)" },
                ...(permissions.canManageAdmins
                  ? [{ value: "admin", label: "Admin (Manage members, forms and settings)" }]
                  : [])
              ]}
              size="md"
            />
          </div>

          {inviteError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {undelivered && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <p className="text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{undelivered.message}</span>
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={undelivered.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs h-8"
                  aria-label="Invitation link"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleCopyInviteLink} className="h-8 text-xs shrink-0">
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="ml-1">{linkCopied ? 'Copied' : 'Copy link'}</span>
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              {undelivered ? 'Done' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Send Invite</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TEAM SETTINGS */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Workspace Settings"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Input
            label="Team Workspace Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Description (Optional)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What does this team do?"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border">
            {permissions.canDeleteTeam ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteTeam}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Team
              </Button>
            ) : <div />}

            <div className="flex space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingSettings}>
                {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE FORM IN TEAM */}
      <Modal
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        title={`Create Form in ${team.name}`}
      >
        <form onSubmit={handleCreateFormInTeam} className="space-y-4">
          <Input
            label="Form Title"
            placeholder="e.g. Q4 Feedback Survey"
            value={newFormTitle}
            onChange={(e) => setNewFormTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Description (Optional)</label>
            <textarea
              value={newFormDescription}
              onChange={(e) => setNewFormDescription(e.target.value)}
              placeholder="Purpose or instructions for responders"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingForm}>
              {isCreatingForm ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              <span>Create & Open Builder</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
