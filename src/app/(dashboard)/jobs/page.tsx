'use client'
import { useState, useEffect } from 'react'
import { Camera, CheckCircle, Clock, MapPin, FileText, Plus, X } from 'lucide-react'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import type { Job, Contact, RecurringFrequency } from '@/lib/types'

const RECURRING_LABELS: Record<RecurringFrequency, string> = {
  one_time: 'One Time',
  quarterly: 'Quarterly (every 3 months)',
  biannual: 'Bi-Annual (every 6 months)',
  annual: 'Annual (once a year)',
}

function nextServiceDate(from: string, freq: RecurringFrequency): string | null {
  if (freq === 'one_time') return null
  const d = new Date(from)
  if (freq === 'quarterly') d.setMonth(d.getMonth() + 3)
  if (freq === 'biannual') d.setMonth(d.getMonth() + 6)
  if (freq === 'annual') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const STATUS_STYLES = {
  scheduled: 'bg-indigo-500/20 text-indigo-300',
  in_progress: 'bg-cyan-500/20 text-cyan-300',
  completed: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-red-500/20 text-red-300',
}

type JobWithContact = Job & { contacts: { first_name: string; last_name: string } | null }

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobWithContact | null>(null)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')
  const [showBook, setShowBook] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)
  const [bookForm, setBookForm] = useState({
    contact_id: '',
    address: '',
    city: '',
    state: 'MO',
    zip: '',
    scheduled_date: '',
    arrival_time: '',
    services: [] as string[],
    total_price: '',
    notes: '',
    recurring_frequency: 'one_time' as RecurringFrequency,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('jobs').select('*, contacts(first_name, last_name)').order('scheduled_date', { ascending: false })
      .then(({ data }) => {
        if (data) setJobs(data as JobWithContact[])
        setLoading(false)
      })
    supabase.from('contacts').select('*').order('first_name').then(({ data }) => {
      if (data) setContacts(data as Contact[])
    })
  }, [])

  async function saveJob() {
    if (!bookForm.contact_id || !bookForm.scheduled_date || !bookForm.arrival_time || bookForm.services.length === 0 || !bookForm.total_price) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('jobs').insert({
      contact_id: bookForm.contact_id,
      address: bookForm.address,
      city: bookForm.city,
      state: bookForm.state,
      zip: bookForm.zip,
      scheduled_date: bookForm.scheduled_date,
      arrival_time: bookForm.arrival_time,
      services: bookForm.services,
      total_price: Number(bookForm.total_price),
      notes: bookForm.notes || null,
      status: 'scheduled',
    }).select('*, contacts(first_name, last_name)').single()
    if (data) setJobs(prev => [data as JobWithContact, ...prev])
    await supabase.from('contacts').update({
      recurring_frequency: bookForm.recurring_frequency,
      next_service_date: nextServiceDate(bookForm.scheduled_date, bookForm.recurring_frequency),
    }).eq('id', bookForm.contact_id)
    setShowBook(false)
    setBookForm({ contact_id: '', address: '', city: '', state: 'MO', zip: '', scheduled_date: '', arrival_time: '', services: [], total_price: '', notes: '', recurring_frequency: 'one_time' })
    setSaving(false)
  }

  async function generateInvoice(job: JobWithContact) {
    const supabase = createClient()
    const labels: Record<string, string> = {
      pressure_washing: 'Pressure Washing',
      soft_washing: 'Soft Wash / House Wash',
      window_cleaning: 'Window Cleaning',
    }
    const priceEach = job.total_price / (job.services.length || 1)
    const lineItems = job.services.map(s => ({
      id: crypto.randomUUID(),
      service_type: s,
      description: labels[s] ?? s,
      unit_price: priceEach,
      total: priceEach,
    }))
    const { data: inv } = await supabase.from('invoices').insert({
      job_id: job.id,
      contact_id: job.contact_id,
      line_items: lineItems,
      subtotal: job.total_price,
      bundle_discount: 0,
      discount_amount: 0,
      total: job.total_price,
      payment_method: 'unpaid',
      payment_status: 'unpaid',
      paid_at: null,
      stripe_payment_intent_id: null,
      email_sent: false,
      email_sent_at: null,
      completed_date: job.completed_at?.slice(0, 10) ?? job.scheduled_date,
    }).select('id').single()
    if (inv) {
      await supabase.from('jobs').update({ invoice_id: inv.id }).eq('id', job.id)
      const updated = { ...job, invoice_id: inv.id }
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j))
      setSelected(updated)
    }
  }

  async function updateStatus(job: JobWithContact, status: Job['status']) {
    const supabase = createClient()
    const updates: Partial<Job> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    await supabase.from('jobs').update(updates).eq('id', job.id)
    const updated = { ...job, ...updates }
    setJobs(prev => prev.map(j => j.id === job.id ? updated : j))
    setSelected(updated)
    if (status === 'completed') await generateInvoice(updated)
  }

  const filtered = jobs.filter(j => filter === 'all' || j.status === filter)

  const contactName = (job: JobWithContact) =>
    job.contacts ? `${job.contacts.first_name} ${job.contacts.last_name}` : job.address

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Jobs</h1>
        <button onClick={() => setShowBook(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Plus size={14} />Book Job
        </button>
      </div>

      <div className="flex gap-1 px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['all', 'scheduled', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
            style={{ color: filter === f ? '#fff' : 'var(--text-secondary)' }}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {loading ? (
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No jobs</div>
          ) : filtered.map(job => (
            <button key={job.id} onClick={() => setSelected(job)}
              className="w-full text-left px-4 py-3 border-b hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--border)', background: selected?.id === job.id ? 'var(--surface-2)' : 'transparent' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{contactName(job)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[job.status]}`}>{job.status}</span>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={10} />{formatDate(job.scheduled_date)} @ {formatTime(job.arrival_time)}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{job.address}</div>
                <span className="text-sm font-semibold text-blue-400">{formatCurrency(job.total_price)}</span>
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{contactName(selected)}</h2>
                <div className="flex items-center gap-1 text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin size={12} />{selected.address}, {selected.city}, {selected.state} {selected.zip}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">{formatCurrency(selected.total_price)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scheduled</div>
                <div className="font-medium mt-0.5">{formatDate(selected.scheduled_date)}</div>
                <div className="text-sm text-blue-400">{formatTime(selected.arrival_time)}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Services</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selected.services.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 capitalize">{s.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </div>

            {selected.notes && (
              <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1 text-sm font-medium mb-1"><FileText size={14} />Notes</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.notes}</div>
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-sm font-medium mb-3"><Camera size={14} />Photos</div>
              <div className="grid grid-cols-2 gap-4">
                <PhotoSection label="Before" photos={selected.before_photos} />
                <PhotoSection label="After" photos={selected.after_photos} />
              </div>
            </div>

            {selected.status === 'scheduled' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(selected, 'in_progress')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors">
                  Mark In Progress
                </button>
                <button onClick={() => updateStatus(selected, 'completed')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors">
                  <CheckCircle size={14} className="inline mr-1" />Mark Complete
                </button>
              </div>
            )}
            {selected.status === 'in_progress' && (
              <button onClick={() => updateStatus(selected, 'completed')}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors">
                <CheckCircle size={14} className="inline mr-1" />Mark Complete
              </button>
            )}
            {selected.status === 'completed' && !selected.invoice_id && (
              <button onClick={() => generateInvoice(selected)}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <FileText size={14} className="inline mr-1" />Generate Invoice
              </button>
            )}
            {selected.status === 'completed' && selected.invoice_id && (
              <div className="flex items-center gap-2 text-sm text-green-400 py-1">
                <CheckCircle size={14} />Invoice created — mark it paid in the Invoices tab
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            Select a job to view details
          </div>
        )}
      </div>

      {showBook && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="font-semibold">Book Job</div>
              <button onClick={() => setShowBook(false)}><X size={16} style={{ color: 'var(--text-secondary)' }} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Customer</label>
                <select value={bookForm.contact_id} onChange={e => {
                  const c = contacts.find(x => x.id === e.target.value)
                  setBookForm(p => ({ ...p, contact_id: e.target.value, address: c?.address ?? '', city: c?.city ?? '', state: c?.state ?? 'MO', zip: c?.zip ?? '', recurring_frequency: c?.recurring_frequency ?? 'one_time' }))
                }}>
                  <option value="">Select customer…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.phone}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Date</label>
                  <input type="date" value={bookForm.scheduled_date} onChange={e => setBookForm(p => ({ ...p, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Arrival Time</label>
                  <input type="time" value={bookForm.arrival_time} onChange={e => setBookForm(p => ({ ...p, arrival_time: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Address</label>
                <input placeholder="Address" value={bookForm.address} onChange={e => setBookForm(p => ({ ...p, address: e.target.value }))} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>City</label>
                  <input placeholder="City" value={bookForm.city} onChange={e => setBookForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>State</label>
                  <input placeholder="MO" value={bookForm.state} onChange={e => setBookForm(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Zip</label>
                  <input placeholder="Zip" value={bookForm.zip} onChange={e => setBookForm(p => ({ ...p, zip: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Services</label>
                <div className="flex gap-2">
                  {(['pressure_washing', 'soft_washing', 'window_cleaning'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => setBookForm(p => ({ ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s] }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${bookForm.services.includes(s) ? 'bg-blue-600 border-blue-500 text-white' : 'border-dashed'}`}
                      style={bookForm.services.includes(s) ? {} : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      {s === 'pressure_washing' ? 'Pressure Wash' : s === 'soft_washing' ? 'Soft Wash' : 'Windows'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Total Price</label>
                <input type="number" placeholder="$0.00" value={bookForm.total_price} onChange={e => setBookForm(p => ({ ...p, total_price: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Schedule Type</label>
                <select value={bookForm.recurring_frequency} onChange={e => setBookForm(p => ({ ...p, recurring_frequency: e.target.value as RecurringFrequency }))}>
                  {(Object.entries(RECURRING_LABELS) as [RecurringFrequency, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                <textarea placeholder="Any notes…" value={bookForm.notes} onChange={e => setBookForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>

              <button onClick={saveJob} disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                {saving ? 'Booking…' : 'Book Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoSection({ label, photos }: { label: string; photos: string[] }) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <label className="block cursor-pointer">
        <input type="file" accept="image/*" capture="environment" className="hidden" multiple />
        <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-blue-500/50 transition-colors"
          style={{ borderColor: 'var(--border)' }}>
          {photos.length > 0 ? (
            <div className="text-xs text-blue-400">{photos.length} photo(s)</div>
          ) : (
            <>
              <Camera size={20} className="mx-auto mb-1" style={{ color: 'var(--text-secondary)' }} />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tap to add {label.toLowerCase()} photos</div>
            </>
          )}
        </div>
      </label>
    </div>
  )
}
