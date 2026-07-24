import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import { authService, type SignInInput, type SignUpInput } from '@/services/auth.service'
import { profilesService } from '@/services/profiles.service'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function loadProfile(userId: string) {
    profile.value = await profilesService.getById(userId)
  }

  // Restores the session on page load, then keeps user/profile in sync
  // with subsequent sign-in/out events. Only runs once per app session.
  async function init() {
    if (initialized.value) return

    const session = await authService.getSession()
    user.value = session?.user ?? null
    if (user.value) await loadProfile(user.value.id)

    authService.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      if (user.value) {
        await loadProfile(user.value.id)
      } else {
        profile.value = null
      }
    })

    initialized.value = true
  }

  async function signUp(input: SignUpInput) {
    return authService.signUp(input)
  }

  async function signIn(input: SignInInput) {
    return authService.signIn(input)
  }

  async function signOut() {
    await authService.signOut()
  }

  return { user, profile, initialized, isAuthenticated, init, signUp, signIn, signOut }
})
