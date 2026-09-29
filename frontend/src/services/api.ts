import type { ApiEnvelope, Client, ClientInput, Conversation, Memory, Payment, Project } from '../types/client'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new Error('The API is unavailable. Start the FastAPI service and try again.')
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>
        if (typeof b.error === 'object' && b.error !== null && 'message' in (b.error as Record<string, unknown>)) {
          message = String((b.error as Record<string, unknown>).message)
        } else if (typeof b.error === 'string') {
          message = b.error
        } else if (typeof b.detail === 'string') {
          message = b.detail
        } else if (Array.isArray(b.detail) && b.detail.length > 0) {
          message = b.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ')
        } else if (typeof b.message === 'string') {
          message = b.message
        }
      }
    } catch { /* Keep the status-based message when the response has no JSON body. */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  const envelope = await response.json() as ApiEnvelope<T>
  return envelope.data
}

export interface PaymentReminder {
  payment_id: string
  project_id: string | null
  project_name: string
  client_name: string
  client_id: string | null
  amount: number
  currency: string
  formatted_amount: string
  type: string
  status: string
  due_date: string | null
  days_left: number | null
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'no_date'
  status_label: string
  badge_color: string
  message: string
  reminder_draft: string
}

export interface PaymentRemindersResponse {
  reminders: PaymentReminder[]
  urgent_count: number
  overdue_count: number
  due_today_count: number
  due_soon_count: number
  total_outstanding_inr: number
}

export interface PaymentMilestoneSuggestion {
  title: string
  percentage: number
  recommended_amount_inr: number | null
  trigger: string
  reasoning: string
}

export interface ScopeSuggestion {
  category: 'scope_risk' | 'missing_info' | 'tech_stack' | 'change_recommendation'
  title: string
  detail: string
  suggested_action: string
}

export interface IngestNotesResult {
  summary: string
  client_objective: string
  detected_budget_inr: number | null
  detected_timeline: string | null
  memories_saved_count: number
  memories: { type: string; content: string; confidence: number; tags: string[] }[]
  scope_suggestions: ScopeSuggestion[]
  payment_suggestions: PaymentMilestoneSuggestion[]
  questions_to_ask_client: string[]
}

export const clientsApi = {
  list: (search = '') => request<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  get: (id: string) => request<Client>(`/clients/${id}`),
  create: (client: ClientInput) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(client) }),
  update: (id: string, client: Partial<ClientInput>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(client) }),
  remove: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  analyze: (id: string) => request<{ memories_added: number }>(`/clients/${id}/analyze`, { method: 'POST' }),
  ingestNotes: (id: string, payload: { raw_content: string; source: string; auto_save_memories?: boolean }) =>
    request<IngestNotesResult>(`/clients/${id}/ingest-notes`, { method: 'POST', body: JSON.stringify(payload) }),
}

export const projectsApi = {
  list: () => request<Project[]>('/projects'),
  create: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(project) }),
  update: (id: string, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
}

export const memoriesApi = {
  list: () => request<Memory[]>('/memories'),
  search: (query: string, clientId?: string) => request<Memory[]>('/memories/search', { method: 'POST', body: JSON.stringify({ query, client_id: clientId || null, limit: 20 }) }),
  create: (memory: Pick<Memory, 'client_id' | 'project_id' | 'type' | 'content' | 'confidence' | 'source' | 'metadata' | 'is_verified'>) => request<Memory>('/memories', { method: 'POST', body: JSON.stringify(memory) }),
  update: (id: string, data: Partial<Pick<Memory, 'content' | 'type' | 'confidence' | 'is_verified'>>) => request<Memory>(`/memories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/memories/${id}`, { method: 'DELETE' }),
}

export const conversationsApi = {
  list: (clientId: string) => request<Conversation[]>(`/conversations?client_id=${encodeURIComponent(clientId)}`),
  chat: (data: { client_id: string; message: string }) => request<{ answer: string; memory_ids: string[]; explanation: string }>('/conversations/chat', { method: 'POST', body: JSON.stringify(data) }),
}

export const paymentsApi = {
  list: () => request<Payment[]>('/payments'),
  reminders: () => request<PaymentRemindersResponse>('/payments/reminders'),
  create: (data: Omit<Payment, 'id' | 'created_at'>) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Payment>) => request<Payment>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const authApi = {
  sendOtp: (identifier: string, name?: string) =>
    request<{
      identifier: string
      normalized_identifier: string
      identifier_type: 'email' | 'phone'
      code: string
      expires_in_seconds: number
      message: string
    }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, name }),
    }),
  verifyOtp: (data: { identifier: string; code: string; password: string; name?: string }) =>
    request<{
      verified: boolean
      identifier: string
      name: string
      message: string
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}


