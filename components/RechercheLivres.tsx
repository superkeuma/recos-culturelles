'use client'
// ============================================
// COMPOSANT RECHERCHE LIVRES
// Utilise l'API Google Books (gratuite)
// pour rechercher des livres par titre
// ou par auteur.
// Affiche : couverture, titre, auteur, année.
// ============================================

import { useState, useEffect } from 'react'

interface ResultatLivre {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    imageLinks?: {
      thumbnail?: string
    }
    infoLink?: string
  }
}

interface Props {
  onSelect: (resultat: {
    title: string
    creator: string
    url: string
    posterUrl: string
  }) => void
}

export default function RechercheLivres({ onSelect }: Props) {
  const [mode, setMode] = useState<'titre' | 'auteur'>('titre')
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ResultatLivre[]>([])
  const [loading, setLoading] = useState(false)

  // --- Vide les résultats quand on change de mode ---
  useEffect(() => {
    setQuery('')
    setResultats([])
  }, [mode])

  // --- Debounce 400ms ---
  useEffect(() => {
    if (query.length < 2) {
      setResultats([])
      return
    }
    const timer = setTimeout(() => rechercherLivres(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  // --- Appel à l'API Google Books ---
  // Deux modes : recherche par titre (intitle:) ou par auteur (inauthor:)
  const rechercherLivres = async (texte: string) => {
    setLoading(true)

    // Préfixe différent selon le mode de recherche
    const prefixe = mode === 'titre' ? 'intitle:' : 'inauthor:'
    const url = `https://www.googleapis.com/books/v1/volumes?q=${prefixe}${encodeURIComponent(texte)}&maxResults=6&langRestrict=fr&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_KEY}`

    const response = await fetch(url)
    const data = await response.json()
    setResultats(data.items || [])
    setLoading(false)
  }

  // --- Sélection d'un livre ---
  const selectionner = (livre: ResultatLivre) => {
    const info = livre.volumeInfo
    const auteur = info.authors?.[0] || ''
    const annee = (info.publishedDate || '').slice(0, 4)
    const couverture = info.imageLinks?.thumbnail?.replace('http:', 'https:') || ''

    onSelect({
      title: info.title,
      creator: `${auteur}${annee ? ` · ${annee}` : ''}`,
      url: info.infoLink || '',
      posterUrl: couverture,
    })

    setQuery('')
    setResultats([])
  }

  return (
    <div className="mb-4">

      {/* ---- SÉLECTEUR DE MODE ---- */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('titre')}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
            mode === 'titre'
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          📖 Par titre
        </button>
        <button
          onClick={() => setMode('auteur')}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition ${
            mode === 'auteur'
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          ✍️ Par auteur
        </button>
      </div>

      {/* ---- BARRE DE RECHERCHE ---- */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            mode === 'titre'
              ? "ex: L'Étranger, Dune, Harry Potter..."
              : 'ex: Camus, Proust, Tolkien...'
          }
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
          {resultats.map(livre => {
            const info = livre.volumeInfo
            const auteur = info.authors?.[0] || ''
            const annee = (info.publishedDate || '').slice(0, 4)
            const couverture = info.imageLinks?.thumbnail?.replace('http:', 'https:') || ''

            return (
              <button
                key={livre.id}
                onClick={() => selectionner(livre)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-0 text-left"
              >
                {/* Couverture */}
                {couverture ? (
                  <img
                    src={couverture}
                    alt={info.title}
                    className="w-8 h-12 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs flex-shrink-0">
                    📚
                  </div>
                )}

                {/* Infos */}
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {info.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    ✍️ {auteur}{annee ? ` · ${annee}` : ''}
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