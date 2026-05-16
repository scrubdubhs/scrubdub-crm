'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, GitBranch, Users, FileText, Briefcase,
  Receipt, Calendar, Map, Settings, Droplets, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',   icon: GitBranch },
  { href: '/contacts',   label: 'Contacts',   icon: Users },
  { href: '/quotes',     label: 'Quotes',     icon: FileText },
  { href: '/jobs',       label: 'Jobs',       icon: Briefcase },
  { href: '/invoices',   label: 'Invoices',   icon: Receipt },
  { href: '/calendar',   label: 'Calendar',   icon: Calendar },
  { href: '/map',        label: 'Map / D2D',  icon: Map },
  { href: '/settings',   label: 'Settings',   icon: Settings },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: collapsed ? '52px' : '224px',
        transition: 'width 0.2s ease',
      }}
      className="shrink-0 flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-3 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Droplets size={22} className="text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>Scrub-A-Dub</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>Home Services CRM</div>
            </div>
          </div>
        )}
        {collapsed && <Droplets size={22} className="text-blue-400 mx-auto" />}
        <button
          onClick={toggle}
          className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-secondary)', marginLeft: collapsed ? 'auto' : '8px' }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link key={href} href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center' : '',
                active ? 'bg-blue-600 text-white font-medium' : 'hover:bg-white/5'
              )}
              style={{ color: active ? '#fff' : 'var(--text-secondary)' }}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      <div className="px-1.5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        {!collapsed && (
          <div className="text-xs px-2.5 mb-2" style={{ color: 'var(--text-secondary)' }}>636-281-6111</div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm w-full hover:bg-white/5 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
          style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}
