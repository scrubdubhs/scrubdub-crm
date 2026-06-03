'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Phone, MapPin, RefreshCw, DollarSign, X, Pencil, Trash2 } from 'lucide-react'
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

function calcNextServiceDate(from: string, freq: RecurringFrequency): string | null {
  if (freq === 'one_time') return null
  const d = new Date(from)
  if (freq === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (freq === 'biannual') d.setMonth(d.getMonth() + 6)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ ...BLANK })
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [firstServiceDate, setFirstServiceDate] = useState('')
  const [editFirstServiceDate, setEditFirstServiceDate] = useState('')

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
    const nextServiceDate = (form.recurring_frequency !== 'one_time' && firstServiceDate)
      ? calcNextServiceDate(firstServiceDate, form.recurring_frequency)
      : null
    const { data } = await supabase.from('contacts').insert({ ...form, next_service_date: nextServiceDate }).select().single()
    if (data) {
      if (nextServiceDate) {
        await supabase.from('jobs').insert({
          contact_id: (data as Contact).id,
          address: form.address, city: form.city, state: form.state, zip: form.zip,
          scheduled_date: nextServiceDate, status: 'scheduled',
          arrival_time: null, services: [], total_price: 0, notes: null,
        })
      }
      setContacts(prev => [...prev, data as Contact].sort((a, b) => a.first_name.localeCompare(b.first_name)))
      setForm({ ...BLANK })
      setFirstServiceDate('')
      setShowForm(false)
    }
    setSaving(false)
  }

  function startEdit() {
    if (!selected) return
    setEditForm({
      first_name: selected.first_name, last_name: selected.last_name,
      email: selected.email ?? '', phone: selected.phone,
      address: selected.address, city: selected.city, state: selected.state, zip: selected.zip,
      notes: selected.notes ?? '', recurring_frequency: selected.recurring_frequency,
    })
    setEditFirstServiceDate('')
    setEditMode(true)
  }

  async function saveContactEdit() {
    if (!selected || !editForm.first_name || !editForm.phone) return
    setEditSaving(true)
    const supabase = createClient()
    const newFreq = editForm.recurring_frequency as RecurringFrequency

    const { data: lastJob } = await supabase.from('jobs')
      .select('id, scheduled_date, arrival_time, address, city, state, zip, services, total_price, notes, lead_id, quote_id')
      .eq('contact_id', selected.id)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .single()

    const baseDate = lastJob?.scheduled_date ?? (editFirstServiceDate || new Date().toISOString().slice(0, 10))
    const newNextServiceDate = calcNextServiceDate(baseDate, newFreq)

    await supabase.from('contacts').update({
      first_name: editForm.first_name, last_name: editForm.last_name,
      email: editForm.email || null, phone: editForm.phone,
      address: editForm.address, city: editForm.city, state: editForm.state, zip: editForm.zip,
      notes: editForm.notes || null, recurring_frequency: newFreq,
      next_service_date: newNextServiceDate,
    }).eq('id', selected.id)

    if (newFreq !== 'one_time' && newNextServiceDate) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: futureJobs } = await supabase.from('jobs')
        .select('id').eq('contact_id', selected.id).eq('status', 'scheduled').gt('scheduled_date', today).limit(1)
      if (!futureJobs || futureJobs.length === 0) {
        await supabase.from('jobs').insert({
          contact_id: selected.id,
          address: lastJob?.address ?? editForm.address,
          city: lastJob?.city ?? editForm.city,
          state: lastJob?.state ?? editForm.state,
          zip: lastJob?.zip ?? editForm.zip,
          scheduled_date: newNextServiceDate,
          arrival_time: lastJob?.arrival_time ?? null,
          services: lastJob?.services ?? [],
          total_price: lastJob?.total_price ?? 0,
          notes: lastJob?.notes ?? null,
          status: 'scheduled',
          lead_id: lastJob?.lead_id ?? null,
          quote_id: lastJob?.quote_id ?? null,
        })
      }
    }

    const updated = { ...selected, ...editForm, email: editForm.email || null, notes: editForm.notes || null, recurring_frequency: newFreq, next_service_date: newNextServiceDate }
    setContacts(prev => prev.map(c => c.id === selected.id ? updated : c).sort((a, b) => a.first_name.localeCompare(b.first_name)))
    setSelected(updated)
    setEditMode(false)
    setEditSaving(false)
  }

  async function deleteContact() {
    if (!selected) return
    const supabase = createClient()
    const { error } = await supabase.from('contacts').delete().eq('id', selected.id)
    if (error) {
      setDeleteError('This contact has existing jobs or invoices and cannot be deleted.')
      return
    }
    setContacts(prev => prev.filter(c => c.id !== selected.id))
    setSelected(null)
    setConfirmDelete(false)
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
              <div className="flex items-center gap-2">
                <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Edit contact"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => { setDeleteError(''); setConfirmDelete(true) }} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors" title="Delete contact"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Trash2 size={14} />
                </button>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${RECURRING_COLORS[selected.recurring_frequency]}`}
                  style={{ background: 'var(--surface-2)' }}>
                  <RefreshCw size={12} className="inline mr-1" />
                  {RECURRING_LABELS[selected.recurring_frequency]}
                </span>
              </div>
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

      {/* Edit Contact Modal */}
      {editMode && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="font-semibold">Edit Contact</div>
              <button onClick={() => setEditMode(false)}><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <input placeholder="First Name *" value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              <input placeholder="Last Name" value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              <input placeholder="Phone *" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              <input placeholder="Email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              <input placeholder="Address" className="col-span-2" value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
              <input placeholder="City" value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
              <input placeholder="ZIP" value={editForm.zip} onChange={e => setEditForm(p => ({ ...p, zip: e.target.value }))} />
              <select className="col-span-2" value={editForm.recurring_frequency} onChange={e => setEditForm(p => ({ ...p, recurring_frequency: e.target.value as RecurringFrequency }))}>
                <option value="one_time">One-Time</option>
                <option value="quarterly">Quarterly Recurring</option>
                <option value="biannual">Bi-Annual Recurring</option>
                <option value="annual">Annual Recurring</option>
              </select>
              {editForm.recurring_frequency !== 'one_time' && (
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>First Service Date (only needed if no jobs exist yet)</label>
                  <input type="date" className="w-full" value={editFirstServiceDate} onChange={e => setEditFirstServiceDate(e.target.value)} />
                </div>
              )}
              <textarea placeholder="Notes…" className="col-span-2" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={saveContactEdit} disabled={editSaving}
                className="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-5">
              <div className="font-semibold mb-1">Delete Contact</div>
              <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete <span className="font-medium" style={{ color: 'var(--text)' }}>{selected.first_name} {selected.last_name}</span>? This cannot be undone.
              </div>
              {deleteError && <div className="text-sm text-red-400 mb-3">{deleteError}</div>}
              <div className="flex gap-2">
                <button onClick={deleteContact} className="flex-1 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition-colors">
                  Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {form.recurring_frequency !== 'one_time' && (
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>First Service Date — next appointment auto-scheduled from this</label>
                  <input type="date" className="w-full" value={firstServiceDate} onChange={e => setFirstServiceDate(e.target.value)} />
                </div>
              )}
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
