'use client'
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '40px' }}>

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
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '0', display: 'flex',
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)', fontFamily: 'var(--font-title)' }}>
          nouvelle reco
        </span>
        <div style={{ width: '60px' }} />
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px' }}>

        {/* ---- SÉLECTEUR DE TYPE ---- */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
          }}>
            Type
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: type === t.value ? 'var(--accent)' : 'transparent',
                  color: type === t.value ? '#fff' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <TypeIcon type={t.value} size={13} color={type === t.value ? '#fff' : 'currentColor'} />
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
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            padding: '12px', marginBottom: '20px',
          }}>
            <img
              src={posterUrl}
              alt={title}
              style={{ width: '44px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>{title}</p>
              {creator && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{creator}</p>}
            </div>
            <button
              onClick={() => { setTitle(''); setCreator(''); setUrl(''); setPosterUrl('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex',
              }}
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* ---- SAISIE MANUELLE (types sans API) ---- */}
        {!TYPES_AVEC_API.includes(type) && (
          <div style={{ marginBottom: '20px' }}>

            {/* Titre */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="ex: Hades II, Hamilton..."
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '14px', color: 'var(--text-primary)',
                  background: 'var(--bg)', outline: 'none',
                }}
              />
            </div>

            {/* Type de reco */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Type de reco
              </label>
              <input
                type="text"
                value={creator}
                onChange={e => setCreator(e.target.value)}
                placeholder="ex: concert, exposition, compte insta..."
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '14px', color: 'var(--text-primary)',
                  background: 'var(--bg)', outline: 'none',
                }}
              />
            </div>

            {/* Lien */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Lien
                {fetchingImage && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '8px', color: 'var(--text-muted)' }}>
                    récupération de l'image...
                  </span>
                )}
                {!fetchingImage && posterUrl && url && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '8px', color: '#22c55e' }}>
                    image trouvée ✓
                  </span>
                )}
              </label>
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); if (!e.target.value) setPosterUrl('') }}
                placeholder="https://..."
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '14px', color: 'var(--text-primary)',
                  background: 'var(--bg)', outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* ---- COMMENTAIRE ---- */}
        <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '6px',
            }}>
              Ton commentaire
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Pourquoi tu recommandes ça ? Ce qui t'a touché, surpris, marqué..."
              rows={4}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '14px', color: 'var(--text-primary)',
                background: 'var(--bg)', outline: 'none',
                resize: 'none', lineHeight: '1.6',
                fontFamily: 'var(--font)',
              }}
            />
        </div>

        {/* Message erreur */}
        {message && (
          <p style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', marginBottom: '16px' }}>
            {message}
          </p>
        )}

        {/* ---- BOUTON PUBLIER ---- */}
        <button
          onClick={soumettre}
          disabled={saving}
          style={{
            width: '100%', padding: '13px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '15px', fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saving ? 'Publication...' : <><Send size={15} strokeWidth={2} />Partager ma reco</>}
          </span>
        </button>

      </main>
    </div>
  )
}