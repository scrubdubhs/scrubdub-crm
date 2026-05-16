'use client'
import { Bell } from 'lucide-react'

export default function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
        <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
      </button>
    </header>
  )
}
