import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Brain,
  Check,
  ClipboardCopy,
  FileText,
  IndianRupee,
  Layers,
  Lightbulb,
  LoaderCircle,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { clientsApi, type IngestNotesResult } from '../services/api'
import { formatINR } from '../utils/currency'

import { useProfileStore } from '../stores/profileStore'

interface IngestNotesModalProps {
  open: boolean
  clientId: string
  clientName: string
  onClose: () => void
  onMemoriesAdded?: () => void
}

const SAMPLE_WHATSAPP = `[2:15 PM, 29/09/2026] Rohan: Hi Manohar, we need a complete website for our textile boutique.
[2:16 PM, 29/09/2026] Rohan: Need around 5-6 pages: Home, Catalog, About Us, Lookbook, Contact.
[2:17 PM, 29/09/2026] Rohan: We want Razorpay integration for online orders, and WhatsApp chat button on all product cards.
[2:18 PM, 29/09/2026] Rohan: Total budget is around 75k INR. Can we finish this in 3 weeks?
[2:20 PM, 29/09/2026] Rohan: We already have our logo, but product photos and fabric descriptions are still being shot.`

export default function IngestNotesModal({ open, clientId, clientName, onClose, onMemoriesAdded }: IngestNotesModalProps) {
  const queryClient = useQueryClient()
  const profile = useProfileStore()
  const [source, setSource] = useState<'whatsapp' | 'email' | 'slack' | 'notes'>('whatsapp')
  const [rawContent, setRawContent] = useState('')
  const [autoSave, setAutoSave] = useState(true)
  const [result, setResult] = useState<IngestNotesResult | null>(null)
  const [copiedQuestions, setCopiedQuestions] = useState(false)
  const [copiedMilestones, setCopiedMilestones] = useState(false)

  const ingestMutation = useMutation({
    mutationFn: () => clientsApi.ingestNotes(clientId, { raw_content: rawContent, source, auto_save_memories: autoSave }),
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['memories'] })
      void queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onMemoriesAdded?.()
    },
  })

  if (!open) return null

  function copyQuestions() {
    if (!result?.questions_to_ask_client) return
    const text = result.questions_to_ask_client.map((q, i) => `${i + 1}. ${q}`).join('\n')
    navigator.clipboard.writeText(`Hi ${clientName},\n\nThanks for sharing the project details! To ensure we hit the ground running, could you clarify a few quick points:\n\n${text}\n\nLooking forward to hearing from you!\n\nBest regards,\n${profile.name}${profile.phone ? `\nWhatsApp: ${profile.phone}` : ''}`)
    setCopiedQuestions(true)
    setTimeout(() => setCopiedQuestions(false), 2500)
  }

  function copyMilestones() {
    if (!result?.payment_suggestions) return
    const text = result.payment_suggestions
      .map(
        (p) =>
          `• ${p.title}: ${p.percentage}%${p.recommended_amount_inr ? ` (${formatINR(p.recommended_amount_inr)})` : ''} — ${p.trigger}`
      )
      .join('\n')
    navigator.clipboard.writeText(
      `Commercial Milestone Proposal for ${clientName}:\n\n${text}\n\nPayment terms: Invoices payable via UPI/Bank Transfer in INR.${profile.upiId ? `\nUPI ID: ${profile.upiId}` : ''}\n\nPrepared by ${profile.name}${profile.title ? ` (${profile.title})` : ''}`
    )
    setCopiedMilestones(true)
    setTimeout(() => setCopiedMilestones(false), 2500)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !ingestMutation.isPending) onClose()
      }}
    >
      <section className="modal-card ingest-modal-card" role="dialog" aria-modal="true" aria-labelledby="ingest-heading">
        <div className="modal-top">
          <div>
            <p className="eyebrow">AI REQUIREMENTS ADVISOR & INGESTION</p>
            <h2 id="ingest-heading">Import client notes for {clientName}</h2>
          </div>
          <button className="icon-button close-button" aria-label="Close" onClick={onClose} disabled={ingestMutation.isPending}>
            <X size={17} />
          </button>
        </div>

        {!result ? (
          <form
            className="client-form ingest-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (rawContent.trim().length >= 5) ingestMutation.mutate()
            }}
          >
            <div className="platform-selector-row">
              <span className="platform-label">Platform source:</span>
              <div className="platform-buttons">
                <button
                  type="button"
                  className={`platform-btn ${source === 'whatsapp' ? 'active-platform whatsapp-active' : ''}`}
                  onClick={() => setSource('whatsapp')}
                >
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <button
                  type="button"
                  className={`platform-btn ${source === 'email' ? 'active-platform email-active' : ''}`}
                  onClick={() => setSource('email')}
                >
                  <Mail size={14} /> Email thread
                </button>
                <button
                  type="button"
                  className={`platform-btn ${source === 'slack' ? 'active-platform slack-active' : ''}`}
                  onClick={() => setSource('slack')}
                >
                  <Send size={14} /> Slack
                </button>
                <button
                  type="button"
                  className={`platform-btn ${source === 'notes' ? 'active-platform notes-active' : ''}`}
                  onClick={() => setSource('notes')}
                >
                  <FileText size={14} /> Meeting notes
                </button>
              </div>
            </div>

            <label className="ingest-textarea-label">
              <span>Paste conversation, email text, or brief:</span>
              <textarea
                required
                rows={7}
                placeholder="e.g. Paste WhatsApp chat export, client emails, or bullet points discussed during client call..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
              />
            </label>

            <div className="ingest-quick-actions">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setSource('whatsapp')
                  setRawContent(SAMPLE_WHATSAPP)
                }}
              >
                ⚡ Load sample WhatsApp chat brief
              </button>
              <label className="checkbox-label">
                <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
                <span>Auto-save extracted memories to database</span>
              </label>
            </div>

            {ingestMutation.isError && <p className="form-error" role="alert">{ingestMutation.error.message}</p>}

            <div className="form-actions">
              <button type="button" className="button button-soft" onClick={onClose} disabled={ingestMutation.isPending}>
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={ingestMutation.isPending || rawContent.trim().length < 5}
              >
                {ingestMutation.isPending ? (
                  <>
                    <LoaderCircle size={15} className="spin-icon" /> Analyzing & extracting…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Analyze & Advise
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="ingest-results-view">
            <div className="ingest-summary-banner">
              <div className="summary-icon">
                <Lightbulb size={20} />
              </div>
              <div>
                <h3>Executive Summary</h3>
                <p>{result.summary}</p>
                <div className="summary-meta-chips">
                  <span className="summary-chip">
                    <b>Goal:</b> {result.client_objective}
                  </span>
                  {result.detected_budget_inr && (
                    <span className="summary-chip highlight-chip">
                      <IndianRupee size={12} /> <b>Budget:</b> {formatINR(result.detected_budget_inr)}
                    </span>
                  )}
                  {result.detected_timeline && (
                    <span className="summary-chip">
                      <b>Timeline:</b> {result.detected_timeline}
                    </span>
                  )}
                  <span className="summary-chip saved-chip">
                    <Check size={12} /> {result.memories_saved_count} memories stored
                  </span>
                </div>
              </div>
            </div>

            <div className="ingest-results-grid">
              {/* Payment Suggestions in INR */}
              <div className="advisor-section">
                <div className="advisor-section-header">
                  <h4>
                    <IndianRupee size={16} /> Recommended Payment Schedule (INR ₹)
                  </h4>
                  <button type="button" className="copy-action-btn" onClick={copyMilestones}>
                    {copiedMilestones ? <Check size={13} /> : <ClipboardCopy size={13} />}
                    {copiedMilestones ? 'Copied proposal!' : 'Copy proposal'}
                  </button>
                </div>
                <div className="milestone-cards">
                  {result.payment_suggestions.map((p, idx) => (
                    <div key={idx} className="milestone-card">
                      <div className="milestone-top">
                        <b>{p.title}</b>
                        <span className="milestone-share">{p.percentage}%</span>
                      </div>
                      {p.recommended_amount_inr && (
                        <p className="milestone-amount">{formatINR(p.recommended_amount_inr)}</p>
                      )}
                      <p className="milestone-trigger">
                        <strong>Trigger:</strong> {p.trigger}
                      </p>
                      <small className="milestone-reason">{p.reasoning}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope & Requirements Advice */}
              <div className="advisor-section">
                <div className="advisor-section-header">
                  <h4>
                    <AlertTriangle size={16} /> Scope Risks & Changes Needed
                  </h4>
                </div>
                <div className="scope-cards">
                  {result.scope_suggestions.map((s, idx) => (
                    <div key={idx} className={`scope-card scope-${s.category}`}>
                      <div className="scope-tag">{s.category.replace('_', ' ').toUpperCase()}</div>
                      <b>{s.title}</b>
                      <p>{s.detail}</p>
                      <div className="scope-action">
                        <strong>Suggested action:</strong> {s.suggested_action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Questions to ask client */}
              <div className="advisor-section full-span">
                <div className="advisor-section-header">
                  <h4>
                    <MessageSquare size={16} /> Clarification Questions to Ask Client ({source.toUpperCase()})
                  </h4>
                  <button type="button" className="copy-action-btn" onClick={copyQuestions}>
                    {copiedQuestions ? <Check size={13} /> : <ClipboardCopy size={13} />}
                    {copiedQuestions ? 'Copied WhatsApp message!' : 'Copy WhatsApp message'}
                  </button>
                </div>
                <ul className="questions-list">
                  {result.questions_to_ask_client.map((q, idx) => (
                    <li key={idx}>
                      <span className="q-number">{idx + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Extracted Memories */}
              <div className="advisor-section full-span">
                <div className="advisor-section-header">
                  <h4>
                    <Brain size={16} /> Extracted & Stored Client Memories ({result.memories.length})
                  </h4>
                </div>
                <div className="extracted-memories-chips">
                  {result.memories.map((m, idx) => (
                    <div key={idx} className="extracted-chip">
                      <span className={`memory-type type-${m.type}`}>{m.type}</span>
                      <span className="extracted-content">{m.content}</span>
                      <small className="extracted-conf">{Math.round(m.confidence * 100)}%</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions result-actions">
              <button
                type="button"
                className="button button-soft"
                onClick={() => {
                  setResult(null)
                  setRawContent('')
                }}
              >
                Analyze another text
              </button>
              <button type="button" className="button button-primary" onClick={onClose}>
                Done & View Profile
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
