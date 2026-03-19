'use client'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAuth, api, formatPrice, setTrackedOrder, sounds } from '@/lib/store'
import { ArrowLeft, Plus, Minus, Trash2, Send, ShoppingCart, Check, X, Upload, Image as ImageIcon, Video, Settings, CheckCircle, MessageSquare } from 'lucide-react'
import useSWR, { mutate as globalMutate } from 'swr'

type CartItem = {
  menu_id: number
  name: string
  emoji: string
  price: number
  qty: number
}

type MenuItem = {
  id: number
  name: string
  emoji: string
  description: string
  price: number
  category_id: number
  cat_name: string
  cat_icon: string
  media_url: string | null
  media_type: string | null
}

type Category = {
  id: number
  name: string
  icon: string
}

type PendingOrder = {
  id: string
  table_name: string
  client_name: string
  notes: string
  status: string
  total: number
  items: Array<{ name: string; emoji: string; price: number; qty: number }>
  created_at: string
}

const fetcher = (url: string) => api(url)

// --- Menu Management Modal ---
function MenuManagerModal({ categories, onClose, onRefresh }: { categories: Category[]; onClose: () => void; onRefresh: () => void }) {
  const { data: menu = [], mutate: mutateMenu } = useSWR<MenuItem[]>('/api/menu', fetcher)
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category_id: 1, emoji: '' })
  const [uploading, setUploading] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null)

  async function handleAddItem() {
    if (!newItem.name || !newItem.price) {
      setAddError('Veuillez renseigner le nom et le prix')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const auth = getAuth()
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth?.token || ''}`,
        },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description,
          price: Number(newItem.price),
          category_id: Number(newItem.category_id),
          emoji: newItem.emoji || '',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        throw new Error(err.error || `Erreur ${res.status}`)
      }
      setNewItem({ name: '', description: '', price: '', category_id: 1, emoji: '' })
      mutateMenu()
      onRefresh()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Erreur lors de l\'ajout')
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('Supprimer cet article du menu ?')) return
    try {
      const auth = getAuth()
      const res = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth?.token || ''}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(err.error)
      }
      mutateMenu()
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  function triggerUpload(itemId: number) {
    setUploadTargetId(itemId)
    // Reset the file input so onChange fires even if same file is selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Use setTimeout to ensure state is updated before click
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 0)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId) return
    setUploading(uploadTargetId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const auth = getAuth()
      const res = await fetch(`/api/menu/${uploadTargetId}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth?.token || ''}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur upload' }))
        throw new Error(err.error || 'Erreur upload')
      }
      mutateMenu()
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(null)
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveMedia(id: number) {
    try {
      const auth = getAuth()
      const res = await fetch(`/api/menu/${id}/media`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth?.token || ''}` },
      })
      if (!res.ok) throw new Error('Erreur')
      mutateMenu()
      onRefresh()
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border overflow-hidden" style={{ background: 'var(--bg2)', borderColor: 'var(--border-color)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--gold)' }}>Gestion du menu</h3>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--muted-color)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleFileUpload} />

        {/* Add new item */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--gold)' }}>Ajouter un article</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="Nom" className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }} />
            <input value={newItem.emoji} onChange={e => setNewItem(p => ({ ...p, emoji: e.target.value }))} placeholder="Emoji (ex: 🍕)" className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }} />
            <input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="px-3 py-2 rounded-lg border text-sm col-span-2" style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }} />
            <input value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} placeholder="Prix (FCFA)" type="number" className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }} />
            <select value={newItem.category_id} onChange={e => setNewItem(p => ({ ...p, category_id: Number(e.target.value) }))} className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <button onClick={handleAddItem} disabled={adding || !newItem.name || !newItem.price} className="mt-3 w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
            <Plus className="w-3.5 h-3.5" /> {adding ? 'Ajout...' : 'Ajouter au menu'}
          </button>
        </div>

        {/* Menu items list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menu.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
                {/* Media preview */}
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--bg3)' }}>
                  {item.media_url && item.media_type === 'image' ? (
                    <img src={item.media_url} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : item.media_url && item.media_type === 'video' ? (
                    <Video className="w-5 h-5" style={{ color: 'var(--blue)' }} />
                  ) : (
                    <span className="text-2xl">{item.emoji}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{formatPrice(item.price)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => triggerUpload(item.id)} disabled={uploading === item.id} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--blue)' }} title="Uploader image/video">
                    {uploading === item.id ? <span className="w-4 h-4 block border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                  </button>
                  {item.media_url && (
                    <button onClick={() => handleRemoveMedia(item.id)} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--orange)' }} title="Supprimer media">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--red)' }} title="Supprimer du menu">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Validation Modal ---
function ValidationModal({ order, onValidate, onReject, onClose }: {
  order: PendingOrder
  onValidate: (id: string, message: string) => void
  onReject: (id: string, message: string) => void
  onClose: () => void
}) {
  const [message, setMessage] = useState('Commande confirmee, merci !')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden animate-card-in" style={{ background: 'var(--bg2)', borderColor: 'var(--border-color)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--gold)' }}>Validation commande</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-color)' }}>Verifiez et validez avant envoi en cuisine</p>
        </div>

        <div className="p-4">
          {/* Order Info */}
          <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--gold)' }}>{order.id}</span>
              <span className="text-xs" style={{ color: 'var(--muted-color)' }}>{order.table_name} - {order.client_name}</span>
            </div>
            {order.notes && <p className="text-xs mb-2 px-2 py-1 rounded-lg" style={{ background: 'var(--bg)', color: 'var(--orange)' }}>{order.notes}</p>}
            <div className="space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text)' }}>{item.emoji} {item.name} x{item.qty}</span>
                  <span className="font-mono" style={{ color: 'var(--muted-color)' }}>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Total</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--gold)' }}>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--muted-color)' }}>
              <MessageSquare className="w-3 h-3" /> Message pour le client
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => onValidate(order.id, message)} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2" style={{ background: 'var(--green)', color: '#fff' }}>
              <CheckCircle className="w-4 h-4" /> Valider et envoyer en cuisine
            </button>
            <button onClick={() => onReject(order.id, 'Commande refusee par la caisse')} className="py-2.5 px-4 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onClose} className="w-full mt-2 py-2 rounded-xl text-xs" style={{ color: 'var(--muted-color)' }}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

// --- Main Caisse Screen ---
export function CaisseScreen({ onBack, onTrack }: { onBack: () => void; onTrack?: (orderId: string) => void }) {
  const auth = getAuth()
  const isClient = auth?.role === 'client'
  const isStaff = !isClient
  const isCaissier = auth?.role === 'caissier' || auth?.role === 'admin'

  const { data: menu = [], mutate: mutateMenu } = useSWR<MenuItem[]>('/api/menu', fetcher, { refreshInterval: 30000 })
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: stats } = useSWR(isStaff ? '/api/stats' : null, fetcher, { refreshInterval: 10000 })

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [tableName, setTableName] = useState('')
  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sentOrder, setSentOrder] = useState<{ id: string; total: number } | null>(null)
  const [showMenuManager, setShowMenuManager] = useState(false)
  const [pendingValidation, setPendingValidation] = useState<PendingOrder[]>([])
  const [selectedValidation, setSelectedValidation] = useState<PendingOrder | null>(null)

  // Fetch pending_validation orders for caissier
  useRealtimeChannel('caisse', isStaff ? auth?.token : undefined, (data) => {
    if (data.type === 'NEW_ORDER_VALIDATION') {
      sounds.caisseNewOrder()
      api('/api/orders?status=pending_validation').then(orders => {
        setPendingValidation(orders)
      }).catch(() => {})
      globalMutate('/api/stats')
    } else if (
      data.type === 'ORDER_STATUS_CHANGED' ||
      data.type === 'ORDER_READY' ||
      data.type === 'ORDER_SERVED' ||
      data.type === 'RESET'
    ) {
      globalMutate('/api/stats')
    } else if (data.type === 'MENU_UPDATED') {
      mutateMenu()
    }
  })

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_id === item.id)
      if (existing) {
        return prev.map(c => c.menu_id === item.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { menu_id: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 }]
    })
  }, [])

  const updateQty = (menuId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menu_id === menuId) {
        const newQty = c.qty + delta
        return newQty > 0 ? { ...c, qty: newQty } : c
      }
      return c
    }).filter(c => c.qty > 0))
  }

  const removeFromCart = (menuId: number) => {
    setCart(prev => prev.filter(c => c.menu_id !== menuId))
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0)

  async function sendOrder() {
    if (cart.length === 0) return
    setSending(true)
    try {
      const data = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          table_name: tableName || 'Sans table',
          client_name: clientName || 'Client',
          notes,
          items: cart.map(c => ({ menu_id: c.menu_id, qty: c.qty })),
        }),
      })
      sounds.orderSent()
      setSentOrder(data)
      setCart([])
      setTableName('')
      setClientName('')
      setNotes('')
      globalMutate('/api/stats')

      if (isClient && onTrack) {
        setTrackedOrder(data.id)
        setTimeout(() => onTrack(data.id), 1200)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSending(false)
    }
  }

  async function handleValidateOrder(id: string, message: string) {
    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending', message }),
      })
      setPendingValidation(prev => prev.filter(o => o.id !== id))
      setSelectedValidation(null)
      globalMutate('/api/stats')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  async function handleRejectOrder(id: string, message: string) {
    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled', message }),
      })
      setPendingValidation(prev => prev.filter(o => o.id !== id))
      setSelectedValidation(null)
      globalMutate('/api/stats')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  function resetOrder() {
    setSentOrder(null)
  }

  const filteredMenu = selectedCategory ? menu.filter(m => m.category_id === selectedCategory) : menu

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--muted-color)' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)' }}>Caisse</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Pending validation badge */}
          {isCaissier && pendingValidation.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium animate-pulse-urgent" style={{ background: 'rgba(255,167,38,0.15)', color: 'var(--orange)' }}>
              {pendingValidation.length} en attente
            </span>
          )}
          {isCaissier && (
            <button onClick={() => setShowMenuManager(true)} className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--muted-color)' }} title="Gerer le menu">
              <Settings className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="text-sm font-mono" style={{ color: 'var(--gold)' }}>{cart.length}</span>
          </div>
        </div>
      </nav>

      {/* Stats Bar (staff only) */}
      {isStaff && stats && (
        <div className="flex gap-4 px-4 py-3 overflow-x-auto border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg2)' }}>
          {[
            { label: 'Commandes', value: stats.orders_today },
            { label: 'CA jour', value: formatPrice(stats.revenue_today) },
            ...(isCaissier ? [{ label: 'A valider', value: stats.pending_validation, color: 'var(--orange)' }] : []),
            { label: 'En attente', value: stats.pending_orders, color: 'var(--gold)' },
            { label: 'En cuisine', value: stats.active_orders, color: 'var(--orange)' },
            { label: 'Prets', value: stats.ready_orders, color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center min-w-[80px]">
              <span className="text-xs" style={{ color: 'var(--muted-color)' }}>{s.label}</span>
              <span className="text-sm font-mono font-medium" style={{ color: s.color || 'var(--text)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending Validation Bar (caissier only) */}
      {isCaissier && pendingValidation.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'rgba(255,167,38,0.05)' }}>
          <p className="text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--orange)' }}>
            <CheckCircle className="w-3.5 h-3.5" /> Commandes en attente de validation
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingValidation.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedValidation(o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 text-xs border transition-all hover:scale-[1.02]"
                style={{ background: 'var(--card)', borderColor: 'var(--orange)' }}
              >
                <span className="font-mono font-medium" style={{ color: 'var(--gold)' }}>{o.id}</span>
                <span style={{ color: 'var(--text)' }}>{o.client_name}</span>
                <span className="font-mono" style={{ color: 'var(--orange)' }}>{formatPrice(o.total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Success Banner */}
          {sentOrder && (
            <div className="mb-4 p-4 rounded-xl border animate-card-in" style={{ background: 'rgba(76,175,80,0.1)', borderColor: 'var(--green)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5" style={{ color: 'var(--green)' }} />
                <span className="font-medium" style={{ color: 'var(--green)' }}>
                  {isClient ? 'Commande envoyee ! En attente de validation par la caisse.' : 'Commande envoyee !'}
                </span>
              </div>
              <p className="font-mono text-lg" style={{ color: 'var(--gold)' }}>{sentOrder.id}</p>
              <p className="text-sm" style={{ color: 'var(--muted-color)' }}>Total : {formatPrice(sentOrder.total)}</p>
              <button onClick={resetOrder} className="mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
                Nouvelle commande
              </button>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: !selectedCategory ? 'var(--gold)' : 'var(--bg3)',
                color: !selectedCategory ? 'var(--bg)' : 'var(--text)',
              }}
            >
              Tout
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: selectedCategory === cat.id ? 'var(--gold)' : 'var(--bg3)',
                  color: selectedCategory === cat.id ? 'var(--bg)' : 'var(--text)',
                }}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95 overflow-hidden"
                style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}
              >
                {/* Media thumbnail */}
                {item.media_url && item.media_type === 'image' ? (
                  <div className="w-full h-28 overflow-hidden">
                    <img src={item.media_url} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                ) : item.media_url && item.media_type === 'video' ? (
                  <div className="w-full h-28 overflow-hidden relative">
                    <video src={item.media_url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <Video className="w-6 h-6" style={{ color: 'var(--text)' }} />
                    </div>
                  </div>
                ) : null}
                <div className="p-3">
                  {!item.media_url && <div className="text-3xl mb-2">{item.emoji}</div>}
                  <h4 className="text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>{item.name}</h4>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted-color)' }}>{item.description}</p>
                  <p className="text-sm font-mono mt-2 font-medium" style={{ color: 'var(--gold)' }}>{formatPrice(item.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col shrink-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg2)' }}>
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--gold)' }}>Votre commande</h3>

            {cart.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: 'var(--muted-color)' }}>
                Aucun article selectionne
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menu_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--card)' }}>
                    <span className="text-xl shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.menu_id, -1)} className="p-1 rounded" style={{ color: 'var(--muted-color)' }}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-mono" style={{ color: 'var(--text)' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.menu_id, 1)} className="p-1 rounded" style={{ color: 'var(--gold)' }}>
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeFromCart(item.menu_id)} className="p-1 rounded ml-1" style={{ color: 'var(--red)' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Order Fields */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  placeholder="N. de table"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }}
                />
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nom du client"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }}
                />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (allergies, cuisson...)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border-color)', color: 'var(--text)' }}
                />
              </div>
            )}
          </div>

          {/* Total + Send */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm" style={{ color: 'var(--muted-color)' }}>Total TTC</span>
              <span className="text-lg font-mono font-semibold" style={{ color: 'var(--gold)' }}>{formatPrice(total)}</span>
            </div>
            <button
              onClick={sendOrder}
              disabled={cart.length === 0 || sending}
              className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: 'var(--gold)', color: 'var(--bg)' }}
            >
              <Send className="w-4 h-4" />
              {sending ? 'Envoi...' : isClient ? 'Envoyer la commande' : 'Envoyer en cuisine'}
            </button>
            {isClient && (
              <p className="text-center text-[10px] mt-2" style={{ color: 'var(--muted-color)' }}>
                La commande sera validee par la caisse avant envoi en cuisine
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMenuManager && <MenuManagerModal categories={categories} onClose={() => setShowMenuManager(false)} onRefresh={() => mutateMenu()} />}
      {selectedValidation && (
        <ValidationModal
          order={selectedValidation}
          onValidate={handleValidateOrder}
          onReject={handleRejectOrder}
          onClose={() => setSelectedValidation(null)}
        />
      )}
    </div>
  )
}
