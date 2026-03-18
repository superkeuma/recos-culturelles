'use client'
// ============================================
// COMPOSANT RECHERCHE MUSIQUE
// Deux modes au choix :
// - "Artiste" : recherche un artiste/groupe
// - "Album / Morceau" : recherche un album
// Utilise MusicBrainz (gratuit, sans clé)
// ============================================

import { useState, useEffect } from 'react'

interface ResultatArtiste {
  id: string
  name: string
  country?: string
  tags?: Array<{ name: string }>
}

interface ResultatAlbum {
  id: string
  title: string
  date?: string
  'artist-credit'?: Array<{ artist: { name: string } }>
}

interface Props {
  onSelect: (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => void
}

export default function RechercheMusique({ onSelect }: Props) {
  // --- Mode : artiste ou album ---
  const [mode, setMode] = useState<'artiste' | 'album'>('artiste')
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // --- Vide les résultats quand on change de mode ---
  useEffect(() => {
    setQuery('')
    setResultats([])
  }, [mode])

  // --- Debounce 500ms ---
  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      return
    }
    const timer = setTimeout(() => rechercher(query), 500)
    return () => clearTimeout(timer)
  }, [query])

  // --- Recherche selon le mode actif ---
  const rechercher = async (texte: string) => {
    setLoading(true)

    const endpoint = mode === 'artiste'
      // Recherche d'artistes
      ? `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(texte)}&limit=6&fmt=json`
      // Recherche d'albums/release-groups
      : `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(texte)}&limit=6&fmt=json`

    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'RecosCulturelles/1.0 (contact@example.com)' }
    })

    const data = await response.json()

    // Selon le mode, la clé de résultats est différente
    setResultats(
      mode === 'artiste'
        ? (data.artists || [])
        : (data['release-groups'] || [])
    )
    setLoading(false)
  }

  // --- Pochette album via Cover Art Archive ---
  const getPochette = (id: string) =>
    `https://coverartarchive.org/release-group/${id}/front-250`

  // --- Sélection d'un artiste ---
  const selectionnerArtiste = (artiste: ResultatArtiste) => {
    const genre = artiste.tags?.[0]?.name || ''
    onSelect({
      title: artiste.name,
      creator: genre,
      url: `https://musicbrainz.org/artist/${artiste.id}`,
      posterUrl: '',
    })
    setQuery('')
    setResultats([])
  }

  // --- Sélection d'un album ---
  const selectionnerAlbum = (album: ResultatAlbum) => {
    const artiste = album['artist-credit']?.[0]?.artist?.name || ''
    const annee = (album.date || '').slice(0, 4)
    onSelect({
      title: album.title,
      creator: `${artiste}${annee ? ` · ${annee}` : ''}`,
      url: `https://musicbrainz.org/release-group/${album.id}`,
      posterUrl: getPochette(album.id),
    })
    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">

      {/* ---- SÉLECTEUR DE MODE ---- */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('artiste')}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
            mode === 'artiste'
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          🎤 Artiste
        </button>
        <button
          onClick={() => setMode('album')}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
            mode === 'album'
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          💿 Album / Morceau
        </button>
      </div>

      {/* ---- BARRE DE RECHERCHE ---- */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            mode === 'artiste'
              ? 'ex: Daft Punk, Angèle, PNL...'
              : 'ex: Random Access Memories, Thriller...'
          }
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">
            Recherche...
          </span>
        )}
      </div>

      {/* ---- RÉSULTATS ARTISTES ---- */}
      {mode === 'artiste' && resultats.length > 0 && (
        <div className="mt-1 border rounded-xl overflow-hidden shadow-sm bg-white">
          {(resultats as ResultatArtiste[]).map(artiste => (
            <button
              key={artiste.id}
              onClick={() => selectionnerArtiste(artiste)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
            >
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                🎤
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{artiste.name}</p>
                <p className="text-xs text-gray-400">
                  {artiste.country || ''}
                  {artiste.tags?.[0] ? ` · ${artiste.tags[0].name}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ---- RÉSULTATS ALBUMS ---- */}
      {mode === 'album' && resultats.length > 0 && (
        <div className="mt-1 border rounded-xl overflow-hidden shadow-sm bg-white">
          {(resultats as ResultatAlbum[]).map(album => {
            const artiste = album['artist-credit']?.[0]?.artist?.name || ''
            const annee = (album.date || '').slice(0, 4)
            return (
              <button
                key={album.id}
                onClick={() => selectionnerAlbum(album)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
              >
                {/* Pochette */}
                <img
                  src={getPochette(album.id)}
                  alt={album.title}
                  className="w-10 h-10 object-cover rounded flex-shrink-0 bg-gray-100"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{album.title}</p>
                  <p className="text-xs text-gray-400">
                    💿 {artiste}{annee ? ` · ${annee}` : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}