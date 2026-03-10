'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAuth, api, formatPrice, sounds } from '@/lib/store'
import { ArrowLeft, Check, X, Play, Bell, UtensilsCrossed, Clock } from 'lucide-react'
import useSWR, { mutate as globalMutate } from 'swr'

type Order = {
  id: string
  table_name: string
  client_name: string
  notes: string
  status: string
  total: number
  items: Array<{ id: number; name: string; emoji: string; price: number; qty: number; done: number }>
  created_at: string
}

const fetcher = (url: string) => api(url)

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const isUrgent = mins >= 20
  const isWarning = mins >= 10 && mins < 20

  return (
    <span
      className={`font-mono text-xs flex items-center gap-1 ${isUrgent ? 'animate-pulse-urgent' : ''}`}
      style={{ color: isUrgent ? 'var(--red)' : isWarning ? 'var(--orange)' : 'var(--green)' }}
    >
      <Clock className="w-3 h-3" />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}

function KitchenTicket({
  order,
  onStatusChange,
  onToggleItem,
  onCancel,
}: {
  order: Order
  onStatusChange: (id: string, status: string) => void
  onToggleItem: (orderId: string, idx: number, done: boolean) => void
  onCancel: (id: string) => void
}) {
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'A preparer', color: 'var(--gold)' },
    acknowledged: { label: 'Pris en compte', color: 'var(--blue)' },
    preparing: { label: 'En preparation', color: 'var(--orange)' },
    ready: { label: 'Prete', color: 'var(--green)' },
  }

  const info = statusLabels[order.status] || { label: order.status, color: 'var(--muted-color)' }

  return (
    <div className="rounded-xl border p-4 animate-card-in" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--gold)' }}>{order.id}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-color)' }}>{order.table_name} - {order.client_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderTimer createdAt={order.created_at} />
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${info.color}20`, color: info.color }}>
            {info.label}
          </span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <p className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--orange)' }}>
          {order.notes}
        </p>
      )}

      {/* Items */}
      <div className="space-y-1.5 mb-3">
        {order.items.map((item, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-all hover:opacity-80"
            style={{ background: item.done ? 'rgba(76,175,80,0.08)' : 'transparent' }}
          >
            <input
              type="checkbox"
              checked={item.done === 1}
              onChange={(e) => onToggleItem(order.id, idx, e.target.checked)}
              className="rounded accent-[var(--green)]"
              style={{ accentColor: 'var(--green)' }}
            />
            <span className="text-sm" style={{
              color: item.done ? 'var(--muted-color)' : 'var(--text)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
              {item.emoji} {item.name} x{item.qty}
            </span>
          </label>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => onStatusChange(order.id, 'acknowledged')}
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: 'var(--blue)', color: '#fff' }}
          >
            <Check className="w-3 h-3" /> Prise en compte
          </button>
        )}
        {order.status === 'acknowledged' && (
          <button
            onClick={() => onStatusChange(order.id, 'preparing')}
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: 'var(--orange)', color: '#fff' }}
          >
            <Play className="w-3 h-3" /> Lancer preparation
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => onStatusChange(order.id, 'ready')}
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: 'var(--green)', color: '#fff' }}
          >
            <Bell className="w-3 h-3" /> Commande prete
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => onStatusChange(order.id, 'served')}
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: 'var(--gold)', color: 'var(--bg)' }}
          >
            <UtensilsCrossed className="w-3 h-3" /> Commande servie
          </button>
        )}
        {order.status !== 'ready' && order.status !== 'served' && (
          <button
            onClick={() => onCancel(order.id)}
            className="py-2 px-3 rounded-lg text-xs flex items-center justify-center"
            style={{ borderColor: 'var(--red)', color: 'var(--red)', border: '1px solid' }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export function CuisineScreen({ onBack }: { onBack: () => void }) {
  const auth = getAuth()
  const { data: allOrders = [], mutate: mutateOrders } = useSWR<Order[]>('/api/orders', fetcher, { refreshInterval: 5000 })
  const { data: stats } = useSWR('/api/stats', fetcher, { refreshInterval: 10000 })

  // SSE connection
  useEffect(() => {
    if (!auth?.token) return
    const eventSource = new EventSource(`/api/events?channel=cuisine&token=${auth.token}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'NEW_ORDER') {
          sounds.newOrder()
          mutateOrders()
          globalMutate('/api/stats')
        } else if (data.type === 'ORDER_SERVED' || data.type === 'ITEM_TOGGLED' || data.type === 'RESET') {
          mutateOrders()
          globalMutate('/api/stats')
        }
      } catch {}
    }

    return () => eventSource.close()
  }, [auth?.token, mutateOrders])

  // Only show validated orders (not pending_validation — those are at the caisse)
  const pendingOrders = allOrders.filter(o => o.status === 'pending')
  const activeOrders = allOrders.filter(o => ['acknowledged', 'preparing'].includes(o.status))
  const readyOrders = allOrders.filter(o => o.status === 'ready')

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      mutateOrders()
      globalMutate('/api/stats')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }, [mutateOrders])

  const handleToggleItem = useCallback(async (orderId: string, idx: number, done: boolean) => {
    try {
      await api(`/api/orders/${orderId}/items/${idx}`, {
        method: 'PATCH',
        body: JSON.stringify({ done }),
      })
      mutateOrders()
    } catch {}
  }, [mutateOrders])

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm('Annuler cette commande ?')) return
    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      mutateOrders()
      globalMutate('/api/stats')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }, [mutateOrders])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--muted-color)' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)' }}>Cuisine</h2>
        </div>
      </nav>

      {/* Stats */}
      {stats && (
        <div className="flex gap-4 px-4 py-3 overflow-x-auto border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg2)' }}>
          {[
            { label: 'En attente', value: stats.pending_orders, color: 'var(--gold)' },
            { label: 'En cours', value: stats.active_orders, color: 'var(--orange)' },
            { label: 'Pretes', value: stats.ready_orders, color: 'var(--green)' },
            { label: 'Servies', value: stats.served_today, color: 'var(--muted-color)' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center min-w-[70px]">
              <span className="text-xs" style={{ color: 'var(--muted-color)' }}>{s.label}</span>
              <span className="text-sm font-mono font-medium" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3 Column Layout */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Column 1 - Pending */}
        <div className="flex-1 overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
            <span style={{ color: 'var(--gold)' }}>A preparer ({pendingOrders.length})</span>
          </h3>
          <div className="space-y-3">
            {pendingOrders.map(o => (
              <KitchenTicket key={o.id} order={o} onStatusChange={handleStatusChange} onToggleItem={handleToggleItem} onCancel={handleCancel} />
            ))}
            {pendingOrders.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'var(--muted-color)' }}>Aucune commande en attente</p>
            )}
          </div>
        </div>

        {/* Column 2 - In Progress */}
        <div className="flex-1 overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--orange)' }} />
            <span style={{ color: 'var(--orange)' }}>En preparation ({activeOrders.length})</span>
          </h3>
          <div className="space-y-3">
            {activeOrders.map(o => (
              <KitchenTicket key={o.id} order={o} onStatusChange={handleStatusChange} onToggleItem={handleToggleItem} onCancel={handleCancel} />
            ))}
            {activeOrders.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'var(--muted-color)' }}>Aucune commande en cours</p>
            )}
          </div>
        </div>

        {/* Column 3 - Ready */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
            <span style={{ color: 'var(--green)' }}>Pret a servir ({readyOrders.length})</span>
          </h3>
          <div className="space-y-3">
            {readyOrders.map(o => (
              <KitchenTicket key={o.id} order={o} onStatusChange={handleStatusChange} onToggleItem={handleToggleItem} onCancel={handleCancel} />
            ))}
            {readyOrders.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'var(--muted-color)' }}>Aucune commande prete</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
