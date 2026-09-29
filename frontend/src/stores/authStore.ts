import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useProfileStore } from './profileStore'

export interface RegisteredUser {
  id: string
  name: string
  identifier: string // normalized email or phone
  rawIdentifier: string
  identifierType: 'email' | 'phone'
  password: string
  workspaceName?: string
  createdAt: string
}

export function detectIdentifierType(input: string): 'email' | 'phone' {
  const clean = input.trim()
  if (clean.includes('@')) return 'email'
  return 'phone'
}

export function normalizeIdentifier(input: string): string {
  const clean = input.trim().toLowerCase()
  if (clean.includes('@')) return clean
  // Extract all digits
  const digits = clean.replace(/\D/g, '')
  // If 10 digits (standard Indian mobile), standardise to +91 prefix
  if (digits.length === 10) return `+91${digits}`
  if (digits.length > 10 && !clean.startsWith('+')) return `+${digits}`
  return clean.replace(/[\s\-\(\)]/g, '')
}

const INITIAL_USERS: RegisteredUser[] = [
  {
    id: 'user-manohar-1',
    name: 'Manohar',
    identifier: 'manohar@memora.app',
    rawIdentifier: 'manohar@memora.app',
    identifierType: 'email',
    password: 'password123',
    workspaceName: 'Manohar Studio',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-manohar-phone',
    name: 'Manohar',
    identifier: '+919876543210',
    rawIdentifier: '+91 98765 43210',
    identifierType: 'phone',
    password: 'password123',
    workspaceName: 'Manohar Studio',
    createdAt: new Date().toISOString(),
  },
]

interface AuthState {
  isAuthenticated: boolean
  currentUser: RegisteredUser | null
  registeredUsers: RegisteredUser[]
  pendingOtp: {
    code: string
    identifier: string
    rawIdentifier: string
    identifierType: 'email' | 'phone'
    expiresAt: number
  } | null

  // Actions
  sendVerificationOtp: (input: string, name?: string) => Promise<{
    success: boolean
    code?: string
    error?: string
    identifierType?: 'email' | 'phone'
    isExisting?: boolean
  }>
  verifyOtpAndSignUp: (params: {
    name: string
    identifier: string
    code: string
    password: string
  }) => { success: boolean; error?: string }
  signIn: (identifierInput: string, passwordInput: string) => { success: boolean; error?: string }
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: true, // Default to true so existing app state loads seamlessly
      currentUser: INITIAL_USERS[0],
      registeredUsers: INITIAL_USERS,
      pendingOtp: null,

      sendVerificationOtp: async (input: string, name?: string) => {
        const raw = input.trim()
        if (!raw || raw.length < 4) {
          return { success: false, error: 'Please enter a valid email address or mobile number.' }
        }

        const idType = detectIdentifierType(raw)
        const normalized = normalizeIdentifier(raw)

        if (idType === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(raw)) {
            return { success: false, error: 'Please enter a valid email address (e.g. name@domain.com).' }
          }
        } else {
          const digitsOnly = raw.replace(/\D/g, '')
          if (digitsOnly.length < 10) {
            return { success: false, error: 'Please enter a valid 10-digit mobile number (e.g. 98765 43210 or +91 98765 43210).' }
          }
        }

        // Check if existing user (allow re-verifying to update password or access)
        const existing = get().registeredUsers.find(
          (u) => u.identifier === normalized || normalizeIdentifier(u.identifier) === normalized
        )

        // Generate 6-digit code
        let code = Math.floor(100000 + Math.random() * 900000).toString()

        // Also notify backend so it logs to terminal
        try {
          const resp = await fetch('http://localhost:8000/api/v1/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: raw, name: name || 'User' }),
          })
          if (resp.ok) {
            const data = await resp.json()
            if (data?.data?.code) {
              code = data.data.code
            }
          }
        } catch {
          // Local fallback continues uninterrupted
        }

        set({
          pendingOtp: {
            code,
            identifier: normalized,
            rawIdentifier: raw,
            identifierType: idType,
            expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
          },
        })

        return {
          success: true,
          code,
          identifierType: idType,
          isExisting: Boolean(existing),
        }
      },

      verifyOtpAndSignUp: ({ name, identifier, code, password }) => {
        const pending = get().pendingOtp
        const normalized = normalizeIdentifier(identifier)
        const enteredCode = code.trim()

        // Universal master test code "123456" OR generated OTP
        const isMasterCode = enteredCode === '123456'
        const isPendingMatch = pending && pending.code.trim() === enteredCode

        if (!isMasterCode && !isPendingMatch) {
          if (!pending) {
            return { success: false, error: 'No verification code was requested for this contact. Please request a code (or use test code 123456).' }
          }
          if (Date.now() > pending.expiresAt) {
            return { success: false, error: 'Verification code has expired. Please request a new code.' }
          }
          return { success: false, error: 'Incorrect verification code. Please check your code or use demo code 123456.' }
        }

        if (!password || password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters long.' }
        }

        const displayName = name.trim() || (pending ? pending.rawIdentifier.split('@')[0] : 'User')
        const rawIdentifier = pending ? pending.rawIdentifier : identifier
        const identifierType = pending ? pending.identifierType : detectIdentifierType(identifier)

        // Find existing or create new
        const existingIdx = get().registeredUsers.findIndex(
          (u) => u.identifier === normalized || normalizeIdentifier(u.identifier) === normalized
        )

        let userRecord: RegisteredUser
        let updatedUsers: RegisteredUser[]

        if (existingIdx >= 0) {
          userRecord = {
            ...get().registeredUsers[existingIdx],
            name: displayName,
            password: password,
            rawIdentifier: rawIdentifier,
          }
          updatedUsers = [...get().registeredUsers]
          updatedUsers[existingIdx] = userRecord
        } else {
          userRecord = {
            id: `user-${Date.now()}`,
            name: displayName,
            identifier: normalized,
            rawIdentifier: rawIdentifier,
            identifierType: identifierType,
            password: password,
            workspaceName: `${displayName}'s Studio`,
            createdAt: new Date().toISOString(),
          }
          updatedUsers = [...get().registeredUsers, userRecord]
        }

        set({
          registeredUsers: updatedUsers,
          currentUser: userRecord,
          isAuthenticated: true,
          pendingOtp: null,
        })

        // Synchronize profileStore
        try {
          useProfileStore.getState().updateProfile({
            name: userRecord.name,
            email: userRecord.identifierType === 'email' ? userRecord.rawIdentifier : `${userRecord.name.toLowerCase().replace(/\s+/g, '')}@memora.app`,
            phone: userRecord.identifierType === 'phone' ? userRecord.rawIdentifier : '',
            workspaceName: userRecord.workspaceName,
          })
        } catch {
          // ignore
        }

        return { success: true }
      },


      signIn: (identifierInput, passwordInput) => {
        const normalized = normalizeIdentifier(identifierInput)
        const password = passwordInput.trim()

        if (!normalized || !password) {
          return { success: false, error: 'Please provide both your email/phone and password.' }
        }

        // Match user by normalized identifier or raw identifier or partial phone digits
        const user = get().registeredUsers.find((u) => {
          if (u.identifier === normalized) return true
          if (normalizeIdentifier(u.identifier) === normalized) return true
          // match last 10 digits for phone
          const uDigits = u.identifier.replace(/\D/g, '').slice(-10)
          const inDigits = normalized.replace(/\D/g, '').slice(-10)
          if (uDigits && inDigits && uDigits === inDigits) return true
          return false
        })

        if (!user) {
          return {
            success: false,
            error: 'No account found with this email or mobile number. Please check for typos or sign up.',
          }
        }

        if (user.password !== password) {
          return {
            success: false,
            error: 'Incorrect password. Please try again or check your credentials.',
          }
        }

        set({
          currentUser: user,
          isAuthenticated: true,
          pendingOtp: null,
        })

        // Synchronize profileStore
        try {
          useProfileStore.getState().updateProfile({
            name: user.name,
            email: user.identifierType === 'email' ? user.rawIdentifier : `${user.name.toLowerCase().replace(/\s+/g, '')}@memora.app`,
            phone: user.identifierType === 'phone' ? user.rawIdentifier : '',
            workspaceName: user.workspaceName || `${user.name}'s Studio`,
          })
        } catch {
          // ignore
        }

        return { success: true }
      },

      signOut: () => {
        set({
          isAuthenticated: false,
          currentUser: null,
          pendingOtp: null,
        })
      },
    }),
    {
      name: 'memora-auth-session-v1',
    }
  )
)
