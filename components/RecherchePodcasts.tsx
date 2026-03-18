'use client'
// ============================================
// COMPOSANT RECHERCHE PODCASTS
// Utilise l'API iTunes Search (gratuite,
// sans clé) pour rechercher des podcasts.
// Affiche : logo, nom du podcast, auteur.
// ============================================

import { useState, useEffect } from 'react'

interface ResultatPodcast {
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100: string
  trackCount?: number
  primaryGenreName?: string
  collectionViewUrl: string
}

interface Props {
  onSelect: (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => void
}

export default function RecherchePodcasts({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatPodcast[]>([])
  const [loading, setLoading] = useState(false)

  // --- Debounce 400ms ---
  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      return
    }
    const timer = setTimeout(() => rechercherPodcasts(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  // --- Appel à l'API iTunes Search ---
  // entity=podcast pour filtrer uniquement les podcasts
  // country=fr pour prioriser les résultats francophones
  const rechercherPodcasts = async (texte: string) => {
    setLoading(true)

    // On passe par un proxy pour éviter les problèmes CORS
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(texte)}&entity=podcast&country=fr&limit=6`

    const response = await fetch(url)
    const data = await response.json()
    setResultats(data.results || [])
    setLoading(false)
  }

  // --- Sélection d'un podcast ---
  const selectionner = (podcast: ResultatPodcast) => {
    onSelect({
      title: podcast.collectionName,
      creator: podcast.artistName,
      url: podcast.collectionViewUrl,
      posterUrl: podcast.artworkUrl100,
    })
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rechercher un podcast
      </label>

      {/* ---- BARRE DE RECHERCHE ---- */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ex: Splash, Transfert, No Agenda..."
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
            Recherche...
          </span>
        )}
      </div>

      {/* ---- RÉSULTATS ---- */}
      {resultats.length > 0 && (
        <div className="mt-1 border rounded-xl overflow-hidden shadow-sm bg-white">
          {resultats.map(podcast => (
            <button
              key={podcast.collectionId}
              onClick={() => selectionner(podcast)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {/* Logo du podcast */}
              {podcast.artworkUrl100 ? (
                <img
                  src={podcast.artworkUrl100}
                  alt={podcast.collectionName}
                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg flex-shrink-0">
                  🎙️
                </div>
              )}

              {/* Infos */}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {podcast.collectionName}
                </p>
                <p className="text-xs text-gray-400">
                  🎙️ {podcast.artistName}
                  {podcast.primaryGenreName ? ` · ${podcast.primaryGenreName}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}