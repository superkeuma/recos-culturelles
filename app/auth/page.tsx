'use client'
// ============================================
// PAGE AUTHENTIFICATION + ONBOARDING
// Flow en 3 étapes :
// 1. Email / mot de passe
// 2. Choix du pseudo (@ définitif)
// 3. Premières recommandations
// ============================================

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RechercheTMDB from '@/components/RechercheTMDB'
import RechercheMusique from '@/components/RechercheMusique'
import RechercheLivres from '@/components/RechercheLivres'
import RecherchePodcasts from '@/components/RecherchePodcasts'
import RechercheYouTube from '@/components/RechercheYouTube'
import TypeIcon from '@/components/TypeIcon'

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
  const [etape, setEtape] = useState<'login' | 'inscription' | 'pseudo' | 'recos' | 'reset'>('login')

  // --- Étape 1 : email / mot de passe ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // --- Étape 2 : pseudo ---
  const [pseudo, setPseudo] = useState('')
  const [pseudoDisponible, setPseudoDisponible] = useState<boolean | null>(null)
  const [checkingPseudo, setCheckingPseudo] = useState(false)

  // --- Étape 3 : premières recos ---
  // On propose 3 slots de recos à remplir
  const [recos, setRecos] = useState([recoVide(), recoVide(), recoVide()])

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // ============================================
  // RESET MOT DE PASSE
  // ============================================
  const handleReset = async () => {
    if (!email) { setMessage("Saisis ton email"); return }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    setLoading(false)
    if (error) setMessage("Erreur : " + error.message)
    else setMessage('✓ Email envoyé ! Vérifie ta boîte mail.')
  }

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
  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'
  const RED = '#FF2D55'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `2px solid ${INK}`, borderRadius: '2px',
    fontSize: '15px', outline: 'none', color: INK,
    background: '#FAFAF0', fontFamily: 'var(--font)',
    boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px',
    background: YELLOW, color: INK,
    border: `2px solid ${INK}`, borderRadius: '2px',
    boxShadow: `4px 4px 0 ${INK}`,
    fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em',
    cursor: 'pointer', textTransform: 'uppercase',
    marginBottom: '16px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF0',
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '48px 20px 40px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* ---- Logo ---- */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src="/icon.png" alt="reco reco" style={{ height: '96px' }} />
          </div>
          {(etape === 'login' || etape === 'inscription') && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '15px', color: INK, lineHeight: '1.7', marginBottom: '6px', fontStyle: 'italic', opacity: 0.7 }}>
                reco reco est une application de recommandations culturelles.
              </p>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '15px', color: INK, lineHeight: '1.7', marginBottom: '6px', fontStyle: 'italic', opacity: 0.7 }}>
                Les coups de cœur de tes contacts. Rien de plus. Rien de moins.
              </p>
              <p style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, color: INK, lineHeight: '1.7' }}>
                Pas de likes. Pas de bruit. Pas d'algo.<br />Juste des recos.
              </p>
            </div>
          )}
          {(etape === 'pseudo' || etape === 'recos') && (
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontStyle: 'italic', color: INK, opacity: 0.6, marginTop: '6px' }}>
              {etape === 'pseudo' ? 'Choisis ton @' : 'Tes premiers coups de cœur'}
            </p>
          )}
        </div>

        {/* ======================================
            ÉTAPE 1A — CONNEXION
        ====================================== */}
        {etape === 'login' && (
          <div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" style={{ ...inputStyle, marginBottom: '10px' }} />
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ ...inputStyle, paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'flex', padding: 0, opacity: 0.4,
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {message && <p style={{ color: RED, fontSize: '13px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>{message}</p>}

            <button onClick={handleLogin} disabled={loading} style={btnPrimary}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: INK, marginBottom: '10px', opacity: 0.6 }}>
              Pas encore de compte ?{' '}
              <button onClick={() => { setEtape('inscription'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: INK, fontWeight: 700, fontSize: '13px', textDecoration: 'underline',
              }}>S'inscrire</button>
            </p>
            <p style={{ textAlign: 'center' }}>
              <button onClick={() => { setEtape('reset'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: INK, fontSize: '12px', opacity: 0.4, textDecoration: 'underline',
              }}>Mot de passe oublié ?</button>
            </p>
          </div>
        )}

        {/* ======================================
            ÉTAPE RESET
        ====================================== */}
        {etape === 'reset' && (
          <div>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontStyle: 'italic', color: INK, opacity: 0.6, textAlign: 'center', marginBottom: '20px', lineHeight: '1.6' }}>
              Saisis ton email et on t'envoie un lien pour réinitialiser ton mot de passe.
            </p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" onKeyDown={e => e.key === 'Enter' && handleReset()}
              style={{ ...inputStyle, marginBottom: '16px' }} />
            {message && (
              <p style={{ color: message.startsWith('✓') ? '#22c55e' : RED, fontSize: '13px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>
                {message}
              </p>
            )}
            <button onClick={handleReset} disabled={loading} style={btnPrimary}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <p style={{ textAlign: 'center' }}>
              <button onClick={() => { setEtape('login'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: INK, fontSize: '12px', opacity: 0.4, textDecoration: 'underline',
              }}>Retour à la connexion</button>
            </p>
          </div>
        )}

        {/* ======================================
            ÉTAPE 1B — INSCRIPTION
        ====================================== */}
        {etape === 'inscription' && (
          <div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" style={{ ...inputStyle, marginBottom: '10px' }} />
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères min)"
                style={{ ...inputStyle, paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'flex', padding: 0, opacity: 0.4,
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {message && <p style={{ color: RED, fontSize: '13px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>{message}</p>}

            <button onClick={handleInscription} disabled={loading} style={btnPrimary}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: INK, opacity: 0.6 }}>
              Déjà un compte ?{' '}
              <button onClick={() => { setEtape('login'); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: INK, fontWeight: 700, fontSize: '13px', textDecoration: 'underline',
              }}>Se connecter</button>
            </p>
          </div>
        )}

        {/* ======================================
            ÉTAPE 2 — CHOIX DU PSEUDO
        ====================================== */}
        {etape === 'pseudo' && (
          <div>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontStyle: 'italic', color: INK, opacity: 0.6, marginBottom: '20px', lineHeight: '1.6' }}>
              Ton @ est définitif — c'est ce que tes amis utiliseront pour te trouver.
            </p>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: INK, fontWeight: 700 }}>@</span>
              <input type="text" value={pseudo}
                onChange={e => verifierPseudo(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                placeholder="tonpseudo"
                style={{
                  ...inputStyle, paddingLeft: '28px',
                  border: `2px solid ${pseudoDisponible === true ? '#22c55e' : pseudoDisponible === false ? RED : INK}`,
                }}
              />
            </div>
            {pseudo.length >= 3 && (
              <p style={{ fontSize: '12px', marginBottom: '16px', fontWeight: 700,
                color: checkingPseudo ? INK : pseudoDisponible ? '#22c55e' : RED, opacity: checkingPseudo ? 0.4 : 1 }}>
                {checkingPseudo ? 'Vérification...' : pseudoDisponible ? '✓ @' + pseudo + ' est disponible' : '✗ Ce pseudo est déjà pris'}
              </p>
            )}
            <p style={{ fontSize: '11px', color: INK, opacity: 0.4, marginBottom: '20px', letterSpacing: '0.04em' }}>
              Lettres minuscules, chiffres, points et underscores uniquement.
            </p>
            <button onClick={validerPseudo} disabled={!pseudoDisponible || loading} style={{
              ...btnPrimary,
              background: pseudoDisponible ? YELLOW : '#e0e0d0',
              boxShadow: pseudoDisponible ? `4px 4px 0 ${INK}` : 'none',
              cursor: pseudoDisponible ? 'pointer' : 'not-allowed',
            }}>
              {loading ? 'Sauvegarde...' : 'Choisir ce pseudo →'}
            </button>
          </div>
        )}

        {/* ======================================
            ÉTAPE 3 — PREMIÈRES RECOS
        ====================================== */}
        {etape === 'recos' && (
          <div>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontStyle: 'italic', color: INK, opacity: 0.6, marginBottom: '24px', lineHeight: '1.6' }}>
              Partage 1 à 3 coups de cœur récents pour démarrer ton feed.
            </p>

            {recos.filter(r => r.title).length > 0 && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recos.map((reco, i) => reco.title ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`, borderRadius: '2px', padding: '10px 12px' }}>
                    {reco.posterUrl ? (
                      <img src={reco.posterUrl} alt={reco.title} style={{ width: '28px', height: '38px', objectFit: 'cover', borderRadius: '2px', border: `1px solid ${INK}`, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
                        <TypeIcon type={reco.type} size={16} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-title)' }}>{reco.title}</p>
                      {reco.creator && <p style={{ fontSize: '11px', color: INK, opacity: 0.5 }}>{reco.creator}</p>}
                    </div>
                    <button onClick={() => updateReco(i, recoVide())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, opacity: 0.4, fontSize: '16px', flexShrink: 0 }}>✕</button>
                  </div>
                ) : null)}
              </div>
            )}

            {(() => {
              const prochainIndex = recos.findIndex(r => !r.title)
              if (prochainIndex === -1) return null
              const reco = recos[prochainIndex]
              return (
                <div style={{ border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', opacity: 0.5 }}>
                    Reco {recos.filter(r => r.title).length + 1}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {TYPES.map(t => (
                      <button key={t.value} onClick={() => updateReco(prochainIndex, { type: t.value, title: '', creator: '', url: '', posterUrl: '' })} style={{
                        padding: '5px 11px', borderRadius: '2px',
                        border: `2px solid ${INK}`,
                        background: reco.type === t.value ? YELLOW : 'transparent',
                        color: INK, fontSize: '11px', fontWeight: 700,
                        cursor: 'pointer', letterSpacing: '0.04em',
                        boxShadow: reco.type === t.value ? `2px 2px 0 ${INK}` : 'none',
                      }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {reco.type === 'film' && <RechercheTMDB onSelect={handleSelectReco(prochainIndex)} />}
                  {reco.type === 'musique' && <RechercheMusique onSelect={handleSelectReco(prochainIndex)} />}
                  {reco.type === 'podcast' && <RecherchePodcasts onSelect={handleSelectReco(prochainIndex)} />}
                  {reco.type === 'livre' && <RechercheLivres onSelect={handleSelectReco(prochainIndex)} />}
                  {reco.type === 'youtube' && <RechercheYouTube onSelect={handleSelectReco(prochainIndex)} />}
                  {reco.title && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FAFAF0', border: `1.5px solid ${INK}`, borderRadius: '2px', padding: '10px 12px', marginBottom: '12px' }}>
                      {reco.posterUrl && <img src={reco.posterUrl} alt={reco.title} style={{ width: '32px', height: '44px', objectFit: 'cover', borderRadius: '2px', border: `1px solid ${INK}` }} />}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: INK, fontFamily: 'var(--font-title)' }}>{reco.title}</p>
                        {reco.creator && <p style={{ fontSize: '11px', color: INK, opacity: 0.5 }}>{reco.creator}</p>}
                      </div>
                      <button onClick={() => updateReco(prochainIndex, recoVide())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, opacity: 0.4, fontSize: '14px' }}>✕</button>
                    </div>
                  )}
                  {reco.type === 'autre' && (
                    <input type="text" value={reco.title} onChange={e => updateReco(prochainIndex, { title: e.target.value })}
                      placeholder="Titre de ta recommandation..."
                      style={{ width: '100%', padding: '10px 12px', border: `2px solid ${INK}`, borderRadius: '2px', fontSize: '14px', outline: 'none', marginBottom: '12px', color: INK, background: '#FAFAF0', fontFamily: 'var(--font)', boxSizing: 'border-box' }} />
                  )}
                  <textarea value={reco.comment} onChange={e => updateReco(prochainIndex, { comment: e.target.value })}
                    placeholder="Pourquoi tu recommandes ça ? (optionnel)" rows={2}
                    style={{ width: '100%', padding: '10px 12px', border: `2px solid ${INK}`, borderRadius: '2px', fontSize: '13px', outline: 'none', resize: 'none', color: INK, fontFamily: 'var(--font)', lineHeight: '1.5', background: '#FAFAF0', boxSizing: 'border-box' }} />
                </div>
              )
            })()}

            <button onClick={terminerOnboarding} disabled={loading} style={btnPrimary}>
              {loading ? 'Sauvegarde...' : recos.some(r => r.title) ? 'Allons-y !' : 'Passer cette étape →'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}