'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type InvoiceItem = { description: string; quantity: number; unit_price: number }
type Invoice = {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  issue_date: string
  due_date: string
  status: string
  currency: string
  tax_rate: number
  invoice_items: InvoiceItem[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    invoice_number: '',
    client_name: '',
    client_email: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    currency: 'USD',
    tax_rate: 0,
    notes: '',
  })
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0 }])

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    setInvoices((data as Invoice[]) ?? [])
    setLoading(false)
  }

  function updateItem(i: number, field: keyof InvoiceItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function getSubtotal() {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)
  }

  function getTotal() {
    const subtotal = getSubtotal()
    return subtotal + subtotal * (Number(form.tax_rate) / 100)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({ ...form, company_id: companyId, status: 'draft' })
      .select()
      .single()

    if (invErr) { setError(invErr.message); setSaving(false); return }

    const { error: itemsErr } = await supabase
      .from('invoice_items')
      .insert(items.filter(i => i.description).map(i => ({ ...i, invoice_id: inv.id })))

    if (itemsErr) { setError(itemsErr.message); setSaving(false); return }

    setForm({ invoice_number: '', client_name: '', client_email: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', currency: 'USD', tax_rate: 0, notes: '' })
    setItems([{ description: '', quantity: 1, unit_price: 0 }])
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('invoices').update({ status }).eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <p className="text-gray-500 text-sm mt-1">Create and manage client invoices</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + New Invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Invoice</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="INV-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
              <input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="client@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <h4 className="text-sm font-medium text-gray-700 mb-2">Line Items</h4>
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                <th className="pb-2">Description</th>
                <th className="pb-2 w-24">Qty</th>
                <th className="pb-2 w-28">Unit Price</th>
                <th className="pb-2 w-28 text-right">Amount</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">
                    <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Service or product" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="py-1 pr-2 text-right font-mono">{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
                  <td className="py-1">
                    {items.length > 1 && <button type="button" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setItems(p => [...p, { description: '', quantity: 1, unit_price: 0 }])} className="text-sm text-blue-600 hover:underline mb-4">+ Add item</button>

          <div className="flex justify-end text-sm mb-4">
            <div className="space-y-1 text-right">
              <p className="text-gray-500">Subtotal: <span className="font-mono text-gray-900">{getSubtotal().toFixed(2)}</span></p>
              <p className="text-gray-500">Tax ({form.tax_rate}%): <span className="font-mono text-gray-900">{(getSubtotal() * Number(form.tax_rate) / 100).toFixed(2)}</span></p>
              <p className="font-semibold">Total: <span className="font-mono">{getTotal().toFixed(2)} {form.currency}</span></p>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Invoice'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No invoices yet</p>
          <p className="text-sm">Click &quot;New Invoice&quot; to create your first invoice</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Issue Date</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const subtotal = inv.invoice_items?.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0) ?? 0
                const total = subtotal + subtotal * (Number(inv.tax_rate) / 100)
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-gray-700">{inv.client_name}</td>
                    <td className="px-5 py-3 text-gray-500">{inv.issue_date}</td>
                    <td className="px-5 py-3 text-gray-500">{inv.due_date}</td>
                    <td className="px-5 py-3 text-right font-mono">{total.toFixed(2)} {inv.currency}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
