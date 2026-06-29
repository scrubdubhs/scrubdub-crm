'use client'
import { useState, useEffect } from 'react'
import { Receipt, Send, CheckCircle, DollarSign, Copy } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import type { Invoice, PaymentMethod } from '@/lib/types'

const PAYMENT_BADGE: Record<PaymentMethod | 'unpaid', string> = {
  stripe: 'bg-purple-500/20 text-purple-300',
  cash: 'bg-green-500/20 text-green-300',
  check: 'bg-yellow-500/20 text-yellow-300',
  unpaid: 'bg-red-500/20 text-red-300',
}

type InvoiceWithContact = Invoice & { contacts: { first_name: string; last_name: string; email: string | null } | null }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InvoiceWithContact | null>(null)
  const [emailModal, setEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [copied, setCopied] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('invoices').select('*, contacts(first_name, last_name, email)').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setInvoices(data as InvoiceWithContact[]) })
      .catch(e => console.error('Invoices load error:', e))
      .finally(() => setLoading(false))
  }, [])

  async function markPaid(method: PaymentMethod) {
    if (!selected) return
    const supabase = createClient()
    const updates = { payment_method: method, payment_status: 'paid' as const, paid_at: new Date().toISOString() }
    await supabase.from('invoices').update(updates).eq('id', selected.id)
    const { data: contact } = await supabase.from('contacts').select('total_spent').eq('id', selected.contact_id).single()
    if (contact) await supabase.from('contacts').update({ total_spent: (contact.total_spent ?? 0) + selected.total }).eq('id', selected.contact_id)
    const updated = { ...selected, ...updates }
    setInvoices(prev => prev.map(i => i.id === selected.id ? updated : i))
    setSelected(updated)
  }

  async function sendEmail() {
    if (!selected || !emailAddress) return
    setSendingEmail(true)
    await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: selected.id, email: emailAddress }),
    })
    setSendingEmail(false)
    setEmailModal(false)
  }

  const copyInvoiceText = (inv: InvoiceWithContact) => {
    const lines = [
      `INVOICE — Scrub-A-Dub Home Services`,
      `636-281-6111`,
      `Date: ${inv.completed_date}`,
      ``,
      ...inv.line_items.map((li: { description: string; total: number }) => `${li.description}: ${formatCurrency(li.total)}`),
      ``,
      inv.bundle_discount > 0 ? `Bundle Discount: -${formatCurrency(inv.discount_amount)}` : '',
      `TOTAL: ${formatCurrency(inv.total)}`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-blue-400" />
          <h1 className="text-lg font-semibold">Invoices</h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {loading ? (
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No invoices yet</div>
          ) : invoices.map(inv => (
            <button key={inv.id} onClick={() => setSelected(inv)}
              className="w-full text-left px-4 py-3 border-b hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--border)', background: selected?.id === inv.id ? 'var(--surface-2)' : 'transparent' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">
                  {inv.contacts ? `${inv.contacts.first_name} ${inv.contacts.last_name}` : `#${inv.id.slice(0, 8)}`}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_BADGE[inv.payment_status === 'paid' ? inv.payment_method : 'unpaid']}`}>
                  {inv.payment_status === 'paid' ? inv.payment_method : 'Unpaid'}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.created_at)}</div>
              <div className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(inv.total)}</div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-lg rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="p-5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">Scrub-A-Dub Home Services</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>636-281-6111</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Invoice #{selected.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Date: {selected.completed_date}</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {selected.line_items.map((li: { id?: string; description: string; total: number }, i: number) => (
                  <div key={li.id ?? i} className="flex justify-between text-sm">
                    <span>{li.description}</span>
                    <span className="font-medium">{formatCurrency(li.total)}</span>
                  </div>
                ))}
                {selected.bundle_discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Bundle Discount</span>
                    <span>-{formatCurrency(selected.discount_amount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t flex justify-between font-bold text-lg" style={{ borderColor: 'var(--border)' }}>
                  <span>Total</span>
                  <span className="text-blue-400">{formatCurrency(selected.total)}</span>
                </div>
                {selected.payment_status === 'paid' && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle size={14} />Paid via {selected.payment_method} {selected.paid_at && `on ${formatDate(selected.paid_at)}`}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => copyInvoiceText(selected)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <Copy size={14} />{copied ? 'Copied!' : 'Copy as Text'}
              </button>
              <button onClick={() => { setEmailAddress(selected.contacts?.email ?? ''); setEmailModal(true) }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <Send size={14} />Email Invoice
              </button>
              {selected.payment_status === 'unpaid' && (
                <>
                  <button onClick={() => markPaid('cash')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white transition-colors">
                    <DollarSign size={14} />Mark Cash Paid
                  </button>
                  <button onClick={() => markPaid('check')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-yellow-600 hover:bg-yellow-700 text-white transition-colors">
                    <CheckCircle size={14} />Mark Check Paid
                  </button>
                  <button disabled
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm opacity-40 cursor-not-allowed"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Stripe — Coming Soon
                  </button>
                </>
              )}
            </div>

            {emailModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="rounded-xl p-5 w-80 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="font-medium">Email Invoice</div>
                  <input placeholder="Customer email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={sendEmail} disabled={sendingEmail}
                      className="flex-1 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                      {sendingEmail ? 'Sending…' : 'Send'}
                    </button>
                    <button onClick={() => setEmailModal(false)} className="flex-1 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            Select an invoice to view
          </div>
        )}
      </div>
    </div>
  )
}
