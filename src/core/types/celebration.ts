// A moment worth marking with confetti -- a savings milestone passed or
// a badge unlocked. Built in src/core so the wording lives next to the
// rule that triggers it; shown by CelebrationOverlay.vue.
export interface Celebration {
  icon: string
  title: string
  message: string
}
