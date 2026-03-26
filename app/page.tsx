'use client'
// ============================================
// PAGE D'ACCUEIL — ROUE DE LOTERIE
// DA : fond crème, noir, accent jaune — pop art 60s
// ============================================

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'

// ── Palette pop art 60s ──
const BG     = '#FAFAF0'
const INK    = '#0a0a0a'
const YELLOW = '#FFD600'

// ── Couleurs par type ──
const TYPE_META: Record<string, { bg: string; accent: string; emoji: string }> = {
  film:      { bg: '#2d1810', accent: '#e8845a', emoji: '🎬' },
  musique:   { bg: '#0f1a2d', accent: '#7b9ee8', emoji: '🎵' },
  livre:     { bg: '#0f2316', accent: '#6eba7e', emoji: '📚' },
  podcast:   { bg: '#2d2310', accent: '#e8c45a', emoji: '🎙️' },
  youtube:   { bg: '#2d0f0f', accent: '#e87b7b', emoji: '▶️' },
  spectacle: { bg: '#1e1a2d', accent: '#b07be8', emoji: '🎭' },
  série:     { bg: '#1a2010', accent: '#a0cc7b', emoji: '📺' },
  autre:     { bg: '#1a1a1a', accent: '#888888', emoji: '✨' },
}

const FILTERS = ['tout', 'film', 'musique', 'livre', 'podcast', 'youtube', 'série']

const CONTACT_COLORS = [
  '#FF2D55','#FFD600','#0066FF','#FF6B00',
  '#00CC66','#CC00FF','#00CCFF','#FF3300',
]

// ── Types ──
interface Reco {
  id: string; user_id: string; type: string; title: string
  creator: string | null; comment: string | null
  poster_url: string | null; url: string | null
  color: string; by: string; username: string
}
interface Contact {
  user_id: string; name: string; username: string; color: string
}

// ── Wheel ──
const WHEEL_R  = 130   // rayon px
const MIN_SEGS = 8     // nombre minimum de segments (répète si besoin)

function toRad(d: number) { return d * Math.PI / 180 }

function segPath(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const x1 = cx + r * Math.cos(toRad(a1))
  const y1 = cy + r * Math.sin(toRad(a1))
  const x2 = cx + r * Math.cos(toRad(a2))
  const y2 = cy + r * Math.sin(toRad(a2))
  const large = (a2 - a1 > 180) ? 1 : 0
  return `M ${cx},${cy} L ${x1.toFixed(2)},${y1.toFixed(2)} A ${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
}

// ── Composant principal ──
export default function Feed() {
  const router = useRouter()
  const [loading,      setLoading]      = useState(true)
  const [allRecos,     setAllRecos]     = useState<Reco[]>([])
  const [contacts,     setContacts]     = useState<Contact[]>([])
  const [activeFilter, setActiveFilter] = useState('tout')
  const [page,         setPage]         = useState(0)
  const [spinAngle,    setSpinAngle]    = useState(0)
  const [isDragging,   setIsDragging]   = useState(false)

  const pointerDown = useRef(false)
  const prevAngle   = useRef(0)
  const wheelRef    = useRef<HTMLDivElement>(null)

  // ── Chargement Supabase ──
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: followsData } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)

      if (!followsData || followsData.length === 0) { setLoading(false); return }

      const ids = followsData.map((f: any) => f.following_id)
      const [profilesRes, recosRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name').in('id', ids),
        supabase.from('recommendations')
          .select('id, user_id, type, title, creator, comment, poster_url, url')
          .in('user_id', ids)
          .order('created_at', { ascending: false })
          .limit(240),
      ])

      const colorMap: Record<string, string> = {}
      const cl: Contact[] = []
      profilesRes.data?.forEach((p: any, i: number) => {
        const color = CONTACT_COLORS[i % CONTACT_COLORS.length]
        colorMap[p.id] = color
        cl.push({ user_id: p.id, name: p.full_name || p.username, username: p.username, color })
      })
      setContacts(cl)

      if (recosRes.data) {
        setAllRecos(recosRes.data.map((r: any) => ({
          ...r,
          color: colorMap[r.user_id] || '#888',
          by:    cl.find(c => c.user_id === r.user_id)?.name || '?',
          username: cl.find(c => c.user_id === r.user_id)?.username || '',
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Filtres + pagination (24 recos par roue) ──
  const PAGE_SIZE = 24
  const filteredRecos = activeFilter === 'tout'
    ? allRecos
    : allRecos.filter(r => r.type === activeFilter)
  const totalPages = Math.max(1, Math.ceil(filteredRecos.length / PAGE_SIZE))
  const recos = filteredRecos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset à la page 0 quand le filtre ou les données changent
  useEffect(() => {
    const filtered = activeFilter === 'tout' ? allRecos : allRecos.filter(r => r.type === activeFilter)
    const N0 = Math.max(MIN_SEGS, Math.min(PAGE_SIZE, filtered.length))
    setPage(0)
    setSpinAngle(270 - (360 / N0) / 2)
  }, [activeFilter, allRecos])

  // ── Navigation entre pages ──
  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return
    const slice = filteredRecos.slice(newPage * PAGE_SIZE, (newPage + 1) * PAGE_SIZE)
    const N0 = Math.max(MIN_SEGS, slice.length)
    setPage(newPage)
    setSpinAngle(270 - (360 / N0) / 2)
  }

  // ── Segments de la roue (répète si < MIN_SEGS) ──
  const segments = recos.length === 0 ? [] :
    Array.from({ length: Math.max(MIN_SEGS, recos.length) }, (_, i) => recos[i % recos.length])

  const N        = segments.length
  const segAngle = N > 0 ? 360 / N : 360

  // ── Segment actif (celui en haut = 270° dans SVG) ──
  const topAngle      = (((270 - spinAngle) % 360) + 360) % 360
  const activeSegIdx  = N > 0 ? Math.floor(topAngle / segAngle) % N : 0
  const activeReco    = recos.length > 0 ? segments[activeSegIdx] : null
  const typeMeta      = TYPE_META[activeReco?.type ?? ''] ?? TYPE_META.autre

  // ── Snap au segment i ──
  const snapTo = (i: number) => {
    const base = 270 - i * segAngle - segAngle / 2
    const revs = Math.round((spinAngle - base) / 360)
    setSpinAngle(base + revs * 360)
  }

  // ── Clavier ──
  useEffect(() => {
    if (N === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  snapTo((activeSegIdx - 1 + N) % N)
      if (e.key === 'ArrowRight') snapTo((activeSegIdx + 1) % N)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSegIdx, N, segAngle, spinAngle])

  // ── Drag rotatif (suit le doigt autour du centre) ──
  const getAngle = (clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0
    const rect = wheelRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top  + rect.height / 2
    return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI
  }

  const onPointerDown = (e: React.PointerEvent) => {
    pointerDown.current = true
    prevAngle.current   = getAngle(e.clientX, e.clientY)
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerDown.current) return
    const angle = getAngle(e.clientX, e.clientY)
    let delta = angle - prevAngle.current
    // Corrige le saut ±180° lors du passage par la discontinuité atan2
    if (delta >  180) delta -= 360
    if (delta < -180) delta += 360
    prevAngle.current = angle
    setSpinAngle(prev => prev + delta)
  }
  const onPointerUp = () => {
    if (!pointerDown.current) return
    pointerDown.current = false
    setIsDragging(false)
    snapTo(activeSegIdx)
  }

  // ── Heure ──
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`

  const CX = WHEEL_R
  const CY = WHEEL_R
  const D  = WHEEL_R * 2

  return (
    <div style={{
      background: BG, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      paddingBottom: 80, fontFamily: 'Inter, sans-serif',
      maxWidth: 520, margin: '0 auto',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `2px solid ${INK}`,
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: '-0.5px' }}>reco</span>
        <span style={{ fontSize: 10, color: INK, opacity: 0.4, letterSpacing: '0.15em', fontWeight: 600 }}>{timeStr}</span>
      </div>

      {/* ── Filtres ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 16px',
        overflowX: 'auto', borderBottom: `2px solid ${INK}`,
        scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '5px 12px', borderRadius: 2,
            border: `2px solid ${INK}`,
            background: activeFilter === f ? YELLOW : 'transparent',
            color: INK, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            boxShadow: activeFilter === f ? `3px 3px 0 ${INK}` : 'none',
            transform: activeFilter === f ? 'translate(-1px,-1px)' : 'none',
            transition: 'all 0.1s',
          }}>{f}</button>
        ))}
      </div>

      {/* ── Infos reco active ── */}
      <div style={{ padding: '12px 16px 0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          background: '#fff',
          border: `2px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          borderRadius: 2,
          padding: '12px 14px',
          height: 100,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          {activeReco ? (
            <>
              {/* Badge type */}
              <span style={{
                fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                fontWeight: 700, color: typeMeta.accent, background: typeMeta.bg,
                padding: '2px 8px', borderRadius: 1,
                display: 'inline-block', marginBottom: 6,
              }}>{activeReco.type}</span>

              {/* Titre + lien */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, color: INK,
                  margin: 0, lineHeight: 1.2,
                  fontFamily: 'var(--font-title, Georgia, serif)',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                }}>{activeReco.title}</h2>
                {activeReco.url && (
                  <a
                    href={activeReco.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flexShrink: 0,
                      width: 26, height: 26,
                      border: `2px solid ${INK}`,
                      background: YELLOW,
                      boxShadow: `2px 2px 0 ${INK}`,
                      borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, textDecoration: 'none', color: INK,
                    }}
                  >↗</a>
                )}
              </div>

              {/* Contact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeReco.color, border: `1.5px solid ${INK}`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: INK, opacity: 0.55, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {activeReco.by}{activeReco.creator ? ` — ${activeReco.creator}` : ''}
                </span>
              </div>
            </>
          ) : (
            !loading && (
              <p style={{ fontSize: 13, color: INK, opacity: 0.3, fontStyle: 'italic', margin: 0 }}>
                {allRecos.length === 0 ? 'Suis des contacts pour voir leurs recos' : 'Aucune reco dans cette catégorie'}
              </p>
            )
          )}
        </div>
      </div>

      {/* ── Roue ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0 8px', gap: 0 }}>

        {/* Flèche gauche — recos plus récentes */}
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 0}
          style={{
            width: 40, height: 40, flexShrink: 0,
            border: `2px solid ${INK}`, borderRadius: 2,
            background: page === 0 ? 'transparent' : '#fff',
            boxShadow: page === 0 ? 'none' : `3px 3px 0 ${INK}`,
            cursor: page === 0 ? 'default' : 'pointer',
            fontSize: 18, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 16,
            opacity: page === 0 ? 0.25 : 1,
          }}
          onMouseDown={e => { if (page > 0) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = 'none' } }}
          onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = page > 0 ? `3px 3px 0 ${INK}` : 'none' }}
        >←</button>

        <div style={{ position: 'relative', width: D, height: D }}>

          {/* ── Pointeur (flèche fixe en haut) ── */}
          <svg
            width={24} height={28}
            style={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              filter: `drop-shadow(0 2px 0 rgba(0,0,0,0.25))`,
            }}
          >
            <polygon points="12,26 2,2 22,2" fill={YELLOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          </svg>

          {/* ── Zone de drag ── */}
          <div
            ref={wheelRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width: D, height: D,
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none', userSelect: 'none',
              position: 'relative',
            }}
          >

            {/* Loading */}
            {loading && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${INK}`, borderTopColor: YELLOW, animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}

            {/* SVG roue */}
            {N > 0 && (
              <svg
                width={D} height={D}
                style={{
                  transform: `rotate(${spinAngle}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  display: 'block',
                }}
              >
                {/* Segments */}
                {segments.map((seg, i) => {
                  const a1   = i * segAngle
                  const a2   = (i + 1) * segAngle
                  const midA = (a1 + a2) / 2
                  const isActive = i === activeSegIdx
                  const meta = TYPE_META[seg.type] ?? TYPE_META.autre

                  // Alternance sombre / très sombre, jaune si actif
                  const fill = isActive
                    ? YELLOW
                    : (i % 2 === 0 ? meta.bg : '#111111')

                  // Position de l'emoji dans le segment
                  const eR = WHEEL_R * 0.60
                  const ex = CX + eR * Math.cos(toRad(midA))
                  const ey = CY + eR * Math.sin(toRad(midA))

                  const emojiSize = N <= 8 ? 22 : N <= 12 ? 17 : 12

                  return (
                    <g key={`${seg.id}-${i}`}>
                      <path
                        d={segPath(CX, CY, WHEEL_R, a1, a2)}
                        fill={fill}
                        stroke={INK}
                        strokeWidth={isActive ? 2.5 : 1.5}
                      />
                      <text
                        x={ex} y={ey}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={emojiSize}
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {meta.emoji}
                      </text>
                    </g>
                  )
                })}

                {/* Anneau extérieur */}
                <circle cx={CX} cy={CY} r={WHEEL_R - 1} fill="none" stroke={INK} strokeWidth={3} />

                {/* Moyeu central */}
                <circle cx={CX} cy={CY} r={22} fill={BG}  stroke={INK} strokeWidth={2.5} />
                <circle cx={CX} cy={CY} r={7}  fill={INK} />
              </svg>
            )}
          </div>
        </div>

        {/* Flèche droite — recos plus anciennes */}
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages - 1}
          style={{
            width: 40, height: 40, flexShrink: 0,
            border: `2px solid ${INK}`, borderRadius: 2,
            background: page >= totalPages - 1 ? 'transparent' : '#fff',
            boxShadow: page >= totalPages - 1 ? 'none' : `3px 3px 0 ${INK}`,
            cursor: page >= totalPages - 1 ? 'default' : 'pointer',
            fontSize: 18, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: 16,
            opacity: page >= totalPages - 1 ? 0.25 : 1,
          }}
          onMouseDown={e => { if (page < totalPages - 1) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = 'none' } }}
          onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = page < totalPages - 1 ? `3px 3px 0 ${INK}` : 'none' }}
        >→</button>

      </div>

      {/* ── Indicateur de page ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0 0' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} onClick={() => goToPage(i)} style={{
              width: i === page ? 18 : 6, height: 6, borderRadius: 3,
              background: i === page ? INK : 'rgba(10,10,10,0.2)',
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* ── Contacts ── */}
      {contacts.length > 0 && (
        <div style={{
          display: 'flex', gap: 14, padding: '12px 16px 6px',
          overflowX: 'auto', scrollbarWidth: 'none',
          justifyContent: 'center',
          borderTop: `2px solid ${INK}`,
          marginTop: 12,
        }}>
          {contacts.map(c => (
            <div key={c.user_id}
              onClick={() => router.push(`/u/${c.username}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: 'pointer', flexShrink: 0,
                opacity: !activeReco || activeReco.user_id === c.user_id ? 1 : 0.3,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: c.color, border: `2px solid ${INK}`,
                boxShadow: `2px 2px 0 ${INK}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>{c.name[0].toUpperCase()}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: INK, letterSpacing: '0.06em', opacity: 0.6 }}>
                {c.username}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Commentaire ── */}
      {activeReco?.comment && (
        <div style={{ padding: '10px 16px 0', width: '100%', boxSizing: 'border-box' }}>
          <p style={{
            fontSize: 13, color: INK, fontStyle: 'italic',
            opacity: 0.72, lineHeight: 1.65, margin: 0,
            borderLeft: `3px solid ${activeReco.color}`,
            paddingLeft: 12,
          }}>
            "{activeReco.comment}"
          </p>
        </div>
      )}

      <NavBar current="/" router={router} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
