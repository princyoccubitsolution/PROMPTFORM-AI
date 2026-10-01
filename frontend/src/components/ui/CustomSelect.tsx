import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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

  return (
    <div className={`w-full relative select-none ${className}`} ref={containerRef} id={id}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:text-zinc-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
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

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-[full] mt-1.5 z-[999] bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden text-xs font-semibold"
            style={{ maxHeight: '280px' }}
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
            <div className="p-1.5 overflow-y-auto max-h-56 space-y-0.5 custom-scrollbar">
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
                      disabled={opt.disabled}
                      onClick={() => handleSelect(String(opt.value), opt.disabled)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors duration-150 cursor-pointer ${
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
      </AnimatePresence>

      {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
};
