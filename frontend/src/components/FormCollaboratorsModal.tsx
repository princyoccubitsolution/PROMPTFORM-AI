"use client";

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { api } from '@/lib/api';

interface CollaboratorUser {
  id: string;
  name?: string | null;
  email: string;
}

interface CollaboratorItem {
  id: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  user: CollaboratorUser;
  isOwner: boolean;
}

interface FormCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
}

export function FormCollaboratorsModal({
  isOpen,
  onClose,
  formId,
  formTitle
}: FormCollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && formId) {
      loadCollaborators();
    }
  }, [isOpen, formId]);

  const loadCollaborators = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get(`/forms/${formId}/collaborators`);
      setCollaborators(data.collaborators || []);
      setIsOwner(data.isCurrentUserOwner || false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load collaborators.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setInviteSuccessMsg(null);

    try {
      await api.post(`/forms/${formId}/collaborators`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteEmail('');
      setInviteSuccessMsg(`Added collaborator successfully!`);
      setTimeout(() => setInviteSuccessMsg(null), 3000);
      await loadCollaborators();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add collaborator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      await api.put(`/forms/${formId}/collaborators/${collaboratorId}`, { role: newRole });
      setCollaborators(prev =>
        prev.map(c => (c.id === collaboratorId ? { ...c, role: newRole } : c))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update collaborator role.');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this form?`)) return;

    try {
      await api.delete(`/forms/${formId}/collaborators/${collaboratorId}`);
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove collaborator.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Collaborators"
      size="md"
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground">
            Manage who can view and edit <span className="font-semibold text-foreground">"{formTitle}"</span>.
          </p>
        </div>

        {/* Invite section - available for owners */}
        {isOwner && (
          <form onSubmit={handleAddCollaborator} className="bg-secondary/40 dark:bg-card/40 p-4 rounded-xl border border-border/70 space-y-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-primary" />
              Add Collaborator
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <Input
                  type="email"
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
              <div className="sm:col-span-3">
                <CustomSelect
                  value={inviteRole}
                  onChange={(val) => setInviteRole(val as any)}
                  options={[
                    { value: "editor", label: "Editor" },
                    { value: "viewer", label: "Viewer" }
                  ]}
                  size="sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !inviteEmail.trim()}
                  className="w-full h-9 text-xs font-semibold"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>

            {inviteSuccessMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1 font-medium">
                <Check className="w-3.5 h-3.5" /> {inviteSuccessMsg}
              </p>
            )}
          </form>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Collaborators List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>People with access</span>
            <span>{collaborators.length} {collaborators.length === 1 ? 'person' : 'people'}</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading collaborators...</p>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-foreground">Only you have access to this form.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Invite teammates above to review or edit questions together.</p>
            </div>
          ) : (
            <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden bg-card">
              {collaborators.map((c) => {
                const displayName = c.user.name || c.user.email.split('@')[0];
                const initial = (c.user.name || c.user.email)[0].toUpperCase();

                return (
                  <div key={c.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {initial}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
                          {c.isOwner && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {c.isOwner ? (
                        <span className="text-xs font-semibold text-muted-foreground px-2 py-1">
                          Full Control
                        </span>
                      ) : isOwner ? (
                        <>
                          <CustomSelect
                            value={c.role}
                            onChange={(val) => handleChangeRole(c.id, val as any)}
                            options={[
                              { value: "editor", label: "Editor" },
                              { value: "viewer", label: "Viewer" }
                            ]}
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(c.id, c.user.email)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Remove collaborator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary border border-border capitalize">
                          {c.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions info footer */}
        <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-primary" /> Roles & Permissions
          </p>
          <p><span className="font-semibold text-foreground">Editor:</span> Can modify form questions, logic, and settings.</p>
          <p><span className="font-semibold text-foreground">Viewer:</span> Read-only preview access to form structure.</p>
        </div>
      </div>
    </Modal>
  );
}
