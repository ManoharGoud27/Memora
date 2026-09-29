import { useState } from 'react'
import {
  Bell,
  Brain,
  Check,
  ChevronRight,
  CreditCard,
  IndianRupee,
  LogOut,
  Moon,
  Palette,
  Phone,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  User,
} from 'lucide-react'
import { defaultProfile, AVATAR_COLORS, extractInitials, useProfileStore } from '../stores/profileStore'
import { useAuthStore } from '../stores/authStore'

type Tab = 'profile' | 'notifications' | 'ai' | 'appearance' | 'security'

export default function Settings() {
  const profile = useProfileStore()
  const auth = useAuthStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)
  const [resetToast, setResetToast] = useState(false)
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    workspaceName: profile.workspaceName,
    title: profile.title,
    phone: profile.phone,
    upiId: profile.upiId,
    avatarColor: profile.avatarColor,
  })

  const [notifs, setNotifs] = useState({
    memoryExtracted: true,
    weeklyDigest: true,
    paymentDue: true,
    projectDeadline: false,
  })
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-2.0-flash')

  function handleSaveProfile() {
    profile.updateProfile(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleResetDefault() {
    profile.resetProfile()
    setForm({
      name: defaultProfile.name,
      email: defaultProfile.email,
      workspaceName: defaultProfile.workspaceName,
      title: defaultProfile.title,
      phone: defaultProfile.phone,
      upiId: defaultProfile.upiId,
      avatarColor: defaultProfile.avatarColor,
    })
    setResetToast(true)
    setTimeout(() => setResetToast(false), 3000)
  }

  function saveGeneric() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = extractInitials(form.name)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'ai', label: 'AI & Memory', icon: <Brain size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ]

  return (
    <div className="page-wrap settings-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE PREFERENCES</p>
          <h1>Settings</h1>
          <p className="subheading">Manage your personal profile, branding, AI configuration, and preferences.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-nav-item ${tab === t.id ? 'settings-nav-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
              <ChevronRight size={14} className="settings-nav-arrow" />
            </button>
          ))}
          <div className="settings-nav-divider" />
          <button type="button" className="settings-nav-item settings-nav-warning" onClick={handleResetDefault}>
            <RotateCcw size={16} />
            <span>Reset to default</span>
          </button>
          <button type="button" className="settings-nav-item settings-nav-danger" onClick={() => auth.signOut()}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </nav>

        <div className="settings-panel">
          {resetToast && (
            <div className="analyze-toast reset-confirm-toast">
              ✓ Profile successfully reset to default settings
            </div>
          )}
          {tab === 'profile' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Your dynamic profile</h2>
              <p className="settings-section-desc">
                Customize your name, workspace, role, and contact info. These details dynamically appear on your sidebar, topbar, and client communication drafts.
              </p>

              {/* Dynamic live avatar preview */}
              <div className="settings-avatar-row">
                <div className="settings-avatar" style={{ backgroundColor: form.avatarColor }}>
                  {initials}
                </div>
                <div>
                  <p className="settings-avatar-name">{form.name || 'Your Name'}</p>
                  <p className="settings-avatar-role">{form.title || 'Freelancer'}</p>
                  <p className="settings-avatar-plan">
                    <CreditCard size={12} /> {profile.plan} · {form.workspaceName}
                  </p>
                </div>
              </div>

              {/* Avatar color picker */}
              <div className="avatar-color-picker-section">
                <span className="picker-label">Avatar Color Theme</span>
                <div className="color-swatches">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-swatch ${form.avatarColor === c.value ? 'color-swatch-active' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setForm((f) => ({ ...f, avatarColor: c.value }))}
                      title={c.label}
                    >
                      {form.avatarColor === c.value && <Check size={14} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-fields">
                <div className="fields-row-2">
                  <label className="settings-field">
                    <span>Full name *</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Manohar Kumar"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </label>
                </div>

                <div className="fields-row-2">
                  <label className="settings-field">
                    <span>Workspace name</span>
                    <input
                      value={form.workspaceName}
                      onChange={(e) => setForm((f) => ({ ...f, workspaceName: e.target.value }))}
                      placeholder="e.g. Manohar Studio"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Professional title / role</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Full-Stack Developer & Consultant"
                    />
                  </label>
                </div>

                <div className="fields-row-2">
                  <label className="settings-field">
                    <span>WhatsApp / Phone (for client reminders)</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label className="settings-field">
                    <span>UPI ID (for payments in INR ₹)</span>
                    <input
                      value={form.upiId}
                      onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                      placeholder="e.g. yourname@upi"
                    />
                  </label>
                </div>
              </div>

              <button className="button button-primary settings-save" onClick={handleSaveProfile}>
                {saved ? (
                  <>
                    <Check size={15} /> Saved successfully!
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Notification preferences</h2>
              <p className="settings-section-desc">Choose what Memora keeps you informed about.</p>
              <div className="settings-toggles">
                {(
                  [
                    ['memoryExtracted', 'New memory extracted', 'When AI discovers a useful detail from your conversations'],
                    ['weeklyDigest', 'Weekly memory digest', 'A summary of what Memora learned about your clients this week'],
                    ['paymentDue', 'Payment reminders', 'Get notified when a payment is coming up or overdue in INR (₹)'],
                    ['projectDeadline', 'Project deadlines', 'Reminders for upcoming project milestones'],
                  ] as const
                ).map(([key, label, desc]) => (
                  <div key={key} className="settings-toggle-row">
                    <div>
                      <b>{label}</b>
                      <p>{desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={notifs[key]}
                      className={`toggle-switch ${notifs[key] ? 'toggle-on' : ''}`}
                      onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div className="settings-section">
              <h2 className="settings-section-title">AI & Memory configuration</h2>
              <p className="settings-section-desc">Configure which AI model powers Memora's memory extraction and assistant.</p>

              <div className="settings-fields">
                <label className="settings-field">
                  <span>Gemini API key</span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSyBdA65uEK9RZefps3H0SnswGJaAAdyOzVM"
                  />
                  <small>
                    Active in backend environment. You can get keys from{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                      aistudio.google.com/apikey
                    </a>
                  </small>
                </label>
                <label className="settings-field">
                  <span>AI model</span>
                  <select value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (active)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </label>
              </div>

              <div className="ai-info-card">
                <Sparkles size={18} />
                <div>
                  <b>How memory extraction & requirements advisor work</b>
                  <p>
                    When you chat or paste WhatsApp/Email notes, Memora automatically analyses them and saves useful facts, preferences, deadlines, and milestone budgets as searchable memories. Vector embeddings use Google's <code>text-embedding-004</code> model.
                  </p>
                </div>
              </div>

              <button className="button button-primary settings-save" onClick={saveGeneric}>
                {saved ? (
                  <>
                    <Check size={15} /> Saved
                  </>
                ) : (
                  'Save AI settings'
                )}
              </button>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Appearance</h2>
              <p className="settings-section-desc">Choose how Memora looks.</p>
              <div className="theme-options">
                {(
                  [
                    ['light', 'Light', Sun],
                    ['dark', 'Dark', Moon],
                    ['system', 'System', Palette],
                  ] as const
                ).map(([val, label, Icon]) => (
                  <button
                    key={val}
                    className={`theme-option ${theme === val ? 'theme-selected' : ''}`}
                    onClick={() => setTheme(val)}
                  >
                    <Icon size={22} />
                    <span>{label}</span>
                    {theme === val && <Check size={14} className="theme-check" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Security</h2>
              <p className="settings-section-desc">Manage your workspace security and credentials.</p>
              <div className="settings-fields">
                <label className="settings-field">
                  <span>Current password</span>
                  <input type="password" placeholder="••••••••" />
                </label>
                <label className="settings-field">
                  <span>New password</span>
                  <input type="password" placeholder="••••••••" />
                </label>
                <label className="settings-field">
                  <span>Confirm new password</span>
                  <input type="password" placeholder="••••••••" />
                </label>
              </div>
              <button className="button button-primary settings-save" onClick={saveGeneric}>
                {saved ? (
                  <>
                    <Check size={15} /> Updated
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
