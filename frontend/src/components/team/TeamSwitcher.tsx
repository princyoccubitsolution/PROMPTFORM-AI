"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Users, User, Plus } from 'lucide-react';

interface TeamItem {
  id: string;
  name: string;
  memberCount?: number;
}

interface TeamSwitcherProps {
  currentWorkspaceId: string; // 'personal' or teamId
  teams: TeamItem[];
  userName?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateTeamClick?: () => void;
}

export function TeamSwitcher({
  currentWorkspaceId,
  teams,
  userName,
  onSelectWorkspace,
  onCreateTeamClick
}: TeamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeTeam = teams.find(t => t.id === currentWorkspaceId);
  const activeLabel = currentWorkspaceId === 'personal' || !activeTeam
    ? (userName ? `${userName}'s Workspace` : 'My Workspace')
    : activeTeam.name;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-border bg-card/80 hover:bg-muted/80 text-foreground transition-all duration-150 cursor-pointer shadow-2xs group"
      >
        <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
          {currentWorkspaceId === 'personal' ? (
            <User className="w-3 h-3" />
          ) : (
            <Users className="w-3 h-3" />
          )}
        </div>
        <span className="text-xs font-bold truncate max-w-[150px]">{activeLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-card border border-border shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Switch Workspace
          </div>

          {/* Personal Workspace Option */}
          <button
            type="button"
            onClick={() => {
              onSelectWorkspace('personal');
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-muted transition-colors cursor-pointer ${
              currentWorkspaceId === 'personal' ? 'font-bold text-primary bg-primary/5' : 'text-foreground font-medium'
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">My Workspace</span>
            </div>
            {currentWorkspaceId === 'personal' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </button>

          {/* Teams list */}
          {teams.length > 0 && (
            <>
              <div className="my-1 border-t border-border/60" />
              <div className="px-3 py-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                Teams
              </div>
              {teams.map(t => {
                const isSelected = currentWorkspaceId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectWorkspace(t.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-muted transition-colors cursor-pointer ${
                      isSelected ? 'font-bold text-primary bg-primary/5' : 'text-foreground font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </>
          )}

          {/* Create Team Action */}
          {onCreateTeamClick && (
            <>
              <div className="my-1 border-t border-border/60" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateTeamClick();
                }}
                className="w-full text-left px-3 py-2 flex items-center space-x-2 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
