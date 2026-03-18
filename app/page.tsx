'use client'
// ============================================
// PAGE D'ACCUEIL — LE FEED (v2 redesign)
// Design minimaliste blanc pur + bleu nuit
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import TypeIcon from '@/components/TypeIcon'
import NavBar from '@/components/NavBar'

// --- Formate la date en "il y a X jours" ---
const formatDate = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} jours`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Feed() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      fetchRecommendations(user.id)
      fetchSaved(user.id)
    }
    getUser()
  }, [])

  const fetchRecommendations = async (userId: string) => {
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = followData?.map(f => f.following_id) || []
    const allIds = [...followingIds, userId]

    const { data } = await supabase
      .from('recommendations')
      .select('*, profiles(username, full_name)')
      .in('user_id', allIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setRecommendations(data)
    setLoading(false)
  }

  // --- Charge les IDs des recos déjà sauvegardées ---
  const fetchSaved = async (userId: string) => {
    const { data } = await supabase
      .from('saved_recommendations')
      .select('recommendation_id')
      .eq('user_id', userId)
    if (data) setSaved(new Set(data.map(s => s.recommendation_id)))
  }

  // --- Sauvegarde ou retire une reco ---
  const toggleSave = async (recoId: string) => {
    if (!user) return
    if (saved.has(recoId)) {
      await supabase
        .from('saved_recommendations')
        .delete()
        .eq('user_id', user.id)
        .eq('recommendation_id', recoId)
      setSaved(prev => { const s = new Set(prev); s.delete(recoId); return s })
    } else {
      await supabase
        .from('saved_recommendations')
        .insert({ user_id: user.id, recommendation_id: recoId })
      setSaved(prev => new Set(prev).add(recoId))
    }
  }

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
        padding: '0 16px',
        height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.3px', color: 'var(--accent)' }}>
          recos
        </span>
        <button
          onClick={() => router.push('/nouvelle-reco')}
          style={{
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-full)',
            padding: '7px 16px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.01em',
          }}
        >
          + partager
        </button>
      </header>

      {/* ---- FEED ---- */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        {recommendations.length === 0 ? (

          /* ---- ÉTAT VIDE ---- */
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Aucune reco pour l'instant</p>
            <p style={{ fontSize: '14px', marginTop: '6px' }}>Ajoute des contacts ou partage la première !</p>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map(reco => (

              /* ---- CARTE RECO ---- */
              <div key={reco.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                transition: 'border-color 0.15s',
              }}>

                {/* Ligne auteur + date */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Avatar initiales */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)',
                    }}>
                      {(reco.profiles?.full_name || reco.profiles?.username || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {reco.profiles?.full_name || reco.profiles?.username || 'Anonyme'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatDate(reco.created_at)}
                  </span>
                </div>

               {/* Affiche pleine largeur */}
                {reco.poster_url && (
                  <div style={{ margin: '0 -16px 12px', overflow: 'hidden' }}>
                    <img
                      src={reco.poster_url}
                      alt={reco.title}
                      style={{
                        width: '100%',
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        display: 'block',
                      }}
                    />
                  </div>
                )}

{/* Contenu principal */}
<div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>

  {/* Badge emoji si pas d'affiche */}
 {!reco.poster_url && (
  <div style={{
    width: '40px', height: '40px', flexShrink: 0,
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
  }}>
    <TypeIcon type={reco.type} size={18} />
  </div>
)}

  {/* Texte */}
  <div style={{ flex: 1, minWidth: 0 }}>
  <span style={{
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  fontSize: '10px', fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '3px',
}}>
  <TypeIcon type={reco.type} size={11} />
  {reco.type}
</span>

<p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>
     {reco.title}
    </p>
    {reco.creator && (
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {reco.creator}
      </p>
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

                {/* Pied de carte : lien + sauvegarder */}
                {(reco.url || reco.user_id !== user?.id) && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginTop: '12px',
                    paddingTop: '10px', borderTop: '1px solid var(--border-light)',
                  }}>
                    {reco.url ? (
                      <a href={reco.url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '12px', color: 'var(--accent)',
                        textDecoration: 'none', fontWeight: 500,
                      }}>
                        Voir →
                      </a>
                    ) : <span />}

                    {reco.user_id !== user?.id && (
                      <button
                        onClick={() => toggleSave(reco.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '13px', color: saved.has(reco.id) ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: saved.has(reco.id) ? 600 : 400,
                          padding: '0',
                        }}
                      >
                        {saved.has(reco.id) ? '🔖 Sauvegardé' : '🔖 Sauvegarder'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ---- BARRE DE NAVIGATION BAS ---- */}
      <NavBar current="/" router={router} />

    </div>
  )
}

