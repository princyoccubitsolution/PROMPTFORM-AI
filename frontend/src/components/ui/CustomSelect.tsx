import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface PopoverPosition {
  left: number;
  width: number;
  /** Distance from the viewport top (opening downwards) or bottom (opening upwards). */
  offset: number;
  placement: 'bottom' | 'top';
  maxHeight: number;
}

const POPOVER_GAP = 6;
const POPOVER_MAX_HEIGHT = 300;
const VIEWPORT_MARGIN = 8;

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: (SelectOption | string)[];
  value?: string | number | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = '-- Select Option --',
  label,
  error,
  disabled = false,
  searchable,
  className = '',
  buttonClassName = '',
  size = 'md',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // The option list is rendered in a portal with fixed positioning so it is never clipped by
  // a parent with overflow: hidden (question cards, modals, scroll panels). It opens upwards
  // when there is not enough room below the trigger.
  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - POPOVER_GAP - VIEWPORT_MARGIN;
    const placement: 'bottom' | 'top' = spaceBelow < Math.min(POPOVER_MAX_HEIGHT, 200) && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const available = placement === 'bottom' ? spaceBelow : spaceAbove;
    setPosition({
      left: rect.left,
      width: rect.width,
      offset: placement === 'bottom' ? rect.bottom + POPOVER_GAP : window.innerHeight - rect.top + POPOVER_GAP,
      placement,
      maxHeight: Math.max(140, Math.min(POPOVER_MAX_HEIGHT, available))
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Normalize options array into SelectOption format
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Determine if search input should be shown automatically for large option sets
  const isSearchable = searchable ?? normalizedOptions.length >= 6;

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, isSearchable]);

  const handleSelect = (optionValue: string, isOptDisabled?: boolean) => {
    if (isOptDisabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  // Size styling maps
  const heightMap = {
    sm: 'h-8 text-xs px-2.5 rounded-lg',
    md: 'h-9 md:h-10 text-xs md:text-sm px-3 rounded-xl',
    lg: 'h-11 md:h-12 text-sm md:text-base px-4 rounded-xl'
  };
  const optionTextMap = {
    sm: 'text-xs',
    md: 'text-xs md:text-sm',
    lg: 'text-sm md:text-base'
  };

  return (
    <div className={`w-full relative select-none ${className}`} ref={containerRef} id={id}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:text-zinc-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border font-semibold transition-all duration-200 outline-none text-left cursor-pointer
          bg-background dark:bg-zinc-900/90 text-foreground dark:text-zinc-100 border-border dark:border-zinc-800 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20
          ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}
          ${error ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' : ''}
          ${isOpen ? 'border-primary ring-2 ring-primary/20 dark:border-primary' : ''}
          ${heightMap[size]} ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground dark:text-zinc-500 font-normal truncate">
              {placeholder}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground dark:text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover (portal: never clipped by overflow-hidden parents) */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isOpen && position && (
          <motion.div
            ref={popoverRef}
            role="listbox"
            initial={{ opacity: 0, y: position.placement === 'bottom' ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.placement === 'bottom' ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`fixed z-[9999] bg-card dark:bg-zinc-900 text-foreground border border-border dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden font-medium flex flex-col ${optionTextMap[size]}`}
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.placement === 'bottom' ? { top: position.offset } : { bottom: position.offset })
            }}
          >
            {/* Search Input Bar */}
            {isSearchable && (
              <div className="p-2 border-b border-border dark:border-zinc-800/80 bg-muted/40 dark:bg-zinc-900/50 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-foreground dark:text-zinc-200 outline-none placeholder:text-muted-foreground/60"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="p-1.5 overflow-y-auto flex-1 min-h-0 space-y-0.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(String(opt.value), opt.disabled)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors duration-150 cursor-pointer ${
                        opt.disabled ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        isSelected
                          ? 'bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary font-bold'
                          : 'text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="truncate">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
};
