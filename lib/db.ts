// In-memory database for the restaurant management system

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
  done: number
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

// --- Seed Data ---
const categories: Category[] = [
  { id: 1, name: 'Entrees', icon: '🥗', sort: 1 },
  { id: 2, name: 'Plats', icon: '🍽️', sort: 2 },
  { id: 3, name: 'Desserts', icon: '🍮', sort: 3 },
  { id: 4, name: 'Boissons', icon: '🥤', sort: 4 },
]

const menuItems: MenuItem[] = [
  { id: 1, name: 'Salade Cesar', emoji: '🥗', description: 'Laitue romaine, parmesan, croutons, sauce cesar maison', price: 4500, category_id: 1, available: 1, media_url: null, media_type: null },
  { id: 2, name: 'Soupe a l\'oignon', emoji: '🧅', description: 'Soupe traditionnelle gratinee au fromage', price: 3500, category_id: 1, available: 1, media_url: null, media_type: null },
  { id: 3, name: 'Bruschetta', emoji: '🍅', description: 'Pain grille, tomates fraiches, basilic, huile d\'olive', price: 3000, category_id: 1, available: 1, media_url: null, media_type: null },
  { id: 4, name: 'Accras de morue', emoji: '🐟', description: 'Beignets de morue epices, sauce chien', price: 4000, category_id: 1, available: 1, media_url: null, media_type: null },
  { id: 5, name: 'Entrecote 300g', emoji: '🥩', description: 'Entrecote grillee, sauce au poivre, frites maison', price: 14000, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 6, name: 'Poulet braise', emoji: '🍗', description: 'Poulet marine aux epices, braise au charbon', price: 8500, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 7, name: 'Poisson grille', emoji: '🐠', description: 'Poisson du jour grille, legumes vapeur', price: 11000, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 8, name: 'Riz sauce arachide', emoji: '🍚', description: 'Riz parfume, sauce arachide onctueuse, viande', price: 6500, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 9, name: 'Spaghetti Bolognaise', emoji: '🍝', description: 'Pates fraiches, sauce tomate, viande hachee', price: 7000, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 10, name: 'Attieke poisson', emoji: '🍛', description: 'Attieke frais, poisson braise, piment', price: 7500, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 11, name: 'Burger Classic', emoji: '🍔', description: 'Boeuf, cheddar, salade, tomate, sauce maison', price: 8000, category_id: 2, available: 1, media_url: null, media_type: null },
  { id: 12, name: 'Tiramisu', emoji: '🍰', description: 'Tiramisu classique au cafe et mascarpone', price: 4500, category_id: 3, available: 1, media_url: null, media_type: null },
  { id: 13, name: 'Creme brulee', emoji: '🍮', description: 'Creme vanille, caramel croustillant', price: 4000, category_id: 3, available: 1, media_url: null, media_type: null },
  { id: 14, name: 'Fondant chocolat', emoji: '🍫', description: 'Coeur coulant au chocolat noir', price: 5000, category_id: 3, available: 1, media_url: null, media_type: null },
  { id: 15, name: 'Jus de fruits frais', emoji: '🧃', description: 'Jus presse du jour (mangue, ananas, passion)', price: 2500, category_id: 4, available: 1, media_url: null, media_type: null },
  { id: 16, name: 'Bissap', emoji: '🌺', description: 'Infusion d\'hibiscus glacee, menthe', price: 2000, category_id: 4, available: 1, media_url: null, media_type: null },
  { id: 17, name: 'Gingembre', emoji: '🫚', description: 'Jus de gingembre frais, citron, miel', price: 2000, category_id: 4, available: 1, media_url: null, media_type: null },
]

let orders: Order[] = []
let transactions: Transaction[] = []
let nextItemId = 1
let nextTransactionId = 1
let nextMenuId = 18

// --- Database API ---
export const db = {
  // Categories
  getCategories: () => [...categories].sort((a, b) => a.sort - b.sort),

  // Menu
  getMenu: () => menuItems.filter(m => m.available === 1).map(m => {
    const cat = categories.find(c => c.id === m.category_id)
    return { ...m, cat_name: cat?.name || '', cat_icon: cat?.icon || '' }
  }),

  getMenuItem: (id: number) => menuItems.find(m => m.id === id),

  addMenuItem: (item: Omit<MenuItem, 'id' | 'available' | 'media_url' | 'media_type'>) => {
    const newItem: MenuItem = { ...item, id: nextMenuId++, available: 1, media_url: null, media_type: null }
    menuItems.push(newItem)
    return newItem
  },

  deleteMenuItem: (id: number) => {
    const item = menuItems.find(m => m.id === id)
    if (item) item.available = 0
    return item
  },

  updateMenuMedia: (id: number, media_url: string, media_type: string) => {
    const item = menuItems.find(m => m.id === id)
    if (item) {
      item.media_url = media_url
      item.media_type = media_type
    }
    return item
  },

  // Orders
  getOrders: (status?: string) => {
    let result = [...orders]
    if (status) result = result.filter(o => o.status === status)
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  getOrder: (id: string) => orders.find(o => o.id === id),

  createOrder: (data: { table_name: string; client_name: string; notes: string; items: { menu_id: number; qty: number }[] }) => {
    const id = generateOrderId()
    const orderItems: OrderItem[] = data.items.map(i => {
      const mi = menuItems.find(m => m.id === i.menu_id)
      if (!mi) throw new Error(`Menu item ${i.menu_id} not found`)
      return {
        id: nextItemId++,
        order_id: id,
        name: mi.name,
        emoji: mi.emoji,
        price: mi.price,
        qty: i.qty,
        done: 0,
      }
    })
    const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const order: Order = {
      id,
      table_name: data.table_name,
      client_name: data.client_name,
      notes: data.notes,
      status: 'pending_validation',
      total,
      items: orderItems,
      rating: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    orders.push(order)
    addTransaction(id, 'Commande creee', 'system')
    return order
  },

  updateOrderStatus: (id: string, status: Order['status'], actor: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return null

    const validTransitions: Record<string, string[]> = {
      pending_validation: ['pending', 'cancelled'],
      pending: ['acknowledged', 'cancelled'],
      acknowledged: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['served', 'cancelled'],
    }

    if (!validTransitions[order.status]?.includes(status)) return null

    order.status = status
    order.updated_at = new Date().toISOString()
    addTransaction(id, `Statut → ${status}`, actor)
    return order
  },

  toggleItemDone: (orderId: string, itemIdx: number, done: boolean) => {
    const order = orders.find(o => o.id === orderId)
    if (!order || !order.items[itemIdx]) return null
    order.items[itemIdx].done = done ? 1 : 0
    return order.items[itemIdx]
  },

  // Rating
  rateOrder: (id: string, rating: number) => {
    const order = orders.find(o => o.id === id)
    if (!order || order.status !== 'served') return null
    if (rating < 1 || rating > 5) return null
    order.rating = rating
    return order
  },

  // History
  getHistory: (date?: string, limit = 200) => {
    let result = orders.filter(o => o.status === 'served')
    if (date) {
      result = result.filter(o => o.updated_at.startsWith(date))
    }
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    
    const served_today = orders.filter(o => o.status === 'served' && o.updated_at.startsWith(new Date().toISOString().slice(0, 10))).length
    const revenue_today = orders.filter(o => o.status === 'served' && o.updated_at.startsWith(new Date().toISOString().slice(0, 10))).reduce((s, o) => s + o.total, 0)

    return { orders: result.slice(0, limit), summary: { served_today, revenue_today } }
  },

  // Stats
  getStats: () => {
    const today = new Date().toISOString().slice(0, 10)
    const todayOrders = orders.filter(o => o.created_at.startsWith(today))
    return {
      orders_today: todayOrders.length,
      revenue_today: todayOrders.filter(o => o.status === 'served').reduce((s, o) => s + o.total, 0),
      pending_validation: orders.filter(o => o.status === 'pending_validation').length,
      pending_orders: orders.filter(o => o.status === 'pending').length,
      active_orders: orders.filter(o => ['acknowledged', 'preparing'].includes(o.status)).length,
      ready_orders: orders.filter(o => o.status === 'ready').length,
      served_today: todayOrders.filter(o => o.status === 'served').length,
    }
  },

  // Transactions
  getTransactions: (orderId?: string) => {
    let result = [...transactions]
    if (orderId) result = result.filter(t => t.order_id === orderId)
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  // Reset
  reset: () => {
    orders = []
    transactions = []
    nextItemId = 1
    nextTransactionId = 1
  },
}

function addTransaction(orderId: string, action: string, actor: string) {
  transactions.push({
    id: nextTransactionId++,
    order_id: orderId,
    action,
    actor,
    timestamp: new Date().toISOString(),
  })
}

function generateOrderId(): string {
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase()
  const id = `CMD-${ts}${rnd}`
  // Check collision
  if (orders.find(o => o.id === id)) return generateOrderId()
  return id
}
