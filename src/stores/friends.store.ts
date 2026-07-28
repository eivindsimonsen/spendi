import { ref } from 'vue'
import { defineStore } from 'pinia'
import { friendshipsService } from '@/services/friendships.service'
import { friendInvitesService } from '@/services/friend-invites.service'
import { profilesService } from '@/services/profiles.service'
import type { Database } from '@/types/database.types'

type Friendship = Database['public']['Tables']['friendships']['Row']
type FriendInviteCode = Database['public']['Tables']['friend_invite_codes']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export const useFriendsStore = defineStore('friends', () => {
  const friendships = ref<Friendship[]>([])
  const friendProfiles = ref<Map<string, Profile>>(new Map())
  const myInviteCode = ref<FriendInviteCode | null>(null)

  function otherProfileId(friendship: Friendship, myUserId: string): string {
    return friendship.requester_id === myUserId ? friendship.addressee_id : friendship.requester_id
  }

  async function load(myUserId: string) {
    const [friendshipRows, inviteCodes] = await Promise.all([
      friendshipsService.listMine(),
      friendInvitesService.listMine(myUserId),
    ])

    friendships.value = friendshipRows
    myInviteCode.value = inviteCodes.find((code) => !code.redeemed_by) ?? null

    const otherIds = [...new Set(friendshipRows.map((f) => otherProfileId(f, myUserId)))]
    const profiles = otherIds.length ? await profilesService.listByIds(otherIds) : []
    friendProfiles.value = new Map(profiles.map((profile) => [profile.id, profile]))
  }

  async function generateInviteCode(myUserId: string) {
    myInviteCode.value = await friendInvitesService.create(myUserId)
    return myInviteCode.value
  }

  async function redeemCode(code: string) {
    return friendInvitesService.redeem(code)
  }

  return {
    friendships,
    friendProfiles,
    myInviteCode,
    otherProfileId,
    load,
    generateInviteCode,
    redeemCode,
  }
})
