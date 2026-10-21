import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// The tab bar's "+" sheet links to a page with ?add=1, so a choice made
// there lands straight in that page's add form rather than one tap short
// of it. Cleared right away so going back or reloading doesn't reopen it.
export function useAddFromQuery(openAddForm: () => void) {
  const route = useRoute()
  const router = useRouter()

  watch(
    () => route.query.add,
    (add) => {
      if (!add) return
      openAddForm()
      router.replace({ query: {} })
    },
    { immediate: true },
  )
}
