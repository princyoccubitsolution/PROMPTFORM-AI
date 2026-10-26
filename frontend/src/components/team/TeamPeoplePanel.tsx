"use client";

import React, { useMemo, useState } from 'react';
import {
  Search, UserPlus, Trash2, Mail, RotateCw, X, LogOut, Shield, Loader2, Clock, CheckCircle2, AlertCircle, Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: { name: string | null; email: string } | null;
  expiresAt: string;
  lastSentAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface TeamPeoplePanelProps {
  team: any;
  currentUserId?: string;
  invitations: TeamInvitation[];
  busyInviteId: string | null;
  onInvite: () => void;
  onChangeRole: (memberId: string, role: string) => void;
  onRemoveMember: (member: any) => void;
  onLeave: (member: any) => void;
  onResendInvite: (invite: TeamInvitation) => void;
  onCancelInvite: (invite: TeamInvitation) => void;
}

type InviteTab = 'pending' | 'accepted' | 'expired';

const ROLE_DESCRIPTIONS: { role: string; text: string }[] = [
  { role: 'Owner', text: 'Full access, billing, deleting the workspace and managing all users.' },
  { role: 'Admin', text: 'Invite and remove users, manage forms and settings, view analytics.' },
  { role: 'Editor', text: 'Create, edit and share forms, and view responses.' },
  { role: 'Viewer', text: 'Read-only: view forms and responses, cannot edit anything.' }
];

const relativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const unit = abs < 3600 ? [Math.max(1, Math.round(abs / 60)), 'minute']
    : abs < 86400 ? [Math.round(abs / 3600), 'hour']
    : [Math.round(abs / 86400), 'day'];
  const label = `${unit[0]} ${unit[1]}${unit[0] === 1 ? '' : 's'}`;
  if (abs < 60) return future ? 'in under a minute' : 'just now';
  return future ? `in ${label}` : `${label} ago`;
};

const roleBadgeClass = (role: string) =>
  role === 'owner'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : role === 'admin'
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-secondary text-foreground border-border';

export function TeamPeoplePanel({
  team,
  currentUserId,
  invitations,
  busyInviteId,
  onInvite,
  onChangeRole,
  onRemoveMember,
  onLeave,
  onResendInvite,
  onCancelInvite
}: TeamPeoplePanelProps) {
  const { permissions } = team;
  const [search, setSearch] = useState('');
  const [inviteTab, setInviteTab] = useState<InviteTab>('pending');

  const query = search.trim().toLowerCase();
  const members: any[] = useMemo(
    () => (team.members || []).filter((m: any) =>
      !query ||
      (m.user?.name || '').toLowerCase().includes(query) ||
      (m.user?.email || '').toLowerCase().includes(query) ||
      (m.role || '').toLowerCase().includes(query)
    ),
    [team.members, query]
  );

  const inviteGroups = useMemo(() => {
    const matches = invitations.filter((i) => !query || i.email.toLowerCase().includes(query));
    return {
      pending: matches.filter((i) => i.status === 'pending'),
      accepted: matches.filter((i) => i.status === 'accepted'),
      expired: matches.filter((i) => i.status === 'expired')
    };
  }, [invitations, query]);

  const roleOptions = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'editor', label: 'Editor' },
    ...(permissions.canManageAdmins ? [{ value: 'admin', label: 'Admin' }] : [])
  ];

  // Admins manage editors and viewers; only the owner manages admins
  const canManageMember = (m: any) =>
    permissions.canManageMembers &&
    m.role !== 'owner' &&
    m.userId !== currentUserId &&
    (m.role !== 'admin' || permissions.canManageAdmins);

  const canManageInvite = (i: TeamInvitation) =>
    permissions.canManageMembers && (i.role !== 'admin' || permissions.canManageAdmins);

  const visibleInvites = inviteGroups[inviteTab];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-sm font-bold text-foreground">Workspace Members</h3>
          <p className="text-xs text-muted-foreground">
            {team.members?.length || 0} {team.members?.length === 1 ? 'member' : 'members'}
            {permissions.canManageMembers && inviteGroups.pending.length > 0 && ` · ${inviteGroups.pending.length} pending`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search members or invites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
              aria-label="Search members"
            />
          </div>
          {permissions.canManageMembers && (
            <Button onClick={onInvite} size="sm" className="text-xs space-x-1.5 h-9 shrink-0">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite People</span>
            </Button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="border border-border rounded-xl divide-y divide-border bg-card overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No members match "{search}".</p>
          </div>
        ) : members.map((m: any) => {
          const displayName = m.user.name || m.user.email.split('@')[0];
          const isSelf = m.userId === currentUserId;
          const isOwner = m.role === 'owner';

          return (
            <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {displayName[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                  <p className="text-[11px] text-muted-foreground truncate" title={m.user.email}>{m.user.email}</p>
                  {m.createdAt && (
                    <p className="text-[10px] text-muted-foreground/80">Joined {new Date(m.createdAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {canManageMember(m) ? (
                  <>
                    <div className="w-28">
                      <CustomSelect
                        value={m.role}
                        onChange={(val) => onChangeRole(m.id, val)}
                        options={roleOptions}
                        size="sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMember(m)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Remove member"
                      aria-label={`Remove ${m.user.email}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${roleBadgeClass(m.role)}`}>
                    {m.role}
                  </span>
                )}
                {isSelf && !isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLeave(m)}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Leave workspace"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Leave
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invitations (owners and admins) */}
      {permissions.canManageMembers && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Invitations</h3>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold self-start">
              {([
                { id: 'pending', label: 'Pending', icon: Clock },
                { id: 'accepted', label: 'Accepted', icon: CheckCircle2 },
                { id: 'expired', label: 'Expired', icon: AlertCircle }
              ] as { id: InviteTab; label: string; icon: React.ElementType }[]).map((tab) => {
                const Icon = tab.icon;
                const active = inviteTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInviteTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 rounded-full bg-muted text-muted-foreground">{inviteGroups[tab.id].length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-border rounded-xl divide-y divide-border bg-card overflow-hidden">
            {visibleInvites.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <Mail className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  {inviteTab === 'pending' ? 'No pending invitations' : inviteTab === 'accepted' ? 'No accepted invitations yet' : 'No expired invitations'}
                </p>
                {inviteTab === 'pending' && (
                  <p>Invite teammates by email; they join after accepting.</p>
                )}
              </div>
            ) : visibleInvites.map((inv) => {
              const inviter = inv.invitedBy ? (inv.invitedBy.name || inv.invitedBy.email) : null;
              const meta = inv.status === 'pending'
                ? `${inviter ? `Invited by ${inviter} · ` : ''}sent ${relativeTime(inv.lastSentAt)} · expires ${relativeTime(inv.expiresAt)}`
                : inv.status === 'accepted'
                ? `Accepted ${relativeTime(inv.acceptedAt || inv.createdAt)}${inviter ? ` · invited by ${inviter}` : ''}`
                : `Expired ${relativeTime(inv.expiresAt)}${inviter ? ` · invited by ${inviter}` : ''}`;
              const busy = busyInviteId === inv.id;

              return (
                <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate" title={inv.email}>{inv.email}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold capitalize ${roleBadgeClass(inv.role)}`}>
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{meta}</p>
                    </div>
                  </div>

                  {inv.status !== 'accepted' && canManageInvite(inv) && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResendInvite(inv)}
                        disabled={busy}
                        className="h-8 text-xs"
                        title="Resend invitation with a new 7-day link"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RotateCw className="w-3.5 h-3.5 mr-1" />}
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelInvite(inv)}
                        disabled={busy}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Cancel invitation"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role reference */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border/60 text-[11px] text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
          <Shield className="w-3.5 h-3.5 text-primary" /> Roles & Permissions
        </p>
        {ROLE_DESCRIPTIONS.map((r) => (
          <p key={r.role}><span className="font-semibold text-foreground">{r.role}:</span> {r.text}</p>
        ))}
      </div>
    </div>
  );
}
