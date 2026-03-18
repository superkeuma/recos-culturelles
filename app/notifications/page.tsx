'use client'
// ============================================
// PAGE NOTIFICATIONS
// Affiche les nouveaux abonnés
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { ArrowLeft, Bell } from 'lucide-react'

const formatDate = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} jours`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seenAt, setSeenAt] = useState<Date | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Récupérer la date de dernière lecture
      const stored = localStorage.getItem('notifs_seen_at')
      const seen = stored ? new Date(stored) : null
      setSeenAt(seen)

      // Charger les abonnés avec leur profil
      const { data: follows } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })

      if (follows && follows.length > 0) {
        const ids = follows.map(f => f.follower_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', ids)

        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
        const merged = follows.map(f => ({
          ...f,
          profile: profileMap[f.follower_id] || null,
        }))
        setNotifs(merged)
      }

      // Marquer comme lu
      localStorage.setItem('notifs_seen_at', new Date().toISOString())
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>

      {/* ---- HEADER ---- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center', gap: '12px',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)', flex: 1 }}>
          notifications
        </span>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>

        {notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
              <Bell size={36} strokeWidth={1.5} />
            </div>
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Aucune notification</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Tu seras notifié quand quelqu'un te suivra</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {notifs.map((notif, i) => {
              const isNew = seenAt ? new Date(notif.created_at) > seenAt : true
              const p = notif.profile
              return (
                <button
                  key={i}
                  onClick={() => p?.username && router.push(`/u/${p.username}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: isNew ? 'rgba(15,23,42,0.04)' : 'var(--bg-card)',
                    border: `1px solid ${isNew ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                    cursor: p?.username ? 'pointer' : 'default', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {(p?.full_name || p?.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      <strong>{p?.full_name || p?.username || 'Quelqu\'un'}</strong> a commencé à te suivre
                    </p>
                    {p?.username && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</p>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatDate(notif.created_at)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <NavBar current="" router={router} />
    </div>
  )
}
