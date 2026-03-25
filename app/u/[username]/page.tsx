'use client'
// ============================================
// PAGE PROFIL PUBLIC — /u/[username]
// Onglets : recos partagées + sauvegardées
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import TypeIcon from '@/components/TypeIcon'
import { ArrowLeft, UserPlus, UserMinus, Sprout, Search, Bookmark, Users } from 'lucide-react'

type Tab = 'recos' | 'sauvegardes' | 'contacts'

const formatDate = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} jours`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ProfilPublic() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recos, setRecos] = useState<any[]>([])
  const [savedRecos, setSavedRecos] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('recos')
  const [isSuivi, setIsSuivi] = useState(false)
  const [mySaved, setMySaved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()
  const params = useParams()
  const username = params.username as string

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setCurrentUser(user)

      // Charger le profil cible
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)

      // Si c'est son propre profil, rediriger
      if (prof.id === user.id) { router.replace('/profil'); return }

      // Charger ses recos + ses sauvegardes + follow + mes sauvegardes + ses abonnements en parallèle
      const [recosRes, savedRecosRes, followRes, mySavedRes, followingRes] = await Promise.all([
        supabase
          .from('recommendations')
          .select('*')
          .eq('user_id', prof.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('saved_recommendations')
          .select('created_at, recommendations(*, profiles(username, full_name))')
          .eq('user_id', prof.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('following_id', prof.id)
          .single(),

        supabase
          .from('saved_recommendations')
          .select('recommendation_id')
          .eq('user_id', user.id),

        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', prof.id),
      ])

      if (recosRes.data) setRecos(recosRes.data)
      if (savedRecosRes.data) {
        const items = savedRecosRes.data
          .map((s: any) => s.recommendations)
          .filter(Boolean)
        setSavedRecos(items)
      }
      setIsSuivi(!!followRes.data)
      if (mySavedRes.data) setMySaved(new Set(mySavedRes.data.map((s: any) => s.recommendation_id)))

      // Charger les profils des abonnements
      const followingIds = followingRes.data?.map((f: any) => f.following_id) || []
      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', followingIds)
        setFollowing(followingProfiles || [])
      }

      setLoading(false)
    }
    load()
  }, [username])

  const toggleSuivi = async () => {
    if (!currentUser || !profile) return
    if (isSuivi) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
      setIsSuivi(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
      setIsSuivi(true)
    }
  }

  const toggleMySave = async (recoId: string) => {
    if (!currentUser) return
    if (mySaved.has(recoId)) {
      await supabase.from('saved_recommendations').delete()
        .eq('user_id', currentUser.id)
        .eq('recommendation_id', recoId)
      setMySaved(prev => { const s = new Set(prev); s.delete(recoId); return s })
    } else {
      await supabase.from('saved_recommendations').insert({ user_id: currentUser.id, recommendation_id: recoId })
      setMySaved(prev => new Set(prev).add(recoId))
    }
  }

  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'

  // ---- HEADER partagé ----
  const renderHeader = (title: string) => (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: '#FAFAF0', borderBottom: `2px solid ${INK}`,
      padding: '0 20px', height: '56px',
      display: 'flex', alignItems: 'center', gap: '12px',
      maxWidth: '520px', margin: '0 auto',
    }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
        cursor: 'pointer', color: INK, padding: '5px', display: 'flex',
      }}>
        <ArrowLeft size={16} strokeWidth={2} />
      </button>
      <span style={{ fontWeight: 700, fontSize: '18px', color: INK, flex: 1, fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>{title}</span>
    </header>
  )

  // ---- CARTE RECO ----
  const renderReco = (reco: any, showAuthor = false) => (
    <div key={reco.id} style={{ background: '#fff', border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', overflow: 'hidden' }}>
      {showAuthor && reco.profiles && (
        <button onClick={() => reco.profiles?.username && router.push(`/u/${reco.profiles.username}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: YELLOW, border: 'none', borderBottom: `2px solid ${INK}`, cursor: 'pointer', padding: '8px 14px', width: '100%', textAlign: 'left' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: INK, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: YELLOW, flexShrink: 0, fontFamily: 'var(--font-title)' }}>
            {(reco.profiles.full_name || reco.profiles.username || '?')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '11px', color: INK, fontWeight: 700, letterSpacing: '0.06em' }}>
            {reco.profiles.full_name || reco.profiles.username}
          </span>
        </button>
      )}

      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px' }}>
        {reco.poster_url ? (
          <img src={reco.poster_url} alt={reco.title}
            style={{ width: '52px', height: '70px', objectFit: 'cover', objectPosition: 'center top', borderRadius: '2px', border: `1.5px solid ${INK}`, flexShrink: 0 }} />
        ) : (
          <div style={{ width: '40px', height: '40px', flexShrink: 0, background: '#FAFAF0', border: `1.5px solid ${INK}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
            <TypeIcon type={reco.type} size={18} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px', opacity: 0.4 }}>
            <TypeIcon type={reco.type} size={10} color={INK} />{reco.type}
          </span>
          <p style={{ fontWeight: 700, fontSize: '17px', color: INK, marginBottom: '2px', fontFamily: 'var(--font-title)', lineHeight: 1.1 }}>{reco.title}</p>
          {reco.creator && <p style={{ fontSize: '12px', color: INK, opacity: 0.5 }}>{reco.creator}</p>}
          {reco.comment && (
            <p style={{ fontSize: '13px', color: INK, fontStyle: 'italic', lineHeight: 1.6, borderLeft: `3px solid ${YELLOW}`, paddingLeft: '10px', marginTop: '8px', fontFamily: 'var(--font-title)', opacity: 0.75 }}>
              "{reco.comment}"
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: `2px solid ${INK}`, background: '#FAFAF0' }}>
        <span style={{ fontSize: '10px', color: INK, opacity: 0.4, fontWeight: 700, letterSpacing: '0.06em' }}>{formatDate(reco.created_at)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {reco.url && (
            <a href={reco.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', color: INK, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', border: `2px solid ${INK}`, borderRadius: '2px', padding: '3px 9px' }}>
              VOIR →
            </a>
          )}
          <button onClick={() => toggleMySave(reco.id)} style={{
            border: `2px solid ${INK}`, borderRadius: '2px', cursor: 'pointer',
            padding: '3px 9px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
            background: mySaved.has(reco.id) ? YELLOW : 'transparent', color: INK,
            boxShadow: mySaved.has(reco.id) ? `2px 2px 0 ${INK}` : 'none',
          }}>
            {mySaved.has(reco.id) ? 'SAUVEGARDÉ ✓' : 'SAUVEGARDER'}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${INK}`, borderTopColor: YELLOW, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', paddingBottom: '80px' }}>
      {renderHeader('profil')}
      <div style={{ textAlign: 'center', padding: '80px 20px', color: INK }}>
        <div style={{ marginBottom: '12px', opacity: 0.15, display: 'flex', justifyContent: 'center' }}>
          <Search size={40} strokeWidth={1.5} />
        </div>
        <p style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontStyle: 'italic', opacity: 0.4 }}>Utilisateur introuvable</p>
        <p style={{ fontSize: '13px', marginTop: '6px', opacity: 0.4 }}>@{username} n'existe pas</p>
      </div>
      <NavBar current="" router={router} />
    </div>
  )

  const displayName = profile.full_name || profile.username || '?'

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', paddingBottom: '80px' }}>

      {renderHeader(`@${profile.username}`)}

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- AVATAR + INFOS + BOUTON SUIVRE ---- */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
          background: '#fff', border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
          borderRadius: '2px', padding: '16px',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: YELLOW, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: INK, flexShrink: 0,
            fontFamily: 'var(--font-title)',
          }}>
            {displayName[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '20px', color: INK, fontFamily: 'var(--font-title)', lineHeight: 1.1 }}>{displayName}</p>
            <p style={{ fontSize: '11px', color: INK, opacity: 0.5, marginTop: '2px' }}>@{profile.username}</p>
            <p style={{ fontSize: '10px', color: INK, fontWeight: 700, letterSpacing: '0.08em', marginTop: '4px', opacity: 0.5 }}>
              {recos.length} RECOS · {savedRecos.length} SAUV.
            </p>
          </div>
          <button onClick={toggleSuivi} style={{
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            background: isSuivi ? 'transparent' : YELLOW,
            color: INK, border: `2px solid ${INK}`, borderRadius: '2px',
            boxShadow: isSuivi ? 'none' : `3px 3px 0 ${INK}`,
            padding: '8px 14px', fontSize: '11px', fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {isSuivi ? <><UserMinus size={12} />Suivi ✓</> : <><UserPlus size={12} />Suivre</>}
          </button>
        </div>

        {/* ---- ONGLETS ---- */}
        <div style={{ display: 'flex', border: `2px solid ${INK}`, borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
          {(['recos', 'sauvegardes', 'contacts'] as Tab[]).map((t, i) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 4px',
              background: tab === t ? YELLOW : 'transparent',
              border: 'none', borderRight: i < 2 ? `2px solid ${INK}` : 'none',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              color: INK, cursor: 'pointer', textTransform: 'uppercase',
              transition: 'background 0.1s',
            }}>
              {t === 'recos' ? `Recos (${recos.length})` : t === 'sauvegardes' ? `Sauv. (${savedRecos.length})` : `Contacts (${following.length})`}
            </button>
          ))}
        </div>

        {/* ---- ONGLET RECOS ---- */}
        {tab === 'recos' && (
          recos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: INK }}>
              <div style={{ marginBottom: '12px', opacity: 0.15, display: 'flex', justifyContent: 'center' }}><Sprout size={40} strokeWidth={1.5} /></div>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontStyle: 'italic', opacity: 0.4 }}>Aucune reco pour l'instant</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recos.map(reco => renderReco(reco, false))}
            </div>
          )
        )}

        {tab === 'sauvegardes' && (
          savedRecos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: INK }}>
              <div style={{ marginBottom: '12px', opacity: 0.15, display: 'flex', justifyContent: 'center' }}><Bookmark size={40} strokeWidth={1.5} /></div>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontStyle: 'italic', opacity: 0.4 }}>Aucune sauvegarde pour l'instant</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {savedRecos.map(reco => renderReco(reco, true))}
            </div>
          )
        )}

        {tab === 'contacts' && (
          following.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: INK }}>
              <div style={{ marginBottom: '12px', opacity: 0.15, display: 'flex', justifyContent: 'center' }}><Users size={40} strokeWidth={1.5} /></div>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontStyle: 'italic', opacity: 0.4 }}>Ne suit personne pour l'instant</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {following.map(p => (
                <button key={p.id} onClick={() => router.push(`/u/${p.username}`)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#fff', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
                  borderRadius: '2px', padding: '10px 14px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: YELLOW, border: `2px solid ${INK}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: INK, flexShrink: 0, fontFamily: 'var(--font-title)',
                  }}>
                    {(p.full_name || p.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: INK, fontFamily: 'var(--font-title)' }}>{p.full_name || p.username}</p>
                    <p style={{ fontSize: '11px', color: INK, opacity: 0.5 }}>@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </main>

      <NavBar current="" router={router} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
