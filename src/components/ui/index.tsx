'use client'

import { X, Loader2, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useEffect } from 'react'

export const ACCENT = '#39FF14'

/* ── Spinner ── */
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={clsx('w-8 h-8 rounded-full border-2 animate-spin', className)}
      style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
  )
}

/* ── StatusBadge ── */
export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={{ color, borderColor: `${color}80`, backgroundColor: `${color}22` }}>
      {label}
    </span>
  )
}

/* ── Botão ── */
export function Button({
  children, onClick, variant = 'primary', type = 'button', disabled, loading, className,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'outline' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'text-black hover:opacity-90',
    outline: 'border border-white/20 text-white hover:bg-white/5',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'text-white/70 hover:bg-white/5 hover:text-white',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={clsx(base, variants[variant], className)}
      style={variant === 'primary' ? { backgroundColor: ACCENT } : {}}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

/* ── Input ── */
export function Input({
  label, value, onChange, type = 'text', placeholder, required, error, ...rest
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <input
        type={type} value={value} placeholder={placeholder} required={required}
        onChange={(e) => onChange(e.target.value)}
        className={clsx('w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 transition',
          error ? 'border-red-500' : 'border-white/10 focus:border-transparent')}
        style={{ ['--tw-ring-color' as string]: ACCENT }}
        {...rest}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

/* ── Textarea ── */
export function Textarea({
  label, value, onChange, placeholder, rows = 3, required,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <textarea
        value={value} placeholder={placeholder} rows={rows} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 transition resize-none"
        style={{ ['--tw-ring-color' as string]: ACCENT }}
      />
    </div>
  )
}

/* ── Select ── */
export function Select({
  label, value, onChange, options, required,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <select
        value={value} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 transition"
        style={{ ['--tw-ring-color' as string]: ACCENT }}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/* ── SearchBar ── */
export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-md">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
      <input
        value={value} placeholder={placeholder || 'Buscar...'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 transition"
        style={{ ['--tw-ring-color' as string]: ACCENT }}
      />
    </div>
  )
}

/* ── Modal ── */
export function Modal({
  open, onClose, title, children, maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className={clsx('w-full bg-[#111] rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col', maxWidth)}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

/* ── ConfirmDialog ── */
export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-white/70 text-sm leading-relaxed mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ── EmptyState ── */
export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 opacity-30" style={{ color: ACCENT }}>{icon}</div>}
      <p className="text-white font-bold text-lg">{title}</p>
      {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

/* ── Helpers ── */
export function formatCurrency(value?: number | null): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function formatDate(date?: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}
