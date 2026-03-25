'use client'
import React from 'react'
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
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

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

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeletingAccount(true)
    // Supprime les données utilisateur, puis le compte auth via API route
    await supabase.from('recommendations').delete().eq('user_id', user.id)
    await supabase.from('saved_recommendations').delete().eq('user_id', user.id)
    await supabase.from('follows').delete().eq('follower_id', user.id)
    await supabase.from('follows').delete().eq('following_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #0a0a0a', borderTopColor: '#FFD600', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const nomAffiché = displayName || username || '?'

  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'
  const RED = '#FF2D55'

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: `2px solid ${INK}`,
    boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', padding: '18px',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: INK,
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px',
    opacity: 0.5,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: `2px solid ${INK}`, borderRadius: '2px',
    fontSize: '14px', color: INK,
    background: '#FAFAF0', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font)',
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '11px',
    background: YELLOW, color: INK,
    border: `2px solid ${INK}`, borderRadius: '2px',
    boxShadow: `3px 3px 0 ${INK}`,
    fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
    cursor: 'pointer', textTransform: 'uppercase',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', paddingBottom: '80px' }}>

      {/* ---- HEADER ---- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#FAFAF0',
        borderBottom: `2px solid ${INK}`,
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: INK, fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>
          profil
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/notifications')}
            style={{
              background: unreadNotifs > 0 ? YELLOW : 'none',
              border: `2px solid ${INK}`, borderRadius: '2px',
              boxShadow: unreadNotifs > 0 ? `2px 2px 0 ${INK}` : 'none',
              cursor: 'pointer', display: 'flex', position: 'relative', padding: '4px 6px',
            }}
          >
            <Bell size={18} color={INK} strokeWidth={2} />
            {unreadNotifs > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '16px', height: '16px',
                background: RED, color: '#fff',
                borderRadius: '50%', border: `1.5px solid ${INK}`,
                fontSize: '9px', fontWeight: 700,
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
              background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
              padding: '5px 10px', cursor: 'pointer',
              fontSize: '11px', fontWeight: 700, color: INK,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            <LogOut size={13} />
            Sortir
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- AVATAR + NOM + USERNAME ---- */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
          background: '#fff', border: `2px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px',
          padding: '16px',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: YELLOW, border: `2px solid ${INK}`,
            boxShadow: `2px 2px 0 ${INK}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: INK, flexShrink: 0,
            fontFamily: 'var(--font-title)',
          }}>
            {nomAffiché[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '20px', color: INK, fontFamily: 'var(--font-title)', lineHeight: 1.1 }}>
              {nomAffiché}
            </p>
            <p style={{ fontSize: '12px', color: INK, opacity: 0.5, marginTop: '2px' }}>@{username}</p>
            <p style={{ fontSize: '11px', color: INK, marginTop: '4px', fontWeight: 700, letterSpacing: '0.06em', opacity: 0.6 }}>
              {mesRecos.length} RECOS · {following.length} SUIVIS · {followers.length} ABONNÉS
            </p>
          </div>
        </div>

        {/* ---- ONGLETS ---- */}
        <div style={{
          display: 'flex', gap: '0px',
          border: `2px solid ${INK}`, borderRadius: '2px',
          marginBottom: '20px', overflow: 'hidden',
        }}>
          {(['recos', 'contacts', 'parametres'] as Tab[]).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 4px',
                background: tab === t ? YELLOW : 'transparent',
                border: 'none', borderRight: i < 2 ? `2px solid ${INK}` : 'none',
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                color: INK, cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'background 0.1s',
              }}
            >
              {t === 'recos' ? `Recos (${mesRecos.length})` : t === 'contacts' ? 'Contacts' : 'Réglages'}
            </button>
          ))}
        </div>

        {/* ---- ONGLET RECOS ---- */}
        {tab === 'recos' && (
          mesRecos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: INK }}>
              <div style={{ marginBottom: '12px', opacity: 0.2, display: 'flex', justifyContent: 'center' }}>
                <Sprout size={40} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: '14px', fontFamily: 'var(--font-title)', fontStyle: 'italic' }}>
                Tu n'as pas encore partagé de reco
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mesRecos.map(reco => (
                <div key={reco.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#fff', border: `2px solid ${INK}`,
                  boxShadow: `3px 3px 0 ${INK}`, borderRadius: '2px',
                  padding: '10px 12px',
                }}>
                  {reco.poster_url ? (
                    <img src={reco.poster_url} alt={reco.title}
                      style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '2px', border: `1.5px solid ${INK}`, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      background: '#FAFAF0', border: `1.5px solid ${INK}`, borderRadius: '2px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK,
                    }}>
                      <TypeIcon type={reco.type} size={16} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: INK, fontFamily: 'var(--font-title)' }}>
                      {reco.title}
                    </p>
                    {reco.creator && <p style={{ fontSize: '11px', color: INK, opacity: 0.5 }}>{reco.creator}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', color: INK, opacity: 0.4, letterSpacing: '0.04em' }}>
                      {formatDate(reco.created_at)}
                    </p>
                    {deletingId === reco.id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDeletingId(null)} style={{
                          background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
                          padding: '3px 7px', fontSize: '10px', fontWeight: 700,
                          color: INK, cursor: 'pointer',
                        }}>Annuler</button>
                        <button onClick={() => deleteReco(reco.id)} style={{
                          background: RED, color: '#fff',
                          border: `2px solid ${INK}`, borderRadius: '2px',
                          boxShadow: `2px 2px 0 ${INK}`,
                          padding: '3px 7px', fontSize: '10px', fontWeight: 700,
                          cursor: 'pointer',
                        }}>Suppr.</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(reco.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: INK, display: 'flex', padding: '4px', opacity: 0.3,
                      }}>
                        <Trash2 size={14} />
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
            {[
              { label: 'Abonnements', list: following, empty: 'Tu ne suis personne encore' },
              { label: 'Abonnés', list: followers, empty: 'Personne ne te suit encore' },
            ].map(({ label, list, empty }) => (
              <div key={label}>
                <p style={{ ...labelStyle, marginBottom: '10px' }}>{label} · {list.length}</p>
                {list.length === 0 ? (
                  <p style={{ fontSize: '13px', color: INK, opacity: 0.4, fontFamily: 'var(--font-title)', fontStyle: 'italic' }}>{empty}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {list.map(p => (
                      <button key={p.id} onClick={() => router.push(`/u/${p.username}`)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: '#fff', border: `2px solid ${INK}`,
                        boxShadow: `3px 3px 0 ${INK}`, borderRadius: '2px',
                        padding: '10px 14px', cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: YELLOW, border: `2px solid ${INK}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: INK, flexShrink: 0,
                          fontFamily: 'var(--font-title)',
                        }}>
                          {(p.full_name || p.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: INK, fontFamily: 'var(--font-title)' }}>
                            {p.full_name || p.username}
                          </p>
                          <p style={{ fontSize: '11px', color: INK, opacity: 0.5 }}>@{p.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- ONGLET PARAMÈTRES ---- */}
        {tab === 'parametres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Nom affiché */}
            <div style={cardStyle}>
              <p style={labelStyle}>Nom affiché</p>
              <input type="text" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)}
                placeholder="Ton prénom, surnom..." style={{ ...inputStyle, marginBottom: '10px' }} />
              {msgDisplayName && (
                <p style={{ fontSize: '12px', marginBottom: '10px', color: msgDisplayName.includes('!') ? '#22c55e' : RED }}>
                  {msgDisplayName}
                </p>
              )}
              <button onClick={saveDisplayName} disabled={savingDisplayName} style={btnPrimary}>
                {savingDisplayName ? 'Mise à jour...' : 'Enregistrer'}
              </button>
            </div>

            {/* Pseudo (lecture seule) */}
            <div style={cardStyle}>
              <p style={labelStyle}>Pseudo</p>
              <p style={{ fontSize: '15px', color: INK, fontWeight: 700 }}>@{username}</p>
              <p style={{ fontSize: '11px', color: INK, opacity: 0.4, marginTop: '4px' }}>
                Le pseudo ne peut pas être modifié.
              </p>
            </div>

            {/* Mot de passe */}
            <div style={cardStyle}>
              <p style={labelStyle}>Mot de passe</p>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"
                  placeholder="Nouveau mot de passe"
                  style={{ ...inputStyle, paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'flex', padding: 0, opacity: 0.4,
                }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                style={{ ...inputStyle, marginBottom: '10px' }} />
              {msgPassword && (
                <p style={{ fontSize: '12px', marginBottom: '10px', color: msgPassword.includes('!') ? '#22c55e' : RED }}>
                  {msgPassword}
                </p>
              )}
              <button onClick={savePassword} disabled={savingPassword} style={btnPrimary}>
                {savingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
            </div>

            {/* Email */}
            <div style={cardStyle}>
              <p style={labelStyle}>Email</p>
              <p style={{ fontSize: '14px', color: INK, opacity: 0.6 }}>{user?.email}</p>
            </div>

            {/* Zone danger */}
            <div style={{ ...cardStyle, border: `2px solid ${RED}`, boxShadow: `4px 4px 0 ${RED}` }}>
              <p style={{ ...labelStyle, color: RED, opacity: 1 }}>Zone de danger</p>
              {!deleteConfirm ? (
                <>
                  <p style={{ fontSize: '12px', color: INK, opacity: 0.5, marginBottom: '12px' }}>
                    Supprime définitivement ton compte et toutes tes recos.
                  </p>
                  <button onClick={() => setDeleteConfirm(true)} style={{
                    width: '100%', padding: '10px',
                    background: 'transparent', color: RED,
                    border: `2px solid ${RED}`, borderRadius: '2px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    Supprimer mon compte
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: RED, marginBottom: '12px', fontFamily: 'var(--font-title)', fontStyle: 'italic' }}>
                    Es-tu sûr(e) ? Cette action est irréversible.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteConfirm(false)} style={{
                      flex: 1, padding: '10px',
                      background: 'transparent', color: INK,
                      border: `2px solid ${INK}`, borderRadius: '2px',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Annuler</button>
                    <button onClick={handleDeleteAccount} disabled={deletingAccount} style={{
                      flex: 1, padding: '10px',
                      background: RED, color: '#fff',
                      border: `2px solid ${INK}`, borderRadius: '2px',
                      boxShadow: `3px 3px 0 ${INK}`,
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {deletingAccount ? 'Suppression...' : 'Confirmer'}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </main>

      <NavBar current="/profil" router={router} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
