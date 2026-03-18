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

const TYPES = [
  { value: 'film',      label: 'Film / Série', emoji: '🎬' },
  { value: 'musique',   label: 'Musique',      emoji: '🎵' },
  { value: 'podcast',   label: 'Podcast',      emoji: '🎙️' },
  { value: 'livre',     label: 'Livre',        emoji: '📚' },
  { value: 'jeu',       label: 'Jeu vidéo',    emoji: '🎮' },
  { value: 'youtube',   label: 'YouTube',      emoji: '▶️' },
  { value: 'spectacle', label: 'Spectacle',    emoji: '🎭' },
  { value: 'autre',     label: 'Autre',        emoji: '✨' },
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
  const [quotaAtteint, setQuotaAtteint] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await verifierQuota(user.id)
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

  const verifierQuota = async (userId: string) => {
    const maintenant = new Date()
    const jourSemaine = maintenant.getDay()
    const diffLundi = (jourSemaine === 0 ? -6 : 1 - jourSemaine)
    const lundi = new Date(maintenant)
    lundi.setDate(maintenant.getDate() + diffLundi)
    lundi.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('recommendations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', lundi.toISOString())
      .limit(1)

    if (data && data.length > 0) setQuotaAtteint(true)
  }

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
    if (quotaAtteint) { setMessage('Tu as déjà posté ta reco cette semaine !'); return }

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
            fontSize: '14px', color: 'var(--text-secondary)', padding: '0',
          }}
        >
          ← Retour
        </button>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)' }}>
          nouvelle reco
        </span>
        <div style={{ width: '60px' }} />
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px' }}>

        {/* ---- QUOTA ATTEINT ---- */}
        {quotaAtteint && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)', padding: '16px',
            textAlign: 'center', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '24px', marginBottom: '6px' }}>⏳</p>
            <p style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>
              Tu as déjà partagé ta reco cette semaine
            </p>
            <p style={{ fontSize: '13px', color: '#b45309', marginTop: '4px' }}>
              Reviens lundi prochain !
            </p>
          </div>
        )}

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
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: type === t.value ? 'var(--accent)' : 'transparent',
                  color: type === t.value ? '#fff' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- RECHERCHE API ---- */}
        {!quotaAtteint && (
          <div style={{ marginBottom: '8px' }}>
            {type === 'film' && <RechercheTMDB onSelect={handleSelect} />}
            {type === 'musique' && <RechercheMusique onSelect={handleSelect} />}
            {type === 'podcast' && <RecherchePodcasts onSelect={handleSelect} />}
            {type === 'livre' && <RechercheLivres onSelect={handleSelect} />}
            {type === 'youtube' && <RechercheYouTube onSelect={handleSelect} />}
          </div>
        )}

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
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{title}</p>
              {creator && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{creator}</p>}
            </div>
            <button
              onClick={() => { setTitle(''); setCreator(''); setUrl(''); setPosterUrl('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--text-muted)',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ---- SAISIE MANUELLE (types sans API) ---- */}
        {!TYPES_AVEC_API.includes(type) && !quotaAtteint && (
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

            {/* Auteur */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '6px',
              }}>
                Auteur / Studio
              </label>
              <input
                type="text"
                value={creator}
                onChange={e => setCreator(e.target.value)}
                placeholder="optionnel"
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
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
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
        {!quotaAtteint && (
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
        )}

        {/* Message erreur */}
        {message && (
          <p style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', marginBottom: '16px' }}>
            {message}
          </p>
        )}

        {/* ---- BOUTON PUBLIER ---- */}
        <button
          onClick={soumettre}
          disabled={saving || quotaAtteint}
          style={{
            width: '100%', padding: '13px',
            background: quotaAtteint ? 'var(--bg-secondary)' : 'var(--accent)',
            color: quotaAtteint ? 'var(--text-muted)' : '#fff',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: '15px', fontWeight: 600,
            cursor: quotaAtteint ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Publication...' : '🎉 Partager ma reco'}
        </button>

      </main>
    </div>
  )
}