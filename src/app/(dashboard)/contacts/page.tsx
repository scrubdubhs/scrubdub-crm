'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Phone, MapPin, RefreshCw, DollarSign, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import type { Contact, RecurringFrequency } from '@/lib/types'

const RECURRING_LABELS: Record<RecurringFrequency, string> = {
  one_time: 'One-Time', quarterly: 'Quarterly', biannual: 'Bi-Annual', annual: 'Annual'
}
const RECURRING_COLORS: Record<RecurringFrequency, string> = {
  one_time: 'text-gray-400', quarterly: 'text-blue-400', biannual: 'text-purple-400', annual: 'text-green-400'
}

const BLANK = { first_name: '', last_name: '', email: '', phone: '', address: '', city: '', state: 'MO', zip: '', notes: '', recurring_frequency: 'one_time' as RecurringFrequency }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('contacts').select('*').order('first_name').then(({ data }) => {
      if (data) setContacts(data as Contact[])
      setLoading(false)
    })
  }, [])

  async function saveContact() {
    if (!form.first_name || !form.phone) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('contacts').insert(form).select().single()
    if (data) {
      setContacts(prev => [...prev, data as Contact].sort((a, b) => a.first_name.localeCompare(b.first_name)))
      setForm({ ...BLANK })
      setShowForm(false)
    }
    setSaving(false)
  }

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone} ${c.address}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Contacts</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Plus size={15} />Add Contact
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px' }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No contacts yet</div>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full text-left px-4 py-3 border-b hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border)', background: selected?.id === c.id ? 'var(--surface-2)' : 'transparent' }}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                  <span className={`text-xs ${RECURRING_COLORS[c.recurring_frequency]}`}>{RECURRING_LABELS[c.recurring_frequency]}</span>
                </div>
                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <Phone size={10} />{c.phone}
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin size={10} />{c.city}, {c.state}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.first_name} {selected.last_name}</h2>
                <div className="flex items-center gap-1 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin size={12} />{selected.address}, {selected.city}, {selected.state} {selected.zip}
                </div>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${RECURRING_COLORS[selected.recurring_frequency]}`}
                style={{ background: 'var(--surface-2)' }}>
                <RefreshCw size={12} className="inline mr-1" />
                {RECURRING_LABELS[selected.recurring_frequency]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <DollarSign size={16} className="mx-auto mb-1 text-green-400" />
                <div className="text-xl font-bold">{formatCurrency(selected.total_spent)}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Spent</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xl font-bold">{selected.job_count}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Jobs</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xl font-bold">{formatCurrency(selected.total_spent / (selected.job_count || 1))}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg Job Value</div>
              </div>
            </div>
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium">Contact Info</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: 'var(--text-secondary)' }}>Phone: </span>
                  <a href={`tel:${selected.phone}`} className="text-blue-400">{selected.phone}</a>
                </div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Email: </span>{selected.email ?? '—'}</div>
                {selected.next_service_date && (
                  <div><span style={{ color: 'var(--text-secondary)' }}>Next Service: </span>{formatDate(selected.next_service_date)}</div>
                )}
                <div><span style={{ color: 'var(--text-secondary)' }}>Customer Since: </span>{formatDate(selected.created_at)}</div>
              </div>
            </div>
            {selected.notes && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-2">Notes</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            Select a contact to view details
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="font-semibold">Add Contact</div>
              <button onClick={() => setShowForm(false)}><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <input placeholder="First Name *" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
              <input placeholder="Last Name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
              <input placeholder="Phone *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              <input placeholder="Address" className="col-span-2" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              <input placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <input placeholder="ZIP" value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} />
              <select className="col-span-2" value={form.recurring_frequency} onChange={e => setForm(p => ({ ...p, recurring_frequency: e.target.value as RecurringFrequency }))}>
                <option value="one_time">One-Time</option>
                <option value="quarterly">Quarterly Recurring</option>
                <option value="biannual">Bi-Annual Recurring</option>
                <option value="annual">Annual Recurring</option>
              </select>
              <textarea placeholder="Notes (allergies, dogs, gate codes…)" className="col-span-2" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={saveContact} disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Contact'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
