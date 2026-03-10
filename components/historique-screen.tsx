'use client'

import { useState, useEffect } from 'react'
import { getAuth, api, formatPrice } from '@/lib/store'
import { ArrowLeft, ChevronDown, ChevronUp, Calendar, DollarSign, ShoppingBag, Star } from 'lucide-react'

type HistoryOrder = {
  id: string
  table_name: string
  client_name: string
  status: string
  total: number
  rating: number | null
  items: Array<{ name: string; emoji: string; price: number; qty: number }>
  created_at: string
  updated_at: string
}

type Transaction = {
  action: string
  actor: string
  timestamp: string
}

export function HistoriqueScreen({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [summary, setSummary] = useState({ served_today: 0, revenue_today: 0 })
  const [dateFilter, setDateFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [orderTransactions, setOrderTransactions] = useState<Record<string, Transaction[]>>({})
  const [loading, setLoading] = useState(true)

  async function fetchHistory(date?: string) {
    setLoading(true)
    try {
      const params = date ? `?date=${date}` : ''
      const data = await api(`/api/history${params}`)
      setOrders(data.orders)
      setSummary(data.summary)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  async function toggleExpand(orderId: string) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
      return
    }
    setExpandedOrder(orderId)
    if (!orderTransactions[orderId]) {
      try {
        const data = await api(`/api/transactions?order_id=${orderId}`)
        setOrderTransactions(prev => ({ ...prev, [orderId]: data }))
      } catch {}
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={onBack} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--muted-color)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)' }}>Historique</h2>
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-color)' }}>Servies aujourd'hui</span>
              </div>
              <p className="text-2xl font-mono font-semibold" style={{ color: 'var(--text)' }}>{summary.served_today}</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" style={{ color: 'var(--green)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-color)' }}>CA du jour</span>
              </div>
              <p className="text-2xl font-mono font-semibold" style={{ color: 'var(--green)' }}>{formatPrice(summary.revenue_today)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-color)' }} />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border-color)', color: 'var(--text)', colorScheme: 'dark' }}
              />
            </div>
            <button
              onClick={() => fetchHistory(dateFilter || undefined)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--gold)', color: 'var(--bg)' }}
            >
              Filtrer
            </button>
            <button
              onClick={() => { setDateFilter(''); fetchHistory() }}
              className="px-4 py-2.5 rounded-xl text-sm border"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text)' }}
            >
              Tout
            </button>
          </div>

          {/* Orders Table */}
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--muted-color)' }}>Chargement...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--muted-color)' }}>Aucune commande servie</p>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
                  {/* Row */}
                  <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                    <span className="font-mono text-sm font-medium" style={{ color: 'var(--gold)' }}>{order.id}</span>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{order.client_name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted-color)' }}>{order.table_name}</span>
                    <span className="text-xs hidden sm:block truncate flex-1" style={{ color: 'var(--muted-color)' }}>
                      {order.items.map(i => `${i.emoji}${i.name}`).join(', ')}
                    </span>
                    {order.rating && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--gold)' }}>
                        <Star className="w-3 h-3" fill="var(--gold)" />
                        {order.rating}
                      </span>
                    )}
                    <span className="font-mono text-sm font-medium ml-auto" style={{ color: 'var(--gold)' }}>{formatPrice(order.total)}</span>
                    {expandedOrder === order.id ? (
                      <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-color)' }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-color)' }} />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedOrder === order.id && (
                    <div className="px-4 pb-4 pt-0 border-t animate-slide-up" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {/* Items */}
                        <div>
                          <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--gold)' }}>Articles</h5>
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span style={{ color: 'var(--text)' }}>{item.emoji} {item.name} x{item.qty}</span>
                                <span className="font-mono" style={{ color: 'var(--muted-color)' }}>{formatPrice(item.price * item.qty)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Transactions */}
                        <div>
                          <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--gold)' }}>Journal</h5>
                          <div className="space-y-1">
                            {(orderTransactions[order.id] || []).map((t, i) => (
                              <div key={i} className="text-xs" style={{ color: 'var(--muted-color)' }}>
                                <span className="font-mono">{formatDate(t.timestamp)}</span>
                                {' - '}
                                <span style={{ color: 'var(--text)' }}>{t.action}</span>
                                {' '}
                                <span>({t.actor})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--muted-color)' }}>
                        <span>Commande : {formatDate(order.created_at)}</span>
                        <span>Service : {formatDate(order.updated_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
