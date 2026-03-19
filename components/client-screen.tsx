'use client'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { useState, useEffect } from 'react'
import { getAuth, api, formatPrice, getTrackedOrder, setTrackedOrder, sounds } from '@/lib/store'
import { ArrowLeft, Search, Check, Clock, ChefHat, Bell, UtensilsCrossed, Star, ShieldCheck } from 'lucide-react'

type Order = {
  id: string
  table_name: string
  client_name: string
  notes: string
  status: string
  total: number
  items: Array<{ name: string; emoji: string; price: number; qty: number; done: number }>
  rating: number | null
  created_at: string
}

const steps = [
  { key: 'pending_validation', label: 'En attente', desc: 'Votre commande est en attente de validation par la caisse', icon: Clock },
  { key: 'pending', label: 'Validee', desc: 'La caisse a valide votre commande, envoyee en cuisine', icon: ShieldCheck },
  { key: 'acknowledged', label: 'Prise en compte', desc: 'La cuisine a pris votre commande en charge', icon: Check },
  { key: 'preparing', label: 'En preparation', desc: 'Votre commande est en cours de preparation', icon: ChefHat },
  { key: 'ready', label: 'Prete !', desc: 'Votre commande est prete a etre servie', icon: Bell },
  { key: 'served', label: 'Servie', desc: 'Bon appetit !', icon: UtensilsCrossed },
]

// --- Star Rating Component ---
function StarRating({ rating, onRate, readonly }: { rating: number; onRate?: (r: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hovered || rating)
        return (
          <button
            key={star}
            onClick={() => !readonly && onRate?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            disabled={readonly}
            className="transition-all disabled:cursor-default"
            style={{ transform: filled ? 'scale(1.15)' : 'scale(1)' }}
          >
            <Star
              className={`w-7 h-7 transition-colors ${readonly ? 'w-5 h-5' : ''}`}
              fill={filled ? 'var(--gold)' : 'transparent'}
              style={{ color: filled ? 'var(--gold)' : 'var(--border-color)' }}
            />
          </button>
        )
      })}
    </div>
  )
}

export function ClientScreen({ onBack, initialOrderId }: { onBack: () => void; initialOrderId?: string }) {
  const auth = getAuth()
  const [orderId, setOrderId] = useState(initialOrderId || getTrackedOrder() || '')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState<{ message: string; color: string } | null>(null)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)

  async function fetchOrder(id: string) {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await api(`/api/orders/${id}`)
      setOrder(data)
      setTrackedOrder(id)
      if (data.rating) setRatingSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commande non trouvee')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useRealtimeChannel('client', auth?.token, (data) => {
    const payload = data.payload as Record<string, unknown>

    if (payload?.id !== order?.id) return

    // Update order
    if (payload.status) {
      setOrder(prev => prev ? { ...prev, status: payload.status as Order['status'], items: (payload.items as Order['items']) || prev.items } : prev)
    }

    // Play sounds and show notifications
    const notifMap: Record<string, { msg: string; color: string; sound: () => void }> = {
      ORDER_VALIDATED:    { msg: (payload.message as string) || 'Votre commande a ete validee par la caisse !', color: 'var(--green)',  sound: sounds.acknowledged },
      ORDER_ACKNOWLEDGED: { msg: 'Votre commande a ete prise en compte par la cuisine !',                       color: 'var(--blue)',   sound: sounds.acknowledged },
      ORDER_PREPARING:    { msg: 'Votre commande est en preparation !',                                         color: 'var(--orange)', sound: sounds.preparing    },
      ORDER_READY:        { msg: 'Votre commande est prete !',                                                  color: 'var(--green)',  sound: sounds.orderReady   },
      ORDER_SERVED:       { msg: 'Bon appetit !',                                                               color: 'var(--gold)',   sound: sounds.served       },
      ORDER_CANCELLED:    { msg: (payload.message as string) || 'Votre commande a ete annulee',                 color: 'var(--red)',    sound: sounds.served       },
    }

    const notif = notifMap[data.type]
    if (notif) {
      notif.sound()
      setNotification({ message: notif.msg, color: notif.color })
      setTimeout(() => setNotification(null), 8000)
    }
  })

  async function handleRate(rating: number) {
    if (!order || ratingSubmitted) return
    setRatingLoading(true)
    try {
      await api(`/api/orders/${order.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      })
      setOrder(prev => prev ? { ...prev, rating } : prev)
      setRatingSubmitted(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setRatingLoading(false)
    }
  }

  const currentStepIdx = order ? steps.findIndex(s => s.key === order.status) : -1
  const isCancelled = order?.status === 'cancelled'
  const isServed = order?.status === 'served'
  const isActive = order && !isCancelled && !isServed

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={onBack} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--muted-color)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)' }}>Suivi commande</h2>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: 'var(--green)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: 'var(--green)' }} />
            Suivi en temps reel actif
          </span>
        )}
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          {/* Search */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && fetchOrder(orderId)}
              placeholder="Code commande (ex: CMD-A3F2B1)"
              className="flex-1 px-4 py-3 rounded-xl border text-sm font-mono"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border-color)', color: 'var(--text)' }}
            />
            <button
              onClick={() => fetchOrder(orderId)}
              disabled={loading || !orderId}
              className="px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'var(--gold)', color: 'var(--bg)' }}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <p className="text-sm text-center mb-4 py-3 rounded-xl" style={{ background: 'rgba(239,83,80,0.1)', color: 'var(--red)' }}>
              {error}
            </p>
          )}

          {/* Notification Banner */}
          {notification && (
            <div className="mb-4 p-3 rounded-xl text-sm font-medium text-center animate-notif-pop" style={{ background: `${notification.color}15`, color: notification.color }}>
              {notification.message}
            </div>
          )}

          {order && (
            <>
              {/* Order Info */}
              <div className="mb-6 text-center">
                <p className="font-mono text-lg font-semibold" style={{ color: 'var(--gold)' }}>{order.id}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-color)' }}>
                  {order.table_name} - {order.client_name}
                </p>
              </div>

              {/* Cancelled Banner */}
              {isCancelled && (
                <div className="mb-6 p-4 rounded-xl text-center" style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid var(--red)' }}>
                  <p className="font-medium" style={{ color: 'var(--red)' }}>Commande annulee</p>
                </div>
              )}

              {/* Progress Steps */}
              {!isCancelled && (
                <div className="mb-8">
                  <div className="space-y-0">
                    {steps.map((step, i) => {
                      const isDone = i < currentStepIdx
                      const isCurrent = i === currentStepIdx
                      const isInactive = i > currentStepIdx
                      const Icon = step.icon

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                              style={{
                                background: isDone ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--bg3)',
                                border: `2px solid ${isDone ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--border-color)'}`,
                              }}
                            >
                              {isDone ? (
                                <Check className="w-4 h-4" style={{ color: '#fff' }} />
                              ) : (
                                <Icon className="w-3.5 h-3.5" style={{ color: isCurrent ? 'var(--bg)' : 'var(--muted-color)' }} />
                              )}
                            </div>
                            {i < steps.length - 1 && (
                              <div className="w-0.5 h-10" style={{ background: isDone ? 'var(--green)' : 'var(--border-color)' }} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="pt-1 pb-6">
                            <p className="text-sm font-medium" style={{ color: isInactive ? 'var(--muted-color)' : 'var(--text)' }}>
                              {step.label}
                            </p>
                            {(isDone || isCurrent) && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-color)' }}>{step.desc}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Rating Section - only shown when order is served */}
              {isServed && (
                <div className="mb-6 p-5 rounded-xl border text-center animate-card-in" style={{ background: 'var(--card)', borderColor: 'var(--gold)' }}>
                  <h4 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--gold)' }}>
                    {ratingSubmitted ? 'Merci pour votre avis !' : 'Comment etait votre repas ?'}
                  </h4>
                  <p className="text-xs mb-4" style={{ color: 'var(--muted-color)' }}>
                    {ratingSubmitted ? 'Votre note a ete enregistree' : 'Notez votre experience de 1 a 5 etoiles'}
                  </p>
                  <div className="flex justify-center">
                    {ratingLoading ? (
                      <span className="text-sm" style={{ color: 'var(--muted-color)' }}>Enregistrement...</span>
                    ) : (
                      <StarRating
                        rating={order.rating || 0}
                        onRate={handleRate}
                        readonly={ratingSubmitted}
                      />
                    )}
                  </div>
                  {ratingSubmitted && order.rating && (
                    <p className="mt-3 text-sm font-medium" style={{ color: 'var(--gold)' }}>
                      {order.rating}/5 - {order.rating >= 4 ? 'Excellent !' : order.rating >= 3 ? 'Merci !' : 'Nous ferons mieux'}
                    </p>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--gold)' }}>Articles commandes</h4>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span>{item.emoji}</span>
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{item.name}</span>
                        <span className="text-xs" style={{ color: 'var(--muted-color)' }}>x{item.qty}</span>
                      </div>
                      <span className="text-sm font-mono" style={{ color: 'var(--gold)' }}>{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Total TTC</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--gold)' }}>{formatPrice(order.total)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
