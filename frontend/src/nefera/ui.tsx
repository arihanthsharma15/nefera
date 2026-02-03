import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/nefera-logo.png'

export function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ')
}

export function NeferaLogo({ className }: { className?: string }) {
  return <img src={logo} alt="Nefera Logo" className={cx('w-auto object-contain', className)} />
}

function HeaderMark({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-11 w-11' : 'h-12 w-12'
  return (
    <div
      className={cx(
        'relative grid place-items-center rounded-2xl border border-white/60 bg-[radial-gradient(80%_80%_at_30%_20%,rgba(98,110,255,0.22),transparent_55%),radial-gradient(90%_90%_at_90%_70%,rgba(62,197,200,0.20),transparent_55%),rgba(255,255,255,0.85)] shadow-lg shadow-black/5 backdrop-blur',
        box,
      )}
    >
      <div className={size === 'sm' ? 'text-xl' : 'text-2xl'}>{emoji}</div>
    </div>
  )
}

export function Card({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.78)] shadow-lg shadow-black/5 backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 active:translate-y-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  right,
  emoji,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  emoji?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-6 pb-0">
      <div className="flex min-w-0 items-start gap-4">
        {emoji ? <HeaderMark emoji={emoji} size="sm" /> : null}
        <div className="min-w-0 pt-0.5">
          <div className="text-lg font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{title}</div>
          {subtitle ? <div className="mt-1 text-sm leading-6 text-[rgb(var(--nefera-muted))]">{subtitle}</div> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('p-6 pt-5', className)}>{children}</div>
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 ease-out active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50'
  const sizes = size === 'sm' ? 'h-10 px-4 text-sm' : 'h-11 px-5 text-sm'
  const variants = {
    primary:
      'bg-[linear-gradient(135deg,rgb(var(--nefera-brand)),rgb(var(--nefera-brand-2)))] text-white shadow-lg shadow-[rgba(98,110,255,0.22)] ring-0 ring-[rgba(98,110,255,0.18)] hover:brightness-[0.99] hover:shadow-xl hover:shadow-[rgba(98,110,255,0.22)] hover:ring-4',
    secondary:
      'border border-white/70 bg-white/65 text-[rgb(var(--nefera-ink))] shadow-lg shadow-black/5 hover:bg-white/80 hover:shadow-xl hover:shadow-black/5',
    ghost: 'border border-white/70 bg-transparent text-[rgb(var(--nefera-ink))] hover:bg-white/60',
    danger:
      'bg-[linear-gradient(135deg,rgb(var(--nefera-danger)),rgba(244,63,94,0.78))] text-white shadow-lg shadow-[rgba(244,63,94,0.18)] hover:brightness-[0.99] hover:shadow-xl hover:shadow-[rgba(244,63,94,0.14)]',
  } satisfies Record<string, string>

  return (
    <button className={cx(base, sizes, variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

export function IconButton({
  children,
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--nefera-border))] bg-[rgb(var(--nefera-surface))] text-[rgb(var(--nefera-ink))] shadow-sm shadow-black/5 transition hover:bg-black/5 active:scale-[0.99]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  hint,
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; inputClassName?: string }) {
  return (
    <label className={cx('block', className)}>
      {label ? <div className="mb-2 text-sm font-semibold text-[rgb(var(--nefera-ink))]">{label}</div> : null}
      <input
        className={cx(
          'h-12 w-full rounded-2xl border border-white/70 bg-white/80 px-4 text-sm text-[rgb(var(--nefera-ink))] outline-none shadow-lg shadow-black/5 ring-[rgba(98,110,255,0.20)] focus:bg-white focus:ring-4',
          inputClassName,
        )}
        {...props}
      />
      {hint ? <div className="mt-1.5 text-xs text-[rgb(var(--nefera-muted))]">{hint}</div> : null}
    </label>
  )
}

export function TextArea({
  label,
  hint,
  className,
  inputClassName,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; inputClassName?: string }) {
  return (
    <label className={cx('block', className)}>
      {label ? <div className="mb-2 text-sm font-semibold text-[rgb(var(--nefera-ink))]">{label}</div> : null}
      <textarea
        className={cx(
          'min-h-28 w-full resize-none rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[rgb(var(--nefera-ink))] outline-none shadow-lg shadow-black/5 ring-[rgba(98,110,255,0.20)] focus:bg-white focus:ring-4',
          inputClassName,
        )}
        {...props}
      />
      {hint ? <div className="mt-1.5 text-xs text-[rgb(var(--nefera-muted))]">{hint}</div> : null}
    </label>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  hint?: string
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      {label ? <div className="mb-1.5 text-sm font-semibold text-[rgb(var(--nefera-ink))]">{label}</div> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-[rgb(var(--nefera-border))] bg-white px-4 text-sm text-[rgb(var(--nefera-ink))] outline-none ring-[rgba(98,110,255,0.22)] focus:ring-4"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <div className="mt-1.5 text-xs text-[rgb(var(--nefera-muted))]">{hint}</div> : null}
    </label>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.99]',
        selected
          ? 'border-[rgba(98,110,255,0.35)] bg-[rgba(98,110,255,0.12)] text-[rgb(var(--nefera-ink))]'
          : 'border-[rgb(var(--nefera-border))] bg-white text-[rgb(var(--nefera-ink))] hover:bg-black/5',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' }) {
  const tones = {
    neutral: 'bg-black/5 text-[rgb(var(--nefera-ink))] border-[rgb(var(--nefera-border))]',
    ok: 'bg-[rgba(34,197,94,0.12)] text-[rgb(var(--nefera-ink))] border-[rgba(34,197,94,0.20)]',
    warn: 'bg-[rgba(245,158,11,0.12)] text-[rgb(var(--nefera-ink))] border-[rgba(245,158,11,0.22)]',
    danger: 'bg-[rgba(244,63,94,0.12)] text-[rgb(var(--nefera-ink))] border-[rgba(244,63,94,0.22)]',
  } satisfies Record<string, string>
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    const letters = parts.map((p) => p[0]?.toUpperCase()).filter(Boolean)
    return letters.join('') || 'N'
  }, [name])
  return (
    <div
      className="grid place-items-center rounded-2xl border border-[rgb(var(--nefera-border))] bg-[rgba(98,110,255,0.10)] text-sm font-extrabold text-[rgb(var(--nefera-ink))]"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

export function StatPill({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--nefera-border))] bg-white px-3 py-2">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-lg">{emoji}</div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">{label}</div>
        <div className="truncate text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{value}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--nefera-brand)),rgb(var(--nefera-brand-2)))]"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-[rgb(var(--nefera-border))]', className)} />
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('mx-auto w-full max-w-6xl px-4 pb-28 pt-7 md:px-8 md:pb-10 motion-reduce:animate-none animate-[nefera-page-in_260ms_ease-out]', className)}>
      {children}
    </div>
  )
}

export function Section({
  title,
  subtitle,
  rightAction,
  className,
}: {
  title: string
  subtitle?: string
  rightAction?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-white/70 pb-3', className)}>
      <div className="min-w-0">
        <div className="text-sm font-extrabold tracking-tight text-[rgb(var(--nefera-ink))] md:text-base">{title}</div>
        {subtitle ? <div className="mt-1 text-sm leading-6 text-[rgb(var(--nefera-muted))]">{subtitle}</div> : null}
      </div>
      {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
    </div>
  )
}

function useWarmSkeleton(ms = 260) {
  const [warm, setWarm] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setWarm(false), ms)
    return () => window.clearTimeout(t)
  }, [ms])
  return warm
}

export function TileCard({
  to,
  onClick,
  icon,
  title,
  description,
  rightTop,
  className,
  showArrow = true,
}: {
  to?: string
  onClick?: () => void
  icon: React.ReactNode
  title: string
  description?: string
  rightTop?: React.ReactNode
  className?: string
  showArrow?: boolean
}) {
  const warm = useWarmSkeleton(240)
  const base = cx(
    'group relative block overflow-hidden rounded-2xl border border-white/70 bg-white/55 p-6 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0 active:scale-[0.99]',
    className,
  )

  const content = (
    <>
      {warm ? (
        <div className="pointer-events-none absolute inset-0 p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="h-12 w-12 rounded-2xl bg-black/10" />
              <div className="h-9 w-9 rounded-2xl bg-black/10" />
            </div>
            <div className="h-4 w-40 rounded-full bg-black/10" />
            <div className="h-4 w-full rounded-full bg-black/10" />
            <div className="h-4 w-5/6 rounded-full bg-black/10" />
          </div>
        </div>
      ) : null}
      <div className={cx('flex items-start justify-between gap-3 transition-opacity duration-300', warm ? 'opacity-0' : 'opacity-100')}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(98,110,255,0.12)] text-2xl shadow-lg shadow-black/5">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {rightTop ? <div className="shrink-0">{rightTop}</div> : null}
          {showArrow ? (
            <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/70 bg-white/70 text-[rgb(var(--nefera-muted))] transition group-hover:text-[rgb(var(--nefera-ink))]">
              →
            </div>
          ) : null}
        </div>
      </div>
      <div className={cx('mt-4 text-sm font-extrabold tracking-tight text-[rgb(var(--nefera-ink))] transition-opacity duration-300', warm ? 'opacity-0' : 'opacity-100')}>{title}</div>
      {description ? (
        <div className={cx('mt-1 text-sm leading-6 text-[rgb(var(--nefera-muted))] transition-opacity duration-300', warm ? 'opacity-0' : 'opacity-100')}>
          {description}
        </div>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={base}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={base}>
      {content}
    </button>
  )
}

export function FeelingButton({
  to,
  onClick,
  emoji,
  label,
  selected,
  disabled,
  color,
  background,
  borderColor,
  ringColor,
  className,
}: {
  to?: string
  onClick?: () => void
  emoji: string
  label: string
  selected?: boolean
  disabled?: boolean
  color: string
  background: string
  borderColor: string
  ringColor: string
  className?: string
}) {
  const base = cx(
    'grid place-items-center rounded-full border shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70',
    selected ? 'animate-[nefera-pop_240ms_ease-out]' : '',
    className,
  )

  const style = { color, background, borderColor, boxShadow: selected ? `0 0 0 6px ${ringColor}` : undefined } as const

  if (to) {
    if (disabled) {
      return (
        <div aria-label={label} title={label} className={cx(base, 'pointer-events-none')} style={style}>
          <div className="text-3xl leading-none">{emoji}</div>
        </div>
      )
    }
    return (
      <Link to={to} aria-label={label} title={label} className={base} style={style}>
        <div className="text-3xl leading-none">{emoji}</div>
      </Link>
    )
  }

  return (
    <button type="button" disabled={disabled} aria-label={label} title={label} onClick={onClick} className={base} style={style}>
      <div className="text-3xl leading-none">{emoji}</div>
    </button>
  )
}

export function StepperHeader({
  title,
  subtitle,
  step,
  total,
  left,
  rightAction,
  className,
}: {
  title: string
  subtitle?: string
  step: number
  total: number
  left?: React.ReactNode
  rightAction?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-black/5 backdrop-blur', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {left ? <div className="shrink-0">{left}</div> : null}
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{title}</div>
            <div className="mt-0.5 text-sm text-[rgb(var(--nefera-muted))]">
              Step {step} of {total}
              {subtitle ? <span className="hidden md:inline"> • {subtitle}</span> : null}
            </div>
          </div>
        </div>
        {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
      <div className="mt-4">
        <ProgressBar value={total > 0 ? (step / total) * 100 : 0} />
      </div>
    </div>
  )
}

export function ChecklistGroup({
  title,
  subtitle,
  items,
  values,
  onToggle,
  className,
}: {
  title: string
  subtitle?: string
  items: string[]
  values: Record<string, boolean | undefined>
  onToggle: (item: string, checked: boolean) => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardBody className="space-y-3">
        <Section title={title} subtitle={subtitle} />
        <div className="space-y-2">
          {items.map((it) => (
            <label key={it} className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--nefera-border))] bg-white px-3 py-3">
              <input
                type="checkbox"
                checked={!!values[it]}
                onChange={(e) => onToggle(it, e.target.checked)}
                className="mt-1 h-4 w-4 accent-[rgb(var(--nefera-brand))]"
              />
              <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{it}</div>
            </label>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export function ChartCard({
  title,
  subtitle,
  rightAction,
  children,
  className,
}: {
  title: string
  subtitle?: string
  rightAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const warm = useWarmSkeleton(280)
  return (
    <Card className={cx('transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0', className)}>
      <CardBody className="space-y-4">
        <Section title={title} subtitle={subtitle} rightAction={rightAction} />
        <div className="relative">
          {warm ? (
            <div className="pointer-events-none absolute inset-0">
              <div className="animate-pulse space-y-3">
                <div className="h-40 w-full rounded-2xl border border-white/70 bg-white/55" />
                <div className="h-4 w-52 rounded-full bg-black/10" />
                <div className="h-4 w-80 rounded-full bg-black/10" />
              </div>
            </div>
          ) : null}
          <div className={cx('transition-opacity duration-300', warm ? 'opacity-0' : 'opacity-100')}>{children}</div>
        </div>
      </CardBody>
    </Card>
  )
}

export function FAB({
  label,
  to,
  onClick,
  className,
}: {
  label: string
  to?: string
  onClick?: () => void
  className?: string
}) {
  const btn = <Button className={cx('h-12 rounded-full px-6 shadow-xl shadow-black/10', className)}>{label}</Button>

  if (to) {
    return (
      <Link to={to} className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
        {btn}
      </Link>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
      <button type="button" onClick={onClick}>
        {btn}
      </button>
    </div>
  )
}

export function Page({
  title,
  emoji,
  subtitle,
  right,
  children,
}: {
  title?: string
  emoji?: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PageContainer>
      <div className="relative">
        <div
          className="pointer-events-none absolute -top-6 left-0 right-0 h-40 rounded-[32px] opacity-90 blur-2xl"
          style={{ background: 'linear-gradient(135deg,var(--nefera-banner-a),var(--nefera-banner-b))' }}
        />
        {(title || right) && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              {emoji ? <HeaderMark emoji={emoji} /> : null}
              <div className="min-w-0 pt-0.5">
                {title ? <div className="text-3xl font-extrabold tracking-tight text-[rgb(var(--nefera-ink))] md:text-4xl">{title}</div> : null}
                {subtitle ? <div className="mt-2 max-w-2xl text-base leading-7 text-[rgb(var(--nefera-muted))]">{subtitle}</div> : null}
              </div>
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        )}
        {children}
        <div className="mt-10 text-center text-xs font-semibold text-[rgb(var(--nefera-muted))]">
          Nefera cares for your wellbeing. Your data is private and safe.
        </div>
      </div>
    </PageContainer>
  )
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = 'md',
}: {
  open: boolean
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  size?: 'md' | 'lg'
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => panelRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null
  const width = size === 'lg' ? 'max-w-3xl' : 'max-w-xl'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-label="Close dialog" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          'relative w-full rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.86)] shadow-xl shadow-black/15 outline-none backdrop-blur',
          width,
        )}
      >
        <div className="px-6 pt-6">
          <div className="text-xl font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{title}</div>
          {description ? <div className="mt-2 text-sm leading-6 text-[rgb(var(--nefera-muted))]">{description}</div> : null}
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-[rgb(var(--nefera-border))] px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ChartLegend({
  segments,
  className,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  className?: string
}) {
  const total = Math.max(1, segments.reduce((a, s) => a + Math.max(0, s.value), 0))
  return (
    <div className={cx('grid gap-2', className)}>
      {segments.map((s) => {
        const pct = Math.round((Math.max(0, s.value) / total) * 100)
        return (
          <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate font-semibold text-[rgb(var(--nefera-muted))]">{s.label}</span>
            </div>
            <div className="shrink-0 font-extrabold text-[rgb(var(--nefera-ink))]">
              {pct}% <span className="font-semibold text-[rgb(var(--nefera-muted))]">({s.value})</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Stars({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const items = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-1">
      {items.map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={cx('text-2xl transition hover:scale-[1.06] active:scale-[0.98]', n <= value ? 'opacity-100' : 'opacity-30')}
          aria-label={`${n} stars`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: string; label: string; emoji?: string }>
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {tabs.map((t) => (
        <Chip key={t.value} selected={t.value === value} onClick={() => onChange(t.value)}>
          {t.emoji ? <span>{t.emoji}</span> : null}
          <span>{t.label}</span>
        </Chip>
      ))}
    </div>
  )
}

export function Toast({ open, tone = 'ok', message, onClose }: { open: boolean; tone?: 'ok' | 'warn'; message: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => onClose(), 2200)
    return () => window.clearTimeout(t)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 md:bottom-6">
      <div
        className={cx(
          'flex items-start gap-3 rounded-3xl border px-5 py-4 shadow-lg shadow-black/10 backdrop-blur',
          tone === 'ok'
            ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(255,255,255,0.92)]'
            : 'border-[rgba(245,158,11,0.25)] bg-[rgba(255,255,255,0.92)]',
        )}
      >
        <div className="text-xl">{tone === 'ok' ? '✅' : '⚠️'}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{message}</div>
        </div>
        <button type="button" className="ml-auto text-sm font-semibold text-[rgb(var(--nefera-muted))]" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export function DonutChart({
  segments,
  size = 120,
  stroke = 14,
  className,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
  stroke?: number
  className?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = Math.max(1, segments.reduce((a, s) => a + Math.max(0, s.value), 0))
  const dashes = segments.map((s) => (Math.max(0, s.value) / total) * circumference)
  const starts = dashes.map((_, i) => dashes.slice(0, i).reduce((a, x) => a + x, 0))
  return (
    <div className={cx('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const dash = dashes[i] ?? 0
          const dashArray = `${dash} ${circumference - dash}`
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={-(starts[i] ?? 0)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function MiniBar({
  value,
  max,
  color = 'rgb(var(--nefera-brand))',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  )
}

export function LineSpark({
  values,
  width = 220,
  height = 72,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
}) {
  const safe = values.length ? values : [0]
  const min = Math.min(...safe)
  const max = Math.max(...safe)
  const span = Math.max(1e-6, max - min)
  const pts = safe.map((v, i) => {
    const x = (i / Math.max(1, safe.length - 1)) * (width - 8) + 4
    const y = height - 4 - ((v - min) / span) * (height - 8)
    return { x, y }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${d} L ${width - 4} ${height - 4} L 4 ${height - 4} Z`
  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="neferaLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgb(var(--nefera-brand))" stopOpacity="1" />
          <stop offset="100%" stopColor="rgb(var(--nefera-brand-2))" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="neferaArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--nefera-brand))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--nefera-brand-2))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#neferaArea)" />
      <path d={d} fill="none" stroke="url(#neferaLine)" strokeWidth="3" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.2} fill="white" stroke="url(#neferaLine)" strokeWidth={2} />
      ))}
    </svg>
  )
}

export function Segmented({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cx('inline-flex rounded-2xl border border-[rgb(var(--nefera-border))] bg-white p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-2xl px-3 py-2 text-sm font-semibold transition',
            value === o.value ? 'bg-[rgba(98,110,255,0.12)] text-[rgb(var(--nefera-ink))]' : 'text-[rgb(var(--nefera-muted))] hover:bg-black/5',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function useCountdown(totalSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1)
        if (next === 0) setRunning(false)
        return next
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [running])
  const reset = React.useCallback((s: number) => {
    setSecondsLeft(s)
    setRunning(false)
  }, [])
  return { secondsLeft, running, setRunning, reset }
}
