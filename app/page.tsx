'use client'

import { useState, useEffect } from 'react'
import { getAuth } from '@/lib/store'
import { LoginScreen } from '@/components/login-screen'
import { HomeScreen } from '@/components/home-screen'
import { CaisseScreen } from '@/components/caisse-screen'
import { CuisineScreen } from '@/components/cuisine-screen'
import { ClientScreen } from '@/components/client-screen'
import { HistoriqueScreen } from '@/components/historique-screen'

type Screen = 'login' | 'home' | 'caisse' | 'cuisine' | 'client' | 'historique'

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [trackOrderId, setTrackOrderId] = useState<string | undefined>()
  const [preselectedRole, setPreselectedRole] = useState<string | undefined>()

  useEffect(() => {
    // Check for existing session
    const auth = getAuth()
    if (auth) {
      setScreen('home')
    }

    // Check URL params for role preselection
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role')
    if (role) {
      setPreselectedRole(role)
    }
  }, [])

  function handleLogin() {
    setScreen('home')
  }

  function handleLogout() {
    setScreen('login')
  }

  function handleNavigate(target: Screen) {
    setScreen(target)
  }

  function handleTrackOrder(orderId: string) {
    setTrackOrderId(orderId)
    setScreen('client')
  }

  return (
    <>
      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} preselectedRole={preselectedRole} />
      )}
      {screen === 'home' && (
        <HomeScreen onNavigate={(s) => handleNavigate(s as Screen)} onLogout={handleLogout} />
      )}
      {screen === 'caisse' && (
        <CaisseScreen onBack={() => setScreen('home')} onTrack={handleTrackOrder} />
      )}
      {screen === 'cuisine' && (
        <CuisineScreen onBack={() => setScreen('home')} />
      )}
      {screen === 'client' && (
        <ClientScreen onBack={() => setScreen('home')} initialOrderId={trackOrderId} />
      )}
      {screen === 'historique' && (
        <HistoriqueScreen onBack={() => setScreen('home')} />
      )}
    </>
  )
}
