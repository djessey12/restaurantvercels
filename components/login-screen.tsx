'use client'

import { useState } from 'react'
import { api, setAuth } from '@/lib/store'
import { Lock, User, ChefHat, CookingPot, ShieldCheck, UtensilsCrossed } from 'lucide-react'

const roles = [
  { id: 'client', label: 'Client', icon: User, needsPassword: false, color: 'text-[var(--gold)]' },
  { id: 'caissier', label: 'Caissier', icon: UtensilsCrossed, needsPassword: true, color: 'text-[var(--blue)]' },
  { id: 'cuisinier', label: 'Cuisinier', icon: CookingPot, needsPassword: true, color: 'text-[var(--orange)]' },
  { id: 'chef', label: 'Chef', icon: ChefHat, needsPassword: true, color: 'text-[var(--green)]' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, needsPassword: true, color: 'text-[var(--red)]' },
]

export function LoginScreen({ onLogin, preselectedRole }: { onLogin: () => void; preselectedRole?: string }) {
  const [selectedRole, setSelectedRole] = useState(preselectedRole || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRoleObj = roles.find(r => r.id === selectedRole)

  async function handleLogin() {
    if (!selectedRole) return
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole, password: password || undefined }),
      })
      setAuth({ token: data.token, role: data.role, access: data.access })
      onLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-login-fade">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-semibold tracking-tight" style={{ color: 'var(--gold)' }}>
            Restaurant
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-color)' }}>
            Systeme de gestion
          </p>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {roles.map(role => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                onClick={() => { setSelectedRole(role.id); setPassword(''); setError('') }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200"
                style={{
                  background: isSelected ? 'var(--bg3)' : 'var(--card)',
                  borderColor: isSelected ? 'var(--gold)' : 'var(--border-color)',
                  boxShadow: isSelected ? '0 0 20px rgba(201,168,76,0.15)' : 'none',
                }}
              >
                <Icon className={`w-6 h-6 ${role.color}`} />
                <span className="text-xs font-medium" style={{ color: isSelected ? 'var(--gold)' : 'var(--text)' }}>
                  {role.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Password + Login */}
        {selectedRole && (
          <div className="space-y-4 animate-slide-up">
            {selectedRoleObj?.needsPassword && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-color)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Mot de passe"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text)',
                  }}
                  autoFocus
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-center font-medium" style={{ color: 'var(--red)' }}>{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || (selectedRoleObj?.needsPassword && !password)}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={{
                background: 'var(--gold)',
                color: 'var(--bg)',
              }}
            >
              {loading ? 'Connexion...' : selectedRoleObj?.needsPassword ? 'Se connecter' : 'Entrer en tant que Client'}
            </button>


          </div>
        )}
      </div>
    </div>
  )
}
