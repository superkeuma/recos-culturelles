'use client'
// ============================================
// PAGE SAUVEGARDES
// Affiche toutes les recos que l'utilisateur
// a sauvegardées depuis le feed.
// Permet de les retirer de la liste.
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- Correspondance type → emoji (identique au feed) ---
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

export default function Sauvegardes() {
  // --- États locaux ---
  const [user, setUser] = useState<any>(null)
  const [sauvegardes, setSauvegardes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // --- Au chargement : vérifie connexion et charge les sauvegardes ---
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await chargerSauvegardes(user.id)
      setLoading(false)
    }
    load()
  }, [])

  // --- Charge les recos sauvegardées avec le détail de chaque reco ---
  const chargerSauvegardes = async (userId: string) => {
    const { data, error } = await supabase
      .from('saved_recommendations')
      .select(`
        id,
        recommendation_id,
        recommendations(
          id, type, title, creator, url, comment, created_at,
          profiles(username, full_name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) setSauvegardes(data)
  }

  // --- Retire une reco de la liste de sauvegardes ---
  const retirerSauvegarde = async (sauvegardeId: string) => {
    await supabase
      .from('saved_recommendations')
      .delete()
      .eq('id', sauvegardeId)

    // Met à jour l'affichage sans recharger toute la page
    setSauvegardes(prev => prev.filter(s => s.id !== sauvegardeId))
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
        <h1 className="text-lg font-bold">🔖 Sauvegardes</h1>
        <span className="text-sm text-gray-400">
          {sauvegardes.length} reco{sauvegardes.length > 1 ? 's' : ''}
        </span>
      </header>

      <main className="max-w-lg mx-auto py-6 px-4">

        {/* Message si aucune sauvegarde */}
        {sauvegardes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔖</p>
            <p className="font-medium">Aucune sauvegarde pour l'instant</p>
            <p className="text-sm mt-1">
              Appuie sur 🔖 sur une reco du feed pour la retrouver ici
            </p>
          </div>
        ) : (

          /* ---- LISTE DES RECOS SAUVEGARDÉES ---- */
          <div className="space-y-4">
            {sauvegardes.map(sauvegarde => {
              // Raccourci vers les données de la reco
              const reco = sauvegarde.recommendations
              if (!reco) return null

              return (
                /* ---- CARTE D'UNE RECO SAUVEGARDÉE ---- */
                <div key={sauvegarde.id} className="bg-white rounded-xl p-4 shadow-sm border">

                  {/* Ligne du haut : type + bouton retirer */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {TYPE_EMOJI[reco.type] || '✨'} {reco.type}
                    </span>
                    <button
                      onClick={() => retirerSauvegarde(sauvegarde.id)}
                      className="text-xs text-gray-300 hover:text-red-400 transition"
                    >
                      Retirer
                    </button>
                  </div>

                  {/* Titre et créateur */}
                  <h2 className="font-bold text-gray-900">{reco.title}</h2>
                  {reco.creator && (
                    <p className="text-sm text-gray-500">{reco.creator}</p>
                  )}

                  {/* Commentaire personnel */}
                  {reco.comment && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{reco.comment}"
                    </p>
                  )}

                  {/* Lien externe */}
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

                  {/* Pied de carte : auteur + date */}
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-300">
                      par {reco.profiles?.full_name || reco.profiles?.username || 'Anonyme'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {new Date(reco.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        )}
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