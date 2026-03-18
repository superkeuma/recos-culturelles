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
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border-light)',
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
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
              padding: '4px 12px',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}