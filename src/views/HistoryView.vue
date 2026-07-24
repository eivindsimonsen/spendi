<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { format, startOfMonth, subMonths } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useCategoriesStore } from '@/stores/categories.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { sumByCategory } from '@/core/transaction-stats'
import { formatCurrencyNOK } from '@/core/format'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface MonthGroup {
  month: string
  transactions: Transaction[]
}

const { currentPlan } = useCurrentPlan()
const categoriesStore = useCategoriesStore()
const transactionsStore = useTransactionsStore()
const { categoryLabel } = useCategoryLabel()

function defaultFromDate(): string {
  return format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
}

function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

const categoryId = ref('')
const fromDate = ref(defaultFromDate())
const toDate = ref(today())

async function reload() {
  if (!currentPlan.value) return
  await transactionsStore.loadHistory(currentPlan.value.id, {
    categoryId: categoryId.value || undefined,
    fromDate: fromDate.value || undefined,
    toDate: toDate.value || undefined,
  })
}

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    await categoriesStore.load(plan.id)
    await reload()
  },
  { immediate: true },
)

const categoryTotals = computed(() =>
  sumByCategory(
    transactionsStore.history.map((tx) => ({
      categoryId: tx.category_id,
      amount: tx.amount,
      occurredOn: tx.occurred_on,
    })),
  ),
)

const maxCategoryTotal = computed(() =>
  categoryTotals.value.length ? Math.max(...categoryTotals.value.map((c) => c.total)) : 0,
)

function barWidth(total: number): number {
  return maxCategoryTotal.value === 0 ? 0 : Math.round((total / maxCategoryTotal.value) * 100)
}

const groupedByMonth = computed<MonthGroup[]>(() => {
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactionsStore.history) {
    const month = tx.occurred_on.slice(0, 7)
    const existing = groups.get(month) ?? []
    existing.push(tx)
    groups.set(month, existing)
  }
  return Array.from(groups.entries())
    .map(([month, transactions]) => ({ month, transactions }))
    .sort((a, b) => b.month.localeCompare(a.month))
})

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-')
  const date = new Date(Number(year), Number(monthNum) - 1, 1)
  return date.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Historikk</h1>
    </div>

    <section class="card">
      <h2>Filter</h2>
      <div class="history-filters">
        <label class="form-field">
          Kategori
          <select v-model="categoryId" @change="reload">
            <option value="">Alle kategorier</option>
            <option
              v-for="category in categoriesStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.icon }} {{ category.name }}
            </option>
          </select>
        </label>
        <label class="form-field">
          Fra
          <input v-model="fromDate" type="date" @change="reload" />
        </label>
        <label class="form-field">
          Til
          <input v-model="toDate" type="date" @change="reload" />
        </label>
      </div>
    </section>

    <section v-if="categoryTotals.length" class="card">
      <h2>Fordeling per kategori</h2>
      <div v-for="stat in categoryTotals" :key="stat.categoryId" class="stat-bar-row">
        <span class="stat-bar-label">{{ categoryLabel(stat.categoryId) }}</span>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: barWidth(stat.total) + '%' }" />
        </div>
        <span class="stat-bar-value">{{ formatCurrencyNOK(stat.total) }}</span>
      </div>
    </section>

    <section class="card">
      <h2>Transaksjoner</h2>
      <p v-if="!transactionsStore.history.length" class="card-subtitle">
        Ingen utgifter registrert i denne perioden.
      </p>
      <div v-for="group in groupedByMonth" :key="group.month" class="history-month-group">
        <h3 class="history-month-heading">{{ monthLabel(group.month) }}</h3>
        <ul class="history-list">
          <li v-for="tx in group.transactions" :key="tx.id" class="history-item">
            <div>
              <p class="history-item-category">{{ categoryLabel(tx.category_id) }}</p>
              <p class="card-subtitle">
                {{ tx.occurred_on }}<span v-if="tx.note"> · {{ tx.note }}</span>
              </p>
            </div>
            <span class="history-item-amount">{{ formatCurrencyNOK(tx.amount) }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.history-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stat-bar-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: 0.9rem;
}

.stat-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-bar-value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.history-month-group {
  margin-bottom: var(--space-4);
}

.history-month-heading {
  text-transform: capitalize;
  font-size: 0.95rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-2);
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
}

.history-item:first-child {
  border-top: none;
  padding-top: 0;
}

.history-item-category {
  margin: 0;
  font-weight: 600;
}

.history-item-amount {
  font-weight: 600;
  white-space: nowrap;
}
</style>
