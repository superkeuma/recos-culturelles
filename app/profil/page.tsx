'use client'
// ============================================
// PAGE PROFIL
// Permet à l'utilisateur de créer/modifier
// son profil (username, nom complet)
// Aussi utilisée comme page de complétion
// de profil après la première connexion
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profil() {
  // --- États locaux ---
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // --- Au chargement : récupère l'utilisateur connecté et son profil ---
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)

      // Cherche le profil existant dans la table profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Profil existant → pré-remplit les champs
        setProfile(profile)
        setUsername(profile.username || '')
        setFullName(profile.full_name || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  // --- Sauvegarde le profil (création ou mise à jour) ---
  const saveProfile = async () => {
    if (!username.trim()) {
      setMessage('Le pseudo est obligatoire')
      return
    }
    setSaving(true)
    setMessage('')

    // upsert = insert si n'existe pas, update si existe déjà
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
      })

    if (error) {
      // Erreur fréquente : username déjà pris par quelqu'un d'autre
      if (error.message.includes('unique')) {
        setMessage('Ce pseudo est déjà pris, essaie-en un autre')
      } else {
        setMessage('Erreur : ' + error.message)
      }
    } else {
      setMessage('Profil sauvegardé !')
      setTimeout(() => router.push('/'), 1000)
    }
    setSaving(false)
  }

  // --- Déconnexion ---
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
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
        <h1 className="text-lg font-bold">👤 Mon profil</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Déconnexion
        </button>
      </header>

      {/* ---- FORMULAIRE PROFIL ---- */}
      <main className="max-w-lg mx-auto py-6 px-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border">

          {/* Email (non modifiable, juste affiché) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>

          {/* Pseudo — obligatoire et unique */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pseudo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: superkeuma"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Visible par tes contacts. Minuscules uniquement.
            </p>
          </div>

          {/* Nom complet — optionnel */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="ex: Marc Chevigny"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>

          {/* Message de retour (erreur ou succès) */}
          {message && (
            <p className={`text-sm text-center mb-4 ${
              message.includes('!') ? 'text-green-500' : 'text-red-400'
            }`}>
              {message}
            </p>
          )}

          {/* Bouton sauvegarder */}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
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