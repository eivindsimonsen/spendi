<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useFriendsStore } from '@/stores/friends.store'
import { usePlansStore } from '@/stores/plans.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const authStore = useAuthStore()
const friendsStore = useFriendsStore()
const plansStore = usePlansStore()

onMounted(async () => {
  if (!authStore.user) return
  await Promise.all([
    friendsStore.load(authStore.user.id),
    plansStore.loadPendingInvites(authStore.user.id),
  ])
})

const { loading: generating, run: runGenerateCode } = useAsyncAction(async () => {
  if (authStore.user) await friendsStore.generateInviteCode(authStore.user.id)
})

const codeCopied = ref(false)
async function copyCode() {
  if (!friendsStore.myInviteCode) return
  await navigator.clipboard.writeText(friendsStore.myInviteCode.code)
  codeCopied.value = true
  setTimeout(() => {
    codeCopied.value = false
  }, 2000)
}

const redeemCodeInput = ref('')
const {
  loading: redeeming,
  error: redeemError,
  run: runRedeem,
} = useAsyncAction(async () => {
  if (!redeemCodeInput.value.trim() || !authStore.user) return
  await friendsStore.redeemCode(redeemCodeInput.value.trim())
  redeemCodeInput.value = ''
  await friendsStore.load(authStore.user.id)
})

const proposingFriendId = ref<string | null>(null)
const sharedPlanName = ref('')
const {
  loading: proposing,
  error: proposeError,
  run: runPropose,
} = useAsyncAction(async () => {
  if (!proposingFriendId.value || !sharedPlanName.value.trim()) return
  await plansStore.proposeSharedPlan(sharedPlanName.value.trim(), proposingFriendId.value)
  proposingFriendId.value = null
  sharedPlanName.value = ''
})

function startProposing(friendId: string) {
  proposingFriendId.value = friendId
  sharedPlanName.value = ''
}

async function respond(memberId: string, status: 'accepted' | 'declined') {
  await plansStore.respondToInvite(memberId, status)
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Venner og Spendiplan</h1>
    </div>

    <section v-if="plansStore.pendingInvites.length" class="card">
      <h2>Ventende invitasjoner</h2>
      <div
        v-for="invite in plansStore.pendingInvites"
        :key="invite.id"
        class="pending-invite"
      >
        <p>
          <strong>{{ friendsStore.friendProfiles.get(invite.invited_by ?? '')?.display_name ?? 'Noen' }}</strong>
          ønsker å starte Spendiplanen
          "{{ plansStore.pendingInvitePlans.get(invite.plan_id)?.name ?? '' }}" med deg.
        </p>
        <div class="pending-invite-actions">
          <button type="button" class="button-primary" @click="respond(invite.id, 'accepted')">
            Ja
          </button>
          <button type="button" class="pending-invite-decline" @click="respond(invite.id, 'declined')">
            Nei
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Din invitasjonskode</h2>
      <p class="card-subtitle">Del denne koden med en venn for å bli venner i appen.</p>
      <div v-if="friendsStore.myInviteCode" class="invite-code-row">
        <code class="invite-code">{{ friendsStore.myInviteCode.code }}</code>
        <button type="button" class="button-primary" @click="copyCode">
          {{ codeCopied ? 'Kopiert!' : 'Kopier' }}
        </button>
      </div>
      <button v-else type="button" class="button-primary" :disabled="generating" @click="runGenerateCode()">
        {{ generating ? 'Genererer …' : 'Generer kode' }}
      </button>
    </section>

    <section class="card">
      <h2>Løs inn en kode</h2>
      <form class="form" @submit.prevent="runRedeem()">
        <label class="form-field">
          Kode fra en venn
          <input v-model="redeemCodeInput" type="text" placeholder="F.eks. AB3D9F2K" required />
        </label>
        <p v-if="redeemError" class="form-error">{{ redeemError }}</p>
        <button type="submit" class="button-primary" :disabled="redeeming">
          {{ redeeming ? 'Løser inn …' : 'Bli venner' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Dine venner</h2>
      <p v-if="!friendsStore.friendships.length" class="card-subtitle">
        Ingen venner registrert ennå. Del koden din, eller løs inn en du har fått.
      </p>
      <ul v-else class="friend-list">
        <li v-for="friendship in friendsStore.friendships" :key="friendship.id" class="friend-item">
          <div class="friend-row">
            <span>
              {{
                friendsStore.friendProfiles.get(
                  friendsStore.otherProfileId(friendship, authStore.user?.id ?? ''),
                )?.display_name ?? 'Ukjent'
              }}
            </span>
            <button
              type="button"
              class="friend-propose-button"
              @click="
                startProposing(friendsStore.otherProfileId(friendship, authStore.user?.id ?? ''))
              "
            >
              Start Spendiplan
            </button>
          </div>

          <form
            v-if="proposingFriendId === friendsStore.otherProfileId(friendship, authStore.user?.id ?? '')"
            class="form propose-form"
            @submit.prevent="runPropose()"
          >
            <label class="form-field">
              Navn på Spendiplanen
              <input v-model="sharedPlanName" type="text" placeholder="F.eks. Felles økonomi" required />
            </label>
            <p v-if="proposeError" class="form-error">{{ proposeError }}</p>
            <button type="submit" class="button-primary" :disabled="proposing">
              {{ proposing ? 'Sender …' : 'Send forespørsel' }}
            </button>
          </form>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.pending-invite {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.pending-invite:first-child {
  border-top: none;
  padding-top: 0;
}

.pending-invite-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.pending-invite-decline {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
}

.invite-code-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.invite-code {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  background-color: var(--color-background);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.friend-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.friend-item {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.friend-item:first-child {
  border-top: none;
  padding-top: 0;
}

.friend-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.friend-propose-button {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  color: var(--color-primary);
  font-size: 0.85rem;
}

.propose-form {
  margin-top: var(--space-3);
}
</style>
