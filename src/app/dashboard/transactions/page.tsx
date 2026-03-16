'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Account = { id: string; code: string; name: string; type: string }
type TransactionLine = { account_id: string; debit: number; credit: number; description: string }
type Transaction = {
  id: string
  date: string
  description: string
  reference: string
  currency: string
  transaction_lines: { debit: number; credit: number; accounts: { name: string } }[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    currency: 'USD',
  })
  const [lines, setLines] = useState<TransactionLine[]>([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' },
  ])

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const [{ data: txs }, { data: accs }] = await Promise.all([
      supabase.from('transactions').select('*, transaction_lines(debit, credit, accounts(name))').eq('company_id', company.id).order('date', { ascending: false }),
      supabase.from('accounts').select('id, code, name, type').eq('company_id', company.id).order('code'),
    ])

    setTransactions((txs as Transaction[]) ?? [])
    setAccounts(accs ?? [])
    setLoading(false)
  }

  function updateLine(index: number, field: keyof TransactionLine, value: string | number) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines(prev => [...prev, { account_id: '', debit: 0, credit: 0, description: '' }])
  }

  function removeLine(index: number) {
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0)
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    if (!isBalanced) { setError('Debits must equal credits'); return }

    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({ ...form, company_id: companyId })
      .select()
      .single()

    if (txErr) { setError(txErr.message); setSaving(false); return }

    const lineRows = lines
      .filter(l => l.account_id)
      .map(l => ({ transaction_id: tx.id, account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), description: l.description }))

    const { error: linesErr } = await supabase.from('transaction_lines').insert(lineRows)
    if (linesErr) { setError(linesErr.message); setSaving(false); return }

    setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '', currency: 'USD' })
    setLines([{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }])
    setShowForm(false)
    await load()
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-gray-500 text-sm mt-1">Journal entries with double-entry bookkeeping</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Transaction
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Journal Entry</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Payment received..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="INV-001" />
            </div>
          </div>

          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                <th className="pb-2">Account</th>
                <th className="pb-2 w-28">Debit</th>
                <th className="pb-2 w-28">Credit</th>
                <th className="pb-2">Note</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">
                    <select value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="">Select account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="0.01" value={line.debit || ''} onChange={e => updateLine(i, 'debit', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="0.00" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="0.01" value={line.credit || ''} onChange={e => updateLine(i, 'credit', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="0.00" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Optional note" />
                  </td>
                  <td className="py-1">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-medium">
                <td className="pt-2 text-gray-500">Totals</td>
                <td className={`pt-2 ${!isBalanced ? 'text-red-600' : 'text-green-600'}`}>{totalDebit.toFixed(2)}</td>
                <td className={`pt-2 ${!isBalanced ? 'text-red-600' : 'text-green-600'}`}>{totalCredit.toFixed(2)}</td>
                <td colSpan={2} className="pt-2 text-xs text-gray-400">{isBalanced ? 'Balanced' : 'Not balanced'}</td>
              </tr>
            </tfoot>
          </table>

          <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline mb-4">+ Add line</button>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !isBalanced} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Post Entry'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : transactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No transactions yet</p>
          <p className="text-sm">Click &quot;New Transaction&quot; to post your first journal entry</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3 text-right">Total Debit</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const total = tx.transaction_lines?.reduce((s, l) => s + Number(l.debit), 0) ?? 0
                return (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500">{tx.date}</td>
                    <td className="px-5 py-3 text-gray-900">{tx.description}</td>
                    <td className="px-5 py-3 text-gray-400">{tx.reference || '—'}</td>
                    <td className="px-5 py-3 text-right font-mono">{total.toFixed(2)}</td>
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
