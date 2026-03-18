'use client'
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
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await chargerContacts(user.id)
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
      await chargerContacts(user.id)
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
    await chargerContacts(user.id)
  }

  // --- Initiales pour l'avatar ---
  const initiales = (nom: string) => nom?.[0]?.toUpperCase() || '?'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>

      {/* ---- HEADER ---- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)' }}>
          contacts
        </span>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ---- BARRE DE RECHERCHE ---- */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={recherche}
            onChange={e => rechercherUtilisateur(e.target.value)}
            placeholder="Rechercher un pseudo..."
            style={{
              width: '100%', padding: '11px 14px 11px 36px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '14px', color: 'var(--text-primary)',
              background: 'var(--bg-secondary)', outline: 'none',
            }}
          />
        </div>

        {/* Message retour */}
        {message && (
          <p style={{ fontSize: '13px', color: '#22c55e', textAlign: 'center', marginBottom: '8px' }}>
            {message}
          </p>
        )}

        {/* ---- RÉSULTATS DE RECHERCHE ---- */}
        {resultats.length > 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden', marginBottom: '20px',
          }}>
            {resultats.map(profil => (
              <div key={profil.id} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
              }}>
                <button
                  onClick={() => router.push(`/u/${profil.username}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    {initiales(profil.username)}
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    @{profil.username}
                  </p>
                </button>

                {estSuivi(profil.id) ? (
                  <span style={{
                    fontSize: '12px', color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)',
                    padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  }}>
                    Suivi ✓
                  </span>
                ) : (
                  <button
                    onClick={() => suivre(profil.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 'var(--radius-full)',
                      padding: '6px 14px', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <UserPlus size={13} />
                    Suivre
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- LISTE DES CONTACTS ---- */}
        <p style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Mes contacts ({contacts.length})
        </p>

        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px' }}>Recherche des amis par leur pseudo</p>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {contacts.map(contact => (
              <div key={contact.following_id} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
              }}>
                <button
                  onClick={() => contact.profiles?.username && router.push(`/u/${contact.profiles.username}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    {initiales(contact.profiles?.username)}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      @{contact.profiles?.username}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => nePlusSuivre(contact.following_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '5px 12px', fontSize: '12px',
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  <UserMinus size={12} />
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <NavBar current="/contacts" router={router} />
    </div>
  )
}