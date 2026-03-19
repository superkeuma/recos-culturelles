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

  // ---- HEADER partagé ----
  const renderHeader = (title: string) => (
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
      <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)', flex: 1, fontFamily: 'var(--font-title)' }}>{title}</span>
    </header>
  )

  // ---- CARTE RECO ----
  const renderReco = (reco: any, showAuthor = false) => (
    <div key={reco.id} style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
    }}>
      {/* Auteur (pour les sauvegardes) */}
      {showAuthor && reco.profiles && (
        <button
          onClick={() => reco.profiles?.username && router.push(`/u/${reco.profiles.username}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, marginBottom: '10px',
          }}
        >
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
          }}>
            {(reco.profiles.full_name || reco.profiles.username || '?')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {reco.profiles.full_name || reco.profiles.username}
          </span>
        </button>
      )}

      {/* Affiche pleine largeur */}
      {reco.poster_url && (
        <div style={{ margin: '0 -16px 12px', overflow: 'hidden' }}>
          <img
            src={reco.poster_url}
            alt={reco.title}
            style={{
              width: '100%', aspectRatio: '2/3',
              objectFit: 'cover', objectPosition: 'center top', display: 'block',
            }}
          />
        </div>
      )}

      {/* Contenu */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {!reco.poster_url && (
          <div style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <TypeIcon type={reco.type} size={18} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px',
          }}>
            <TypeIcon type={reco.type} size={11} />
            {reco.type}
          </span>
          <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px', fontFamily: 'var(--font-title)' }}>
            {reco.title}
          </p>
          {reco.creator && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{reco.creator}</p>
          )}
          {reco.comment && (
            <p style={{
              fontSize: '14px', color: 'var(--text-secondary)',
              fontStyle: 'italic', lineHeight: '1.5',
              borderLeft: '2px solid var(--border)',
              paddingLeft: '10px', marginTop: '8px',
            }}>
              {reco.comment}
            </p>
          )}
        </div>
      </div>

      {/* Pied de carte */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDate(reco.created_at)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {reco.url && (
            <a href={reco.url} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500,
            }}>
              Voir →
            </a>
          )}
          <button
            onClick={() => toggleMySave(reco.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '13px',
              color: mySaved.has(reco.id) ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: mySaved.has(reco.id) ? 600 : 400,
            }}
          >
            {mySaved.has(reco.id) ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      {renderHeader('profil')}
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
          <Search size={36} strokeWidth={1.5} />
        </div>
        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Utilisateur introuvable</p>
        <p style={{ fontSize: '14px', marginTop: '6px' }}>@{username} n'existe pas</p>
      </div>
      <NavBar current="" router={router} />
    </div>
  )

  const displayName = profile.full_name || profile.username || '?'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>

      {renderHeader(`@${profile.username}`)}

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- AVATAR + INFOS + BOUTON SUIVRE ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {displayName[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
              {displayName}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {recos.length} reco{recos.length > 1 ? 's' : ''} · {savedRecos.length} sauvegarde{savedRecos.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={toggleSuivi}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isSuivi ? 'none' : 'var(--accent)',
              color: isSuivi ? 'var(--text-muted)' : '#fff',
              border: isSuivi ? '1px solid var(--border)' : 'none',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {isSuivi ? <><UserMinus size={14} />Suivi ✓</> : <><UserPlus size={14} />Suivre</>}
          </button>
        </div>

        {/* ---- ONGLETS ---- */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)',
          padding: '4px', marginBottom: '16px',
        }}>
          {(['recos', 'sauvegardes', 'contacts'] as Tab[]).map(t => (
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
              {t === 'recos' ? `Recos (${recos.length})` : t === 'sauvegardes' ? `Sauvegardé (${savedRecos.length})` : `Contacts (${following.length})`}
            </button>
          ))}
        </div>

        {/* ---- CONTENU ONGLET ---- */}
        {tab === 'recos' && (
          recos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                <Sprout size={36} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: '14px' }}>Aucune reco pour l'instant</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recos.map(reco => renderReco(reco, false))}
            </div>
          )
        )}

        {tab === 'sauvegardes' && (
          savedRecos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                <Bookmark size={36} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: '14px' }}>Aucune sauvegarde pour l'instant</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedRecos.map(reco => renderReco(reco, true))}
            </div>
          )
        )}

        {tab === 'contacts' && (
          following.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '12px', opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
                <Users size={36} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: '14px' }}>Ne suit personne pour l'instant</p>
            </div>
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
                      {p.full_name || p.username}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </main>

      <NavBar current="" router={router} />
    </div>
  )
}
