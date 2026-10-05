"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { api } from '@/lib/api';

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: any[];
  defaultTeamId?: string | null;
  onCreated?: (newForm: any) => void;
}

export function CreateFormModal({
  isOpen,
  onClose,
  teams,
  defaultTeamId,
  onCreated
}: CreateFormModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    defaultTeamId || 'personal'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        teamId: selectedWorkspace === 'personal' ? null : selectedWorkspace
      };

      const newForm = await api.post('/forms', payload);
      onClose();
      setTitle('');
      setDescription('');
      
      if (onCreated) {
        onCreated(newForm);
      }
      router.push(`/builder/${newForm.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const workspaceOptions = [
    { value: "personal", label: "My Workspace (Personal)" },
    ...teams.map(t => ({
      value: t.id,
      label: `${t.name} (Team)`
    }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Form"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Form Title"
          placeholder="e.g. Customer Satisfaction Survey"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Description (Optional)
          </label>
          <textarea
            placeholder="What is this form for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Where should this form be saved?
          </label>
          <CustomSelect
            value={selectedWorkspace}
            onChange={(val) => setSelectedWorkspace(val)}
            options={workspaceOptions}
            size="md"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {selectedWorkspace === 'personal'
              ? 'Only you can view and edit this form, unless you invite collaborators.'
              : 'Members of this team workspace will have access based on their assigned role.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            <span>Create & Open Builder</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
