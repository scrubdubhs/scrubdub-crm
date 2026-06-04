'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, Copy, Pencil, Check, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { formatCurrency, formatTime, applyTextTemplate, calcNextServiceDate } from '@/lib/utils'
import { TEXT_TEMPLATES } from '@/lib/constants'
import { createClient } from '@/lib/supabase-browser'

type CalJob = {
  id: string
  scheduled_date: string
  arrival_time: string
  address: string
  total_price: number
  status: string
  services: string[]
  contacts: { first_name: string; last_name: string; phone: string } | null
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [jobs, setJobs] = useState<CalJob[]>([])
  const [copiedTemplate, setCopiedTemplate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ scheduled_date: '', arrival_time: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function loadAndSync() {
      const today = new Date().toISOString().slice(0, 10)
      const { data: contacts } = await supabase.from('contacts').select('id, address, city, state, zip, recurring_frequency, next_service_date').neq('recurring_frequency', 'one_time')
      if (contacts) {
        for (const c of contacts) {
          let nextDate = c.next_service_date
          if (!nextDate) {
            const { data: lastJob } = await supabase.from('jobs').select('scheduled_date').eq('contact_id', c.id).order('scheduled_date', { ascending: false }).limit(1).single()
            if (lastJob?.scheduled_date) {
              nextDate = calcNextServiceDate(lastJob.scheduled_date, c.recurring_frequency)
              if (nextDate) await supabase.from('contacts').update({ next_service_date: nextDate }).eq('id', c.id)
            }
          }
          if (!nextDate || nextDate <= today) continue
          const { data: fut } = await supabase.from('jobs').select('id').eq('contact_id', c.id).eq('status', 'scheduled').gt('scheduled_date', today).limit(1)
          if (!fut || fut.length === 0) {
            await supabase.from('jobs').insert({
              contact_id: c.id, address: c.address, city: c.city, state: c.state, zip: c.zip,
              scheduled_date: nextDate, arrival_time: '09:00',
              services: [], total_price: 0, status: 'scheduled', notes: null,
            })
          }
        }
      }
      const { data } = await supabase.from('jobs').select('id, scheduled_date, arrival_time, address, total_price, status, services, contacts(first_name, last_name, phone)').neq('status', 'cancelled')
      if (data) setJobs(data as unknown as CalJob[])
    }
    loadAndSync()
  }, [])

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const blanks = Array(startOfMonth(currentMonth).getDay()).fill(null)

  const jobsOnDate = (date: Date) => jobs.filter(j => j.scheduled_date === format(date, 'yyyy-MM-dd'))
  const selectedJobs = selectedDate ? jobsOnDate(selectedDate) : []

  async function saveEdit(job: CalJob) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('jobs').update({ scheduled_date: editForm.scheduled_date, arrival_time: editForm.arrival_time }).eq('id', job.id)
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, scheduled_date: editForm.scheduled_date, arrival_time: editForm.arrival_time } : j))
    setSelectedDate(parseISO(editForm.scheduled_date))
    setEditingId(null)
    setSaving(false)
  }

  const copyTemplate = (template: string, job: CalJob) => {
    const name = job.contacts ? job.contacts.first_name : 'Customer'
    const text = applyTextTemplate(template, {
      NAME: name,
      DATE: format(parseISO(job.scheduled_date), 'EEEE, MMM d'),
      TIME: formatTime(job.arrival_time),
      PRICE: String(job.total_price),
      SERVICES: job.services.join(' & '),
    })
    navigator.clipboard.writeText(text)
    setCopiedTemplate(template)
    setTimeout(() => setCopiedTemplate(''), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/10"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/10"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks.map((_, i) => <div key={`b${i}`} />)}
            {days.map(day => {
              const dayJobs = jobsOnDate(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  className="min-h-16 p-1.5 rounded-lg text-left transition-colors hover:bg-white/5"
                  style={{ background: isSelected ? 'rgba(59,130,246,0.2)' : 'var(--surface)', border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border)'}` }}>
                  <div className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}
                    style={{ color: isToday ? '#fff' : 'var(--text-primary)' }}>
                    {format(day, 'd')}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayJobs.map(j => (
                      <div key={j.id} className={`text-xs px-1 py-0.5 rounded truncate ${j.status === 'completed' ? 'bg-green-500/30 text-green-200' : 'bg-blue-500/30 text-blue-200'}`}>
                        {formatTime(j.arrival_time)} {j.contacts?.first_name ?? 'Job'}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-72 shrink-0 border-l overflow-y-auto p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
          {selectedDate ? (
            <>
              <div className="text-sm font-medium">{format(selectedDate, 'EEEE, MMMM d')}</div>
              {selectedJobs.length === 0 && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>No jobs scheduled</div>}
              {selectedJobs.map(job => (
                <div key={job.id} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{job.contacts ? `${job.contacts.first_name} ${job.contacts.last_name}` : 'Job'}</div>
                    {job.status !== 'completed' && editingId !== job.id && (
                      <button onClick={() => { setEditingId(job.id); setEditForm({ scheduled_date: job.scheduled_date, arrival_time: job.arrival_time }) }}
                        className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                  {editingId === job.id ? (
                    <div className="space-y-2">
                      <input type="date" value={editForm.scheduled_date} onChange={e => setEditForm(p => ({ ...p, scheduled_date: e.target.value }))} />
                      <input type="time" value={editForm.arrival_time} onChange={e => setEditForm(p => ({ ...p, arrival_time: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(job)} disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                          <Check size={11} />{saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs hover:bg-white/5"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <X size={11} />Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Clock size={10} />{formatTime(job.arrival_time)}
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin size={10} />{job.address}
                  </div>
                  {job.contacts?.phone && (
                    <a href={`tel:${job.contacts.phone}`} className="text-xs text-blue-400">{job.contacts.phone}</a>
                  )}
                  <div className="text-sm font-semibold text-blue-400">{formatCurrency(job.total_price)}</div>
                    </>
                  )}
                  {editingId !== job.id && (
                    <div className="border-t pt-2 space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Text Templates</div>
                      {[
                        { key: 'booking_confirmation', label: 'Booking Confirmation', template: TEXT_TEMPLATES.booking_confirmation },
                        { key: 'day_before_reminder', label: 'Day Before Reminder', template: TEXT_TEMPLATES.day_before_reminder },
                        { key: 'morning_of', label: 'Morning Of', template: TEXT_TEMPLATES.morning_of },
                      ].map(t => (
                        <button key={t.key} onClick={() => copyTemplate(t.template, job)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors"
                          style={{ border: '1px solid var(--border)', color: copiedTemplate === t.template ? '#22c55e' : 'var(--text-secondary)' }}>
                          <span>{t.label}</span>
                          <Copy size={10} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="text-xs text-center pt-8" style={{ color: 'var(--text-secondary)' }}>Select a date to view jobs</div>
          )}
        </div>
      </div>
    </div>
  )
}
