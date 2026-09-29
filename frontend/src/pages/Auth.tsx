import { useState, useEffect } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function AuthPage({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { signIn, sendVerificationOtp, verifyOtpAndSignUp } = useAuthStore()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  // Sign In Form State
  const [signInIdentifier, setSignInIdentifier] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [signInError, setSignInError] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)

  // Sign Up Form State
  const [signUpMode, setSignUpMode] = useState<'mobile' | 'email'>('mobile')
  const [signUpIdentifier, setSignUpIdentifier] = useState('')
  const [signUpName, setSignUpName] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [signUpStep, setSignUpStep] = useState<'request' | 'verify'>('request')
  const [otpCode, setOtpCode] = useState('')
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Countdown timer for Resend Code
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Quick Demo Autofills for Sign In
  function autofillDemo(type: 'email' | 'phone') {
    if (type === 'email') {
      setSignInIdentifier('manohar@memora.app')
      setSignInPassword('password123')
    } else {
      setSignInIdentifier('+91 98765 43210')
      setSignInPassword('password123')
    }
    setSignInError('')
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSignInError('')
    setSignInLoading(true)

    setTimeout(() => {
      const res = signIn(signInIdentifier, signInPassword)
      setSignInLoading(false)
      if (res.success) {
        onAuthenticated?.()
      } else {
        setSignInError(res.error || 'Failed to sign in. Please verify your details.')
      }
    }, 250)
  }

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setSignUpError('')

    const cleanId = signUpIdentifier.trim()
    if (!cleanId) {
      setSignUpError('Please enter your mobile number or email address.')
      return
    }

    setSignUpLoading(true)
    try {
      const res = await sendVerificationOtp(cleanId, signUpName)
      setSignUpLoading(false)
      if (res.success && res.code) {
        setSimulatedOtp(res.code)
        setOtpCode(res.code) // auto-fill immediately for smooth onboarding
        setSignUpStep('verify')
        setResendTimer(30)
      } else {
        setSignUpError(res.error || 'Could not send verification code.')
      }
    } catch {
      setSignUpLoading(false)
      setSignUpError('Could not connect to authentication service. Please check your network.')
    }
  }

  function handleVerifyAndSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSignUpError('')

    const cleanCode = otpCode.trim()
    if (!cleanCode) {
      setSignUpError('Please enter the 6-digit verification code.')
      return
    }

    if (!signUpPassword || signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters long.')
      return
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError('Passwords do not match. Please re-enter.')
      return
    }

    setSignUpLoading(true)
    setTimeout(() => {
      const res = verifyOtpAndSignUp({
        name: signUpName.trim() || 'New User',
        identifier: signUpIdentifier,
        code: cleanCode,
        password: signUpPassword,
      })
      setSignUpLoading(false)
      if (res.success) {
        setSignUpSuccess(true)
        setTimeout(() => {
          onAuthenticated?.()
        }, 800)
      } else {
        setSignUpError(res.error || 'Verification failed. Please check the code and try again.')
      }
    }, 300)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand header */}
        <div className="auth-header">
          <div className="brand-mark auth-brand-mark">
            <span>M</span>
            <i />
          </div>
          <h1>Memora</h1>
          <p className="auth-subtitle">Client Memory & Financial Intelligence for Freelancers</p>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab ${tab === 'signin' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setTab('signin')
              setSignInError('')
              setSignUpError('')
            }}
          >
            <KeyRound size={15} />
            <span>Sign In (Password)</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'signup' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setTab('signup')
              setSignInError('')
              setSignUpError('')
            }}
          >
            <ShieldCheck size={15} />
            <span>Sign Up (OTP Verify)</span>
          </button>
        </div>

        {/* SIGN IN VIEW */}
        {tab === 'signin' && (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="auth-intro">
              <h3>Welcome back</h3>
              <p>Sign in using your registered mobile number or email ID and password.</p>
            </div>

            {signInError && <div className="auth-error-banner" role="alert">{signInError}</div>}

            <label className="auth-field">
              <span>Mobile number or Email address</span>
              <div className="auth-input-wrap">
                <input
                  required
                  type="text"
                  placeholder="e.g. +91 98765 43210 or manohar@memora.app"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  className="auth-input"
                  autoFocus
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <input
                  required
                  type={showSignInPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowSignInPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button type="submit" className="button button-primary auth-submit-btn" disabled={signInLoading}>
              {signInLoading ? 'Signing in…' : 'Sign in to workspace'}
              <ArrowRight size={16} />
            </button>

            {/* Quick autofill chips */}
            <div className="auth-demo-box">
              <p>Demo accounts (password: <code>password123</code>):</p>
              <div className="demo-chip-row">
                <button type="button" className="auth-demo-btn" onClick={() => autofillDemo('email')}>
                  ✉ Manohar (Email)
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => autofillDemo('phone')}>
                  📱 Manohar (Mobile)
                </button>
              </div>
            </div>

            <div className="auth-switch-hint">
              Need a new account?
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setTab('signup')
                  setSignUpStep('request')
                }}
              >
                Sign up with mobile/email verification →
              </button>
            </div>
          </form>
        )}

        {/* SIGN UP VIEW */}
        {tab === 'signup' && (
          <div className="auth-form">
            <div className="auth-intro">
              <h3>Create your account</h3>
              <p>Verify your mobile number or email ID, then set your personal password.</p>
            </div>

            {signUpError && <div className="auth-error-banner" role="alert">{signUpError}</div>}
            {signUpSuccess && (
              <div className="auth-success-banner">
                <CheckCircle2 size={18} />
                <span>Account verified and created! Opening workspace…</span>
              </div>
            )}

            {/* STEP 1: Enter contact & request verification */}
            {signUpStep === 'request' && (
              <form onSubmit={handleSendOtp} className="signup-step-form">
                <div className="signup-mode-picker">
                  <button
                    type="button"
                    className={`mode-btn ${signUpMode === 'mobile' ? 'mode-btn-active' : ''}`}
                    onClick={() => {
                      setSignUpMode('mobile')
                      setSignUpIdentifier('')
                    }}
                  >
                    <Phone size={14} /> Mobile number
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${signUpMode === 'email' ? 'mode-btn-active' : ''}`}
                    onClick={() => {
                      setSignUpMode('email')
                      setSignUpIdentifier('')
                    }}
                  >
                    <Mail size={14} /> Email address
                  </button>
                </div>

                <label className="auth-field">
                  <span>Your full name</span>
                  <div className="auth-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. Manohar Kumar"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>{signUpMode === 'mobile' ? 'Mobile number *' : 'Email address *'}</span>
                  <div className="auth-input-wrap">
                    <input
                      required
                      type={signUpMode === 'mobile' ? 'tel' : 'email'}
                      placeholder={signUpMode === 'mobile' ? 'e.g. 98765 43210 or +91 98765 43210' : 'e.g. yourname@domain.com'}
                      value={signUpIdentifier}
                      onChange={(e) => setSignUpIdentifier(e.target.value)}
                      className="auth-input"
                      autoFocus
                    />
                  </div>
                </label>

                <div className="auth-mode-hint">
                  <span>💡 Note: A 6-digit verification code will be generated and shown instantly on screen.</span>
                </div>

                <button type="submit" className="button button-primary auth-submit-btn" disabled={signUpLoading}>
                  {signUpLoading ? 'Sending verification code…' : 'Send verification code'}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: Enter verification code & set password */}
            {signUpStep === 'verify' && (
              <form onSubmit={handleVerifyAndSignUp} className="signup-step-form">
                {/* Visual OTP Alert Card */}
                <div className="otp-alert-card">
                  <div className="otp-alert-header">
                    <span className="otp-alert-badge"><Sparkles size={13} /> Code Generated</span>
                    <span className="otp-alert-target">Sent to: <b>{signUpIdentifier}</b></span>
                  </div>
                  <div className="otp-alert-body">
                    <div className="otp-number-box">
                      <span className="otp-number-title">YOUR 6-DIGIT OTP</span>
                      <b className="otp-number-value">{simulatedOtp || '123456'}</b>
                    </div>
                    <div className="otp-action-buttons">
                      <button
                        type="button"
                        className="otp-autofill-btn"
                        onClick={() => setOtpCode(simulatedOtp || '123456')}
                      >
                        ✓ Auto-fill
                      </button>
                      <button
                        type="button"
                        className="otp-quick-test-btn"
                        onClick={() => setOtpCode('123456')}
                        title="Use universal demo test code 123456"
                      >
                        Use 123456
                      </button>
                    </div>
                  </div>
                </div>

                <label className="auth-field">
                  <div className="field-header-row">
                    <span>Enter 6-digit verification code *</span>
                    <button
                      type="button"
                      className="resend-link"
                      onClick={() => handleSendOtp()}
                      disabled={resendTimer > 0 || signUpLoading}
                    >
                      <RefreshCw size={12} className={signUpLoading ? 'spin-icon' : ''} />
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                    </button>
                  </div>
                  <div className="auth-input-wrap">
                    <input
                      required
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 582910"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="auth-input auth-otp-input"
                      autoFocus
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>Set your password *</span>
                  <div className="auth-input-wrap">
                    <input
                      required
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowSignUpPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="auth-field">
                  <span>Confirm password *</span>
                  <div className="auth-input-wrap">
                    <input
                      required
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </label>

                <div className="signup-actions-row">
                  <button
                    type="button"
                    className="button button-soft"
                    onClick={() => {
                      setSignUpStep('request')
                      setSignUpError('')
                    }}
                  >
                    Change contact
                  </button>
                  <button type="submit" className="button button-primary" disabled={signUpLoading}>
                    {signUpLoading ? 'Creating account…' : 'Verify & Create Account'}
                  </button>
                </div>
              </form>
            )}

            <div className="auth-switch-hint">
              Already registered in Memora?
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setTab('signin')
                  setSignInError('')
                }}
              >
                Sign in with password →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
