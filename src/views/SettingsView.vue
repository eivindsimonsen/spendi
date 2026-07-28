<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PayScheduleForm from '@/components/budget/PayScheduleForm.vue'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']

const { currentPlan } = useCurrentPlan()
const authStore = useAuthStore()
const categoriesStore = useCategoriesStore()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    await categoriesStore.load(plan.id)
  },
  { immediate: true },
)

const customCategories = computed(() => categoriesStore.categories.filter((category) => !category.is_system))
const systemCategories = computed(() => categoriesStore.categories.filter((category) => category.is_system))

const newName = ref('')
const newIcon = ref('')

const {
  loading: creating,
  error: createError,
  run: runCreate,
} = useAsyncAction(async () => {
  if (!newName.value.trim() || !currentPlan.value) return
  await categoriesStore.createCustom({
    planId: currentPlan.value.id,
    name: newName.value.trim(),
    icon: newIcon.value.trim() || undefined,
  })
  newName.value = ''
  newIcon.value = ''
})

const editingId = ref<string | null>(null)
const editName = ref('')
const editIcon = ref('')

function startEditing(category: Category) {
  editingId.value = category.id
  editName.value = category.name
  editIcon.value = category.icon ?? ''
}

function cancelEditing() {
  editingId.value = null
}

const {
  loading: saving,
  error: saveError,
  run: runSave,
} = useAsyncAction(async () => {
  if (!editingId.value || !editName.value.trim()) return
  await categoriesStore.update(editingId.value, {
    name: editName.value.trim(),
    icon: editIcon.value.trim() || undefined,
  })
  editingId.value = null
})

async function handleDelete(category: Category) {
  const confirmed = window.confirm(`Er du sikker på at du vil slette kategorien "${category.name}"?`)
  if (!confirmed) return

  try {
    await categoriesStore.remove(category.id)
  } catch (err) {
    window.alert(
      err instanceof Error
        ? err.message
        : 'Kunne ikke slette kategorien. Den kan være i bruk av en fast utgift eller utgift.',
    )
  }
}
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Innstillinger</h1>
      <p v-if="currentPlan" class="card-subtitle">
        For {{ currentPlan.type === 'shared' ? 'Spendiplanen' : 'planen' }} "{{ currentPlan.name }}"
      </p>
    </div>

    <section class="card">
      <h2>Lønningsdag</h2>
      <p class="card-subtitle">
        Din egen lønningsdag for denne planen. I en delt Spendiplan setter hver person sin egen.
      </p>
      <PayScheduleForm v-if="currentPlan && authStore.user" :plan-id="currentPlan.id" :profile-id="authStore.user.id" />
    </section>

    <section class="card">
      <h2>Ny kategori</h2>
      <form class="form" @submit.prevent="runCreate()">
        <label class="form-field">
          Navn
          <input v-model="newName" type="text" placeholder="F.eks. Kjæledyr" required />
        </label>
        <label class="form-field">
          Ikon (valgfritt)
          <input v-model="newIcon" type="text" placeholder="F.eks. 🐾" maxlength="4" />
        </label>
        <p v-if="createError" class="form-error">{{ createError }}</p>
        <button type="submit" class="button-primary" :disabled="creating">
          {{ creating ? 'Legger til …' : 'Legg til kategori' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Egne kategorier</h2>
      <p v-if="!customCategories.length" class="card-subtitle">
        Ingen egne kategorier ennå. Legg til en over.
      </p>
      <ul v-else class="category-list">
        <li v-for="category in customCategories" :key="category.id" class="category-item">
          <form v-if="editingId === category.id" class="form category-edit-form" @submit.prevent="runSave()">
            <div class="category-edit-fields">
              <input
                v-model="editIcon"
                type="text"
                placeholder="Ikon"
                maxlength="4"
                class="category-edit-icon"
              />
              <input v-model="editName" type="text" placeholder="Navn" required class="category-edit-name" />
            </div>
            <p v-if="saveError" class="form-error">{{ saveError }}</p>
            <div class="category-edit-actions">
              <button type="submit" class="button-primary" :disabled="saving">
                {{ saving ? 'Lagrer …' : 'Lagre' }}
              </button>
              <button type="button" class="button-link" @click="cancelEditing">Avbryt</button>
            </div>
          </form>
          <template v-else>
            <span class="category-item-label">{{ category.icon }} {{ category.name }}</span>
            <div class="category-item-actions">
              <button type="button" class="button-link" @click="startEditing(category)">Rediger</button>
              <button type="button" class="button-danger-link" @click="handleDelete(category)">Slett</button>
            </div>
          </template>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Standardkategorier</h2>
      <p class="card-subtitle">Disse er felles for alle og kan ikke endres.</p>
      <ul class="category-list">
        <li v-for="category in systemCategories" :key="category.id" class="category-item">
          <span class="category-item-label">{{ category.icon }} {{ category.name }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.category-item:first-child {
  border-top: none;
  padding-top: 0;
}

.category-item-label {
  font-weight: 600;
}

.category-item-actions {
  display: flex;
  gap: var(--space-3);
}

.category-edit-form {
  width: 100%;
}

.category-edit-fields {
  display: flex;
  gap: var(--space-2);
}

.category-edit-icon {
  width: 64px;
  flex-shrink: 0;
  font-size: 1rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-edit-name {
  flex: 1;
  font-size: 1rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-edit-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
