'use client'
// ============================================
// PAGE D'ACCUEIL — TOURNE-DISQUE
// Esthétique pop art 60s
// ============================================

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'

// ---- Palette Pop Art ----
const BG       = '#FAFAF0'   // crème
const INK      = '#0a0a0a'   // noir profond
const YELLOW   = '#FFD600'   // jaune pop
const RED      = '#FF2D55'   // rouge pop
const DISK_BG  = '#111111'   // vinyle

const CONTACT_COLORS = [
  '#FF2D55', '#FFD600', '#0066FF', '#FF6B00',
  '#00CC66', '#CC00FF', '#00CCFF', '#FF3300',
]

const FILTERS = [
  { key: 'tout',    label: 'TOUT'    },
  { key: 'film',    label: 'FILM'    },
  { key: 'musique', label: 'MUSIQUE' },
  { key: 'livre',   label: 'LIVRE'   },
  { key: 'podcast', label: 'PODCAST' },
  { key: 'youtube', label: 'YOUTUBE' },
  { key: 'autre',   label: 'AUTRE'   },
]

// ---- Types ----
interface Reco {
  id: string
  user_id: string
  type: string
  title: string
  creator: string | null
  comment: string | null
  poster_url: string | null
  url: string | null
  color: string
  by: string
  username: string
}
interface Contact {
  user_id: string
  name: string
  username: string
  color: string
}

// ---- Fonctions de dessin ----
const W = 300, H = 300, CX = 150, CY = 150

function computeRingRadius(i: number, total: number): number {
  const minR = 48, maxR = 126
  if (total === 1) return (minR + maxR) / 2
  return minR + (maxR - minR) * (i / (total - 1))
}

function drawDisk(
  canvas: HTMLCanvasElement,
  recos: Reco[],
  activeIdx: number,
  rotation: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)

  // Fond du disque — noir vinyle
  ctx.beginPath()
  ctx.arc(CX, CY, 146, 0, Math.PI * 2)
  ctx.fillStyle = DISK_BG
  ctx.fill()

  // Bordure épaisse noire pop art
  ctx.beginPath()
  ctx.arc(CX, CY, 146, 0, Math.PI * 2)
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.stroke()

  // Sillons discrets
  for (let r = 30; r < 140; r += 6) {
    ctx.beginPath()
    ctx.arc(CX, CY, r, 0, Math.PI * 2)
    ctx.strokeStyle = r % 18 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Rayon de lecture — zone éclairée vers l'aiguille (angle 0 = droite)
  const halfAngle = 0.14
  const rayGrad = ctx.createLinearGradient(CX, CY, CX + 140, CY)
  rayGrad.addColorStop(0, 'rgba(255,255,255,0.22)')
  rayGrad.addColorStop(0.6, 'rgba(255,255,255,0.08)')
  rayGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.moveTo(CX, CY)
  ctx.arc(CX, CY, 140, -halfAngle, halfAngle)
  ctx.closePath()
  ctx.fillStyle = rayGrad
  ctx.fill()

  if (recos.length === 0) {
    ctx.font = '500 11px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.textAlign = 'center'
    ctx.fillText('aucune reco', CX, CY + 4)
  } else {
    recos.forEach((reco, i) => {
      const baseAngle = (i / recos.length) * Math.PI * 2
      const a = baseAngle + rotation
      const radius = computeRingRadius(i, recos.length)
      const x = CX + Math.cos(a) * radius
      const y = CY + Math.sin(a) * radius
      const isActive = i === activeIdx

      // Arc coloré sur le sillon
      const arcSpan = Math.min(0.3, (Math.PI * 2 / recos.length) * 0.7)
      ctx.beginPath()
      ctx.arc(CX, CY, radius, a - arcSpan, a + arcSpan)
      ctx.strokeStyle = reco.color
      ctx.lineWidth = isActive ? 3 : 1.5
      ctx.globalAlpha = isActive ? 1 : 0.5
      ctx.stroke()
      ctx.globalAlpha = 1

      // Point — avec contour noir pop art
      const ptR = isActive ? 8 : 5
      ctx.beginPath()
      ctx.arc(x, y, ptR, 0, Math.PI * 2)
      ctx.fillStyle = reco.color
      ctx.globalAlpha = isActive ? 1 : 0.75
      ctx.fill()
      ctx.globalAlpha = 1
      // Contour noir
      ctx.beginPath()
      ctx.arc(x, y, ptR, 0, Math.PI * 2)
      ctx.strokeStyle = isActive ? INK : 'rgba(0,0,0,0.4)'
      ctx.lineWidth = isActive ? 1.5 : 0.8
      ctx.stroke()

      // Halo actif
      if (isActive) {
        // Trait du centre vers le point
        ctx.beginPath()
        ctx.moveTo(CX, CY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = reco.color
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.35
        ctx.stroke()
        ctx.globalAlpha = 1

        // Halo coloré
        ctx.beginPath()
        ctx.arc(x, y, 15, 0, Math.PI * 2)
        ctx.fillStyle = reco.color
        ctx.globalAlpha = 0.25
        ctx.fill()
        ctx.globalAlpha = 1

        // Initiale
        ctx.font = '700 9px Inter, sans-serif'
        ctx.fillStyle = INK
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(reco.by[0].toUpperCase(), x, y)
        ctx.textBaseline = 'alphabetic'
      }
    })
  }

  // Centre — étiquette jaune pop art
  ctx.beginPath()
  ctx.arc(CX, CY, 24, 0, Math.PI * 2)
  ctx.fillStyle = YELLOW
  ctx.fill()
  ctx.beginPath()
  ctx.arc(CX, CY, 24, 0, Math.PI * 2)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.stroke()

  // Trou central
  ctx.beginPath()
  ctx.arc(CX, CY, 5, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()

  // Aiguille rouge
  const needleX = CX + 146
  ctx.beginPath()
  ctx.moveTo(needleX + 10, CY - 18)
  ctx.lineTo(needleX + 10, CY + 18)
  ctx.strokeStyle = RED
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(needleX + 10, CY, 4, 0, Math.PI * 2)
  ctx.fillStyle = RED
  ctx.fill()
  ctx.beginPath()
  ctx.arc(needleX + 10, CY, 4, 0, Math.PI * 2)
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function findClosest(recos: Reco[], rotation: number): number {
  if (recos.length === 0) return -1
  let best = -1, bestDist = Infinity
  recos.forEach((_, i) => {
    const baseAngle = (i / recos.length) * Math.PI * 2
    let a = ((baseAngle + rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    let dist = Math.abs(a)
    if (dist > Math.PI) dist = Math.PI * 2 - dist
    if (dist < bestDist) { bestDist = dist; best = i }
  })
  return bestDist < 0.45 ? best : -1
}

// ---- Composant ----
export default function Feed() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [allRecos, setAllRecos] = useState<Reco[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeFilter, setActiveFilter] = useState('tout')
  const [activeReco, setActiveReco] = useState<Reco | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const draggingRef = useRef(false)
  const lastAngleRef = useRef(0)
  const activeIdxRef = useRef(-1)
  const recosRef = useRef<Reco[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: followsData } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)

      if (!followsData || followsData.length === 0) { setLoading(false); return }

      const followingIds = followsData.map((f: any) => f.following_id)
      const [profilesRes, recosRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name').in('id', followingIds),
        supabase.from('recommendations')
          .select('id, user_id, type, title, creator, comment, poster_url, url')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(60),
      ])

      const colorMap: Record<string, string> = {}
      const contactsList: Contact[] = []
      profilesRes.data?.forEach((p: any, i: number) => {
        const color = CONTACT_COLORS[i % CONTACT_COLORS.length]
        colorMap[p.id] = color
        contactsList.push({ user_id: p.id, name: p.full_name || p.username, username: p.username, color })
      })
      setContacts(contactsList)

      if (recosRes.data) {
        const recos: Reco[] = recosRes.data.map((r: any) => ({
          ...r,
          color: colorMap[r.user_id] || '#888',
          by: contactsList.find(c => c.user_id === r.user_id)?.name || '?',
          username: contactsList.find(c => c.user_id === r.user_id)?.username || '',
        }))
        setAllRecos(recos)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredRecos = activeFilter === 'tout'
    ? allRecos
    : allRecos.filter(r => r.type === activeFilter)

  useEffect(() => {
    recosRef.current = filteredRecos
    activeIdxRef.current = -1
    rotationRef.current = 0
    setActiveReco(null)
    if (canvasRef.current) drawDisk(canvasRef.current, filteredRecos, -1, 0)
  }, [activeFilter, allRecos])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width, scaleY = H / rect.height
      if ('touches' in e && e.touches.length > 0)
        return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
      return { x: ((e as MouseEvent).clientX - rect.left) * scaleX, y: ((e as MouseEvent).clientY - rect.top) * scaleY }
    }
    const getAngle = (x: number, y: number) => Math.atan2(y - CY, x - CX)

    const onDown = (e: MouseEvent | TouchEvent) => {
      draggingRef.current = true
      const p = getPos(e)
      lastAngleRef.current = getAngle(p.x, p.y)
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return
      const p = getPos(e)
      const angle = getAngle(p.x, p.y)
      rotationRef.current += angle - lastAngleRef.current
      lastAngleRef.current = angle
      const recos = recosRef.current
      const idx = findClosest(recos, rotationRef.current)
      if (idx !== activeIdxRef.current) {
        activeIdxRef.current = idx
        setActiveReco(idx !== -1 ? recos[idx] : null)
      }
      drawDisk(canvas, recos, activeIdxRef.current, rotationRef.current)
      if ('touches' in e) e.preventDefault()
    }
    const onUp = () => { draggingRef.current = false }

    canvas.addEventListener('mousedown', onDown as EventListener)
    canvas.addEventListener('touchstart', onDown as EventListener, { passive: false })
    canvas.addEventListener('mousemove', onMove as EventListener)
    canvas.addEventListener('touchmove', onMove as EventListener, { passive: false })
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchend', onUp)
    window.addEventListener('mouseup', onUp)
    return () => {
      canvas.removeEventListener('mousedown', onDown as EventListener)
      canvas.removeEventListener('touchstart', onDown as EventListener)
      canvas.removeEventListener('mousemove', onMove as EventListener)
      canvas.removeEventListener('touchmove', onMove as EventListener)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchend', onUp)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div style={{
      background: BG, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingBottom: '80px', fontFamily: 'var(--font)',
      maxWidth: '520px', margin: '0 auto',
    }}>

      {/* ---- HEADER ---- */}
      <div style={{
        width: '100%', padding: '12px 20px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `2px solid ${INK}`,
      }}>
        <span style={{
          fontFamily: 'var(--font-title)', color: INK,
          fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px',
        }}>
          reco
        </span>
        <span style={{
          fontSize: '10px', color: INK, letterSpacing: '0.15em',
          fontWeight: 500, opacity: 0.4,
        }}>
          {timeStr}
        </span>
      </div>

      {/* ---- FILTRES ---- */}
      <div style={{
        display: 'flex', gap: '6px', padding: '8px 16px',
        width: '100%', boxSizing: 'border-box',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: `2px solid ${INK}`,
      }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '5px 12px',
              borderRadius: '2px',
              border: `2px solid ${INK}`,
              background: activeFilter === f.key ? YELLOW : 'transparent',
              color: INK,
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font)',
              boxShadow: activeFilter === f.key ? `3px 3px 0 ${INK}` : 'none',
              transform: activeFilter === f.key ? 'translate(-1px, -1px)' : 'none',
              transition: 'all 0.1s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ---- DÉTAIL RECO (compact, au-dessus du disque) ---- */}
      <div style={{ width: '100%', padding: '8px 16px 0', boxSizing: 'border-box', height: '72px', flexShrink: 0 }}>
        {!activeReco ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid transparent`,
          }}>
            <p style={{
              fontFamily: 'var(--font-title)', fontSize: '14px',
              color: INK, fontStyle: 'italic', textAlign: 'center',
              opacity: 0.2, margin: 0,
            }}>
              {allRecos.length === 0 && !loading
                ? 'Suis des contacts pour découvrir leurs recos'
                : 'Tourne pour découvrir les recos de tes contacts'}
            </p>
          </div>
        ) : (
          <div style={{
            height: '100%',
            background: '#fff',
            border: `2px solid ${INK}`,
            boxShadow: `3px 3px 0 ${INK}`,
            borderRadius: '2px',
            padding: '8px 10px',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxSizing: 'border-box',
          }}>
            {activeReco.poster_url && (
              <img
                src={activeReco.poster_url}
                alt={activeReco.title}
                style={{
                  width: '36px', height: '48px', borderRadius: '2px',
                  objectFit: 'cover', flexShrink: 0,
                  border: `1.5px solid ${INK}`,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '8px', letterSpacing: '0.16em', color: INK,
                textTransform: 'uppercase', marginBottom: '2px',
                fontWeight: 700, opacity: 0.4,
              }}>
                {activeReco.type}
              </p>
              <p style={{
                fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700,
                color: INK, lineHeight: 1.1, marginBottom: '3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {activeReco.title}
              </p>
              {activeReco.creator && (
                <p style={{ fontSize: '11px', color: INK, opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeReco.creator}</p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: activeReco.color, border: `1.5px solid ${INK}`,
              }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: INK, letterSpacing: '0.06em' }}>
                {activeReco.by}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ---- DISQUE ---- */}
      <div style={{
        position: 'relative',
        width: 'min(240px, calc(100vw - 60px))',
        aspectRatio: '1/1',
        margin: '10px auto 0', flexShrink: 0,
      }}>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{
            display: 'block', cursor: 'grab', touchAction: 'none',
            opacity: loading ? 0 : 1, transition: 'opacity 0.4s',
            width: '100%', height: '100%',
          }}
        />
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: `3px solid ${INK}`, borderTopColor: YELLOW,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
      </div>

      <p style={{
        fontSize: '9px', color: INK, letterSpacing: '0.2em',
        fontWeight: 700, textAlign: 'center', padding: '6px 0 8px',
        opacity: 0.25,
      }}>
        ↺ TOURNE LE DISQUE
      </p>

      {/* ---- CONTACTS ---- */}
      {contacts.length > 0 && (
        <div style={{
          display: 'flex', gap: '10px', padding: '6px 16px 10px',
          width: '100%', boxSizing: 'border-box',
          overflowX: 'auto', scrollbarWidth: 'none', justifyContent: 'center',
          borderBottom: `2px solid ${INK}`,
        }}>
          {contacts.map(contact => (
            <div
              key={contact.user_id}
              onClick={() => router.push(`/u/${contact.username}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                cursor: 'pointer', flexShrink: 0,
                opacity: !activeReco || activeReco.user_id === contact.user_id ? 1 : 0.2,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: contact.color,
                border: `2px solid ${INK}`,
                boxShadow: `2px 2px 0 ${INK}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#fff',
                textShadow: `1px 1px 0 ${INK}`,
              }}>
                {contact.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '8px', color: INK, letterSpacing: '0.08em', fontWeight: 500, opacity: 0.5 }}>
                {contact.username}
              </span>
            </div>
          ))}
        </div>
      )}

      <NavBar current="/" router={router} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #vn-filters::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
