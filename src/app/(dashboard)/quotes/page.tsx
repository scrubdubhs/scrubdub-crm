'use client'
import { useState } from 'react'
import { Plus, Copy, Trash2, Calculator } from 'lucide-react'
import { PRESSURE_WASH_SURFACES, SOFT_WASH_SURFACES, SOFTWASH_SIDING_TYPES, STORY_HEIGHT, SOFTWASH_ADDONS, WINDOW_TYPES, BUNDLE_DISCOUNT_PER_SERVICE, JOB_MINIMUM } from '@/lib/constants'
import { formatCurrency, calcBundleDiscount } from '@/lib/utils'

type ServiceKey = 'pressure_washing' | 'soft_washing' | 'window_cleaning'

interface PWSurfaceRow { surface: string; sqft: number; unit_price: number }
interface WindowRow { type: string; qty: number; include_interior: boolean; unit_price: number }

const defaultPW: PWSurfaceRow = { surface: 'concrete_driveway', sqft: 0, unit_price: 0.20 }
const defaultWin: WindowRow = { type: 'standard', qty: 0, include_interior: false, unit_price: 6 }

export default function QuotesPage() {
  const [activeServices, setActiveServices] = useState<ServiceKey[]>([])
  const [pwRows, setPwRows] = useState<PWSurfaceRow[]>([{ ...defaultPW }])
  const [swRows, setSwRows] = useState<PWSurfaceRow[]>([{ surface: 'house_exterior_sw', sqft: 0, unit_price: 0.30 }])
  const [winRows, setWinRows] = useState<WindowRow[]>([{ ...defaultWin }])
  const [swCalc, setSwCalc] = useState({ perimeter: '', stories: 1, siding: 'vinyl' })
  const [swAddons, setSwAddons] = useState<string[]>([])
  const [customDiscount, setCustomDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [copied, setCopied] = useState(false)

  const toggleService = (s: ServiceKey) =>
    setActiveServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const pwTotal = activeServices.includes('pressure_washing')
    ? pwRows.reduce((s, r) => s + r.sqft * r.unit_price, 0) : 0
  const swAddonsTotal = swAddons.reduce((s, k) => s + (SOFTWASH_ADDONS.find(a => a.key === k)?.flat_price ?? 0), 0)
  const swTotal = activeServices.includes('soft_washing')
    ? swRows.reduce((s, r) => s + r.sqft * r.unit_price, 0) + swAddonsTotal : 0
  const winTotal = activeServices.includes('window_cleaning')
    ? winRows.reduce((s, r) => {
        const t = WINDOW_TYPES.find(w => w.key === r.type)!
        const price = r.include_interior ? t.exterior_price * t.interior_multiplier : t.exterior_price
        return s + r.qty * price
      }, 0) : 0

  const subtotal = pwTotal + swTotal + winTotal
  const bundleDiscount = calcBundleDiscount(activeServices.length, subtotal)
  const extraDiscount = (customDiscount / 100) * subtotal
  const total = Math.max(subtotal - bundleDiscount - extraDiscount, 0)
  const belowMin = total > 0 && total < JOB_MINIMUM
  const finalTotal = belowMin ? JOB_MINIMUM : total

  const copyQuote = () => {
    const lines = [`Quote for ${customerName} — ${customerAddress}`, '']
    if (pwTotal > 0) lines.push(`Pressure Washing: ${formatCurrency(pwTotal)}`)
    if (swTotal > 0) lines.push(`Soft Washing: ${formatCurrency(swTotal)}`)
    if (winTotal > 0) lines.push(`Window Cleaning: ${formatCurrency(winTotal)}`)
    if (bundleDiscount > 0) lines.push(`Bundle Discount (${activeServices.length - 1}x5%): -${formatCurrency(bundleDiscount)}`)
    if (extraDiscount > 0) lines.push(`Additional Discount: -${formatCurrency(extraDiscount)}`)
    lines.push(``, `TOTAL: ${formatCurrency(finalTotal)}`)
    if (notes) lines.push(``, notes)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-blue-400" />
          <h1 className="text-lg font-semibold">Quote Builder</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={copyQuote}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <Copy size={14} />{copied ? 'Copied!' : 'Copy Quote'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-5">
          {/* Customer Info */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-medium">Customer</div>
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              <input placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
            </div>
          </div>

          {/* Service Toggles */}
          <div className="flex gap-3">
            {(['pressure_washing', 'soft_washing', 'window_cleaning'] as ServiceKey[]).map(s => (
              <button key={s} onClick={() => toggleService(s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${activeServices.includes(s) ? 'bg-blue-600 border-blue-500 text-white' : 'border-dashed hover:border-blue-500'}`}
                style={activeServices.includes(s) ? {} : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {s === 'pressure_washing' ? 'Pressure Washing' : s === 'soft_washing' ? 'Soft Washing' : 'Window Cleaning'}
              </button>
            ))}
          </div>

          {/* Pressure Washing */}
          {activeServices.includes('pressure_washing') && (
            <ServiceSection title="Pressure Washing" total={pwTotal}
              rows={pwRows} setRows={setPwRows}
              surfaces={PRESSURE_WASH_SURFACES}
              defaultRow={{ ...defaultPW }}
              renderRow={(row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select value={row.surface} onChange={e => {
                      const surf = PRESSURE_WASH_SURFACES.find(s => s.key === e.target.value)!
                      setPwRows(prev => prev.map((r, idx) => idx === i ? { ...r, surface: e.target.value, unit_price: surf.price_per_sqft } : r))
                    }}>
                      {PRESSURE_WASH_SURFACES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="Sq Ft" value={row.sqft || ''} onChange={e => setPwRows(prev => prev.map((r, idx) => idx === i ? { ...r, sqft: Number(e.target.value) } : r))} />
                  </div>
                  <div className="col-span-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    ${row.unit_price}/sqft
                  </div>
                  <div className="col-span-2 text-sm font-medium text-right">{formatCurrency(row.sqft * row.unit_price)}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => setPwRows(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              )}
              onAdd={() => setPwRows(prev => [...prev, { ...defaultPW }])}
            />
          )}

          {/* Soft Washing */}
          {activeServices.includes('soft_washing') && (
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Soft Washing</div>
                <div className="text-sm font-semibold text-blue-400">{formatCurrency(swTotal)}</div>
              </div>

              {/* Calculator */}
              <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>HOUSE CALCULATOR</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Perimeter (ft)</div>
                    <input type="number" placeholder="e.g. 292" value={swCalc.perimeter}
                      onChange={e => setSwCalc(p => ({ ...p, perimeter: e.target.value }))} />
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Stories</div>
                    <select value={swCalc.stories} onChange={e => setSwCalc(p => ({ ...p, stories: Number(e.target.value) }))}>
                      <option value={1}>1 Story (10ft)</option>
                      <option value={2}>2 Story (20ft)</option>
                      <option value={3}>3 Story (30ft)</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Surface Type</div>
                    <select value={swCalc.siding} onChange={e => setSwCalc(p => ({ ...p, siding: e.target.value }))}>
                      {SOFTWASH_SIDING_TYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const perim = Number(swCalc.perimeter)
                    if (!perim) return
                    const height = STORY_HEIGHT[swCalc.stories]
                    const sqft = Math.round(perim * height)
                    const siding = SOFTWASH_SIDING_TYPES.find(s => s.key === swCalc.siding)!
                    setSwRows([{ surface: 'house_exterior_sw', sqft, unit_price: siding.price_per_sqft }])
                  }}
                  className="w-full py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Calculate — {swCalc.perimeter ? formatCurrency(Number(swCalc.perimeter) * STORY_HEIGHT[swCalc.stories] * (SOFTWASH_SIDING_TYPES.find(s => s.key === swCalc.siding)?.price_per_sqft ?? 0.30)) : '$0.00'}
                </button>
              </div>

              {/* Add-ons */}
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>ADD-ONS</div>
                <div className="space-y-1.5">
                  {SOFTWASH_ADDONS.map(addon => (
                    <label key={addon.key} className="flex items-center justify-between gap-2 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={swAddons.includes(addon.key)}
                          onChange={e => setSwAddons(prev => e.target.checked ? [...prev, addon.key] : prev.filter(k => k !== addon.key))}
                          className="w-auto" />
                        <span className="text-xs">{addon.label}</span>
                      </div>
                      <span className="text-xs font-medium text-blue-400">+{formatCurrency(addon.flat_price)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Manual sqft rows */}
              {swRows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select value={row.surface} onChange={e => {
                      const surf = SOFT_WASH_SURFACES.find(s => s.key === e.target.value)!
                      setSwRows(prev => prev.map((r, idx) => idx === i ? { ...r, surface: e.target.value, unit_price: surf.price_per_sqft } : r))
                    }}>
                      {SOFT_WASH_SURFACES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="Sq Ft" value={row.sqft || ''} onChange={e => setSwRows(prev => prev.map((r, idx) => idx === i ? { ...r, sqft: Number(e.target.value) } : r))} />
                  </div>
                  <div className="col-span-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    ${row.unit_price}/sqft
                  </div>
                  <div className="col-span-2 text-sm font-medium text-right">{formatCurrency(row.sqft * row.unit_price)}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => setSwRows(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setSwRows(prev => [...prev, { surface: 'house_exterior_sw', sqft: 0, unit_price: 0.30 }])}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                <Plus size={12} />Add Surface
              </button>
            </div>
          )}

          {/* Window Cleaning */}
          {activeServices.includes('window_cleaning') && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Window Cleaning</div>
                <div className="text-sm font-semibold text-blue-400">{formatCurrency(winTotal)}</div>
              </div>
              {winRows.map((row, i) => {
                const wt = WINDOW_TYPES.find(w => w.key === row.type)!
                const unitPrice = row.include_interior ? wt.exterior_price * wt.interior_multiplier : wt.exterior_price
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <select value={row.type} onChange={e => setWinRows(prev => prev.map((r, idx) => idx === i ? { ...r, type: e.target.value } : r))}>
                        {WINDOW_TYPES.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" placeholder="Qty" value={row.qty || ''} onChange={e => setWinRows(prev => prev.map((r, idx) => idx === i ? { ...r, qty: Number(e.target.value) } : r))} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <input type="checkbox" id={`int-${i}`} checked={row.include_interior} onChange={e => setWinRows(prev => prev.map((r, idx) => idx === i ? { ...r, include_interior: e.target.checked } : r))} className="w-auto" />
                      <label htmlFor={`int-${i}`} className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Int + Ext</label>
                    </div>
                    <div className="col-span-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>${unitPrice.toFixed(0)}/ea</div>
                    <div className="col-span-1 text-sm font-medium text-right">{formatCurrency(row.qty * unitPrice)}</div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => setWinRows(prev => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setWinRows(prev => [...prev, { ...defaultWin }])}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                <Plus size={12} />Add Window Type
              </button>
            </div>
          )}

          {/* Totals */}
          {activeServices.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium">Summary</div>
              <div className="space-y-2">
                {pwTotal > 0 && <Line label="Pressure Washing" value={formatCurrency(pwTotal)} />}
                {swTotal > 0 && <Line label="Soft Washing" value={formatCurrency(swTotal)} />}
                {winTotal > 0 && <Line label="Window Cleaning" value={formatCurrency(winTotal)} />}
                <Line label="Subtotal" value={formatCurrency(subtotal)} />
                {bundleDiscount > 0 && (
                  <Line label={`Bundle Discount (${activeServices.length - 1}×5%)`}
                    value={`-${formatCurrency(bundleDiscount)}`} className="text-green-400" />
                )}
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Extra Discount</span>
                  <div className="flex items-center gap-1 w-24">
                    <input type="number" value={customDiscount || ''} onChange={e => setCustomDiscount(Number(e.target.value))} placeholder="0" className="text-right" style={{ padding: '4px 8px' }} />
                    <span className="text-sm">%</span>
                  </div>
                  {extraDiscount > 0 && <span className="text-sm text-green-400">-{formatCurrency(extraDiscount)}</span>}
                </div>
                <div className="pt-2 border-t flex justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-blue-400">{formatCurrency(finalTotal)}</span>
                </div>
                {belowMin && (
                  <div className="text-xs text-yellow-400">Minimum job price applied (${JOB_MINIMUM})</div>
                )}
              </div>
              <textarea placeholder="Notes for quote..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Line({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className={className}>{value}</span>
    </div>
  )
}

function ServiceSection({ title, total, rows, renderRow, onAdd }: {
  title: string; total: number; rows: PWSurfaceRow[];
  setRows: (r: PWSurfaceRow[]) => void; surfaces: typeof PRESSURE_WASH_SURFACES;
  defaultRow: PWSurfaceRow; renderRow: (row: PWSurfaceRow, i: number) => React.ReactNode; onAdd: () => void
}) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm font-semibold text-blue-400">{formatCurrency(total)}</div>
      </div>
      {rows.map((row, i) => renderRow(row, i))}
      <button onClick={onAdd} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
        <Plus size={12} />Add Surface
      </button>
    </div>
  )
}
