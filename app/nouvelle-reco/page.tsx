'use client'
// ============================================
// PAGE NOUVELLE RECOMMANDATION — v2
// Même fonctionnalité qu'avant + intégration
// des APIs externes :
// - TMDB pour films et séries (avec recherche)
// - Saisie manuelle pour les autres types
// Les APIs YouTube, Spotify etc. seront
// ajoutées de la même façon ensuite.
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import RechercheTMDB from '@/components/RechercheTMDB'
import RechercheMusique from '@/components/RechercheMusique'
import RechercheLivres from '@/components/RechercheLivres'
import RecherchePodcasts from '@/components/RecherchePodcasts'

// --- Liste des types de recommandations ---
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

export default function NouvelleReco() {
  // --- États du formulaire ---
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

  // --- Au chargement : vérifie connexion + quota ---
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await verifierQuota(user.id)
      setLoading(false)
    }
    load()
  }, [])

  // --- Quand on change de type, on vide les champs ---
  // Évite d'avoir des données d'un film dans une reco musique
  useEffect(() => {
    setTitle('')
    setCreator('')
    setUrl('')
    setPosterUrl('')
  }, [type])

  // --- Vérifie le quota hebdomadaire (1 reco par semaine) ---
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

  // --- Appelé quand l'utilisateur sélectionne un résultat TMDB ---
  // Remplit automatiquement les champs titre, année, url, poster
  const handleSelectTMDB = (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => {
    setTitle(resultat.title)
    setCreator(resultat.creator)
    setUrl(resultat.url)
    setPosterUrl(resultat.posterUrl)
  }

  // --- Soumet la recommandation ---
  const soumettre = async () => {
    if (!title.trim()) {
      setMessage('Le titre est obligatoire')
      return
    }
    if (quotaAtteint) {
      setMessage('Tu as déjà posté ta reco cette semaine !')
      return
    }

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
      })

    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      router.push('/')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ---- HEADER ---- */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          ← Retour
        </button>
        <h1 className="text-lg font-bold">Nouvelle reco</h1>
        <div className="w-12" />
      </header>

      <main className="max-w-lg mx-auto py-6 px-4">

        {/* ---- QUOTA ATTEINT ---- */}
        {quotaAtteint && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-2xl mb-1">⏳</p>
            <p className="font-medium text-amber-800">Tu as déjà partagé ta reco cette semaine</p>
            <p className="text-sm text-amber-600 mt-1">
              Reviens lundi prochain pour partager un nouveau coup de cœur !
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border">

          {/* ---- SÉLECTEUR DE TYPE ---- */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de recommandation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`py-2 px-3 rounded-lg text-sm border transition ${
                    type === t.value
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ---- RECHERCHE TMDB (films et séries uniquement) ---- */}
          {/* Pour les autres types, on garde la saisie manuelle */}
    {type === 'film' && !quotaAtteint && (
  <RechercheTMDB
    onSelect={handleSelectTMDB}
  />
)}

    {type === 'musique' && !quotaAtteint && (
    <RechercheMusique
        onSelect={handleSelectTMDB}
    />
    )}

    {type === 'livre' && !quotaAtteint && (
            <RechercheLivres
                onSelect={handleSelectTMDB}
            />
            )}


            {type === 'podcast' && !quotaAtteint && (
  <RecherchePodcasts
    onSelect={handleSelectTMDB}
  />
)}
          {/* ---- APERÇU DE L'AFFICHE (si sélection TMDB) ---- */}
          {posterUrl && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <img
                src={posterUrl}
                alt={title}
                className="w-12 h-18 object-cover rounded"
              />
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-gray-400">{creator}</p>
                <button
                  onClick={() => { setTitle(''); setCreator(''); setUrl(''); setPosterUrl('') }}
                  className="text-xs text-gray-300 hover:text-red-400 mt-1"
                >
                  Changer
                </button>
              </div>
            </div>
          )}

          {/* ---- CHAMPS MANUELS ---- */}
          {/* Toujours visibles pour les types sans API */}
          {/* Masqués pour film/série si une affiche est déjà sélectionnée */}
{!(type === 'film') && !(type === 'musique') && !(type === 'livre') && !(type === 'podcast') && (

            <div>
              {/* Titre */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={
                    type === 'musique' ? 'ex: Random Access Memories' :
                    type === 'livre' ? "ex: L'Étranger" :
                    type === 'podcast' ? 'ex: Splash' :
                    type === 'youtube' ? 'ex: Nom de la chaîne ou vidéo' :
                    type === 'spectacle' ? 'ex: Hamilton' :
                    'Titre...'
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  disabled={quotaAtteint}
                />
              </div>

              {/* Auteur / Artiste */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === 'musique' ? 'Artiste' :
                   type === 'livre' ? 'Auteur·ice' :
                   type === 'podcast' ? 'Créateur·ice' :
                   type === 'youtube' ? 'Chaîne' :
                   'Auteur / Artiste'}
                  <span className="text-gray-400 font-normal"> (optionnel)</span>
                </label>
                <input
                  type="text"
                  value={creator}
                  onChange={e => setCreator(e.target.value)}
                  placeholder="ex: Daft Punk"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  disabled={quotaAtteint}
                />
              </div>

              {/* Lien */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lien
                  <span className="text-gray-400 font-normal"> (optionnel)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  disabled={quotaAtteint}
                />
              </div>
            </div>
          )}

          {/* ---- COMMENTAIRE PERSONNEL ---- */}
          {/* Toujours visible — c'est le cœur de la reco */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ton commentaire
              <span className="text-gray-400 font-normal"> (recommandé !)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Pourquoi tu recommandes ça ? Ce qui t'a touché, surpris, marqué..."
              rows={3}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
              disabled={quotaAtteint}
            />
          </div>

          {/* Message d'erreur */}
          {message && (
            <p className="text-sm text-red-400 text-center mb-4">{message}</p>
          )}

          {/* ---- BOUTON SOUMETTRE ---- */}
          <button
            onClick={soumettre}
            disabled={saving || quotaAtteint}
            className={`w-full py-2 rounded-lg font-medium transition ${
              quotaAtteint
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {saving ? 'Publication...' : '🎉 Partager ma reco'}
          </button>

        </div>
      </main>

      {/* ---- BARRE DE NAVIGATION BAS ---- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 max-w-lg mx-auto">
        <button onClick={() => router.push('/')} className="text-2xl">🏠</button>
        <button onClick={() => router.push('/nouvelle-reco')} className="text-2xl">➕</button>
        <button onClick={() => router.push('/sauvegardes')} className="text-2xl">🔖</button>
        <button onClick={() => router.push('/contacts')} className="text-2xl">👥</button>
        <button onClick={() => router.push('/profil')} className="text-2xl">👤</button>
      </nav>

    </div>
  )
}