'use client'
import { useState, useEffect } from 'react'
import { Save, Copy, Check } from 'lucide-react'
import { TEXT_TEMPLATES, PRESSURE_WASH_SURFACES, WINDOW_TYPES, JOB_MINIMUM, FOLLOW_UP_DAYS } from '@/lib/constants'
import { createClient } from '@/lib/supabase-browser'

type TemplateKey = keyof typeof TEXT_TEMPLATES

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  booking_confirmation: 'Booking Confirmation',
  day_before_reminder: 'Day Before Reminder',
  morning_of: 'Morning Of',
  review_request: 'Review Request',
  follow_up: 'Follow-Up',
  invoice: 'Invoice Notification',
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState({ ...TEXT_TEMPLATES })
  const [googleReviewLink, setGoogleReviewLink] = useState('')
  const [myPhone, setMyPhone] = useState('636-281-6111')
  const [copiedKey, setCopiedKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('settings').select('*').single().then(({ data }) => {
      if (data) {
        if (data.google_review_link) setGoogleReviewLink(data.google_review_link)
        if (data.my_phone) setMyPhone(data.my_phone)
        if (data.text_templates) setTemplates({ ...TEXT_TEMPLATES, ...data.text_templates })
      }
      setLoading(false)
    })
  }, [])

  async function save() {
    const supabase = createClient()
    await supabase.from('settings').upsert({
      id: 1,
      google_review_link: googleReviewLink,
      my_phone: myPhone,
      text_templates: templates,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const copy = (key: TemplateKey) => {
    navigator.clipboard.writeText(templates[key])
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const integrations = [
    { label: 'Supabase', connected: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_') },
    { label: 'Google Maps API', connected: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.includes('your_') },
    { label: 'Stripe', connected: false },
    { label: 'Gmail SMTP', connected: false },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Settings</h1>
        <button onClick={save}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          {saved ? <><Check size={14} />Saved!</> : <><Save size={14} />Save Changes</>}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
          <Section title="Business Info">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Your Phone</label>
                <input value={myPhone} onChange={e => setMyPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Google Review Link</label>
                <input placeholder="https://g.page/r/..." value={googleReviewLink} onChange={e => setGoogleReviewLink(e.target.value)} />
              </div>
            </div>
            {!googleReviewLink && (
              <div className="text-xs text-yellow-400 mt-2">⚠ Add your Google review link — needed for review request texts</div>
            )}
          </Section>

          <Section title="Text Templates">
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Use [NAME], [DATE], [TIME], [PRICE], [SERVICES], [GOOGLE_REVIEW_LINK] as placeholders.
            </p>
            <div className="space-y-4">
              {(Object.keys(templates) as TemplateKey[]).map(key => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">{TEMPLATE_LABELS[key]}</label>
                    <button onClick={() => copy(key)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: copiedKey === key ? '#22c55e' : 'var(--text-secondary)' }}>
                      <Copy size={10} />{copiedKey === key ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea value={templates[key]} onChange={e => setTemplates(prev => ({ ...prev, [key]: e.target.value }))} rows={3} style={{ fontSize: '13px' }} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Job Minimum ($)</label>
                <input type="number" defaultValue={JOB_MINIMUM} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Follow-Up Reminder (days)</label>
                <input type="number" defaultValue={FOLLOW_UP_DAYS} />
              </div>
            </div>
            <div className="text-xs font-medium mb-2">Pressure Washing ($/sqft)</div>
            {PRESSURE_WASH_SURFACES.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm flex-1">{s.label}</span>
                <input type="number" step="0.01" defaultValue={s.price_per_sqft} style={{ width: '80px', padding: '4px 8px', textAlign: 'right' }} />
              </div>
            ))}
            <div className="text-xs font-medium mb-2 mt-4">Window Cleaning ($/window)</div>
            {WINDOW_TYPES.map(w => (
              <div key={w.key} className="flex items-center gap-3 mb-2">
                <span className="text-sm flex-1">{w.label}</span>
                <input type="number" defaultValue={w.exterior_price} style={{ width: '80px', padding: '4px 8px' }} />
              </div>
            ))}
          </Section>

          <Section title="Integrations">
            <div className="space-y-2">
              {integrations.map(item => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-sm font-medium">{item.label}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.connected ? 'Connected' : 'Not set'}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-sm font-semibold mb-4">{title}</div>
      {children}
    </div>
  )
}
