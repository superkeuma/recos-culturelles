'use client'
// ============================================
// COMPOSANT RECHERCHE TMDB
// Barre de recherche qui interroge l'API TMDB
// en temps réel et affiche les résultats
// avec affiches et infos.
// Utilisé dans la page nouvelle-reco pour
// les types "film" et "serie".
// ============================================

import { useState, useEffect } from 'react'

// --- Type pour un résultat TMDB ---
interface ResultatTMDB {
  id: number
  title?: string        // films
  name?: string         // séries
  release_date?: string // films
  first_air_date?: string // séries
  poster_path?: string
  overview?: string
  media_type?: string
}

// --- Props du composant ---
interface Props {
  type: 'film' | 'serie'
  onSelect: (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => void
}

export default function RechercheTMDB({ type, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatTMDB[]>([])
  const [loading, setLoading] = useState(false)

  // --- Lance la recherche après 400ms sans frappe (debounce) ---
  // Évite d'envoyer une requête à chaque lettre tapée
  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      return
    }

    const timer = setTimeout(() => {
      rechercherTMDB(query)
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  // --- Appel à l'API TMDB ---
  const rechercherTMDB = async (texte: string) => {
    setLoading(true)

    // Choisit le bon endpoint selon le type
    const endpoint = type === 'film'
      ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(texte)}&language=fr-FR`
      : `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(texte)}&language=fr-FR`

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    setResultats(data.results?.slice(0, 6) || [])
    setLoading(false)
  }

  // --- Quand l'utilisateur clique sur un résultat ---
  // Remonte les données formatées vers la page parent
  const selectionner = (resultat: ResultatTMDB) => {
    const titre = resultat.title || resultat.name || ''
    const annee = (resultat.release_date || resultat.first_air_date || '').slice(0, 4)
    const posterUrl = resultat.poster_path
      ? `https://image.tmdb.org/t/p/w200${resultat.poster_path}`
      : ''
    const urlTMDB = type === 'film'
      ? `https://www.themoviedb.org/movie/${resultat.id}`
      : `https://www.themoviedb.org/tv/${resultat.id}`

    onSelect({
      title: titre,
      creator: annee,   // on met l'année dans le champ creator pour l'instant
      url: urlTMDB,
      posterUrl,
    })

    // Vide la recherche après sélection
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">

      {/* ---- BARRE DE RECHERCHE ---- */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rechercher {type === 'film' ? 'un film' : 'une série'}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={type === 'film' ? 'ex: Parasite, Inception...' : 'ex: The Bear, Severance...'}
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
        />
        {/* Indicateur de chargement */}
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
            Recherche...
          </span>
        )}
      </div>

      {/* ---- LISTE DES RÉSULTATS ---- */}
      {resultats.length > 0 && (
        <div className="mt-1 border rounded-xl overflow-hidden shadow-sm bg-white">
          {resultats.map(resultat => (
            <button
              key={resultat.id}
              onClick={() => selectionner(resultat)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {/* Affiche / poster */}
              {resultat.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${resultat.poster_path}`}
                  alt={resultat.title || resultat.name}
                  className="w-8 h-12 object-cover rounded"
                />
              ) : (
                // Placeholder si pas d'affiche
                <div className="w-8 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">
                  ?
                </div>
              )}

              {/* Titre et année */}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {resultat.title || resultat.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(resultat.release_date || resultat.first_air_date || '').slice(0, 4)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}