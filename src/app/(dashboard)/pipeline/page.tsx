'use client'
import { useState, useEffect } from 'react'
import { Plus, Phone, MapPin, Clock, X } from 'lucide-react'
import { PIPELINE_STAGES, LEAD_SOURCES } from '@/lib/constants'
import { getSourceLabel, formatDate, timeAgo } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import type { Lead, PipelineStage, LeadSource } from '@/lib/types'

const SOURCE_COLORS: Record<LeadSource, string> = {
  facebook_ad: 'bg-blue-500/20 text-blue-300',
  door_hanger: 'bg-yellow-500/20 text-yellow-300',
  word_of_mouth: 'bg-green-500/20 text-green-300',
  d2d: 'bg-purple-500/20 text-purple-300',
  referral: 'bg-pink-500/20 text-pink-300',
  other: 'bg-gray-500/20 text-gray-300',
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div onClick={onClick} className="rounded-lg p-3 space-y-2 cursor-pointer hover:border-blue-500/50 transition-colors"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-sm">{lead.first_name} {lead.last_name}</div>
          <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={10} />{lead.city}, {lead.state}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[lead.source]}`}>
          {getSourceLabel(lead.source)}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <Phone size={10} />{lead.phone}
      </div>
      {lead.notes && <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{lead.notes}</div>}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeAgo(lead.created_at)}</span>
        {lead.follow_up_date && (
          <span className="text-xs text-yellow-400 flex items-center gap-1">
            <Clock size={10} />Follow up {formatDate(lead.follow_up_date)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [newLead, setNewLead] = useState({ first_name: '', last_name: '', phone: '', address: '', city: '', state: 'MO', zip: '', source: 'facebook_ad' as LeadSource, notes: '' })

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
        if (data) setLeads(data as Lead[])
      } catch (e) {
        console.error('Pipeline load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function saveLead() {
    if (!newLead.first_name || !newLead.phone) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('leads').insert({ ...newLead, stage: 'new_lead' }).select().single()
    if (data) {
      setLeads(prev => [data as Lead, ...prev])
      setNewLead({ first_name: '', last_name: '', phone: '', address: '', city: '', state: 'MO', zip: '', source: 'facebook_ad', notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function updateStage(lead: Lead, stage: PipelineStage) {
    const supabase = createClient()
    await supabase.from('leads').update({ stage }).eq('id', lead.id)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage } : l))
    setSelectedLead(prev => prev ? { ...prev, stage } : null)
  }

  const visibleStages = PIPELINE_STAGES.filter(s => s.key !== 'paid')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold">Pipeline</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{leads.length} active leads</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Plus size={15} />New Lead
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
            <input placeholder="First Name *" value={newLead.first_name} onChange={e => setNewLead(p => ({ ...p, first_name: e.target.value }))} />
            <input placeholder="Last Name" value={newLead.last_name} onChange={e => setNewLead(p => ({ ...p, last_name: e.target.value }))} />
            <input placeholder="Phone *" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
            <input placeholder="Address" value={newLead.address} onChange={e => setNewLead(p => ({ ...p, address: e.target.value }))} />
            <input placeholder="City" value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} />
            <input placeholder="ZIP" value={newLead.zip} onChange={e => setNewLead(p => ({ ...p, zip: e.target.value }))} />
            <select value={newLead.source} onChange={e => setNewLead(p => ({ ...p, source: e.target.value as LeadSource }))}>
              {LEAD_SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <input placeholder="Notes" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveLead} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Lead'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-3 h-full" style={{ minWidth: `${visibleStages.length * 220}px` }}>
            {visibleStages.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.key)
              return (
                <div key={stage.key} className="flex flex-col rounded-xl w-52 shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
                    style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-xs font-medium">{stage.label}</span>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageLeads.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />)}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-6 text-xs" style={{ color: 'var(--text-secondary)' }}>No leads</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-md space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <h2 className="text-lg font-bold">{selectedLead.first_name} {selectedLead.last_name}</h2>
                <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedLead.phone}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedLead.address}, {selectedLead.city}</div>
              </div>
              <button onClick={() => setSelectedLead(null)}><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>MOVE TO STAGE</div>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map(s => (
                    <button key={s.key} onClick={() => updateStage(selectedLead, s.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedLead.stage === s.key ? 'text-white' : 'hover:bg-white/5'}`}
                      style={{
                        background: selectedLead.stage === s.key ? undefined : 'var(--surface-2)',
                        border: `1px solid var(--border)`,
                        color: selectedLead.stage === s.key ? '#fff' : 'var(--text-secondary)',
                        backgroundColor: selectedLead.stage === s.key ? '#3b82f6' : undefined
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {selectedLead.notes && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                  {selectedLead.notes}
                </div>
              )}
              <div className="flex gap-2">
                <a href={`tel:${selectedLead.phone}`}
                  className="flex-1 py-2 rounded-lg text-sm text-center bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Call
                </a>
                <a href={`sms:${selectedLead.phone}`}
                  className="flex-1 py-2 rounded-lg text-sm text-center hover:bg-white/5 transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Text
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
