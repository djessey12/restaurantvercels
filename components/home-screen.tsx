'use client'

import { getAuth, clearAuth } from '@/lib/store'
import { ShoppingCart, ChefHat, Search, History, ShieldCheck, LogOut, ClipboardCheck } from 'lucide-react'

type Screen = 'home' | 'caisse' | 'cuisine' | 'client' | 'historique'

const modules = [
  { id: 'caisse' as Screen, label: 'Caisse', desc: 'Passer et gerer les commandes', icon: ShoppingCart, access: ['caisse', 'caisse_readonly'] },
  { id: 'cuisine' as Screen, label: 'Cuisine', desc: 'Gerer la preparation des commandes', icon: ChefHat, access: ['cuisine'] },
  { id: 'client' as Screen, label: 'Suivi commande', desc: 'Suivre l\'etat de votre commande', icon: Search, access: ['client_suivi', 'suivi'] },
  { id: 'historique' as Screen, label: 'Historique', desc: 'Consulter les commandes passees', icon: History, access: ['historique'] },
]

export function HomeScreen({ onNavigate, onLogout }: { onNavigate: (screen: Screen) => void; onLogout: () => void }) {
  const auth = getAuth()
  if (!auth) return null

  const availableModules = modules.filter(m => m.access.some(a => auth.access.includes(a)))

  function handleLogout() {
    clearAuth()
    onLogout()
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--gold)' }}>Restaurant</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: 'var(--bg3)', color: 'var(--gold)' }}>
            {auth.role}
          </span>
          <button onClick={handleLogout} className="p-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--muted-color)' }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center py-16 px-4">
        <h2 className="font-serif text-6xl font-light tracking-tight" style={{ color: 'var(--gold)' }}>
          Bienvenue
        </h2>
        <p className="mt-4 text-lg" style={{ color: 'var(--muted-color)' }}>
          Selectionnez un module pour commencer
        </p>
      </div>

      {/* Module Cards */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableModules.map((mod, i) => {
            const Icon = mod.icon
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="flex items-start gap-4 p-6 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] animate-card-in"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border-color)',
                  animationDelay: `${i * 100}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
                  <Icon className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h3 className="font-medium text-lg" style={{ color: 'var(--text)' }}>{mod.label}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-color)' }}>{mod.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Admin Quick Actions */}
        {auth.role === 'admin' && (
          <div className="mt-8 p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--red)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Administration</span>
            </div>
            <button
              onClick={async () => {
                if (confirm('Reinitialiser toutes les commandes ?')) {
                  const authData = getAuth()
                  await fetch('/api/admin/reset', {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${authData?.token}` },
                  })
                }
              }}
              className="text-xs px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            >
              Reinitialiser les commandes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
