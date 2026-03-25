// ============================================
// COMPOSANT BARRE DE NAVIGATION
// Réutilisable sur toutes les pages
// Icônes Lucide épurées
// ============================================

'use client'

import { Home, PlusCircle, Bookmark, Users, User } from 'lucide-react'

const items = [
  { icon: Home,       path: '/',              label: 'Feed' },
  { icon: PlusCircle, path: '/nouvelle-reco', label: 'Poster' },
  { icon: Bookmark,   path: '/sauvegardes',   label: 'Sauvegardes' },
  { icon: Users,      path: '/contacts',      label: 'Contacts' },
  { icon: User,       path: '/profil',        label: 'Profil' },
]

interface Props {
  current: string
  router: any
}

export default function NavBar({ current, router }: Props) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#FAFAF0',
      borderTop: '2px solid #0a0a0a',
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 0 16px',
      maxWidth: '520px', margin: '0 auto',
      zIndex: 10,
    }}>
      {items.map(item => {
        const Icon = item.icon
        const active = current === item.path
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              background: active ? '#FFD600' : 'none',
              border: active ? '2px solid #0a0a0a' : '2px solid transparent',
              borderRadius: '2px',
              boxShadow: active ? '2px 2px 0 #0a0a0a' : 'none',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
              padding: '4px 10px',
              color: '#0a0a0a',
              transition: 'all 0.1s',
            }}
          >
            <Icon size={20} strokeWidth={2} />
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}