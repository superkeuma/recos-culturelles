// ============================================
// COMPOSANT ICÔNE DE TYPE
// Remplace les emojis par des icônes SVG
// épurées de la librairie Lucide.
// Utilisé partout dans l'app.
// ============================================

import {
  Film, Music, BookOpen, Mic, Gamepad2,
  Youtube, Theater, Sparkles
} from 'lucide-react'

interface Props {
  type: string
  size?: number
  color?: string
}

// --- Correspondance type → icône Lucide ---
const ICONS: Record<string, any> = {
  film:      Film,
  serie:     Film,
  musique:   Music,
  livre:     BookOpen,
  podcast:   Mic,
  jeu:       Gamepad2,
  youtube:   Youtube,
  spectacle: Theater,
  autre:     Sparkles,
}

export default function TypeIcon({ type, size = 16, color = 'currentColor' }: Props) {
  const Icon = ICONS[type] || Sparkles
  return <Icon size={size} color={color} strokeWidth={1.5} />
}