import { ref } from 'vue'

// Shared loading/error wrapper so every store action doesn't repeat the
// same try/catch/loading boilerplate.
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run(...args: Args): Promise<Result | undefined> {
    loading.value = true
    error.value = null
    try {
      return await action(...args)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Something went wrong'
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, error, run }
}
