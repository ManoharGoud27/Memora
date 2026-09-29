import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CalendarDays,
  Check,
  ClipboardCopy,
  ExternalLink,
  IndianRupee,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react'
import { paymentsApi, projectsApi, type PaymentReminder } from '../services/api'
import type { Payment } from '../types/client'
import { formatINR } from '../utils/currency'

import { useProfileStore } from '../stores/profileStore'

type Draft = Omit<Payment, 'id' | 'created_at'>
const blank: Draft = {
  project_id: null,
  amount: '',
  type: 'milestone',
  status: 'pending',
  due_date: null,
  paid_date: null,
  description: '',
}

export default function Payments() {
  const queryClient = useQueryClient()
  const profile = useProfileStore()
  const [draft, setDraft] = useState<Draft>(blank)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const payments = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list })
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })
  const remindersQuery = useQuery({ queryKey: ['payment-reminders'], queryFn: paymentsApi.reminders, refetchInterval: 30000 })

  const create = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['payment-reminders'] })
      setDraft(blank)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      paymentsApi.update(id, {
        status,
        paid_date: status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['payment-reminders'] })
    },
  })

  const rows = payments.data ?? []
  const outstanding = rows
    .filter((payment) => payment.status !== 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const reminders = remindersQuery.data?.reminders ?? []
  const urgentReminders = reminders.filter(
    (r) => r.urgency === 'overdue' || r.urgency === 'due_today' || r.urgency === 'due_soon'
  )

  function getPersonalizedDraft(reminder: PaymentReminder) {
    let text = reminder.reminder_draft
    if (profile.upiId) {
      text += `\n\nUPI Payment ID: ${profile.upiId}`
    }
    text += `\n\nBest regards,\n${profile.name}${profile.title ? ` (${profile.title})` : ''}`
    return text
  }

  function copyDraft(reminder: PaymentReminder) {
    navigator.clipboard.writeText(getPersonalizedDraft(reminder))
    setCopiedId(reminder.payment_id)
    setTimeout(() => setCopiedId(null), 3000)
  }

  function openWhatsApp(reminder: PaymentReminder) {
    const text = getPersonalizedDraft(reminder)
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="page-wrap payments-wrap">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FINANCIAL CONTEXT · INDIAN RUPEES (INR)</p>
          <h1>Payments</h1>
          <p className="subheading">Track milestone payments, upcoming deadlines, and send automated client reminders.</p>
        </div>
      </header>

      {/* Summary metrics in INR */}
      <div className="payment-summary-row">
        <div className="payment-summary">
          <span className="metric-icon tint-green">
            <IndianRupee size={19} />
          </span>
          <div>
            <small>TOTAL OUTSTANDING (INR)</small>
            <b>{payments.isLoading ? '—' : formatINR(outstanding)}</b>
          </div>
          <span className="payment-count">
            {rows.filter((row) => row.status === 'pending').length} pending
          </span>
        </div>

        {urgentReminders.length > 0 && (
          <div className="urgent-summary-card">
            <span className="urgent-bell-icon">
              <BellRing size={18} />
            </span>
            <div>
              <small>NEAR DEADLINE / OVERDUE</small>
              <b className="urgent-amount">
                {formatINR(urgentReminders.reduce((s, r) => s + r.amount, 0))}
              </b>
            </div>
            <span className="urgent-count-pill">{urgentReminders.length} action needed</span>
          </div>
        )}
      </div>

      {/* Payment Deadlines & Reminders Alert Banner */}
      {urgentReminders.length > 0 && (
        <section className="reminders-banner">
          <div className="reminders-banner-header">
            <div className="banner-title-group">
              <AlertTriangle size={18} className="warning-icon" />
              <div>
                <h3>Payment Reminders & Deadlines</h3>
                <p>These payments require client follow-up. Send a gentle reminder via WhatsApp or Email.</p>
              </div>
            </div>
            <span className="banner-count-badge">{urgentReminders.length} Due Soon</span>
          </div>

          <div className="reminders-grid">
            {urgentReminders.map((r) => (
              <div key={r.payment_id} className={`reminder-card card-${r.urgency}`}>
                <div className="reminder-card-top">
                  <div>
                    <span className={`urgency-pill pill-${r.urgency}`}>{r.status_label}</span>
                    <h4 className="reminder-project">{r.project_name}</h4>
                    <p className="reminder-client">Client: <b>{r.client_name}</b></p>
                  </div>
                  <strong className="reminder-amount">{r.formatted_amount}</strong>
                </div>

                <p className="reminder-due-date">
                  <CalendarDays size={13} />
                  <span>Due: {r.due_date ? new Date(`${r.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span>
                </p>

                <div className="reminder-actions">
                  <button
                    type="button"
                    className="button button-whatsapp"
                    onClick={() => openWhatsApp(r)}
                    title="Open WhatsApp with pre-filled message"
                  >
                    <MessageCircle size={14} /> Send on WhatsApp
                  </button>
                  <button
                    type="button"
                    className="button button-soft button-copy-draft"
                    onClick={() => copyDraft(r)}
                    title="Copy polite reminder text"
                  >
                    {copiedId === r.payment_id ? <Check size={14} /> : <ClipboardCopy size={14} />}
                    {copiedId === r.payment_id ? 'Copied!' : 'Copy draft'}
                  </button>
                  <button
                    type="button"
                    className="button button-soft button-mark-done"
                    onClick={() => update.mutate({ id: r.payment_id, status: 'paid' })}
                  >
                    <Check size={14} /> Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Payment Schedule */}
      <section className="list-section payment-section">
        <div className="list-toolbar">
          <div>
            <h2>
              Payment schedule <span className="count-pill">{rows.length}</span>
            </h2>
            <p>Milestones, advances, and final settlements in Indian Rupees</p>
          </div>
        </div>

        {payments.isLoading && (
          <div className="state-panel">
            <span className="spinner" />
            Loading payments…
          </div>
        )}
        {payments.isError && <div className="state-panel error-panel">{payments.error.message}</div>}

        {!payments.isLoading && !payments.isError && rows.length === 0 && (
          <div className="empty-panel">
            <span className="empty-mark">
              <IndianRupee size={21} />
            </span>
            <h3>No payments on the calendar yet</h3>
            <p>Add a payment below to keep due dates, reminders, and follow-ups in view.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="payment-table-wrap">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>PROJECT</th>
                  <th>TYPE</th>
                  <th>DUE DATE</th>
                  <th>AMOUNT (INR)</th>
                  <th>STATUS</th>
                  <th>REMINDER</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => {
                  const reminder = reminders.find((r) => r.payment_id === payment.id)
                  const isUrgent = reminder && (reminder.urgency === 'overdue' || reminder.urgency === 'due_today' || reminder.urgency === 'due_soon')
                  return (
                    <tr key={payment.id} className={isUrgent ? 'row-urgent-payment' : ''}>
                      <td>
                        <b>{projects.data?.find((project) => project.id === payment.project_id)?.name ?? 'Project'}</b>
                        <small>{payment.description || '—'}</small>
                      </td>
                      <td className="capitalize">{payment.type}</td>
                      <td>
                        <div className="due-cell">
                          <span>
                            {payment.due_date
                              ? new Date(`${payment.due_date}T00:00:00`).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                          {reminder && payment.status !== 'paid' && reminder.urgency !== 'no_date' && (
                            <span className={`table-urgency-tag urgency-${reminder.urgency}`}>
                              {reminder.status_label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="amount-cell">{formatINR(payment.amount)}</td>
                      <td>
                        <span className={`payment-status payment-${payment.status}`}>{payment.status}</span>
                      </td>
                      <td>
                        {payment.status !== 'paid' && reminder?.reminder_draft && (
                          <button
                            type="button"
                            className="btn-table-reminder"
                            onClick={() => copyDraft(reminder)}
                            title="Copy client reminder message"
                          >
                            <MessageCircle size={13} />
                            {copiedId === payment.id ? 'Copied' : 'Reminder'}
                          </button>
                        )}
                      </td>
                      <td>
                        {payment.status !== 'paid' && (
                          <button
                            className="mark-paid"
                            onClick={() => update.mutate({ id: payment.id, status: 'paid' })}
                            title="Mark paid"
                          >
                            <Check size={13} /> Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Payment Form */}
        <form
          className="inline-create payment-create"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate(draft)
          }}
        >
          <div className="inline-create-title">
            <Plus size={16} />
            <b>Add a payment (INR ₹)</b>
          </div>
          <div className="project-fields">
            <select
              required
              aria-label="Project"
              value={draft.project_id ?? ''}
              onChange={(event) => setDraft({ ...draft, project_id: event.target.value || null })}
            >
              <option value="">Select project</option>
              {projects.data?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              step="1"
              placeholder="Amount in ₹ (INR)"
              aria-label="Amount in INR"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            />
            <select
              aria-label="Payment type"
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            >
              <option value="advance">Advance</option>
              <option value="milestone">Milestone</option>
              <option value="final">Final</option>
            </select>
            <input
              type="date"
              aria-label="Due date"
              value={draft.due_date ?? ''}
              onChange={(event) => setDraft({ ...draft, due_date: event.target.value || null })}
            />
            <button className="button button-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Add payment'}
            </button>
          </div>
          {create.isError && <p className="form-error">{create.error.message}</p>}
        </form>
      </section>
    </div>
  )
}
