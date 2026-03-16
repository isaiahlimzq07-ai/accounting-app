'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BankAccount = { id: string; name: string; bank_name: string; currency: string }
type BankTransaction = { id: string; date: string; description: string; amount: number; is_reconciled: boolean }

export default function BankPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBankForm, setShowBankForm] = useState(false)
  const [showTxForm, setShowTxForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [bankForm, setBankForm] = useState({ name: '', bank_name: '', account_number: '', currency: 'USD' })
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '' })

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedBank) loadTxs(selectedBank) }, [selectedBank])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data } = await supabase.from('bank_accounts').select('*').eq('company_id', company.id)
    setBankAccounts(data ?? [])
    if (data && data.length > 0 && !selectedBank) setSelectedBank(data[0].id)
    setLoading(false)
  }

  async function loadTxs(bankId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankId)
      .order('date', { ascending: false })
    setBankTxs((data as BankTransaction[]) ?? [])
  }

  async function addBankAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('bank_accounts').insert({ ...bankForm, company_id: companyId })
    setBankForm({ name: '', bank_name: '', account_number: '', currency: 'USD' })
    setShowBankForm(false)
    await load()
    setSaving(false)
  }

  async function addBankTx(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBank) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('bank_transactions').insert({ ...txForm, amount: Number(txForm.amount), bank_account_id: selectedBank })
    setTxForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '' })
    setShowTxForm(false)
    await loadTxs(selectedBank)
    setSaving(false)
  }

  async function toggleReconciled(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('bank_transactions').update({ is_reconciled: !current }).eq('id', id)
    if (selectedBank) await loadTxs(selectedBank)
  }

  const balance = bankTxs.reduce((s, t) => s + Number(t.amount), 0)
  const reconciledBalance = bankTxs.filter(t => t.is_reconciled).reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h2>
          <p className="text-gray-500 text-sm mt-1">Track and reconcile bank transactions</p>
        </div>
        <button onClick={() => setShowBankForm(!showBankForm)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + Add Bank Account
        </button>
      </div>

      {showBankForm && (
        <form onSubmit={addBankAccount} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Bank Account</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input value={bankForm.name} onChange={e => setBankForm(f => ({ ...f, name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Main Checking" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input value={bankForm.bank_name} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Chase Bank" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input value={bankForm.account_number} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="****1234" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input value={bankForm.currency} onChange={e => setBankForm(f => ({ ...f, currency: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="USD" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add Account'}</button>
            <button type="button" onClick={() => setShowBankForm(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : bankAccounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No bank accounts yet</p>
          <p className="text-sm">Add a bank account to start reconciling transactions</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Bank account list */}
          <div className="w-48 shrink-0">
            <p className="text-xs text-gray-400 uppercase font-medium mb-2">Accounts</p>
            {bankAccounts.map(ba => (
              <button key={ba.id} onClick={() => setSelectedBank(ba.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${selectedBank === ba.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                {ba.name}
                <span className="block text-xs text-gray-400">{ba.bank_name}</span>
              </button>
            ))}
          </div>

          {/* Transactions */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400">Statement Balance</p>
                  <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{balance.toFixed(2)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400">Reconciled</p>
                  <p className={`text-lg font-bold ${reconciledBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{reconciledBalance.toFixed(2)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400">Difference</p>
                  <p className={`text-lg font-bold ${Math.abs(balance - reconciledBalance) < 0.01 ? 'text-green-600' : 'text-orange-500'}`}>{(balance - reconciledBalance).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => setShowTxForm(!showTxForm)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                + Add Transaction
              </button>
            </div>

            {showTxForm && (
              <form onSubmit={addBankTx} className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deposit, withdrawal..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (negative = debit)</label>
                    <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1000.00" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add'}</button>
                  <button type="button" onClick={() => setShowTxForm(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            )}

            {bankTxs.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions for this account yet</p>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Reconciled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankTxs.map(tx => (
                      <tr key={tx.id} className={`border-b border-gray-50 hover:bg-gray-50 ${tx.is_reconciled ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3 text-gray-500">{tx.date}</td>
                        <td className="px-5 py-3 text-gray-900">{tx.description || '—'}</td>
                        <td className={`px-5 py-3 text-right font-mono ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => toggleReconciled(tx.id, tx.is_reconciled)} className={`w-5 h-5 rounded border-2 transition-colors ${tx.is_reconciled ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
                            {tx.is_reconciled && <span className="text-white text-xs">✓</span>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
