"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Folder, ArrowRight, Clock, MoreVertical, 
  Trash2, Edit2, LogOut, Activity, Loader2, AlertCircle, 
  ExternalLink, FileText, CheckCircle2, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TeamDetailWorkspace } from './TeamDetailWorkspace';
import { api } from '@/lib/api';

interface TeamDashboardProps {
  user: any;
  forms: any[];
  onOpenMyForms?: () => void;
}

export function TeamDashboard({ user, forms, onOpenMyForms }: TeamDashboardProps) {
  const router = useRouter();

  // State
  const [teams, setTeams] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Team Modal
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Quick Edit Modal
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Active Menu Dropdown ID
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [teamsData, activitiesData] = await Promise.all([
        api.get('/teams'),
        api.get('/teams/activity/recent').catch(() => [])
      ]);
      setTeams(teamsData || []);
      setRecentActivities(activitiesData || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load teams.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreatingTeam(true);
    try {
      const newTeam = await api.post('/teams', {
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined
      });
      setIsCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      await loadData();
      // Automatically open the new team workspace
      setSelectedTeamId(newTeam.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create team.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleQuickRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editName.trim()) return;

    setIsUpdating(true);
    try {
      await api.put(`/teams/${editingTeam.id}`, { name: editName.trim() });
      setEditingTeam(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to rename team.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/teams/${teamId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete team.');
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

  // If a team is selected, show the full TeamDetailWorkspace!
  if (selectedTeamId) {
    return (
      <TeamDetailWorkspace
        teamId={selectedTeamId}
        onBack={() => {
          setSelectedTeamId(null);
          loadData();
        }}
        currentUser={user}
      />
    );
  }

  // Personal workspace stats
  const personalForms = forms.filter(f => !f.teamId && f.ownerId === user?.id);
  const personalResponsesCount = personalForms.reduce((sum, f) => sum + (f._count?.responses || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Teams & Workspaces</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Organize forms across collaborative spaces with team members and permission controls.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateTeamOpen(true)}
          className="text-xs font-semibold space-x-1.5 h-9 shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Team</span>
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="h-7 text-xs">
            Try Again
          </Button>
        </div>
      )}

      {/* SECTION 1: MY WORKSPACE */}
      <div className="space-y-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          My Workspace
        </span>

        <Card className="border border-border/90 bg-gradient-to-br from-card via-card to-secondary/30 p-5 shadow-xs hover:border-primary/40 transition-all rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-foreground">
                    {user?.name ? `${user.name}'s Workspace` : 'Personal Workspace'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-muted text-muted-foreground uppercase border border-border">
                    Personal
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="flex items-center space-x-4 pt-1 text-xs text-muted-foreground font-medium">
                  <span>{personalForms.length} {personalForms.length === 1 ? 'Form' : 'Forms'}</span>
                  <span>•</span>
                  <span>{personalResponsesCount} {personalResponsesCount === 1 ? 'Response' : 'Responses'}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                if (onOpenMyForms) onOpenMyForms();
                else router.push('/dashboard?tab=my_forms');
              }}
              variant="outline"
              size="sm"
              className="text-xs font-semibold space-x-1.5 h-9 shrink-0 border-border"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </Button>
          </div>
        </Card>
      </div>

      {/* SECTION 2: YOUR TEAMS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Your Teams ({teams.length})
          </span>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <Card key={i} className="p-5 border border-border animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-full mt-4" />
              </Card>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card className="text-center py-12 border border-dashed border-border/80">
            <CardContent className="space-y-3">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h4 className="font-bold text-foreground text-sm">You haven't created or joined a team yet.</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create a team workspace to collaborate with editors and share response dashboards.
              </p>
              <Button
                onClick={() => setIsCreateTeamOpen(true)}
                size="sm"
                className="text-xs font-semibold space-x-1 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Team</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {teams.map(team => {
              const isOwner = team.isOwner;
              const ownerEmail = team.owner?.email;
              const ownerLabel = ownerEmail === user?.email ? "You" : team.owner?.name || ownerEmail;

              return (
                <Card 
                  key={team.id} 
                  className="border border-border hover:border-primary/50 transition-all p-5 flex flex-col justify-between space-y-4 bg-card rounded-2xl relative group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h3 
                          onClick={() => setSelectedTeamId(team.id)}
                          className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                        >
                          {team.name}
                        </h3>
                        {team.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">{team.description}</p>
                        ) : null}
                      </div>

                      {/* More Menu Dropdown */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === team.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-20 py-1 text-xs animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setSelectedTeamId(team.id);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-muted text-foreground flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Folder className="w-3.5 h-3.5 text-primary" />
                              <span>Open Workspace</span>
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingTeam(team);
                                  setEditName(team.name);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-muted text-foreground flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Rename</span>
                              </button>
                            )}
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDeleteTeam(team.id, team.name);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-destructive/10 text-destructive flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Team</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Pill Row */}
                    <div className="flex items-center space-x-4 text-xs font-semibold text-muted-foreground pt-1">
                      <span>{team.memberCount} {team.memberCount === 1 ? 'Member' : 'Members'}</span>
                      <span>•</span>
                      <span>{team.formCount} {team.formCount === 1 ? 'Form' : 'Forms'}</span>
                      <span>•</span>
                      <span>{team.responseCount} {team.responseCount === 1 ? 'Response' : 'Responses'}</span>
                    </div>

                    <div className="pt-2 flex flex-col space-y-1 text-xs text-muted-foreground border-t border-border/60">
                      <div>Owner: <span className="font-semibold text-foreground">{ownerLabel}</span></div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>Last activity: {formatRelativeTime(team.lastActivity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Role: <span className="text-primary font-bold">{team.userRole}</span>
                    </span>

                    <Button
                      onClick={() => setSelectedTeamId(team.id)}
                      size="sm"
                      className="text-xs font-semibold space-x-1.5 h-8"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: RECENT ACTIVITY */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </span>
          {recentActivities.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-semibold">Live Realtime Log</span>
          )}
        </div>

        <Card className="border border-border">
          <CardContent className="p-4">
            {recentActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                <p className="font-semibold text-foreground">No recent collaborator activity yet.</p>
                <p className="text-[11px] mt-0.5">Actions taken by teammates will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentActivities.slice(0, 5).map((act, idx) => {
                  const actorName = act.user?.name || act.user?.email.split('@')[0] || "Someone";
                  const isYou = act.userId === user?.id;

                  return (
                    <div key={act.id || idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground">
                          {isYou ? "You" : actorName}
                        </span>
                        <span className="text-muted-foreground">
                          {act.details || act.action.replace('_', ' ').toLowerCase()}
                        </span>
                        {act.targetTitle && (
                          <span className="font-semibold text-primary">
                            "{act.targetTitle}"
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL: CREATE TEAM */}
      <Modal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        title="Create Team Workspace"
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
          <Input
            label="Team Workspace Name"
            placeholder="e.g. Marketing Studio, Growth Team"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Description (Optional)</label>
            <textarea
              placeholder="What is this workspace used for?"
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingTeam}>
              {isCreatingTeam ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Create Team</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: QUICK RENAME */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        title="Rename Team Workspace"
      >
        <form onSubmit={handleQuickRename} className="space-y-4">
          <Input
            label="Team Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingTeam(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              <span>Save</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
