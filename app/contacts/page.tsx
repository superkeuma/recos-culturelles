'use client'
import React from 'react'
// ============================================
// PAGE CONTACTS — redesign minimaliste
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { Search, UserPlus, UserMinus } from 'lucide-react'

export default function Contacts() {
  const [user, setUser] = useState<any>(null)
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const mes = await chargerContacts(user.id)
      await chargerSuggestions(user.id, mes)
      setLoading(false)
    }
    load()
  }, [])

  const chargerContacts = async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, username)')
      .eq('follower_id', userId)
    if (data) setContacts(data)
    return data || []
  }

  const chargerSuggestions = async (userId: string, mesContacts: any[]) => {
    if (mesContacts.length === 0) return
    const mesContactsIds = mesContacts.map(c => c.following_id)

    // Récupère les contacts de mes contacts
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, username)')
      .in('follower_id', mesContactsIds)
      .neq('following_id', userId)

    if (!data) return

    // Filtre ceux que je suis déjà
    const candidats = data.filter(d =>
      !mesContactsIds.includes(d.following_id) && d.profiles
    )

    // Déduplique par following_id
    const vus = new Set<string>()
    const uniques = candidats.filter(d => {
      if (vus.has(d.following_id)) return false
      vus.add(d.following_id)
      return true
    })

    // Mélange et prend 3 max
    const melanges = uniques.sort(() => Math.random() - 0.5).slice(0, 3)
    setSuggestions(melanges)
  }

  const rechercherUtilisateur = async (valeur: string) => {
    setRecherche(valeur)
    if (valeur.length < 2) { setResultats([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${valeur}%`)
      .neq('id', user.id)
      .limit(5)
    if (data) setResultats(data)
  }

  const estSuivi = (profileId: string) =>
    contacts.some(c => c.following_id === profileId)

  const suivre = async (profileId: string) => {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: profileId })
    if (!error) {
      const mes = await chargerContacts(user.id)
      await chargerSuggestions(user.id, mes)
      setMessage('Contact ajouté !')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const nePlusSuivre = async (profileId: string) => {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
    const mes = await chargerContacts(user.id)
    await chargerSuggestions(user.id, mes)
  }

  // --- Initiales pour l'avatar ---
  const initiales = (nom: string) => nom?.[0]?.toUpperCase() || '?'

  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: INK,
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', opacity: 0.5,
  }

  const avatarStyle: React.CSSProperties = {
    width: '36px', height: '36px', borderRadius: '50%',
    background: YELLOW, border: `2px solid ${INK}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 700, color: INK, flexShrink: 0,
    fontFamily: 'var(--font-title)',
  }

  const btnSuivre: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: YELLOW, color: INK,
    border: `2px solid ${INK}`, borderRadius: '2px',
    boxShadow: `2px 2px 0 ${INK}`,
    padding: '5px 12px', fontSize: '11px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: `1px solid rgba(10,10,10,0.1)`,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${INK}`, borderTopColor: YELLOW, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF0', paddingBottom: '80px' }}>

      {/* ---- HEADER ---- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#FAFAF0', borderBottom: `2px solid ${INK}`,
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: INK, fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>
          contacts
        </span>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- BARRE DE RECHERCHE ---- */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: INK, opacity: 0.4 }} />
          <input type="text" value={recherche} onChange={e => rechercherUtilisateur(e.target.value)}
            placeholder="Rechercher un pseudo..."
            style={{
              width: '100%', padding: '11px 14px 11px 36px',
              border: `2px solid ${INK}`, borderRadius: '2px',
              fontSize: '14px', color: INK,
              background: '#FAFAF0', outline: 'none',
              fontFamily: 'var(--font)',
            }}
          />
        </div>

        {message && (
          <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, textAlign: 'center', marginBottom: '8px', letterSpacing: '0.06em' }}>
            {message}
          </p>
        )}

        {/* ---- RÉSULTATS ---- */}
        {resultats.length > 0 && (
          <div style={{ background: '#fff', border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
            {resultats.map(profil => (
              <div key={profil.id} style={rowStyle}>
                <button onClick={() => router.push(`/u/${profil.username}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  <div style={avatarStyle}>{initiales(profil.username)}</div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: INK }}>@{profil.username}</p>
                </button>
                {estSuivi(profil.id) ? (
                  <span style={{ fontSize: '10px', color: INK, background: YELLOW, border: `2px solid ${INK}`, padding: '4px 10px', borderRadius: '2px', fontWeight: 700, letterSpacing: '0.06em' }}>
                    SUIVI ✓
                  </span>
                ) : (
                  <button onClick={() => suivre(profil.id)} style={btnSuivre}>
                    <UserPlus size={12} />Suivre
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- SUGGESTIONS ---- */}
        {suggestions.length > 0 && recherche.length < 2 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={labelStyle}>Suggestions</p>
            <div style={{ background: '#fff', border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', overflow: 'hidden' }}>
              {suggestions.map(s => (
                <div key={s.following_id} style={rowStyle}>
                  <button onClick={() => router.push(`/u/${s.profiles.username}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    <div style={avatarStyle}>{initiales(s.profiles.username)}</div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: INK }}>@{s.profiles.username}</p>
                  </button>
                  <button onClick={() => suivre(s.following_id)} style={btnSuivre}>
                    <UserPlus size={12} />Suivre
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- MES CONTACTS ---- */}
        <p style={labelStyle}>Mes contacts ({contacts.length})</p>

        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: INK }}>
            <Search size={32} style={{ marginBottom: '12px', opacity: 0.15 }} />
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-title)', fontStyle: 'italic', opacity: 0.5 }}>
              Recherche des amis par leur pseudo
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px', overflow: 'hidden' }}>
            {contacts.map(contact => (
              <div key={contact.following_id} style={rowStyle}>
                <button onClick={() => contact.profiles?.username && router.push(`/u/${contact.profiles.username}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  <div style={avatarStyle}>{initiales(contact.profiles?.username)}</div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: INK }}>@{contact.profiles?.username}</p>
                </button>
                <button onClick={() => nePlusSuivre(contact.following_id)} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
                  padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                  color: INK, cursor: 'pointer', letterSpacing: '0.04em',
                }}>
                  <UserMinus size={11} />Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <NavBar current="/contacts" router={router} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}