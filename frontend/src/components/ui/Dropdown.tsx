import * as React from "react";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export const Dropdown = ({ trigger, children, align = "right", className = "" }: DropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-56 rounded-xl bg-card border border-border shadow-lg focus:outline-none z-50 overflow-hidden animate-slide-down`}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const DropdownItem = ({ onClick, children, className = "" }: DropdownItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors duration-150 flex items-center gap-2.5 ${className}`}
    >
      {children}
    </button>
  );
};
