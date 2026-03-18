'use client'
// ============================================
// PAGE PROFIL — redesign minimaliste
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import TypeIcon from '@/components/TypeIcon'
import { LogOut } from 'lucide-react'

export default function Profil() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [mesRecos, setMesRecos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfile(profile)
        setUsername(profile.username || '')
        setFullName(profile.full_name || '')
      }

      // Charge les recos de l'utilisateur
      const { data: recos } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (recos) setMesRecos(recos)
      setLoading(false)
    }
    load()
  }, [])

  const saveProfile = async () => {
    if (!username.trim()) { setMessage('Le pseudo est obligatoire'); return }
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
      })

    if (error) {
      setMessage(error.message.includes('unique')
        ? 'Ce pseudo est déjà pris'
        : 'Erreur : ' + error.message)
    } else {
      setMessage('Sauvegardé !')
      setTimeout(() => setMessage(''), 2000)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Formate la date
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)' }}>
          profil
        </span>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: 'var(--text-muted)',
          }}
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- AVATAR + INFOS ---- */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: '#fff',
          }}>
            {(fullName || username || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
              {fullName || username || 'Mon profil'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {mesRecos.length} reco{mesRecos.length > 1 ? 's' : ''} partagée{mesRecos.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* ---- FORMULAIRE ---- */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px', marginBottom: '24px',
        }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px',
          }}>
            Mes infos
          </p>

          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px',
            }}>
              Email
            </label>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user?.email}</p>
          </div>

          {/* Pseudo */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px',
            }}>
              Pseudo *
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: superkeuma"
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '14px', color: 'var(--text-primary)',
                background: 'var(--bg)', outline: 'none',
              }}
            />
          </div>

          {/* Nom complet */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px',
            }}>
              Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="ex: Marc Chevigny"
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '14px', color: 'var(--text-primary)',
                background: 'var(--bg)', outline: 'none',
              }}
            />
          </div>

          {message && (
            <p style={{
              fontSize: '13px', textAlign: 'center', marginBottom: '12px',
              color: message.includes('!') ? '#22c55e' : '#ef4444',
            }}>
              {message}
            </p>
          )}

          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: '100%', padding: '10px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* ---- MES RECOS ---- */}
        {mesRecos.length > 0 && (
          <div>
            <p style={{
              fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
            }}>
              Mes recommandations
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mesRecos.map(reco => (
                <div key={reco.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}>
                  {/* Miniature ou icône */}
                  {reco.poster_url ? (
                    <img
                      src={reco.poster_url}
                      alt={reco.title}
                      style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}>
                      <TypeIcon type={reco.type} size={16} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {reco.title}
                    </p>
                    {reco.creator && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{reco.creator}</p>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatDate(reco.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <NavBar current="/profil" router={router} />
    </div>
  )
}