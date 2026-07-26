import type { SavingsGoalTheme } from '@/types/database.types'

export interface SavingsThemeInfo {
  icon: string
  label: string
  gradient: string
}

// A themed icon + gradient per goal, used as motivational "cover art" on
// savings goal cards -- no image upload/storage needed to get a distinct
// look per goal (vacation vs wedding vs...).
export const SAVINGS_THEMES: Record<SavingsGoalTheme, SavingsThemeInfo> = {
  vacation: { icon: '🏖️', label: 'Ferie', gradient: 'linear-gradient(135deg, #f59e0b, #38bdf8)' },
  wedding: { icon: '💍', label: 'Bryllup', gradient: 'linear-gradient(135deg, #f472b6, #facc15)' },
  home: { icon: '🏠', label: 'Bolig', gradient: 'linear-gradient(135deg, #34d399, #0ea5e9)' },
  car: { icon: '🚗', label: 'Bil', gradient: 'linear-gradient(135deg, #64748b, #1e293b)' },
  education: { icon: '🎓', label: 'Utdanning', gradient: 'linear-gradient(135deg, #a78bfa, #6366f1)' },
  other: {
    icon: '🎯',
    label: 'Annet',
    gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  },
}
