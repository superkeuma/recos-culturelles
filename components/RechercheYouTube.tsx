'use client'
import { useState, useEffect } from 'react'
import { Tv, Play } from 'lucide-react'

interface ResultatYouTube {
  id: { kind: string; videoId?: string; channelId?: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: { medium: { url: string } }
    publishedAt: string
  }
}

interface Props {
  onSelect: (resultat: { title: string; creator: string; url: string; posterUrl: string }) => void
}

export default function RechercheYouTube({ onSelect }: Props) {
  const [mode, setMode] = useState<'chaine' | 'video'>('chaine')
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatYouTube[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setQuery(''); setResultats([]) }, [mode])

  useEffect(() => {
    if (query.length < 2) { setResultats([]); return }
    const timer = setTimeout(() => rechercherYouTube(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  const rechercherYouTube = async (texte: string) => {
    setLoading(true)
    const type = mode === 'chaine' ? 'channel' : 'video'
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(texte)}&type=${type}&maxResults=6&key=${process.env.NEXT_PUBLIC_YOUTUBE_KEY}`
    const response = await fetch(url)
    const data = await response.json()
    setResultats(data.items || [])
    setLoading(false)
  }

  const selectionner = (resultat: ResultatYouTube) => {
    const estChaine = resultat.id.kind === 'youtube#channel'
    const id = estChaine ? resultat.id.channelId : resultat.id.videoId
    const url = estChaine ? `https://www.youtube.com/channel/${id}` : `https://www.youtube.com/watch?v=${id}`
    onSelect({ title: resultat.snippet.title, creator: estChaine ? '' : resultat.snippet.channelTitle, url, posterUrl: resultat.snippet.thumbnails.medium.url })
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('chaine')}
          className={`flex-1 py-1.5 rounded-none text-sm border transition flex items-center justify-center gap-1.5 ${
            mode === 'chaine' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          <Tv size={13} strokeWidth={1.5} /> Chaîne
        </button>
        <button
          onClick={() => setMode('video')}
          className={`flex-1 py-1.5 rounded-none text-sm border transition flex items-center justify-center gap-1.5 ${
            mode === 'video' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          <Play size={13} strokeWidth={1.5} /> Vidéo
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'chaine' ? 'ex: Nota Bene, Underscore, Micode...' : 'ex: titre de la vidéo...'}
          className="w-full border rounded-none px-4 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
        />
        {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Recherche...</span>}
      </div>

      {resultats.length > 0 && (
        <div className="mt-1 border rounded-none overflow-hidden bg-white">
          {resultats.map((resultat, index) => (
            <button
              key={index}
              onClick={() => selectionner(resultat)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              <img src={resultat.snippet.thumbnails.medium.url} alt={resultat.snippet.title} className="w-16 h-10 object-cover rounded-none flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{resultat.snippet.title}</p>
                <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                  {mode === 'chaine' ? <Tv size={10} strokeWidth={1.5} /> : <Play size={10} strokeWidth={1.5} />}
                  {resultat.snippet.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
