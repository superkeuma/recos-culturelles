'use client'
// ============================================
// PAGE D'ACCUEIL — LE FEED
// Affiche les recommandations des contacts
// de l'utilisateur connecté, par ordre
// chronologique inverse (les plus récentes en haut)
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- Correspondance entre type de reco et emoji affiché ---
const TYPE_EMOJI: Record<string, string> = {
  musique: '🎵',
  film: '🎬',
  livre: '📚',
  podcast: '🎙️',
  serie: '📺',
  jeu: '🎮',
  youtube: '▶️',
  spectacle: '🎭',
  autre: '✨',
}

export default function Feed() {
  // --- États locaux ---
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  // --- Au chargement : vérifie si l'utilisateur est connecté ---
  // Si non connecté → redirige vers /auth
  // Si connecté → charge les recommandations
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      fetchRecommendations(user.id)
    }
    getUser()
  }, [])

  // --- Charge les recos des contacts suivis par l'utilisateur ---
  // Étapes :
  // 1. Récupère la liste des gens que l'utilisateur suit
  // 2. Récupère leurs recommandations de la semaine en cours
  const fetchRecommendations = async (userId: string) => {
    // Étape 1 : qui est-ce que je suis ?
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    // Récupère les IDs des contacts + inclut ses propres recos
    const followingIds = followData?.map(f => f.following_id) || []
    const allIds = [...followingIds, userId]

    // Étape 2 : récupère leurs recos (toutes, pas seulement cette semaine)
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        profiles(username, full_name)
      `)
      .in('user_id', allIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) setRecommendations(data)
    setLoading(false)
  }

  // --- Sauvegarde une recommandation dans "Ma liste" ---
  const saveReco = async (recoId: string) => {
    await supabase
      .from('saved_recommendations')
      .insert({ user_id: user.id, recommendation_id: recoId })
  }

  // --- Déconnexion ---
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // --- Affichage pendant le chargement ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  )

  // --- Rendu principal ---
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- HEADER ---- */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center max-w-lg mx-auto sticky top-0 z-10">
        <h1 className="text-lg font-bold">🎵 Recos Culturelles</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => router.push('/nouvelle-reco')}
            className="bg-black text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            + Recommander
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Déco
          </button>
        </div>
      </header>

      {/* ---- CONTENU PRINCIPAL ---- */}
      <main className="max-w-lg mx-auto py-6 px-4">

        {/* Message si aucune reco à afficher */}
        {recommendations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🌱</p>
            <p className="font-medium">Aucune recommandation pour l'instant</p>
            <p className="text-sm mt-1">Ajoute des contacts ou fais ta première reco !</p>
          </div>
        ) : (

          /* ---- LISTE DES RECOS ---- */
          <div className="space-y-4">
            {recommendations.map(reco => (

              /* ---- CARTE D'UNE RECO ---- */
              <div key={reco.id} className="bg-white rounded-xl p-4 shadow-sm border">

                {/* Ligne du haut : type + date */}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {TYPE_EMOJI[reco.type] || '✨'} {reco.type}
                  </span>
                  <span className="text-xs text-gray-300">
                    {new Date(reco.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {/* Titre et créateur */}
                <h2 className="font-bold text-gray-900">{reco.title}</h2>
                {reco.creator && (
                  <p className="text-sm text-gray-500">{reco.creator}</p>
                )}

                {/* Commentaire personnel */}
                {reco.comment && (
                  <p className="text-sm text-gray-600 mt-2 italic">"{reco.comment}"</p>
                )}

                {/* Lien externe si disponible */}
                {reco.url && (
                  <a
                    href={reco.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-2 block"
                  >
                    Voir le lien →
                  </a>
                )}

                {/* Pied de carte : auteur + bouton sauvegarder */}
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-300">
                    par {reco.profiles?.full_name || reco.profiles?.username || 'Anonyme'}
                  </p>
                  {/* Bouton sauvegarder — uniquement pour les recos des autres */}
                  {reco.user_id !== user?.id && (
                    <button
                      onClick={() => saveReco(reco.id)}
                      className="text-xs text-gray-400 hover:text-black transition"
                    >
                      🔖 Sauvegarder
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* ---- BARRE DE NAVIGATION BAS (mobile) ---- */}
      {/* À compléter dans les prochaines étapes */}
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