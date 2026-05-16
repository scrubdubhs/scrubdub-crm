'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, GitBranch, Users, FileText, Briefcase,
  Receipt, Calendar, Map, Settings, Droplets, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'

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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      className="w-56 shrink-0 flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <Droplets size={22} className="text-blue-400" />
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>Scrub-A-Dub</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Home Services CRM</div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'hover:bg-white/5'
              )}
              style={{ color: active ? '#fff' : 'var(--text-secondary)' }}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-2 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs px-3 mb-2" style={{ color: 'var(--text-secondary)' }}>636-281-6111</div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
