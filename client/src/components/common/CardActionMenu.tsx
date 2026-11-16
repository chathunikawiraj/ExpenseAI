import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface CardAction {
  label: string;
  onSelect: () => void;
}

interface CardActionMenuProps {
  label: string;
  actions: CardAction[];
}

export const CardActionMenu: React.FC<CardActionMenuProps> = ({ label, actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="rounded-xl p-1.5 text-navy-muted hover:bg-primary-light hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-40 mt-2 w-48 rounded-2xl border border-purple-100 bg-white p-1.5 shadow-comet-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                action.onSelect();
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-navy hover:bg-primary-light hover:text-primary transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
