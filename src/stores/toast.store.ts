import { ref } from 'vue'
import { defineStore } from 'pinia'

const DISPLAY_MS = 3000

// One short confirmation at a time across the top of the screen (see
// AppToast.vue). Mostly for things added from a sheet that closes on
// save, where nothing else on screen would show it worked -- adding an
// expense while on Spareplan, say. A newer message replaces an older one
// and restarts the clock rather than queueing behind it.
export const useToastStore = defineStore('toast', () => {
  const message = ref<string | null>(null)
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  function show(text: string) {
    clearTimeout(hideTimer)
    message.value = text
    hideTimer = setTimeout(() => {
      message.value = null
    }, DISPLAY_MS)
  }

  function dismiss() {
    clearTimeout(hideTimer)
    message.value = null
  }

  return { message, show, dismiss }
})
