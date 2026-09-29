import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Brain, Building2, CalendarDays, IndianRupee, LoaderCircle, Mail, MessageSquare, Pencil, Sparkles, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { clientsApi, memoriesApi, paymentsApi, projectsApi } from '../services/api'
import type { ClientInput } from '../types/client'
import IngestNotesModal from '../components/IngestNotesModal'
import { formatINR } from '../utils/currency'

export default function ClientDetail() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [ingestOpen, setIngestOpen] = useState(false)
  const [form, setForm] = useState<Partial<ClientInput>>({})
  const client = useQuery({ queryKey: ['client', id], queryFn: () => clientsApi.get(id), enabled: Boolean(id) })
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })
  const memories = useQuery({ queryKey: ['memories'], queryFn: memoriesApi.list })
  const payments = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list })
  const update = useMutation({ mutationFn: () => clientsApi.update(id, form), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['client', id] }); void queryClient.invalidateQueries({ queryKey: ['clients'] }); setEditing(false) } })
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null)
  const analyze = useMutation({
    mutationFn: () => clientsApi.analyze(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['memories'] })
      setAnalyzeResult(data.memories_added > 0 ? `✓ ${data.memories_added} new memories extracted from conversation history` : '✓ Analysis complete — no new memories found')
      setTimeout(() => setAnalyzeResult(null), 5000)
    },
  })
  if (client.isLoading) return <div className="state-panel detail-state"><span className="spinner" />Opening client profile…</div>
  if (client.isError || !client.data) return <div className="detail-empty"><Link className="back-link" to="/clients"><ArrowLeft size={16} /> Back to clients</Link><h1>We couldn’t find that client.</h1><p>{client.error?.message ?? 'This profile may have been removed.'}</p></div>
  const record = client.data
  const clientProjects = (projects.data ?? []).filter((project) => project.client_id === id)
  const clientMemories = (memories.data ?? []).filter((memory) => memory.client_id === id).slice(0, 4)
  const projectIds = new Set(clientProjects.map((project) => project.id))
  const clientPayments = (payments.data ?? []).filter((payment) => payment.project_id && projectIds.has(payment.project_id))
  const outstandingInr = clientPayments.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0)

  return <div className="page-wrap detail-wrap"><Link className="back-link" to="/clients"><ArrowLeft size={16} /> All clients</Link>
    <section className="profile-hero">
      <div className="avatar avatar-blue profile-avatar">{record.name.split(/\s+/).map((part) => part[0] ?? '').slice(0, 2).join('').toUpperCase()}</div>
      <div className="profile-main"><p className="eyebrow">CLIENT PROFILE</p><h1>{record.name}</h1><p>{record.company_name || record.industry || 'Independent client'}</p></div>
      <span className="active-label"><i />{record.status}</span>
      <div className="profile-actions">
        <button className="button button-soft profile-edit-button" onClick={() => { setForm({ name: record.name, industry: record.industry, company_name: record.company_name, contact_info: record.contact_info, communication_preference: record.communication_preference, priority: record.priority, status: record.status }); setEditing(true) }}><Pencil size={14} /> Edit profile</button>
        <button className="button button-ingest" onClick={() => setIngestOpen(true)} title="Import requirements from WhatsApp, Email, Slack"><MessageSquare size={14} /> Import WhatsApp / Email</button>
        <button className="button button-analyze" onClick={() => analyze.mutate()} disabled={analyze.isPending} title="Extract memories from past conversations using AI"><Brain size={14} />{analyze.isPending ? <><LoaderCircle size={14} className="spin-icon" /> Analyzing…</> : <><Sparkles size={14} /> Analyze memories</>}</button>
      </div>
    </section>
    {analyzeResult && <div className="analyze-toast">{analyzeResult}</div>}
    <div className="detail-grid"><section className="detail-card"><div className="section-title"><h2>About</h2><span>PROFILE</span></div><dl className="profile-fields"><div><dt><Building2 size={15} /> Company</dt><dd>{record.company_name || 'Not added yet'}</dd></div><div><dt>Industry</dt><dd>{record.industry || 'Not added yet'}</dd></div><div><dt><Mail size={15} /> Preferred channel</dt><dd>{record.communication_preference}</dd></div><div><dt>Priority</dt><dd className={`priority-text priority-${record.priority}`}>{record.priority}</dd></div><div><dt><CalendarDays size={15} /> Added</dt><dd>{new Date(record.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</dd></div></dl></section><section className="detail-card client-projects"><div className="section-title"><h2>Projects</h2><Link to="/projects" className="small-link">See all</Link></div>{projects.isLoading ? <p className="client-inline-state">Loading projects…</p> : clientProjects.length ? <div className="client-mini-list">{clientProjects.slice(0, 3).map((project) => <div className="client-mini-row" key={project.id}><span className="client-mini-icon">↗</span><span><b>{project.name}</b><small>{project.progress}% complete{project.deadline ? ` · due ${new Date(`${project.deadline}T00:00:00`).toLocaleDateString()}` : ''}</small></span><i className="mini-progress"><i style={{ width: `${project.progress}%` }} /></i></div>)}</div> : <p className="client-inline-state">No projects linked yet.</p>}</section></div><div className="client-linked-grid"><section className="detail-card"><div className="section-title"><h2>Recent memories</h2><Link to="/memories" className="small-link">Open timeline</Link></div>{memories.isLoading ? <p className="client-inline-state">Loading memories…</p> : clientMemories.length ? <div className="client-memory-list">{clientMemories.map((memory) => <div className="client-memory-row" key={memory.id}><span className={`memory-type type-${memory.type}`}>{memory.type}</span><span>{memory.content}</span><b className={`memory-confidence-${memory.confidence >= .8 ? 'high' : memory.confidence >= .5 ? 'medium' : 'low'}`} title={`${Math.round(memory.confidence * 100)}% confidence`}>●</b></div>)}</div> : <div className="client-inline-empty"><span className="memory-orbit">✳</span><p>Useful details from conversations and project work will appear here.</p></div>}</section><section className="detail-card"><div className="section-title"><h2>Payments (INR)</h2><IndianRupee size={17} /></div>{payments.isLoading ? <p className="client-inline-state">Loading payments…</p> : clientPayments.length ? <div className="client-payment-summary"><strong>{formatINR(outstandingInr)}</strong><span>outstanding across {clientPayments.length} payment{clientPayments.length === 1 ? '' : 's'}</span><Link to="/payments" className="text-link">View payment schedule</Link></div> : <div className="client-inline-empty"><span className="memory-orbit"><IndianRupee size={19} /></span><p>Project payment details will stay close to this profile.</p></div>}</section></div>
    <AnimateEdit open={editing} form={form} setForm={setForm} onClose={() => setEditing(false)} onSave={() => update.mutate()} saving={update.isPending} error={update.isError ? update.error.message : ''} />
    <IngestNotesModal open={ingestOpen} clientId={id} clientName={record.name} onClose={() => setIngestOpen(false)} onMemoriesAdded={() => { void queryClient.invalidateQueries({ queryKey: ['memories'] }) }} />
  </div>
}


function AnimateEdit({ open, form, setForm, onClose, onSave, saving, error }: { open: boolean; form: Partial<ClientInput>; setForm: (form: Partial<ClientInput>) => void; onClose: () => void; onSave: () => void; saving: boolean; error: string }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-client-heading"><div className="modal-top"><div><p className="eyebrow">CLIENT DETAILS</p><h2 id="edit-client-heading">Edit profile</h2></div><button className="icon-button close-button" aria-label="Close" onClick={onClose}><X size={17} /></button></div><form className="client-form" onSubmit={(event) => { event.preventDefault(); onSave() }}><label>Client name<input required value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Company<input value={form.company_name ?? ''} onChange={(event) => setForm({ ...form, company_name: event.target.value })} /></label><label>Industry<input value={form.industry ?? ''} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></label><label>Communication preference<select value={form.communication_preference ?? 'email'} onChange={(event) => setForm({ ...form, communication_preference: event.target.value })}><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="slack">Slack</option></select></label><label>Priority<select value={form.priority ?? 'medium'} onChange={(event) => setForm({ ...form, priority: event.target.value as ClientInput['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Status<select value={form.status ?? 'active'} onChange={(event) => setForm({ ...form, status: event.target.value as ClientInput['status'] })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></section></div>
}
