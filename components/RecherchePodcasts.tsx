'use client'
import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'

interface ResultatPodcast {
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100: string
  primaryGenreName?: string
  collectionViewUrl: string
}

interface Props {
  onSelect: (resultat: { title: string; creator: string; url: string; posterUrl: string }) => void
}

export default function RecherchePodcasts({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatPodcast[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResultats([]); return }
    const timer = setTimeout(() => rechercherPodcasts(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  const rechercherPodcasts = async (texte: string) => {
    setLoading(true)
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(texte)}&entity=podcast&country=fr&limit=6`
    const response = await fetch(url)
    const data = await response.json()
    setResultats(data.results || [])
    setLoading(false)
  }

  const selectionner = (podcast: ResultatPodcast) => {
    onSelect({ title: podcast.collectionName, creator: podcast.artistName, url: podcast.collectionViewUrl, posterUrl: podcast.artworkUrl100 })
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rechercher un podcast
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ex: Splash, Transfert, No Agenda..."
          className="w-full border rounded-none px-4 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
        />
        {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Recherche...</span>}
      </div>

      {resultats.length > 0 && (
        <div className="mt-1 border rounded-none overflow-hidden bg-white">
          {resultats.map(podcast => (
            <button
              key={podcast.collectionId}
              onClick={() => selectionner(podcast)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {podcast.artworkUrl100 ? (
                <img src={podcast.artworkUrl100} alt={podcast.collectionName} className="w-10 h-10 object-cover rounded-none flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-none flex items-center justify-center text-gray-400 flex-shrink-0">
                  <Mic size={16} strokeWidth={1.5} />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{podcast.collectionName}</p>
                <p className="text-xs text-gray-400">
                  {podcast.artistName}{podcast.primaryGenreName ? ` · ${podcast.primaryGenreName}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
