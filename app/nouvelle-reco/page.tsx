'use client'
// ============================================
// PAGE NOUVELLE RECOMMANDATION
// Permet de poster une reco culturelle
// Vérifie le quota : 1 reco max par semaine
// Pour l'instant : saisie manuelle du titre
// (les APIs TMDB, YouTube etc. seront
//  intégrées dans une prochaine étape)
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- Liste des types de recommandations disponibles ---
const TYPES = [
  { value: 'film',      label: 'Film',      emoji: '🎬' },
  { value: 'serie',     label: 'Série',     emoji: '📺' },
  { value: 'musique',   label: 'Musique',   emoji: '🎵' },
  { value: 'podcast',   label: 'Podcast',   emoji: '🎙️' },
  { value: 'livre',     label: 'Livre',     emoji: '📚' },
  { value: 'jeu',       label: 'Jeu vidéo', emoji: '🎮' },
  { value: 'youtube',   label: 'YouTube',   emoji: '▶️' },
  { value: 'spectacle', label: 'Spectacle', emoji: '🎭' },
  { value: 'autre',     label: 'Autre',     emoji: '✨' },
]

export default function NouvelleReco() {
  // --- États du formulaire ---
  const [user, setUser] = useState<any>(null)
  const [type, setType] = useState('film')
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [url, setUrl] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [quotaAtteint, setQuotaAtteint] = useState(false)
  const router = useRouter()

  // --- Au chargement : vérifie connexion + quota hebdomadaire ---
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

  // --- Vérifie si l'utilisateur a déjà posté une reco cette semaine ---
  // La semaine commence le lundi à 00h00
  const verifierQuota = async (userId: string) => {
    // Calcule le début de la semaine courante (lundi)
    const maintenant = new Date()
    const jourSemaine = maintenant.getDay() // 0=dimanche, 1=lundi...
    const diffLundi = (jourSemaine === 0 ? -6 : 1 - jourSemaine)
    const lundi = new Date(maintenant)
    lundi.setDate(maintenant.getDate() + diffLundi)
    lundi.setHours(0, 0, 0, 0)

    // Cherche une reco postée après ce lundi
    const { data } = await supabase
      .from('recommendations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', lundi.toISOString())
      .limit(1)

    if (data && data.length > 0) {
      setQuotaAtteint(true)
    }
  }

  // --- Soumet la nouvelle recommandation ---
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
      // Reco postée avec succès → retour au feed
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
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600"
        >
          ← Retour
        </button>
        <h1 className="text-lg font-bold">Nouvelle reco</h1>
        <div className="w-12" /> {/* Espace vide pour centrer le titre */}
      </header>

      <main className="max-w-lg mx-auto py-6 px-4">

        {/* ---- BLOC QUOTA ATTEINT ---- */}
        {/* Affiché si l'utilisateur a déjà posté cette semaine */}
        {quotaAtteint && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-2xl mb-1">⏳</p>
            <p className="font-medium text-amber-800">Tu as déjà partagé ta reco cette semaine</p>
            <p className="text-sm text-amber-600 mt-1">
              Reviens lundi prochain pour partager un nouveau coup de cœur !
            </p>
          </div>
        )}

        {/* ---- FORMULAIRE ---- */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">

          {/* Sélecteur de type — grille de boutons */}
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

          {/* Titre — obligatoire */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                type === 'film' ? 'ex: Parasite' :
                type === 'musique' ? 'ex: Random Access Memories' :
                type === 'livre' ? 'ex: L\'Étranger' :
                type === 'podcast' ? 'ex: Splash' :
                'Titre...'
              }
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
              disabled={quotaAtteint}
            />
          </div>

          {/* Auteur / Artiste / Réalisateur — optionnel */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'film' || type === 'serie' ? 'Réalisateur·ice' :
               type === 'musique' ? 'Artiste' :
               type === 'livre' ? 'Auteur·ice' :
               type === 'podcast' ? 'Créateur·ice' :
               'Auteur / Artiste'}
              <span className="text-gray-400 font-normal"> (optionnel)</span>
            </label>
            <input
              type="text"
              value={creator}
              onChange={e => setCreator(e.target.value)}
              placeholder="ex: Bong Joon-ho"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
              disabled={quotaAtteint}
            />
          </div>

          {/* Lien externe — optionnel */}
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

          {/* Commentaire personnel — le cœur de la reco */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ton commentaire
              <span className="text-gray-400 font-normal"> (optionnel mais recommandé !)</span>
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

          {/* Bouton soumettre */}
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