'use client'
import { useState, useEffect } from 'react'
import { Plus, Home, Route, Trash2, Navigation } from 'lucide-react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { DOOR_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase-browser'
import type { Door, DoorStatus } from '@/lib/types'

const STL_CENTER = { lat: 38.627, lng: -90.199 }

type Territory = { id: string; name: string; doors_knocked: number; doors_interested: number; doors_booked: number; color: string }

function DoorMarker({ door, selected, onClick }: { door: Door; selected: boolean; onClick: () => void }) {
  const status = DOOR_STATUSES.find(s => s.key === door.status)
  return (
    <AdvancedMarker position={{ lat: Number(door.lat), lng: Number(door.lng) }} onClick={onClick}>
      <div style={{
        width: selected ? '20px' : '14px',
        height: selected ? '20px' : '14px',
        borderRadius: '50%',
        background: status?.mapColor ?? '#6b7280',
        border: `2px solid ${selected ? '#fff' : 'rgba(255,255,255,0.5)'}`,
        boxShadow: selected ? '0 0 0 3px rgba(59,130,246,0.5)' : '0 2px 4px rgba(0,0,0,0.4)',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }} />
    </AdvancedMarker>
  )
}

export default function MapPage() {
  const [doors, setDoors] = useState<Door[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(null)
  const [activeTab, setActiveTab] = useState<'d2d' | 'route'>('d2d')
  const [newTerritoryName, setNewTerritoryName] = useState('')
  const [addDoor, setAddDoor] = useState<{ lat: number; lng: number } | null>(null)
  const [newDoorForm, setNewDoorForm] = useState({ address: '', status: 'not_home' as DoorStatus, notes: '', territory_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('doors').select('*').order('visited_at', { ascending: false }).then(({ data }) => { if (data) setDoors(data as Door[]) })
    supabase.from('territories').select('*').then(({ data }) => { if (data) setTerritories(data as Territory[]) })
  }, [])

  async function updateDoorStatus(door: Door, status: DoorStatus) {
    const supabase = createClient()
    await supabase.from('doors').update({ status }).eq('id', door.id)
    const updated = { ...door, status }
    setDoors(prev => prev.map(d => d.id === door.id ? updated : d))
    setSelectedDoor(updated)
  }

  async function saveDoor() {
    if (!addDoor || !newDoorForm.address) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('doors').insert({
      lat: addDoor.lat, lng: addDoor.lng,
      address: newDoorForm.address, status: newDoorForm.status,
      notes: newDoorForm.notes || null,
      territory_id: newDoorForm.territory_id || null,
    }).select().single()
    if (data) setDoors(prev => [data as Door, ...prev])
    setAddDoor(null)
    setNewDoorForm({ address: '', status: 'not_home', notes: '', territory_id: '' })
    setSaving(false)
  }

  async function addTerritory() {
    if (!newTerritoryName.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('territories').insert({ name: newTerritoryName }).select().single()
    if (data) setTerritories(prev => [...prev, data as Territory])
    setNewTerritoryName('')
  }

  async function deleteDoor(door: Door) {
    const supabase = createClient()
    await supabase.from('doors').delete().eq('id', door.id)
    setDoors(prev => prev.filter(d => d.id !== door.id))
    setSelectedDoor(null)
  }

  const statusCounts = DOOR_STATUSES.reduce((acc, s) => {
    acc[s.key] = doors.filter(d => d.status === s.key).length
    return acc
  }, {} as Record<DoorStatus, number>)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Map / D2D</h1>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab('d2d')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'd2d' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
            style={{ color: activeTab === 'd2d' ? '#fff' : 'var(--text-secondary)' }}>
            <Home size={13} className="inline mr-1" />D2D Tracker
          </button>
          <button onClick={() => setActiveTab('route')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === 'route' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
            style={{ color: activeTab === 'route' ? '#fff' : 'var(--text-secondary)' }}>
            <Route size={13} className="inline mr-1" />Route Optimizer
          </button>
        </div>
      </div>

      {activeTab === 'd2d' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-72 shrink-0 border-r flex flex-col overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>TERRITORIES</div>
              <div className="space-y-1 mb-2">
                {territories.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                      <span className="text-xs font-medium">{t.name}</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.doors_knocked} doors</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="New territory name" value={newTerritoryName}
                  onChange={e => setNewTerritoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTerritory()}
                  style={{ fontSize: '12px', padding: '6px 8px' }} />
                <button onClick={addTerritory} className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>STATUS</div>
              <div className="space-y-1">
                {DOOR_STATUSES.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.mapColor }} />
                      <span className="text-xs">{s.label}</span>
                    </div>
                    <span className="text-xs font-semibold">{statusCounts[s.key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {doors.map(door => {
                  const meta = DOOR_STATUSES.find(s => s.key === door.status)
                  return (
                    <button key={door.id} onClick={() => setSelectedDoor(door)}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ background: selectedDoor?.id === door.id ? 'var(--surface-2)' : 'transparent' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta?.mapColor }} />
                        <span className="text-xs truncate">{door.address}</span>
                      </div>
                      {door.notes && <div className="text-xs ml-4 mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{door.notes}</div>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Tap map to log a door
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <Map
                defaultCenter={STL_CENTER}
                defaultZoom={12}
                gestureHandling="greedy"
                mapId="scrubdub-d2d"
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => {
                  const lat = e.detail.latLng?.lat
                  const lng = e.detail.latLng?.lng
                  if (lat && lng) { setAddDoor({ lat, lng }); setSelectedDoor(null) }
                }}
              >
                {doors.map(door => (
                  <DoorMarker key={door.id} door={door} selected={selectedDoor?.id === door.id} onClick={() => { setSelectedDoor(door); setAddDoor(null) }} />
                ))}
              </Map>
            </APIProvider>

            {/* Selected door popup */}
            {selectedDoor && (
              <div className="absolute bottom-4 left-4 right-4 rounded-xl p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{selectedDoor.address}</div>
                    {selectedDoor.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedDoor.notes}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => deleteDoor(selectedDoor)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setSelectedDoor(null)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>✕</button>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {DOOR_STATUSES.map(s => (
                    <button key={s.key} onClick={() => updateDoorStatus(selectedDoor, s.key)}
                      className="px-2 py-1 rounded text-xs transition-colors"
                      style={{
                        background: selectedDoor.status === s.key ? s.mapColor : 'var(--surface-2)',
                        border: `1px solid ${s.mapColor}`,
                        color: selectedDoor.status === s.key ? '#fff' : s.mapColor,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add door popup */}
            {addDoor && (
              <div className="absolute bottom-4 left-4 right-4 rounded-xl p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-3">Log Door</div>
                <div className="space-y-2">
                  <input placeholder="Address" value={newDoorForm.address}
                    onChange={e => setNewDoorForm(p => ({ ...p, address: e.target.value }))} />
                  <div className="flex gap-2">
                    <select value={newDoorForm.status} onChange={e => setNewDoorForm(p => ({ ...p, status: e.target.value as DoorStatus }))} style={{ flex: 1 }}>
                      {DOOR_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {territories.length > 0 && (
                      <select value={newDoorForm.territory_id} onChange={e => setNewDoorForm(p => ({ ...p, territory_id: e.target.value }))} style={{ flex: 1 }}>
                        <option value="">No territory</option>
                        {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                  <input placeholder="Notes (optional)" value={newDoorForm.notes}
                    onChange={e => setNewDoorForm(p => ({ ...p, notes: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={saveDoor} disabled={saving}
                      className="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Door'}
                    </button>
                    <button onClick={() => setAddDoor(null)}
                      className="flex-1 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RouteOptimizer />
      )}
    </div>
  )
}

function RouteOptimizer() {
  const [stops, setStops] = useState<{ id: string; address: string; name: string; time: string }[]>([])
  const [startAddress, setStartAddress] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('jobs').select('id, address, arrival_time, contacts(first_name, last_name)')
      .eq('status', 'scheduled').then(({ data }) => {
        if (data) setStops((data as unknown as { id: string; address: string; arrival_time: string; contacts: { first_name: string; last_name: string } | null }[]).map(j => ({
          id: j.id, address: j.address,
          name: j.contacts ? `${j.contacts.first_name} ${j.contacts.last_name}` : j.address,
          time: j.arrival_time,
        })))
      })
  }, [])

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 shrink-0 border-r overflow-y-auto p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>START FROM</div>
          <input placeholder="Your starting address..." value={startAddress} onChange={e => setStartAddress(e.target.value)} />
        </div>
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>SCHEDULED JOBS ({stops.length})</div>
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <div key={stop.id} className="flex items-center gap-2 p-2 rounded-lg"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{stop.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{stop.address}</div>
                </div>
                <button onClick={() => setStops(prev => prev.filter(s => s.id !== stop.id))}>
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
            {stops.length === 0 && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>No scheduled jobs</div>}
          </div>
        </div>
        <a
          href={stops.length > 0 ? `https://www.google.com/maps/dir/${encodeURIComponent(startAddress)}/${stops.map(s => encodeURIComponent(s.address)).join('/')}` : '#'}
          target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Navigation size={14} />Open in Google Maps
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
        <div className="text-center">
          <Route size={40} className="mx-auto mb-3 text-blue-500 opacity-50" />
          <div className="font-medium">Click "Open in Google Maps"</div>
          <div className="text-sm mt-1">Your route will open with all stops</div>
        </div>
      </div>
    </div>
  )
}
