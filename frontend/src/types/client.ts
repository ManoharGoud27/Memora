export type Priority = 'low' | 'medium' | 'high'
export type ClientStatus = 'active' | 'inactive' | 'archived'

export interface Client {
  id: string
  name: string
  industry: string | null
  company_name: string | null
  contact_info: Record<string, unknown>
  communication_preference: string
  priority: Priority
  status: ClientStatus
  created_at: string
  updated_at: string
}

export type ClientInput = Pick<Client, 'name' | 'industry' | 'company_name' | 'contact_info' | 'communication_preference' | 'priority' | 'status'>
export interface ApiEnvelope<T> { success: boolean; data: T; message: string; timestamp: string }
export interface Project { id: string; client_id: string | null; name: string; description: string | null; budget: string | null; deadline: string | null; status: string; progress: number; created_at: string; updated_at: string }
export interface Memory { id: string; client_id: string | null; project_id: string | null; type: string; content: string; confidence: number; source: string | null; metadata: Record<string, unknown>; is_verified: boolean; created_at: string; last_used_at: string }
export interface Conversation { id: string; client_id: string | null; project_id: string | null; role: string; content: string; created_at: string }
export interface Payment { id: string; project_id: string | null; amount: string; type: string; status: string; due_date: string | null; paid_date: string | null; description: string | null; created_at: string }
