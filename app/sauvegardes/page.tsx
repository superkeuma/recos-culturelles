'use client'
// ============================================
// PAGE SAUVEGARDES — redesign minimaliste
// ============================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import TypeIcon from '@/components/TypeIcon'
import { X } from 'lucide-react'

export default function Sauvegardes() {
  const [user, setUser] = useState<any>(null)
  const [sauvegardes, setSauvegardes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await chargerSauvegardes(user.id)
      setLoading(false)
    }
    load()
  }, [])

  const chargerSauvegardes = async (userId: string) => {
    const { data } = await supabase
      .from('saved_recommendations')
      .select(`
        id, recommendation_id,
        recommendations(
          id, type, title, creator, url, comment, created_at, poster_url,
          profiles(username, full_name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setSauvegardes(data)
  }

  const retirerSauvegarde = async (sauvegardeId: string) => {
    await supabase.from('saved_recommendations').delete().eq('id', sauvegardeId)
    setSauvegardes(prev => prev.filter(s => s.id !== sauvegardeId))
  }

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--accent)' }}>
          sauvegardes
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {sauvegardes.length} reco{sauvegardes.length > 1 ? 's' : ''}
        </span>
      </header>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>

        {sauvegardes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🔖</div>
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Aucune sauvegarde</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>
              Appuie sur "Sauvegarder" sur une reco du feed
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sauvegardes.map(sauvegarde => {
              const reco = sauvegarde.recommendations
              if (!reco) return null

              return (
                <div key={sauvegarde.id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}>

                  {/* Affiche pleine largeur */}
                  {reco.poster_url && (
                    <img
                      src={reco.poster_url}
                      alt={reco.title}
                      style={{
                        width: '100%',
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        display: 'block',
                      }}
                    />
                  )}

                  <div style={{ padding: '14px 16px' }}>

                    {/* Badge type */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '10px', fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      marginBottom: '4px',
                    }}>
                      <TypeIcon type={reco.type} size={11} />
                      {reco.type}
                    </span>

                    {/* Titre */}
                    <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {reco.title}
                    </p>
                    {reco.creator && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {reco.creator}
                      </p>
                    )}

                    {/* Commentaire */}
                    {reco.comment && (
                      <p style={{
                        fontSize: '14px', color: 'var(--text-secondary)',
                        fontStyle: 'italic', lineHeight: '1.5',
                        borderLeft: '2px solid var(--border)',
                        paddingLeft: '10px', marginTop: '8px', marginBottom: '8px',
                      }}>
                        {reco.comment}
                      </p>
                    )}

                    {/* Pied : auteur + lien + retirer */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginTop: '10px',
                      paddingTop: '10px', borderTop: '1px solid var(--border-light)',
                    }}>
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          par {reco.profiles?.full_name || reco.profiles?.username || 'Anonyme'}
                        </p>
                        {reco.url && (
                          <a href={reco.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                            Voir →
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => retirerSauvegarde(sauvegarde.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-full)',
                          padding: '5px 12px', fontSize: '12px',
                          color: 'var(--text-muted)', cursor: 'pointer',
                        }}
                      >
                        <X size={12} />
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <NavBar current="/sauvegardes" router={router} />
    </div>
  )
}