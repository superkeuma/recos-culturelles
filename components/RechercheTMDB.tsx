'use client'
// ============================================
// COMPOSANT RECHERCHE TMDB
// Recherche films ET séries simultanément
// via l'endpoint "multi" de TMDB.
// Utilisé pour le type "film" dans
// la page nouvelle-reco.
// ============================================

import { useState, useEffect } from 'react'

interface ResultatTMDB {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string
  media_type?: 'movie' | 'tv'
}

interface Props {
  onSelect: (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => void
}

export default function RechercheTMDB({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatTMDB[]>([])
  const [loading, setLoading] = useState(false)

  // --- Debounce : attend 400ms après la dernière frappe ---
  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      return
    }
    const timer = setTimeout(() => rechercherTMDB(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  // --- Recherche multi (films + séries en même temps) ---
const rechercherTMDB = async (texte: string) => {
  setLoading(true)

  // Recherche films ET séries en parallèle
  const [filmsRes, seriesRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(texte)}&language=fr-FR`,
      { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}` } }
    ),
    fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(texte)}&language=fr-FR`,
      { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}` } }
    )
  ])

  const filmsData = await filmsRes.json()
  const seriesData = await seriesRes.json()

  // Ajoute media_type manuellement pour différencier
  const films = (filmsData.results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'movie' }))
  const series = (seriesData.results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'tv' }))

  // Alterne films et séries pour un mix équilibré
  const fusionnes: ResultatTMDB[] = []
  const max = Math.max(films.length, series.length)
  for (let i = 0; i < max; i++) {
    if (films[i]) fusionnes.push(films[i])
    if (series[i]) fusionnes.push(series[i])
  }

  setResultats(fusionnes.slice(0, 6))
  setLoading(false)
}

  // --- Sélection d'un résultat ---
  const selectionner = (resultat: ResultatTMDB) => {
    const titre = resultat.title || resultat.name || ''
    const annee = (resultat.release_date || resultat.first_air_date || '').slice(0, 4)
    const type = resultat.media_type === 'movie' ? 'movie' : 'tv'
    const posterUrl = resultat.poster_path
      ? `https://image.tmdb.org/t/p/w200${resultat.poster_path}`
      : ''
    const urlTMDB = `https://www.themoviedb.org/${type}/${resultat.id}`

    onSelect({ title: titre, creator: annee, url: urlTMDB, posterUrl })
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rechercher un film ou une série
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ex: Parasite, The Bear, Inception..."
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
          {resultats.map(resultat => (
            <button
              key={resultat.id}
              onClick={() => selectionner(resultat)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {/* Affiche */}
              {resultat.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${resultat.poster_path}`}
                  alt={resultat.title || resultat.name}
                  className="w-8 h-12 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs flex-shrink-0">
                  ?
                </div>
              )}

              {/* Infos */}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {resultat.title || resultat.name}
                </p>
                <p className="text-xs text-gray-400">
                  {resultat.media_type === 'movie' ? '🎬 Film' : '📺 Série'}
                  {' · '}
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