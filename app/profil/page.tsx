'use client'
// ============================================
// PAGE PROFIL — onglets recos / contacts / paramètres
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import TypeIcon from '@/components/TypeIcon'
import { LogOut, Sprout, Trash2, Bell, Eye, EyeOff } from 'lucide-react'

type Tab = 'recos' | 'contacts' | 'parametres'

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Profil() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mesRecos, setMesRecos] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('recos')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  // Paramètres
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [msgDisplayName, setMsgDisplayName] = useState('')
  const [msgPassword, setMsgPassword] = useState('')

  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const [profileRes, recosRes, followingRes, followersRes] = await Promise.all([
        supabase.from('profiles').select('username, full_name').eq('id', user.id).single(),
        supabase.from('recommendations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('follows').select('follower_id, created_at').eq('following_id', user.id).order('created_at', { ascending: false }),
      ])

      const u = profileRes.data?.username || ''
      const d = profileRes.data?.full_name || ''
      setUsername(u)
      setDisplayName(d)
      setNewDisplayName(d)
      if (recosRes.data) setMesRecos(recosRes.data)

      // Compter les notifs non lues
      const seenAt = localStorage.getItem('notifs_seen_at')
      if (followersRes.data) {
        const unread = seenAt
          ? followersRes.data.filter(f => new Date(f.created_at) > new Date(seenAt)).length
          : followersRes.data.length
        setUnreadNotifs(unread)
      }

      // Charger les profils des abonnements / abonnés
      const followingIds = followingRes.data?.map(f => f.following_id) || []
      const followerIds = followersRes.data?.map(f => f.follower_id) || []

      const [followingProfiles, followerProfiles] = await Promise.all([
        followingIds.length > 0
          ? supabase.from('profiles').select('id, username, full_name').in('id', followingIds)
          : Promise.resolve({ data: [] }),
        followerIds.length > 0
          ? supabase.from('profiles').select('id, username, full_name').in('id', followerIds)
          : Promise.resolve({ data: [] }),
      ])

      setFollowing(followingProfiles.data || [])
      setFollowers(followerProfiles.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const deleteReco = async (recoId: string) => {
    await supabase.from('recommendations').delete().eq('id', recoId)
    setMesRecos(prev => prev.filter(r => r.id !== recoId))
    setDeletingId(null)
  }

  const saveDisplayName = async () => {
    const val = newDisplayName.trim()
    setSavingDisplayName(true)
    setMsgDisplayName('')
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username, full_name: val })
    if (error) {
      setMsgDisplayName('Erreur : ' + error.message)
    } else {
      setDisplayName(val)
      setMsgDisplayName('Nom mis à jour !')
      setTimeout(() => setMsgDisplayName(''), 2500)
    }
    setSavingDisplayName(false)
  }

  const savePassword = async () => {
    if (!newPassword) { setMsgPassword('Saisis un nouveau mot de passe'); return }
    if (newPassword.length < 6) { setMsgPassword('Minimum 6 caractères'); return }
    if (newPassword !== confirmPassword) { setMsgPassword('Les mots de passe ne correspondent pas'); return }
    setSavingPassword(true)
    setMsgPassword('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setMsgPassword('Erreur : ' + error.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setMsgPassword('Mot de passe mis à jour !')
      setTimeout(() => setMsgPassword(''), 2500)
    }
    setSavingPassword(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  const nomAffiché = displayName || username || '?'

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
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)' }}>profil</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/notifications')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', position: 'relative', padding: 0 }}
          >
            <Bell size={20} color={unreadNotifs > 0 ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={unreadNotifs > 0 ? 2 : 1.5} />
            {unreadNotifs > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '16px', height: '16px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>
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
        </div>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- AVATAR + NOM + USERNAME ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {nomAffiché[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
              {nomAffiché}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{username}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {mesRecos.length} reco{mesRecos.length > 1 ? 's' : ''} · {following.length} abonnement{following.length > 1 ? 's' : ''} · {followers.length} abonné{followers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* ---- ONGLETS ---- */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)',
          padding: '4px', marginBottom: '20px',
        }}>
          {(['recos', 'contacts', 'parametres'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px',
                background: tab === t ? '#fff' : 'none',
                border: 'none', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t === 'recos' ? `Recos (${mesRecos.length})` : t === 'contacts' ? 'Contacts' : 'Paramètres'}
            </button>
          ))}
        </div>

        {/* ---- ONGLET RECOS ---- */}
        {tab === 'recos' && (
          mesRecos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                <Sprout size={36} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: '14px' }}>Tu n'as pas encore partagé de reco</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mesRecos.map(reco => (
                <div key={reco.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}>
                  {reco.poster_url ? (
                    <img
                      src={reco.poster_url}
                      alt={reco.title}
                      style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatDate(reco.created_at)}
                    </p>
                    {deletingId === reco.id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setDeletingId(null)}
                          style={{
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px', fontSize: '11px',
                            color: 'var(--text-muted)', cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => deleteReco(reco.id)}
                          style={{
                            background: '#ef4444', color: '#fff',
                            border: 'none', borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(reco.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', display: 'flex', padding: '4px',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ---- ONGLET CONTACTS ---- */}
        {tab === 'contacts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Abonnements */}
            <div>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
              }}>
                Abonnements · {following.length}
              </p>
              {following.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tu ne suis personne encore</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {following.map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/u/${p.username}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {(p.full_name || p.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.full_name || p.username}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Abonnés */}
            <div>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
              }}>
                Abonnés · {followers.length}
              </p>
              {followers.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Personne ne te suit encore</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {followers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/u/${p.username}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0,
                      }}>
                        {(p.full_name || p.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.full_name || p.username}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- ONGLET PARAMÈTRES ---- */}
        {tab === 'parametres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Nom affiché */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '18px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
              }}>
                Nom affiché
              </p>
              <input
                type="text"
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                placeholder="Ton prénom, surnom..."
                style={{
                  width: '100%', padding: '9px 12px', marginBottom: '10px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '14px', color: 'var(--text-primary)',
                  background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {msgDisplayName && (
                <p style={{
                  fontSize: '13px', marginBottom: '10px',
                  color: msgDisplayName.includes('!') ? '#22c55e' : '#ef4444',
                }}>
                  {msgDisplayName}
                </p>
              )}
              <button
                onClick={saveDisplayName}
                disabled={savingDisplayName}
                style={{
                  width: '100%', padding: '10px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-full)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {savingDisplayName ? 'Mise à jour...' : 'Enregistrer'}
              </button>
            </div>

            {/* Pseudo (lecture seule) */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '18px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Pseudo
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>@{username}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Le pseudo ne peut pas être modifié.
              </p>
            </div>

            {/* Changer le mot de passe */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '18px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
              }}>
                Mot de passe
              </p>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Nouveau mot de passe"
                  style={{
                    width: '100%', padding: '9px 40px 9px 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    fontSize: '14px', color: 'var(--text-primary)',
                    background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirmer le mot de passe"
                  style={{
                    width: '100%', padding: '9px 40px 9px 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    fontSize: '14px', color: 'var(--text-primary)',
                    background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {msgPassword && (
                <p style={{
                  fontSize: '13px', marginBottom: '10px',
                  color: msgPassword.includes('!') ? '#22c55e' : '#ef4444',
                }}>
                  {msgPassword}
                </p>
              )}
              <button
                onClick={savePassword}
                disabled={savingPassword}
                style={{
                  width: '100%', padding: '10px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-full)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {savingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
            </div>

            {/* Email (lecture seule) */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '18px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Email
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user?.email}</p>
            </div>

          </div>
        )}
      </main>

      <NavBar current="/profil" router={router} />
    </div>
  )
}
