'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AccountBalance = { code: string; name: string; type: string; balance: number }

export default function ReportsPage() {
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'pl' | 'bs' | 'tax'>('pl')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code, name, type')
      .eq('company_id', company.id)
      .order('code')

    if (!accounts) { setLoading(false); return }

    const { data: lines } = await supabase
      .from('transaction_lines')
      .select('account_id, debit, credit')

    const balanceMap: Record<string, number> = {}
    for (const line of lines ?? []) {
      if (!balanceMap[line.account_id]) balanceMap[line.account_id] = 0
      balanceMap[line.account_id] += Number(line.debit) - Number(line.credit)
    }

    const result: AccountBalance[] = accounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      balance: balanceMap[acc.id] ?? 0,
    }))

    setBalances(result)
    setLoading(false)
  }

  const byType = (type: string) => balances.filter(b => b.type === type)
  const sum = (items: AccountBalance[]) => items.reduce((s, b) => s + b.balance, 0)

  const revenue = byType('revenue')
  const expenses = byType('expense')
  const assets = byType('asset')
  const liabilities = byType('liability')
  const equity = byType('equity')

  const totalRevenue = sum(revenue)
  const totalExpenses = sum(expenses)
  const netIncome = totalRevenue - totalExpenses
  const totalAssets = sum(assets)
  const totalLiabilities = sum(liabilities)
  const totalEquity = sum(equity)

  function ReportRow({ label, amount, bold, indent }: { label: string; amount: number; bold?: boolean; indent?: boolean }) {
    return (
      <div className={`flex justify-between py-1.5 text-sm ${bold ? 'font-semibold border-t border-gray-200 mt-1 pt-2' : ''} ${indent ? 'pl-4 text-gray-600' : ''}`}>
        <span>{label}</span>
        <span className={`font-mono ${amount < 0 ? 'text-red-600' : ''}`}>
          {amount < 0 ? `(${Math.abs(amount).toFixed(2)})` : amount.toFixed(2)}
        </span>
      </div>
    )
  }

  function SectionHeader({ title }: { title: string }) {
    return <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-1">{title}</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-500 text-sm mt-1">Financial statements for your business</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'pl', label: 'Profit & Loss' },
          { key: 'bs', label: 'Balance Sheet' },
          { key: 'tax', label: 'Tax Summary' },
        ].map(r => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key as 'pl' | 'bs' | 'tax')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeReport === r.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          {activeReport === 'pl' && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Profit & Loss Statement</h3>
              <SectionHeader title="Revenue" />
              {revenue.length === 0 ? <p className="text-sm text-gray-400 pl-4">No revenue accounts</p> : revenue.map(r => <ReportRow key={r.code} label={r.name} amount={r.balance} indent />)}
              <ReportRow label="Total Revenue" amount={totalRevenue} bold />

              <SectionHeader title="Expenses" />
              {expenses.length === 0 ? <p className="text-sm text-gray-400 pl-4">No expense accounts</p> : expenses.map(e => <ReportRow key={e.code} label={e.name} amount={e.balance} indent />)}
              <ReportRow label="Total Expenses" amount={totalExpenses} bold />

              <div className={`mt-4 pt-3 border-t-2 border-gray-300 flex justify-between text-base font-bold ${netIncome >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                <span>Net {netIncome >= 0 ? 'Profit' : 'Loss'}</span>
                <span className="font-mono">{Math.abs(netIncome).toFixed(2)}</span>
              </div>
            </>
          )}

          {activeReport === 'bs' && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Balance Sheet</h3>
              <SectionHeader title="Assets" />
              {assets.length === 0 ? <p className="text-sm text-gray-400 pl-4">No asset accounts</p> : assets.map(a => <ReportRow key={a.code} label={a.name} amount={a.balance} indent />)}
              <ReportRow label="Total Assets" amount={totalAssets} bold />

              <SectionHeader title="Liabilities" />
              {liabilities.length === 0 ? <p className="text-sm text-gray-400 pl-4">No liability accounts</p> : liabilities.map(l => <ReportRow key={l.code} label={l.name} amount={l.balance} indent />)}
              <ReportRow label="Total Liabilities" amount={totalLiabilities} bold />

              <SectionHeader title="Equity" />
              {equity.length === 0 ? <p className="text-sm text-gray-400 pl-4">No equity accounts</p> : equity.map(eq => <ReportRow key={eq.code} label={eq.name} amount={eq.balance} indent />)}
              <ReportRow label="Total Equity" amount={totalEquity} bold />

              <div className={`mt-4 pt-3 border-t-2 border-gray-300 flex justify-between text-base font-bold ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ? 'text-green-700' : 'text-orange-500'}`}>
                <span>Liabilities + Equity</span>
                <span className="font-mono">{(totalLiabilities + totalEquity).toFixed(2)}</span>
              </div>
              {Math.abs(totalAssets - (totalLiabilities + totalEquity)) > 0.01 && (
                <p className="text-xs text-orange-500 mt-1">Balance sheet is out of balance — check your transactions</p>
              )}
            </>
          )}

          {activeReport === 'tax' && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tax Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-mono font-medium">{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Deductible Expenses</span>
                  <span className="font-mono font-medium">{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Net Taxable Income</span>
                  <span className={`font-mono font-semibold ${netIncome >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{netIncome.toFixed(2)}</span>
                </div>
                <div className="mt-4 bg-blue-50 rounded-lg p-4 text-gray-600 text-sm">
                  <p className="font-medium text-blue-800 mb-1">Note</p>
                  <p>This is a simplified tax summary. Please consult a qualified accountant or tax professional for your actual tax filings.</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
