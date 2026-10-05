"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, FileText, BarChart3, Plus, ArrowLeft, Search, Filter, 
  Settings, UserPlus, MoreVertical, ExternalLink, Edit3, Trash2, 
  Activity, Shield, CheckCircle2, AlertCircle, Clock, Eye, MessageSquare, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

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

  const loadTeamDetail = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get(`/teams/${teamId}`);
      setTeam(data);
      setEditName(data.name || '');
      setEditDescription(data.description || '');
      setForms(data.forms || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load team workspace.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await api.post(`/teams/${teamId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setIsInviteOpen(false);
      setInviteEmail('');
      await loadTeamDetail();
      alert('Member added to team workspace successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeMemberRole = async (memberId: string, role: string) => {
    try {
      await api.put(`/teams/${teamId}/members/${memberId}`, { role });
      await loadTeamDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this workspace?`)) return;

    try {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      await loadTeamDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
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
      await loadTeamDetail();
      alert('Team workspace updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update team.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${team?.name}"? All associated team settings will be removed.`)) return;

    try {
      await api.delete(`/teams/${teamId}`);
      alert('Team workspace deleted.');
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete team.');
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
      alert(err.message || 'Failed to create form in team.');
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

  return (
    <div className="space-y-6">
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
          <Button
            onClick={() => setIsCreateFormOpen(true)}
            size="sm"
            className="text-xs space-x-1.5 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Create Form</span>
          </Button>

          {permissions.canManageMembers && (
            <Button
              onClick={() => setIsInviteOpen(true)}
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
                  <p className="text-xs">Create your first collaborative form to get started.</p>
                  <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="mt-2 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create Form
                  </Button>
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
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          <span>Open</span>
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

              <Button
                onClick={() => setIsCreateFormOpen(true)}
                size="sm"
                className="h-9 text-xs font-semibold whitespace-nowrap space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Form</span>
              </Button>
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
                    : 'Start building collaborative dynamic forms for this workspace.'}
                </p>
                <Button onClick={() => setIsCreateFormOpen(true)} size="sm" className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create First Form
                </Button>
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
                      <Edit3 className="w-3 h-3 mr-1" /> Edit
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
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Workspace Members</h3>
              <p className="text-xs text-muted-foreground">Collaborators who can build forms and view results in this team.</p>
            </div>
            {permissions.canManageMembers && (
              <Button onClick={() => setIsInviteOpen(true)} size="sm" className="text-xs space-x-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite People</span>
              </Button>
            )}
          </div>

          <div className="border border-border rounded-xl divide-y divide-border bg-card overflow-hidden">
            {team.members.map((m: any) => {
              const displayName = m.user.name || m.user.email.split('@')[0];
              const isSelf = m.userId === currentUser?.id;
              const isOwner = m.role === 'owner';

              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">You</span>
                        )}
                        {isOwner && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{m.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {permissions.canManageMembers && !isOwner && !isSelf ? (
                      <>
                        <div className="w-28">
                          <CustomSelect
                            value={m.role}
                            onChange={(val) => handleChangeMemberRole(m.id, val)}
                            options={[
                              { value: "editor", label: "Editor" },
                              { value: "admin", label: "Admin" },
                              { value: "viewer", label: "Viewer" }
                            ]}
                            size="sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(m.id, m.user.email)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary border border-border capitalize">
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                { value: "editor", label: "Editor (Can create and edit forms)" },
                { value: "admin", label: "Admin (Can manage members and forms)" },
                { value: "viewer", label: "Viewer (Read-only access)" }
              ]}
              size="md"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Send Invitation</span>
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
