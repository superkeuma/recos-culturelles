'use client'
import { useState, useEffect } from 'react'
import { Film, Tv } from 'lucide-react'

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
  onSelect: (resultat: { title: string; creator: string; url: string; posterUrl: string }) => void
}

export default function RechercheTMDB({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatTMDB[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResultats([]); return }
    const timer = setTimeout(() => rechercherTMDB(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  const rechercherTMDB = async (texte: string) => {
    setLoading(true)
    const [filmsRes, seriesRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(texte)}&language=fr-FR`,
        { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}` } }),
      fetch(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(texte)}&language=fr-FR`,
        { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}` } })
    ])
    const filmsData = await filmsRes.json()
    const seriesData = await seriesRes.json()
    const films = (filmsData.results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'movie' }))
    const series = (seriesData.results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'tv' }))
    const fusionnes: ResultatTMDB[] = []
    const max = Math.max(films.length, series.length)
    for (let i = 0; i < max; i++) {
      if (films[i]) fusionnes.push(films[i])
      if (series[i]) fusionnes.push(series[i])
    }
    setResultats(fusionnes.slice(0, 6))
    setLoading(false)
  }

  const selectionner = (resultat: ResultatTMDB) => {
    const titre = resultat.title || resultat.name || ''
    const annee = (resultat.release_date || resultat.first_air_date || '').slice(0, 4)
    const type = resultat.media_type === 'movie' ? 'movie' : 'tv'
    const posterUrl = resultat.poster_path ? `https://image.tmdb.org/t/p/w200${resultat.poster_path}` : ''
    onSelect({ title: titre, creator: annee, url: `https://www.themoviedb.org/${type}/${resultat.id}`, posterUrl })
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
          className="w-full border rounded-none px-4 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
        />
        {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Recherche...</span>}
      </div>

      {resultats.length > 0 && (
        <div className="mt-1 border rounded-none overflow-hidden bg-white">
          {resultats.map(resultat => (
            <button
              key={resultat.id}
              onClick={() => selectionner(resultat)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {resultat.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${resultat.poster_path}`}
                  alt={resultat.title || resultat.name}
                  className="w-8 h-12 object-cover rounded-none flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-12 bg-gray-100 rounded-none flex items-center justify-center text-gray-300 flex-shrink-0">
                  {resultat.media_type === 'movie' ? <Film size={14} strokeWidth={1.5} /> : <Tv size={14} strokeWidth={1.5} />}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{resultat.title || resultat.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  {resultat.media_type === 'movie'
                    ? <><Film size={10} strokeWidth={1.5} /> Film</>
                    : <><Tv size={10} strokeWidth={1.5} /> Série</>}
                  {' · '}{(resultat.release_date || resultat.first_air_date || '').slice(0, 4)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
