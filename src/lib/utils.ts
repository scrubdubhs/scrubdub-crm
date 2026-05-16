import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { PIPELINE_STAGES, DOOR_STATUSES, LEAD_SOURCES } from './constants'
import type { PipelineStage, LeadSource, DoorStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string) {
  return format(parseISO(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string) {
  return format(parseISO(date), 'MMM d, yyyy h:mm a')
}

export function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function timeAgo(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true })
}

export function getStageMeta(stage: PipelineStage) {
  return PIPELINE_STAGES.find(s => s.key === stage) ?? PIPELINE_STAGES[0]
}

export function getDoorMeta(status: DoorStatus) {
  return DOOR_STATUSES.find(d => d.key === status) ?? DOOR_STATUSES[0]
}

export function getSourceLabel(source: LeadSource) {
  return LEAD_SOURCES.find(s => s.key === source)?.label ?? source
}

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim()
}

export function applyTextTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`[${k}]`, v),
    template
  )
}

export function calcBundleDiscount(serviceCount: number, subtotal: number) {
  if (serviceCount < 2) return 0
  const pct = (serviceCount - 1) * 0.05
  return Math.min(pct, 0.20) * subtotal
}
