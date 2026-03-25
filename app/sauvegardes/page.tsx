'use client'
// ============================================
// PAGE SAUVEGARDES — redesign minimaliste
// ============================================

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import TypeIcon from '@/components/TypeIcon'
import { X, Bookmark } from 'lucide-react'

export default function Sauvegardes() {
  const [user, setUser] = useState<any>(null)
  const [sauvegardes, setSauvegardes] = useState<any[]>([])
  const [filtre, setFiltre] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const categories = useMemo(() => {
    const types = [...new Set(sauvegardes.map(s => s.recommendations?.type).filter(Boolean))]
    return types
  }, [sauvegardes])

  const sauvegardesFiltrees = useMemo(
    () => filtre ? sauvegardes.filter(s => s.recommendations?.type === filtre) : sauvegardes,
    [sauvegardes, filtre]
  )

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

  const INK = '#0a0a0a'
  const YELLOW = '#FFD600'

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '520px', margin: '0 auto',
      }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: INK, fontFamily: 'var(--font-title)', letterSpacing: '-0.5px' }}>
          sauvegardes
        </span>
        <span style={{ fontSize: '10px', color: INK, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.4 }}>
          {sauvegardesFiltrees.length} RECO{sauvegardesFiltrees.length > 1 ? 'S' : ''}
        </span>
      </header>

      {/* ---- FILTRES ---- */}
      {categories.length > 1 && (
        <div style={{
          position: 'sticky', top: '56px', zIndex: 9,
          background: '#FAFAF0', borderBottom: `2px solid ${INK}`,
          maxWidth: '520px', margin: '0 auto',
        }}>
          <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[{ key: null, label: 'TOUT' }, ...categories.map(c => ({ key: c, label: c.toUpperCase() }))].map(({ key, label }) => (
              <button key={label} onClick={() => setFiltre(key)}
                style={{
                  flexShrink: 0, padding: '5px 12px',
                  border: `2px solid ${INK}`, borderRadius: '2px', cursor: 'pointer',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                  background: filtre === key ? YELLOW : 'transparent',
                  color: INK,
                  boxShadow: filtre === key ? `2px 2px 0 ${INK}` : 'none',
                  transform: filtre === key ? 'translate(-1px, -1px)' : 'none',
                  transition: 'all 0.1s',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                {key && <TypeIcon type={key} size={10} color={INK} />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        {sauvegardesFiltrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: INK }}>
            <div style={{ marginBottom: '12px', opacity: 0.15, display: 'flex', justifyContent: 'center' }}>
              <Bookmark size={40} strokeWidth={1.5} />
            </div>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontStyle: 'italic', opacity: 0.4 }}>Aucune sauvegarde</p>
            <p style={{ fontSize: '13px', marginTop: '6px', opacity: 0.4 }}>Appuie sur "Sauvegarder" sur une reco</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sauvegardesFiltrees.map(sauvegarde => {
              const reco = sauvegarde.recommendations
              if (!reco) return null
              return (
                <div key={sauvegarde.id} style={{
                  background: '#fff', border: `2px solid ${INK}`,
                  boxShadow: `4px 4px 0 ${INK}`, borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px' }}>
                    {reco.poster_url && (
                      <img src={reco.poster_url} alt={reco.title}
                        style={{ width: '52px', height: '70px', objectFit: 'cover', objectPosition: 'center top', borderRadius: '2px', border: `1.5px solid ${INK}`, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '4px' }}>
                        <TypeIcon type={reco.type} size={10} color={INK} />{reco.type}
                      </span>
                      <p style={{ fontWeight: 700, fontSize: '17px', color: INK, fontFamily: 'var(--font-title)', lineHeight: 1.1, marginBottom: '3px' }}>
                        {reco.title}
                      </p>
                      {reco.creator && <p style={{ fontSize: '12px', color: INK, opacity: 0.5 }}>{reco.creator}</p>}
                      {reco.comment && (
                        <p style={{ fontSize: '13px', color: INK, fontStyle: 'italic', lineHeight: 1.6, borderLeft: `3px solid ${YELLOW}`, paddingLeft: '10px', marginTop: '8px', fontFamily: 'var(--font-title)', opacity: 0.75 }}>
                          "{reco.comment}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', borderTop: `2px solid ${INK}`,
                    background: '#FAFAF0',
                  }}>
                    <p style={{ fontSize: '11px', color: INK, opacity: 0.5, fontWeight: 700, letterSpacing: '0.04em' }}>
                      par {reco.profiles?.full_name || reco.profiles?.username || 'Anonyme'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {reco.url && (
                        <a href={reco.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: INK, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', border: `2px solid ${INK}`, borderRadius: '2px', padding: '4px 10px' }}>
                          VOIR →
                        </a>
                      )}
                      <button onClick={() => retirerSauvegarde(sauvegarde.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'none', border: `2px solid ${INK}`, borderRadius: '2px',
                        padding: '4px 10px', fontSize: '11px', fontWeight: 700,
                        color: INK, cursor: 'pointer', letterSpacing: '0.04em',
                      }}>
                        <X size={11} strokeWidth={2.5} />Retirer
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}