import { ref, watch } from 'vue'
import { profilesService } from '@/services/profiles.service'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

// Resolves profile display names for a changing set of ids -- e.g.
// whoever logged income, paid for a transaction, or created a recurring
// cost -- fetching only the ids not already cached, so callers can show
// "who did this" without a separate query per name.
export function useProfileNames(idsSource: () => string[]) {
  const profiles = ref(new Map<string, Profile>())

  watch(
    idsSource,
    async (ids) => {
      const missingIds = [...new Set(ids)].filter((id) => !profiles.value.has(id))
      if (!missingIds.length) return

      const fetched = await profilesService.listByIds(missingIds)
      for (const profile of fetched) {
        profiles.value.set(profile.id, profile)
      }
    },
    { immediate: true },
  )

  function nameFor(profileId: string): string {
    return profiles.value.get(profileId)?.display_name ?? 'Ukjent'
  }

  return { nameFor }
}
