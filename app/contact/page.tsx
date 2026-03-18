'use client'
// ============================================
// PAGE CONTACTS
// Permet de rechercher des utilisateurs
// par pseudo et de les suivre / ne plus
// les suivre. Affiche aussi la liste
// des contacts déjà suivis.
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Contacts() {
  // --- États locaux ---
  const [user, setUser] = useState<any>(null)
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // --- Au chargement : récupère l'utilisateur et ses contacts ---
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await chargerContacts(user.id)
      setLoading(false)
    }
    load()
  }, [])

  // --- Charge la liste des contacts déjà suivis ---
  const chargerContacts = async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey(id, username, full_name)
      `)
      .eq('follower_id', userId)

    if (data) setContacts(data)
  }

  // --- Recherche un utilisateur par pseudo ---
  // Se déclenche à chaque frappe dans le champ de recherche
  const rechercherUtilisateur = async (valeur: string) => {
    setRecherche(valeur)
    if (valeur.length < 2) {
      setResultats([])
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .ilike('username', `%${valeur}%`)  // recherche insensible à la casse
      .neq('id', user.id)                // exclut l'utilisateur lui-même
      .limit(5)

    if (data) setResultats(data)
  }

  // --- Vérifie si un utilisateur est déjà suivi ---
  const estSuivi = (profileId: string) => {
    return contacts.some(c => c.following_id === profileId)
  }

  // --- Suit un utilisateur ---
  const suivre = async (profileId: string) => {
    setMessage('')
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: profileId })

    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      await chargerContacts(user.id)
      setMessage('Contact ajouté !')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  // --- Ne plus suivre un utilisateur ---
  const nePlusSuivre = async (profileId: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId)

    if (!error) {
      await chargerContacts(user.id)
    }
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
        <h1 className="text-lg font-bold">👥 Contacts</h1>
      </header>

      <main className="max-w-lg mx-auto py-6 px-4">

        {/* ---- BARRE DE RECHERCHE ---- */}
        <div className="mb-6">
          <input
            type="text"
            value={recherche}
            onChange={e => rechercherUtilisateur(e.target.value)}
            placeholder="Rechercher un pseudo..."
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black text-sm bg-white"
          />

          {/* Message retour (contact ajouté etc.) */}
          {message && (
            <p className="text-sm text-green-500 mt-2 text-center">{message}</p>
          )}

          {/* ---- RÉSULTATS DE RECHERCHE ---- */}
          {resultats.length > 0 && (
            <div className="mt-2 bg-white rounded-xl border shadow-sm overflow-hidden">
              {resultats.map(profil => (
                <div
                  key={profil.id}
                  className="flex justify-between items-center px-4 py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">@{profil.username}</p>
                    {profil.full_name && (
                      <p className="text-xs text-gray-400">{profil.full_name}</p>
                    )}
                  </div>
                  {/* Bouton suivre / déjà suivi */}
                  {estSuivi(profil.id) ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      Suivi ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => suivre(profil.id)}
                      className="text-xs bg-black text-white px-3 py-1 rounded-full hover:bg-gray-800 transition"
                    >
                      + Suivre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- LISTE DES CONTACTS SUIVIS ---- */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Mes contacts ({contacts.length})
          </h2>

          {contacts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Recherche des amis par leur pseudo</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {contacts.map(contact => (
                <div
                  key={contact.following_id}
                  className="flex justify-between items-center px-4 py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      @{contact.profiles?.username}
                    </p>
                    {contact.profiles?.full_name && (
                      <p className="text-xs text-gray-400">
                        {contact.profiles.full_name}
                      </p>
                    )}
                  </div>
                  {/* Bouton ne plus suivre */}
                  <button
                    onClick={() => nePlusSuivre(contact.following_id)}
                    className="text-xs text-gray-400 hover:text-red-400 transition"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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