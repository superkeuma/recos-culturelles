'use client'
import React from 'react'
// ============================================
// PAGE NOUVELLE RECOMMANDATION — v3 redesign
// Design minimaliste blanc pur + bleu nuit
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RechercheTMDB from '@/components/RechercheTMDB'
import RechercheMusique from '@/components/RechercheMusique'
import RechercheLivres from '@/components/RechercheLivres'
import RecherchePodcasts from '@/components/RecherchePodcasts'
import RechercheYouTube from '@/components/RechercheYouTube'
import TypeIcon from '@/components/TypeIcon'
import { ArrowLeft, Send, X } from 'lucide-react'

const TYPES = [
  { value: 'film',      label: 'Film / Série' },
  { value: 'musique',   label: 'Musique'      },
  { value: 'podcast',   label: 'Podcast'      },
  { value: 'livre',     label: 'Livre'        },
  { value: 'youtube',   label: 'YouTube'      },
  { value: 'autre',     label: 'Autre'        },
]

// Types avec API — pas de saisie manuelle
const TYPES_AVEC_API = ['film', 'musique', 'podcast', 'livre', 'youtube']

export default function NouvelleReco() {
  const [user, setUser] = useState<any>(null)
  const [type, setType] = useState('film')
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [url, setUrl] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [fetchingImage, setFetchingImage] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    setTitle('')
    setCreator('')
    setUrl('')
    setPosterUrl('')
  }, [type])

  // Auto-fetch og:image quand l'URL change (types manuels uniquement)
  useEffect(() => {
    if (!url || !url.startsWith('http')) return
    const timer = setTimeout(async () => {
      setFetchingImage(true)
      try {
        const res = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (data.image) setPosterUrl(data.image)
      } catch {}
      setFetchingImage(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [url])

  const handleSelect = (resultat: {
    title: string, creator: string, url: string, posterUrl: string
  }) => {
    setTitle(resultat.title)
    setCreator(resultat.creator)
    setUrl(resultat.url)
    setPosterUrl(resultat.posterUrl)
  }

  const soumettre = async () => {
    if (!title.trim()) { setMessage('Le titre est obligatoire'); return }
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('recommendations')
      .insert({
        user_id: user.id,
        type,
        title: title.trim(),
        creator: creator.trim() || null,
        url: url.trim() || null,
        comment: comment.trim() || null,
        poster_url: posterUrl || null,
      })

    if (error) setMessage('Erreur : ' + error.message)
    else router.push('/')
    setSaving(false)
  }

  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'
  const RED = '#FF2D55'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: `2px solid ${INK}`, borderRadius: '2px',
    fontSize: '14px', color: INK,
    background: '#FAFAF0', outline: 'none',
    fontFamily: 'var(--font)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 700, color: INK,
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', opacity: 0.5,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${INK}`, borderTopColor: YELLOW, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', paddingBottom: '40px' }}>

      {/* ---- HEADER ---- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#FAFAF0', borderBottom: `2px solid ${INK}`,
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
          cursor: 'pointer', color: INK, padding: '5px', display: 'flex',
        }}>
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '18px', color: INK, fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>
          nouvelle reco
        </span>
        <div style={{ width: '36px' }} />
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px' }}>

        {/* ---- SÉLECTEUR DE TYPE ---- */}
        <div style={{ marginBottom: '24px' }}>
          <p style={labelStyle}>Type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                padding: '7px 14px', borderRadius: '2px',
                border: `2px solid ${INK}`,
                background: type === t.value ? YELLOW : 'transparent',
                color: INK, fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer',
                boxShadow: type === t.value ? `3px 3px 0 ${INK}` : 'none',
                transform: type === t.value ? 'translate(-1px, -1px)' : 'none',
                transition: 'all 0.1s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <TypeIcon type={t.value} size={12} color={INK} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- RECHERCHE API ---- */}
        <div style={{ marginBottom: '8px' }}>
          {type === 'film' && <RechercheTMDB onSelect={handleSelect} />}
          {type === 'musique' && <RechercheMusique onSelect={handleSelect} />}
          {type === 'podcast' && <RecherchePodcasts onSelect={handleSelect} />}
          {type === 'livre' && <RechercheLivres onSelect={handleSelect} />}
          {type === 'youtube' && <RechercheYouTube onSelect={handleSelect} />}
        </div>

        {/* ---- APERÇU SÉLECTION ---- */}
        {posterUrl && (
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            background: '#fff', border: `2px solid ${INK}`,
            boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px',
            padding: '12px', marginBottom: '20px',
          }}>
            <img src={posterUrl} alt={title}
              style={{ width: '44px', height: '60px', objectFit: 'cover', borderRadius: '2px', border: `1.5px solid ${INK}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: INK, fontFamily: 'var(--font-title)' }}>{title}</p>
              {creator && <p style={{ fontSize: '12px', color: INK, opacity: 0.5, marginTop: '2px' }}>{creator}</p>}
            </div>
            <button onClick={() => { setTitle(''); setCreator(''); setUrl(''); setPosterUrl('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'flex', opacity: 0.4 }}>
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ---- SAISIE MANUELLE (types sans API) ---- */}
        {!TYPES_AVEC_API.includes(type) && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Titre *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="ex: Hamilton, une expo, un compte..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Type de reco</label>
              <input type="text" value={creator} onChange={e => setCreator(e.target.value)}
                placeholder="ex: concert, exposition, compte insta..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                Lien
                {fetchingImage && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '8px', opacity: 0.6 }}>récupération...</span>}
                {!fetchingImage && posterUrl && url && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '8px', color: '#22c55e' }}>image trouvée ✓</span>}
              </label>
              <input type="url" value={url} onChange={e => { setUrl(e.target.value); if (!e.target.value) setPosterUrl('') }}
                placeholder="https://..." style={inputStyle} />
            </div>
          </div>
        )}

        {/* ---- COMMENTAIRE ---- */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Ton commentaire</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Pourquoi tu recommandes ça ? Ce qui t'a touché, surpris, marqué..."
            rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: '1.6' }} />
        </div>

        {message && (
          <p style={{ fontSize: '13px', color: RED, textAlign: 'center', marginBottom: '16px', fontWeight: 700 }}>
            {message}
          </p>
        )}

        {/* ---- BOUTON PUBLIER ---- */}
        <button onClick={soumettre} disabled={saving} style={{
          width: '100%', padding: '14px',
          background: YELLOW, color: INK,
          border: `2px solid ${INK}`, borderRadius: '2px',
          boxShadow: `4px 4px 0 ${INK}`,
          fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em',
          cursor: 'pointer', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          {saving ? 'Publication...' : <><Send size={14} strokeWidth={2.5} />Partager ma reco</>}
        </button>

      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}