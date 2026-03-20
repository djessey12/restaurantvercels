/**
 * lib/db.ts — Couche base de données Supabase
 * Interface identique à l'ancienne version en mémoire, mais persistante.
 * Toutes les fonctions sont async.
 */

import { createServerClient } from './supabase'

// ── Types (inchangés) ────────────────────────────────────

export type Category = {
  id: number
  name: string
  icon: string
  sort: number
}

export type MenuItem = {
  id: number
  name: string
  emoji: string
  description: string
  price: number
  category_id: number
  available: number
  media_url: string | null
  media_type: string | null
}

export type OrderItem = {
  id: number
  order_id: string
  name: string
  emoji: string
  price: number
  qty: number
  done: number          // 0 ou 1 (compatibilité frontend)
  item_index?: number
}

export type Order = {
  id: string
  table_name: string
  client_name: string
  notes: string
  status: 'pending_validation' | 'pending' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'cancelled'
  total: number
  items: OrderItem[]
  rating: number | null
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: number
  order_id: string
  action: string
  actor: string
  timestamp: string
}

// ── Helpers ──────────────────────────────────────────────

/** Convertit un order_item DB (boolean done) vers le type frontend (number done) */
function mapItem(row: Record<string, unknown>): OrderItem {
  return {
    id:         row.id as number,
    order_id:   row.order_id as string,
    name:       row.name as string,
    emoji:      row.emoji as string,
    price:      row.price as number,
    qty:        row.qty as number,
    done:       row.done ? 1 : 0,
    item_index: row.item_index as number,
  }
}

/** Convertit une order DB (avec order_items[] imbriqués) vers le type Order */
function mapOrder(row: Record<string, unknown>): Order {
  const rawItems = (row.order_items as Record<string, unknown>[]) ?? []
  const sorted   = [...rawItems].sort(
    (a, b) => (a.item_index as number) - (b.item_index as number)
  )
  return {
    id:          row.id as string,
    table_name:  row.table_name as string,
    client_name: row.client_name as string,
    notes:       row.notes as string,
    status:      row.status as Order['status'],
    total:       row.total as number,
    rating:      row.rating as number | null,
    created_at:  row.created_at as string,
    updated_at:  row.updated_at as string,
    items:       sorted.map(mapItem),
  }
}

/** Génère un ID de commande unique (ex: CMD-X7KR2A) */
async function generateOrderId(): Promise<string> {
  const supabase = createServerClient()
  for (let attempt = 0; attempt < 10; attempt++) {
    const ts  = Date.now().toString(36).slice(-4).toUpperCase()
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase()
    const id  = `CMD-${ts}${rnd}`
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
    if (count === 0) return id
  }
  throw new Error('Impossible de générer un ID unique')
}

// ── API DB ────────────────────────────────────────────────

export const db = {

  // ── Catégories ────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort')
    if (error) throw error
    return data as Category[]
  },

  // ── Menu ──────────────────────────────────────────────

  async getMenu(): Promise<(MenuItem & { cat_name: string; cat_icon: string })[]> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name, icon)')
      .eq('available', true)
      .order('id')
    if (error) throw error
    return (data as Record<string, unknown>[]).map(row => ({
      ...(row as unknown as MenuItem),
      available:  1,
      cat_name:   (row.categories as { name: string } | null)?.name  ?? '',
      cat_icon:   (row.categories as { icon: string } | null)?.icon  ?? '',
      categories: undefined,
    }))
  },async getMenu(): Promise<(MenuItem & { cat_name: string; cat_icon: string })[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, categories(name, icon)')
    .eq('available', true)
    .order('id')
  
  if (error) {
    console.error('[getMenu] Supabase error:', error)
    throw error
  }
  if (!data || !Array.isArray(data)) return []
  
  return data.map(row => ({
    id:          row.id,
    name:        row.name,
    emoji:       row.emoji,
    description: row.description,
    price:       row.price,
    category_id: row.category_id,
    available:   1,
    media_url:   row.media_url ?? null,
    media_type:  row.media_type ?? null,
    cat_name:    row.categories?.name  ?? '',
    cat_icon:    row.categories?.icon  ?? '',
  }))
},

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return { ...(data as MenuItem), available: data.available ? 1 : 0 }
  },

  async addMenuItem(
    item: Omit<MenuItem, 'id' | 'available' | 'media_url' | 'media_type'>
  ): Promise<MenuItem> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ ...item, available: true, media_url: null, media_type: null })
      .select()
      .single()
    if (error) throw error
    return { ...(data as MenuItem), available: 1 }
  },

  async deleteMenuItem(id: number): Promise<MenuItem | null> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('menu_items')
      .update({ available: false })
      .eq('id', id)
      .select()
      .single()
    if (error) return null
    return { ...(data as MenuItem), available: 0 }
  },

  async updateMenuMedia(
    id: number, media_url: string, media_type: string
  ): Promise<MenuItem | null> {
    const supabase = createServerClient()
    const payload = media_url
      ? { media_url, media_type: media_type || null }
      : { media_url: null, media_type: null }
    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) return null
    return { ...(data as MenuItem), available: data.available ? 1 : 0 }
  },

  // ── Commandes ─────────────────────────────────────────

  async getOrders(status?: string): Promise<Order[]> {
    const supabase = createServerClient()
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return (data as Record<string, unknown>[]).map(mapOrder)
  },

  async getOrder(id: string): Promise<Order | null> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single()
    if (error) return null
    return mapOrder(data as Record<string, unknown>)
  },

  async createOrder(payload: {
    table_name: string
    client_name: string
    notes: string
    items: { menu_id: number; qty: number }[]
  }): Promise<Order> {
    const supabase = createServerClient()

    // 1. Valider les articles du menu
    const menuIds = [...new Set(payload.items.map(i => i.menu_id))]
    const { data: menuRows, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, emoji, price')
      .in('id', menuIds)
      .eq('available', true)
    if (menuErr) throw menuErr

    const menuMap = new Map(
      (menuRows as { id: number; name: string; emoji: string; price: number }[])
        .map(m => [m.id, m])
    )

    // 2. Construire les items avec sous-total
    const orderItemsData = payload.items.map((i, idx) => {
      const mi = menuMap.get(i.menu_id)
      if (!mi) throw new Error(`Article de menu ${i.menu_id} introuvable ou indisponible`)
      return { menu_id: i.menu_id, name: mi.name, emoji: mi.emoji, price: mi.price, qty: i.qty, item_index: idx }
    })
    const total = orderItemsData.reduce((s, i) => s + i.price * i.qty, 0)

    // 3. Générer un ID unique
    const id = await generateOrderId()

    // 4. Insérer la commande
    const { error: orderErr } = await supabase
      .from('orders')
      .insert({ id, table_name: payload.table_name, client_name: payload.client_name, notes: payload.notes, total })
    if (orderErr) throw orderErr

    // 5. Insérer les items
    const itemRows = orderItemsData.map(i => ({
      order_id:   id,
      item_index: i.item_index,
      name:       i.name,
      emoji:      i.emoji,
      price:      i.price,
      qty:        i.qty,
      done:       false,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)
    if (itemsErr) {
      // Rollback manuel de la commande
      await supabase.from('orders').delete().eq('id', id)
      throw itemsErr
    }

    // 6. Transaction initiale
    await supabase
      .from('transactions')
      .insert({ order_id: id, action: 'Commande creee', actor: 'system' })

    // 7. Retourner la commande complète
    const order = await db.getOrder(id)
    if (!order) throw new Error('Impossible de récupérer la commande créée')
    return order
  },

  async updateOrderStatus(
    id: string,
    status: Order['status'],
    actor: string
  ): Promise<Order | null> {
    const supabase = createServerClient()

    const { data: current, error: fetchErr } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single()
    if (fetchErr) return null

    const validTransitions: Record<string, string[]> = {
      pending_validation: ['pending', 'cancelled'],
      pending:            ['acknowledged', 'cancelled'],
      acknowledged:       ['preparing', 'cancelled'],
      preparing:          ['ready', 'cancelled'],
      ready:              ['served', 'cancelled'],
    }
    if (!validTransitions[current.status]?.includes(status)) return null

    const now = new Date().toISOString()
    const { error: updErr } = await supabase
      .from('orders')
      .update({ status, updated_at: now })
      .eq('id', id)
    if (updErr) return null

    await supabase
      .from('transactions')
      .insert({ order_id: id, action: `Statut → ${status}`, actor })

    return db.getOrder(id)
  },

  async toggleItemDone(
    orderId: string,
    itemIdx: number,
    done: boolean
  ): Promise<OrderItem | null> {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('order_items')
      .update({ done })
      .eq('order_id', orderId)
      .eq('item_index', itemIdx)
      .select()
      .single()
    if (error) return null
    return mapItem(data as Record<string, unknown>)
  },

  // ── Notation ──────────────────────────────────────────

  async rateOrder(id: string, rating: number): Promise<Order | null> {
    const supabase = createServerClient()
    if (rating < 1 || rating > 5) return null

    // Vérifier que la commande est servie
    const { data: current } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single()
    if (!current || current.status !== 'served') return null

    const { error } = await supabase
      .from('orders')
      .update({ rating })
      .eq('id', id)
    if (error) return null

    return db.getOrder(id)
  },

  // ── Historique ────────────────────────────────────────

  async getHistory(
    date?: string,
    limit = 200
  ): Promise<{ orders: Order[]; summary: { served_today: number; revenue_today: number } }> {
    const supabase = createServerClient()
    const today = new Date().toISOString().slice(0, 10)

    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('status', 'served')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (date) {
      query = query
        .gte('updated_at', `${date}T00:00:00.000Z`)
        .lt('updated_at',  `${date}T23:59:59.999Z`)
    }

    const { data, error } = await query
    if (error) throw error

    // Stats du jour (requête séparée)
    const { data: todayData } = await supabase
      .from('orders')
      .select('total')
      .eq('status', 'served')
      .gte('updated_at', `${today}T00:00:00.000Z`)
      .lt('updated_at',  `${today}T23:59:59.999Z`)

    const served_today  = todayData?.length ?? 0
    const revenue_today = (todayData ?? []).reduce((s, o) => s + o.total, 0)

    return {
      orders:  (data as Record<string, unknown>[]).map(mapOrder),
      summary: { served_today, revenue_today },
    }
  },

  // ── Statistiques ──────────────────────────────────────

  async getStats(): Promise<{
    orders_today: number
    revenue_today: number
    pending_validation: number
    pending_orders: number
    active_orders: number
    ready_orders: number
    served_today: number
  }> {
    const supabase = createServerClient()
    const today = new Date().toISOString().slice(0, 10)

    const [todayRes, pendingValRes, pendingRes, activeRes, readyRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', `${today}T00:00:00.000Z`),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_validation'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['acknowledged', 'preparing']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    ])

    const todayOrders  = todayRes.data ?? []
    const servedToday  = todayOrders.filter(o => o.status === 'served')

    return {
      orders_today:       todayOrders.length,
      revenue_today:      servedToday.reduce((s, o) => s + o.total, 0),
      pending_validation: pendingValRes.count ?? 0,
      pending_orders:     pendingRes.count    ?? 0,
      active_orders:      activeRes.count     ?? 0,
      ready_orders:       readyRes.count      ?? 0,
      served_today:       servedToday.length,
    }
  },

  // ── Transactions ──────────────────────────────────────

  async getTransactions(orderId?: string): Promise<Transaction[]> {
    const supabase = createServerClient()
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (orderId) query = query.eq('order_id', orderId)
    const { data, error } = await query
    if (error) throw error
    return (data as Record<string, unknown>[]).map(row => ({
      id:        row.id       as number,
      order_id:  row.order_id as string,
      action:    row.action   as string,
      actor:     row.actor    as string,
      timestamp: row.created_at as string,
    }))
  },

  // ── Reset (admin uniquement) ──────────────────────────

  async reset(): Promise<void> {
    const supabase = createServerClient()
    // Supprime tout sauf menu et catégories
    await supabase.from('transactions').delete().neq('id', 0)
    await supabase.from('order_items').delete().neq('id', 0)
    await supabase.from('orders').delete().neq('id', 'X')
  },
}
