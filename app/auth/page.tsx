'use client'
// ============================================
// PAGE AUTHENTIFICATION + ONBOARDING
// Flow en 3 étapes :
// 1. Email / mot de passe
// 2. Choix du pseudo (@ définitif)
// 3. Premières recommandations
// ============================================

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RechercheTMDB from '@/components/RechercheTMDB'
import RechercheMusique from '@/components/RechercheMusique'
import RechercheLivres from '@/components/RechercheLivres'
import RecherchePodcasts from '@/components/RecherchePodcasts'
import RechercheYouTube from '@/components/RechercheYouTube'
import TypeIcon from '@/components/TypeIcon'
import { Check } from 'lucide-react'

// --- Types disponibles pour les premières recos ---
const TYPES = [
  { value: 'film',      label: 'Film / Série', emoji: '🎬' },
  { value: 'musique',   label: 'Musique',      emoji: '🎵' },
  { value: 'podcast',   label: 'Podcast',      emoji: '🎙️' },
  { value: 'livre',     label: 'Livre',        emoji: '📚' },
  { value: 'youtube',   label: 'YouTube',      emoji: '▶️' },
  { value: 'autre',     label: 'Autre',        emoji: '✨' },
]

// --- Une reco vide par défaut ---
const recoVide = () => ({
  type: 'film', title: '', creator: '', url: '', posterUrl: '', comment: ''
})

export default function AuthPage() {
  // --- Étape courante : 'login' | 'inscription' | 'pseudo' | 'recos' ---
  const [etape, setEtape] = useState<'login' | 'inscription' | 'pseudo' | 'recos'>('login')

  // --- Étape 1 : email / mot de passe ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // --- Étape 2 : pseudo ---
  const [pseudo, setPseudo] = useState('')
  const [pseudoDisponible, setPseudoDisponible] = useState<boolean | null>(null)
  const [checkingPseudo, setCheckingPseudo] = useState(false)

  // --- Étape 3 : premières recos ---
  // On propose 3 slots de recos à remplir
  const [recos, setRecos] = useState([recoVide(), recoVide(), recoVide()])
  const [recoActive, setRecoActive] = useState(0) // index de la reco en cours

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // ============================================
  // ÉTAPE 1 — CONNEXION
  // ============================================
const handleLogin = async () => {
  if (!email || !password) { setMessage('Remplis tous les champs'); return }
  setLoading(true)
  setMessage('')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    setMessage('Email ou mot de passe incorrect')
  } else if (data.user) {
    // Vérifie si le profil existe déjà
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    // Si profil existe → feed, sinon → onboarding
    if (profile) router.push('/')
    else { setUser(data.user); setEtape('pseudo') }
  }
  setLoading(false)
}

  // ============================================
  // ÉTAPE 1 — INSCRIPTION
  // ============================================
  const handleInscription = async () => {
    if (!email || !password) { setMessage('Remplis tous les champs'); return }
    if (password.length < 6) { setMessage('Mot de passe trop court (6 caractères min)'); return }
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else if (data.user) {
      setUser(data.user)
      setEtape('pseudo')
    }
    setLoading(false)
  }

  // ============================================
  // ÉTAPE 2 — VÉRIFICATION DU PSEUDO
  // ============================================
  const verifierPseudo = async (valeur: string) => {
    setPseudo(valeur)
    setPseudoDisponible(null)
    if (valeur.length < 3) return

    setCheckingPseudo(true)
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', valeur.toLowerCase())
      .limit(1)

    setPseudoDisponible(!data || data.length === 0)
    setCheckingPseudo(false)
  }

  const validerPseudo = async () => {
    if (!pseudo || !pseudoDisponible) return
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: pseudo.toLowerCase() })

    if (error) setMessage('Erreur : ' + error.message)
    else setEtape('recos')
    setLoading(false)
  }

  // ============================================
  // ÉTAPE 3 — GESTION DES RECOS
  // ============================================
  const updateReco = (index: number, champs: Partial<typeof recos[0]>) => {
    setRecos(prev => prev.map((r, i) => i === index ? { ...r, ...champs } : r))
  }

  const handleSelectReco = (index: number) => (resultat: {
    title: string, creator: string, url: string, posterUrl: string
  }) => {
    updateReco(index, resultat)
  }

  // --- Sauvegarde les recos remplies et redirige vers le feed ---
  const terminerOnboarding = async () => {
    setLoading(true)

    // Ne sauvegarde que les recos avec un titre
    const recosRemplies = recos.filter(r => r.title.trim())

    if (recosRemplies.length > 0) {
      await supabase.from('recommendations').insert(
        recosRemplies.map(r => ({
          user_id: user.id,
          type: r.type,
          title: r.title.trim(),
          creator: r.creator || null,
          url: r.url || null,
          comment: r.comment || null,
          poster_url: r.posterUrl || null,
        }))
      )
    }

    router.push('/')
    setLoading(false)
  }

  // ============================================
  // RENDU
  // ============================================
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '40px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* ---- Logo ---- */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            recos
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {etape === 'login' ? 'Content de te revoir' :
             etape === 'inscription' ? 'Crée ton compte' :
             etape === 'pseudo' ? 'Choisis ton @' :
             'Tes premiers coups de cœur'}
          </p>
        </div>

        {/* ======================================
            ÉTAPE 1A — CONNEXION
        ====================================== */}
        {etape === 'login' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '15px', outline: 'none', color: 'var(--text-primary)',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '15px', outline: 'none', color: 'var(--text-primary)',
                }}
              />
            </div>

            {message && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{message}</p>}

            <button onClick={handleLogin} disabled={loading} style={{
              width: '100%', padding: '13px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              marginBottom: '16px',
            }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
              Pas encore de compte ?{' '}
              <button onClick={() => { setEtape('inscription'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 600, fontSize: '14px',
              }}>
                S'inscrire
              </button>
            </p>
          </div>
        )}

        {/* ======================================
            ÉTAPE 1B — INSCRIPTION
        ====================================== */}
        {etape === 'inscription' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '15px', outline: 'none', color: 'var(--text-primary)',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe (6 caractères min)"
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '15px', outline: 'none', color: 'var(--text-primary)',
                }}
              />
            </div>

            {message && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{message}</p>}

            <button onClick={handleInscription} disabled={loading} style={{
              width: '100%', padding: '13px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              marginBottom: '16px',
            }}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
              Déjà un compte ?{' '}
              <button onClick={() => { setEtape('login'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 600, fontSize: '14px',
              }}>
                Se connecter
              </button>
            </p>
          </div>
        )}

        {/* ======================================
            ÉTAPE 2 — CHOIX DU PSEUDO
        ====================================== */}
        {etape === 'pseudo' && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
              Ton @ est définitif — c'est ce que tes amis utiliseront pour te trouver.
            </p>

            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500,
              }}>@</span>
              <input
                type="text"
                value={pseudo}
                onChange={e => verifierPseudo(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                placeholder="tonpseudo"
                style={{
                  width: '100%', padding: '12px 14px 12px 28px',
                  border: `1px solid ${
                    pseudoDisponible === true ? '#22c55e' :
                    pseudoDisponible === false ? '#ef4444' :
                    'var(--border)'
                  }`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '15px', outline: 'none', color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Feedback disponibilité */}
            {pseudo.length >= 3 && (
              <p style={{
                fontSize: '13px', marginBottom: '16px',
                color: checkingPseudo ? 'var(--text-muted)' :
                       pseudoDisponible ? '#22c55e' : '#ef4444',
              }}>
                {checkingPseudo ? 'Vérification...' :
                 pseudoDisponible ? '✓ @' + pseudo + ' est disponible' :
                 '✗ Ce pseudo est déjà pris'}
              </p>
            )}

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Lettres minuscules, chiffres, points et underscores uniquement.
            </p>

            <button
              onClick={validerPseudo}
              disabled={!pseudoDisponible || loading}
              style={{
                width: '100%', padding: '13px',
                background: pseudoDisponible ? 'var(--accent)' : 'var(--bg-secondary)',
                color: pseudoDisponible ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 'var(--radius-full)',
                fontSize: '15px', fontWeight: 600,
                cursor: pseudoDisponible ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Sauvegarde...' : 'Choisir ce pseudo →'}
            </button>
          </div>
        )}

        {/* ======================================
    ÉTAPE 3 — PREMIÈRES RECOS
====================================== */}
{etape === 'recos' && (
  <div>
    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.6' }}>
      Partage 1 à 3 coups de cœur récents pour démarrer ton feed.
    </p>
    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
      Tu pourras en ajouter d'autres plus tard (1 par semaine).
    </p>

    {/* Liste des recos déjà remplies */}
    {recos.filter(r => r.title).length > 0 && (
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recos.map((reco, i) => reco.title ? (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
          }}>
            {reco.posterUrl && (
              <img src={reco.posterUrl} alt={reco.title}
                style={{ width: '28px', height: '38px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />
            )}
            {!reco.posterUrl && (
              <div style={{
                width: '28px', height: '28px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <TypeIcon type={reco.type} size={16} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {reco.title}
              </p>
              {reco.creator && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reco.creator}</p>
              )}
            </div>
            <button
              onClick={() => updateReco(i, recoVide())}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', flexShrink: 0 }}
            >✕</button>
          </div>
        ) : null)}
      </div>
    )}

    {/* Formulaire pour la prochaine reco à remplir */}
    {(() => {
      const prochainIndex = recos.findIndex(r => !r.title)
      if (prochainIndex === -1) return null // toutes remplies

      const reco = recos[prochainIndex]
      return (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px', marginBottom: '16px',
        }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
          }}>
            Reco {recos.filter(r => r.title).length + 1}
          </p>

          {/* Sélecteur de type */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => updateReco(prochainIndex, { type: t.value, title: '', creator: '', url: '', posterUrl: '' })}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${reco.type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: reco.type === t.value ? 'var(--accent)' : 'transparent',
                  color: reco.type === t.value ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Recherche API */}
          {reco.type === 'film' && <RechercheTMDB onSelect={handleSelectReco(prochainIndex)} />}
          {reco.type === 'musique' && <RechercheMusique onSelect={handleSelectReco(prochainIndex)} />}
          {reco.type === 'podcast' && <RecherchePodcasts onSelect={handleSelectReco(prochainIndex)} />}
          {reco.type === 'livre' && <RechercheLivres onSelect={handleSelectReco(prochainIndex)} />}
          {reco.type === 'youtube' && <RechercheYouTube onSelect={handleSelectReco(prochainIndex)} />}

          {/* Aperçu si sélectionné */}
          {reco.title && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
              padding: '10px 12px', marginBottom: '12px',
            }}>
              {reco.posterUrl && (
                <img src={reco.posterUrl} alt={reco.title}
                  style={{ width: '32px', height: '44px', objectFit: 'cover', borderRadius: '4px' }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{reco.title}</p>
                {reco.creator && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reco.creator}</p>}
              </div>
              <button
                onClick={() => updateReco(prochainIndex, recoVide())}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
              >✕</button>
            </div>
          )}

          {/* Saisie manuelle pour "autre" */}
          {reco.type === 'autre' && (
            <input
              type="text"
              value={reco.title}
              onChange={e => updateReco(prochainIndex, { title: e.target.value })}
              placeholder="Titre de ta recommandation..."
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '14px', outline: 'none', marginBottom: '12px',
                color: 'var(--text-primary)',
              }}
            />
          )}

          {/* Commentaire */}
          <textarea
            value={reco.comment}
            onChange={e => updateReco(prochainIndex, { comment: e.target.value })}
            placeholder="Pourquoi tu recommandes ça ? (optionnel)"
            rows={2}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontSize: '13px', outline: 'none', resize: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: '1.5',
            }}
          />
        </div>
      )
    })()}

    {/* Bouton terminer */}
    <button
      onClick={terminerOnboarding}
      disabled={loading}
      style={{
        width: '100%', padding: '13px',
        background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 'var(--radius-full)',
        fontSize: '15px', fontWeight: 600, cursor: 'pointer',
      }}
    >
      {loading ? 'Sauvegarde...' : recos.some(r => r.title) ? '🎉 Allons-y !' : 'Passer cette étape →'}
    </button>

  </div>
)}

      </div>
    </div>
  )
}