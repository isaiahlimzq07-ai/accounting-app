const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

const mockTransactions = [
  { id: '1', description: 'Client payment received', date: '2026-03-15' },
  { id: '2', description: 'Office rent payment', date: '2026-03-10' },
  { id: '3', description: 'Supplier invoice paid', date: '2026-03-08' },
]

const mockInvoices = [
  { id: '1', invoice_number: 'INV-001', client_name: 'Acme Corp', status: 'paid' },
  { id: '2', invoice_number: 'INV-002', client_name: 'Beta Ltd', status: 'sent' },
  { id: '3', invoice_number: 'INV-003', client_name: 'Gamma Inc', status: 'overdue' },
]

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back, Bright Star Trading
      </h2>
      <p className="text-gray-500 mb-8">Here&apos;s an overview of your finances</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Chart of Accounts</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">10</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">3</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">3</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <ul className="space-y-3">
            {mockTransactions.map(tx => (
              <li key={tx.id} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate">{tx.description}</span>
                <span className="text-gray-400 ml-4 shrink-0">{tx.date}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Invoices</h3>
          <ul className="space-y-3">
            {mockInvoices.map(inv => (
              <li key={inv.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-gray-700">{inv.invoice_number}</span>
                  <span className="text-gray-400 ml-2">{inv.client_name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] ?? ''}`}>
                  {inv.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
