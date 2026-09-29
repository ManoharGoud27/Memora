import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, Bell, Brain, BriefcaseBusiness, ChevronDown, Command, CreditCard, IndianRupee, LayoutDashboard, Menu, MessageCircle, Settings2, Sparkles, User, Users, X } from 'lucide-react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Projects from './pages/Projects'
import MemoryTimeline from './pages/MemoryTimeline'
import AIChat from './pages/AIChat'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import { useUiStore } from './stores/uiStore'
import { useQuery } from '@tanstack/react-query'
import { memoriesApi, paymentsApi } from './services/api'
import { formatINR } from './utils/currency'

import { useProfileStore, extractInitials } from './stores/profileStore'
import { useAuthStore } from './stores/authStore'
import AuthPage from './pages/Auth'

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Clients', to: '/clients', icon: Users, end: false },
  { label: 'Projects', to: '/projects', icon: BriefcaseBusiness, end: false },
  { label: 'Memory timeline', to: '/memories', icon: Brain, end: false },
  { label: 'AI assistant', to: '/chat', icon: MessageCircle, end: false },
  { label: 'Payments', to: '/payments', icon: IndianRupee, end: false },
]

function ComingSoon({ title }: { title: string }) {
  return <div className="page-wrap coming-page"><span className="coming-icon"><Command size={25} /></span><p className="eyebrow">IN THE WORKS</p><h1>{title}</h1><p>This part of your workspace is taking shape. Your client relationships are ready to get started.</p><NavLink to="/clients" className="button button-primary">Go to clients <ArrowUpRight size={16} /></NavLink></div>
}

export default function App() {
  const auth = useAuthStore()
  const [userMenu, setUserMenu] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navOpen = useUiStore((state) => state.navOpen)
  const setNavOpen = useUiStore((state) => state.setNavOpen)
  const location = useLocation()
  const navigate = useNavigate()

  const profile = useProfileStore()
  const initials = extractInitials(profile.name)

  const recentMemories = useQuery({ queryKey: ['memories'], queryFn: memoriesApi.list })
  const paymentReminders = useQuery({ queryKey: ['payment-reminders'], queryFn: paymentsApi.reminders, refetchInterval: 60000 })

  if (!auth.isAuthenticated) {
    return <AuthPage />
  }

  const urgentPayments = (paymentReminders.data?.reminders ?? []).filter(
    (r) => r.urgency === 'overdue' || r.urgency === 'due_today' || r.urgency === 'due_soon'
  )
  const hasUrgent = urgentPayments.length > 0

  const notifications = (recentMemories.data ?? []).slice(0, 5).map(m => ({
    id: m.id,
    title: `New ${m.type} memory`,
    body: m.content.length > 80 ? m.content.slice(0, 77) + '…' : m.content,
    time: new Date(m.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }))

  return <div className="app-shell">
    <AnimatePresence>{navOpen && <motion.button className="mobile-scrim" aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNavOpen(false)} />}</AnimatePresence>
    <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''}`}>
      <NavLink to="/" className="brand" onClick={() => setNavOpen(false)}><span className="brand-mark"><span>M</span><i /></span><span className="brand-name">Memora<small>CLIENT MEMORY</small></span></NavLink>
      <div className="workspace-picker"><div className="workspace-avatar" style={{ backgroundColor: profile.avatarColor }}>{initials}</div><span><b>{profile.workspaceName}</b><small>{profile.plan}</small></span><ChevronDown size={15} /></div>
      <p className="nav-caption">WORKSPACE</p><nav className="main-nav" aria-label="Main navigation">{navigation.map(({ label, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} onClick={() => setNavOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-decoration">✳</span><b>A little more in sync.</b><p>Your client context, quietly working in the background.</p><a href="mailto:hello@memora.app">How Memora works <ArrowUpRight size={13} /></a></div><button className="settings-link" onClick={() => { navigate('/settings'); setNavOpen(false) }}><Settings2 size={17} /> Settings</button><div className="user-row"><span className="user-avatar" style={{ backgroundColor: profile.avatarColor }}>{initials}</span><span><b>{profile.name}</b><small>{profile.title || 'Personal workspace'}</small></span><button aria-label="Account menu" className="more-button" onClick={() => setUserMenu(!userMenu)}>···</button>{userMenu && <div className="user-popover"><div className="user-popover-info"><b>{profile.name}</b><small>{profile.email}</small></div><button className="user-popover-item" onClick={() => { navigate('/settings'); setUserMenu(false) }}><User size={14} /> Profile & settings</button><button className="user-popover-item user-popover-danger" onClick={() => { setUserMenu(false); auth.signOut() }}><ArrowUpRight size={14} /> Sign out</button></div>}</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
          <span className="breadcrumb-muted">Workspace</span>
          <span className="breadcrumb-slash">/</span>
          <span className="breadcrumb-current">{location.pathname.startsWith('/clients/') ? 'Client profile' : location.pathname === '/' ? 'Overview' : location.pathname.slice(1).replace('-', ' ')}</span>
        </div>
        <div className="topbar-right">
          <span className="today-label">Your work, in good company</span>
          <div className="notif-wrap">
            <button className={`notification-button ${hasUrgent ? 'notif-has-urgent' : ''}`} aria-label="Notifications" onClick={() => setNotifOpen(o => !o)}>
              <Bell size={17} />
              {hasUrgent ? <i className="notif-dot-urgent" /> : notifications.length > 0 ? <i /> : null}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div className="notif-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  <div className="notif-header">
                    <div>
                      <b>Activity & Reminders</b>
                      {hasUrgent && <span className="urgent-badge">{urgentPayments.length} payment alert{urgentPayments.length > 1 ? 's' : ''}</span>}
                    </div>
                    <button className="icon-button" onClick={() => setNotifOpen(false)}><X size={15} /></button>
                  </div>

                  {/* Payment Deadlines section */}
                  {urgentPayments.length > 0 && (
                    <div className="notif-section">
                      <div className="notif-section-title">
                        <AlertTriangle size={13} className="urgent-icon-amber" />
                        <span>PAYMENT REMINDERS ({urgentPayments.length})</span>
                      </div>
                      <div className="notif-payments-list">
                        {urgentPayments.map((p) => (
                          <div
                            key={p.payment_id}
                            className={`notif-payment-item notif-payment-${p.urgency}`}
                            onClick={() => { navigate('/payments'); setNotifOpen(false) }}
                          >
                            <div className="notif-payment-top">
                              <span className="notif-payment-title">{p.project_name}</span>
                              <span className={`notif-urgency-tag urgency-${p.urgency}`}>{p.status_label}</span>
                            </div>
                            <div className="notif-payment-meta">
                              <b>{formatINR(p.amount)}</b> · {p.client_name} · Due {p.due_date ? new Date(`${p.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Soon'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memories section */}
                  <div className="notif-section">
                    <div className="notif-section-title">
                      <Sparkles size={13} />
                      <span>RECENT MEMORIES</span>
                    </div>
                    {notifications.length === 0
                      ? <p className="notif-empty">No memories yet. Chat with the AI to start building context.</p>
                      : notifications.map(n => (
                        <div key={n.id} className="notif-item" onClick={() => { navigate('/memories'); setNotifOpen(false) }}>
                          <span className="notif-icon"><Sparkles size={13} /></span>
                          <div>
                            <b>{n.title}</b>
                            <p>{n.body}</p>
                            <time>{n.time}</time>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="notif-footer-row">
                    <button className="notif-footer-link" onClick={() => { navigate('/payments'); setNotifOpen(false) }}>
                      View payments schedule →
                    </button>
                    <button className="notif-footer-link" onClick={() => { navigate('/memories'); setNotifOpen(false) }}>
                      All memories →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className="top-avatar"
            style={{ backgroundColor: profile.avatarColor }}
            onClick={() => navigate('/settings')}
            title={`${profile.name} · Profile & settings`}
          >
            {initials}
          </button>
        </div>
      </header>
      <div className="route-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/memories" element={<MemoryTimeline />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<ComingSoon title="This page is still taking shape" />} />
        </Routes>
      </div>
    </main>
    <AnimatePresence>{navOpen && <motion.button className="mobile-close" aria-label="Close menu" onClick={() => setNavOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><X size={17} /></motion.button>}</AnimatePresence>
  </div>
}
