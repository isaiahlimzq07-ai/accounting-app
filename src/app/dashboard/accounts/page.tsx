'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Account = {
  id: string
  code: string
  name: string
  type: string
  is_active: boolean
}

const typeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-orange-100 text-orange-700',
}

const defaultAccounts = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'Loans Payable', type: 'liability' },
  { code: '3000', name: 'Owner Equity', type: 'equity' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5100', name: 'Rent Expense', type: 'expense' },
  { code: '5200', name: 'Salaries Expense', type: 'expense' },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', company.id)
      .order('code')

    setAccounts(data ?? [])
    setLoading(false)
  }

  async function seedDefaults() {
    if (!companyId) return
    setSaving(true)
    const supabase = createClient()
    const rows = defaultAccounts.map(a => ({ ...a, company_id: companyId }))
    await supabase.from('accounts').insert(rows)
    await loadAccounts()
    setSaving(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('accounts').insert({
      company_id: companyId,
      code: form.code,
      name: form.name,
      type: form.type,
    })
    if (error) {
      setError(error.message)
    } else {
      setForm({ code: '', name: '', type: 'asset' })
      setShowForm(false)
      await loadAccounts()
    }
    setSaving(false)
  }

  const grouped = ['asset', 'liability', 'equity', 'revenue', 'expense'].reduce(
    (acc, type) => {
      acc[type] = accounts.filter(a => a.type === type)
      return acc
    },
    {} as Record<string, Account[]>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your account categories</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Load Default Accounts
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Account
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Account</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cash"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No accounts yet</p>
          <p className="text-sm">Click &quot;Load Default Accounts&quot; to get started quickly</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) =>
            items.length > 0 ? (
              <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[type]}`}>
                    {type}
                  </span>
                  <span className="text-sm text-gray-500">{items.length} accounts</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-2">Code</th>
                      <th className="px-5 py-2">Name</th>
                      <th className="px-5 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(acc => (
                      <tr key={acc.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-gray-500">{acc.code}</td>
                        <td className="px-5 py-3 text-gray-900">{acc.name}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${acc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {acc.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
