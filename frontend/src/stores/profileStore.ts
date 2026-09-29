import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  name: string
  email: string
  workspaceName: string
  title: string
  phone: string
  upiId: string
  plan: string
  avatarColor: string
}

interface ProfileStore extends UserProfile {
  updateProfile: (fields: Partial<UserProfile>) => void
  resetProfile: () => void
}

export const defaultProfile: UserProfile = {
  name: 'Studio',
  email: 'studio@memora.app',
  workspaceName: 'Studio workspace',
  title: 'Personal workspace',
  phone: '',
  upiId: '',
  plan: 'Free plan',
  avatarColor: '#2563eb', // Royal Blue
}

export const AVATAR_COLORS = [
  { label: 'Blue', value: '#2563eb' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Cyan', value: '#0891b2' },
]

export function extractInitials(name: string): string {
  if (!name || !name.trim()) return 'M'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      ...defaultProfile,
      updateProfile: (fields) => set((state) => ({ ...state, ...fields })),
      resetProfile: () => set(defaultProfile),
    }),
    {
      name: 'memora-user-profile-v1',
    }
  )
)
