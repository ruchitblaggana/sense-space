// SenseSpace — Shared UI primitives

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export function Card({ children, className = '', as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'button' }) {
  return <As className={`bg-softwhite border border-line rounded-xl ${className}`}>{children}</As>;
}

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.2em] text-muted ${className}`}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-[11px] text-muted font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
        className="flex-1"
      />
      <span className="font-mono text-sm text-ink w-16 text-right tabular-nums">{format ? format(value) : value}</span>
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={ariaLabel}
      className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-blue"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };
  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    secondary: 'bg-paper border border-line text-ink hover:bg-sand',
    ghost: 'text-muted hover:text-ink hover:bg-sand/60',
    danger: 'bg-clay/10 text-clay-deep border border-clay/30 hover:bg-clay/20',
    teal: 'bg-teal text-paper hover:bg-teal-deep',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'clay' | 'blue' | 'muted' }) {
  const tones = {
    neutral: 'bg-sand text-ink-soft',
    teal: 'bg-teal-pale text-teal-deep',
    clay: 'bg-clay-pale text-clay-deep',
    blue: 'bg-blue-pale text-blue-deep',
    muted: 'bg-line/40 text-muted',
  };
  return <span className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
      {children && <p className="text-sm text-muted max-w-md">{children}</p>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  destructive = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fade-in" role="alertdialog" aria-modal="true">
      <div className="bg-softwhite rounded-2xl border border-line shadow-xl max-w-sm w-full p-6">
        <h3 className="font-display text-lg text-ink mb-2">{title}</h3>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fade-in" role="dialog" aria-modal="true">
      <div className={`bg-softwhite rounded-2xl border border-line shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success' | 'error'; title?: string; children: ReactNode }) {
  const config = {
    info: { icon: Info, cls: 'border-blue/30 bg-blue/5 text-blue-deep' },
    warning: { icon: AlertTriangle, cls: 'border-clay/30 bg-clay/5 text-clay-deep' },
    success: { icon: CheckCircle2, cls: 'border-teal/30 bg-teal/5 text-teal-deep' },
    error: { icon: XCircle, cls: 'border-red-300 bg-red-50 text-red-700' },
  };
  const { icon: Icon, cls } = config[tone];
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 ${cls}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="text-sm">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <p className="opacity-90">{children}</p>
      </div>
    </div>
  );
}

// Toast container
export function ToastHost({ toasts, onDismiss }: { toasts: { id: string; message: string; kind: string }[]; onDismiss: (id: string) => void }) {
  const kinds: Record<string, { icon: typeof Info; cls: string }> = {
    info: { icon: Info, cls: 'border-blue/30 bg-softwhite' },
    success: { icon: CheckCircle2, cls: 'border-teal/30 bg-softwhite' },
    warning: { icon: AlertTriangle, cls: 'border-clay/30 bg-softwhite' },
    error: { icon: XCircle, cls: 'border-red-300 bg-softwhite' },
  };
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const k = kinds[t.kind] ?? kinds.info;
        const Icon = k.icon;
        return (
          <div key={t.id} className={`flex items-start gap-3 border rounded-lg shadow-md px-4 py-3 animate-fade-in ${k.cls}`} role="status">
            <Icon size={16} className="mt-0.5 shrink-0 text-ink-soft" />
            <p className="text-sm text-ink flex-1">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} aria-label="Dismiss notification" className="text-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Debounced value hook
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(h);
  }, [value, delayMs]);
  return v;
}

// Live region for screen-reader announcements
export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="sr-only-focusable">
      {message}
    </div>
  );
}
