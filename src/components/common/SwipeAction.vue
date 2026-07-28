<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ label: string }>()
const emit = defineEmits<{ action: [] }>()

// Distances in px, not percentages -- these are deliberately small/fixed
// since rows are a fixed height regardless of screen width.
const DRAG_THRESHOLD = 8 // movement below this is treated as a tap, not a swipe
const REVEAL_WIDTH = 88 // how far a partial swipe slides to reveal the label
const COMMIT_DISTANCE = 180 // dragging this far commits the action immediately

const translateX = ref(0)
const dragging = ref(false)
const movedPastThreshold = ref(false)
const activePointerId = ref<number | null>(null)
const startX = ref(0)
const startTranslateX = ref(0)

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  activePointerId.value = event.pointerId
  startX.value = event.clientX
  startTranslateX.value = translateX.value
  movedPastThreshold.value = false
}

function onPointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return
  const delta = event.clientX - startX.value

  if (!movedPastThreshold.value) {
    if (Math.abs(delta) < DRAG_THRESHOLD) return
    movedPastThreshold.value = true
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  let next = Math.min(0, startTranslateX.value + delta)
  if (next < -COMMIT_DISTANCE) {
    // Resistance past the commit point, so it doesn't feel like the row
    // just flies off with no feedback.
    next = -COMMIT_DISTANCE - (-next - COMMIT_DISTANCE) * 0.3
  }
  translateX.value = next
}

function onPointerUp(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return
  activePointerId.value = null

  // Not a drag -- a plain tap, let the click go to whatever's underneath
  // (e.g. the info icon inside the row) instead of reacting to it here.
  if (!dragging.value) return
  dragging.value = false

  if (translateX.value <= -COMMIT_DISTANCE * 0.75) {
    translateX.value = 0
    emit('action')
    return
  }

  translateX.value = translateX.value <= -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0
}

function handleActionClick() {
  translateX.value = 0
  emit('action')
}
</script>

<template>
  <div class="swipe-action">
    <button
      type="button"
      class="swipe-action-reveal"
      :style="{ width: `${-translateX}px` }"
      @click="handleActionClick"
    >
      <span class="swipe-action-reveal-label">{{ label }}</span>
    </button>
    <div
      class="swipe-action-content"
      :class="{ 'swipe-action-content-animated': !dragging }"
      :style="{ transform: `translateX(${translateX}px)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe-action {
  position: relative;
  overflow: hidden;
}

.swipe-action-reveal {
  /* Sized to exactly match the exposed gap (see :style binding) rather
     than spanning the full row at a fixed opacity -- otherwise this
     background would show through the content's translucent glass
     surface even at rest, with nothing dragged at all. No padding on
     this element itself -- padding would set a minimum rendered width
     even when width is bound to 0, leaving a persistent sliver. */
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0;
  border: none;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  overflow: hidden;
}

.swipe-action-reveal-label {
  padding-right: var(--space-4);
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
}

.swipe-action-content {
  position: relative;
  background: transparent;
  touch-action: pan-y;
  user-select: none;
}

.swipe-action-content-animated {
  transition: transform 0.2s ease;
}
</style>
