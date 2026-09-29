import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Building2, Mail, Plus, Search, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clientsApi } from '../services/api'
import type { Client, ClientInput } from '../types/client'
import { Button } from '../components/ui/button'

const palette = ['avatar-lilac', 'avatar-mint', 'avatar-peach', 'avatar-blue']
const initialForm: ClientInput = { name: '', industry: '', company_name: '', contact_info: {}, communication_preference: 'email', priority: 'medium', status: 'active' }

export default function Clients() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ClientInput>(initialForm)
  const queryClient = useQueryClient()
  const clients = useQuery({ queryKey: ['clients', search], queryFn: () => clientsApi.list(search) })
  const create = useMutation({ mutationFn: clientsApi.create, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['clients'] }); setShowForm(false); setForm(initialForm) } })
  const remove = useMutation({ mutationFn: clientsApi.remove, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clients'] }) })
  const records = clients.data ?? []
  const initials = (name: string) => name.split(/\s+/).map((part) => part[0] ?? '').slice(0, 2).join('').toUpperCase()
  const activeCount = useMemo(() => records.filter((client) => client.status === 'active').length, [records])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    create.mutate({ ...form, name: form.name.trim(), industry: form.industry || null, company_name: form.company_name || null })
  }

  return <div className="page-wrap">
    <header className="page-heading">
      <div><p className="eyebrow">RELATIONSHIPS</p><h1>Your clients</h1><p className="subheading">Keep every relationship thoughtful and every detail close.</p></div>
      <Button onClick={() => setShowForm(true)}><Plus size={17} /> Add client</Button>
    </header>
    <section className="stat-strip" aria-label="Client summary">
      <div className="stat-card"><span className="stat-icon tint-blue"><Users size={18} /></span><div><strong>{clients.isLoading ? '—' : records.length}</strong><span>Total clients</span></div></div>
      <div className="stat-card"><span className="stat-icon tint-green"><span className="status-dot" /></span><div><strong>{clients.isLoading ? '—' : activeCount}</strong><span>Active relationships</span></div></div>
      <div className="stat-note"><span className="note-spark">✳</span><span>Good work starts with<br /><b>remembering the little things.</b></span></div>
    </section>
    <section className="list-section">
      <div className="list-toolbar"><div><h2>All clients <span className="count-pill">{records.length}</span></h2><p>Your growing circle of collaborators</p></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients" aria-label="Search clients" />{search && <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label></div>
      {clients.isLoading && <div className="state-panel"><span className="spinner" />Loading your clients…</div>}
      {clients.isError && <div className="state-panel error-panel"><strong>We couldn’t load your clients.</strong><span>{clients.error.message}</span><button className="button button-soft" onClick={() => void clients.refetch()}>Try again</button></div>}
      {!clients.isLoading && !clients.isError && records.length === 0 && <div className="empty-panel"><div className="empty-mark"><Users size={23} /></div><h3>{search ? 'No matching clients' : 'Your client list starts here'}</h3><p>{search ? 'Try a different name or company.' : 'Add a client to start keeping their preferences, projects, and conversations together.'}</p>{!search && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add your first client</button>}</div>}
      {!clients.isLoading && !clients.isError && records.length > 0 && <div className="client-grid">{records.map((client, index) => <ClientCard key={client.id} client={client} index={index} initials={initials(client.name)} onDelete={() => remove.mutate(client.id)} deleting={remove.isPending && remove.variables === client.id} />)}</div>}
    </section>
    <AnimatePresence>{showForm && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}><motion.div role="dialog" aria-modal="true" aria-labelledby="new-client-title" className="modal-card" initial={{ y: 18, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 12, opacity: 0 }}><div className="modal-top"><div><p className="eyebrow">A NEW CONNECTION</p><h2 id="new-client-title">Add a client</h2></div><button className="icon-button close-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={submit} className="client-form"><label>Client name<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Jordan Lee" /></label><label>Company<input value={form.company_name ?? ''} onChange={(event) => setForm({ ...form, company_name: event.target.value })} placeholder="Company name" /></label><label>Industry<input value={form.industry ?? ''} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="e.g. Design, SaaS" /></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ClientInput['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>{create.isError && <p className="form-error" role="alert">{create.error.message}</p>}<div className="form-actions"><button type="button" className="button button-soft" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save client'}</button></div></form></motion.div></motion.div>}</AnimatePresence>
  </div>
}

function ClientCard({ client, index, initials, onDelete, deleting }: { client: Client; index: number; initials: string; onDelete: () => void; deleting: boolean }) {
  return <motion.article className="client-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .045 }}><div className="client-card-top"><div className={`avatar ${palette[index % palette.length]}`}>{initials}</div><span className={`priority-tag priority-${client.priority}`}><i />{client.priority} priority</span></div><Link className="client-name" to={`/clients/${client.id}`}>{client.name}<ArrowUpRight size={15} /></Link><div className="client-company"><Building2 size={14} /><span>{client.company_name || client.industry || 'Independent client'}</span></div><div className="client-card-footer"><span className="client-channel"><Mail size={13} />{client.communication_preference}</span><span className="active-label"><i />{client.status}</span></div><button className="remove-client" aria-label={`Delete ${client.name}`} title="Delete client" disabled={deleting} onClick={onDelete}><X size={14} /></button></motion.article>
}
