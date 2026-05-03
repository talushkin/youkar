import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './RequestPage.css'

const LOGO_URL =
  'https://github.com/user-attachments/assets/fe1cfef5-afeb-4da7-8421-b129b00ab1a0'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const PENDING_API = 'https://be-tan-theta.vercel.app/api/pending'

/** Extract YouTube video ID from any valid YouTube URL */
function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match ? match[1] : null
}

function isValidYouTubeUrl(url) {
  return extractVideoId(url) !== null
}

function isValidPhone(phone) {
  return /^[0-9+\-\s()]{7,15}$/.test(phone.trim())
}

/** Format a Date to DD/MM/YYYY HH:MM:SS */
function formatDateTime(date) {
  const p = (n) => String(n).padStart(2, '0')
  return (
    `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  )
}

/** Build the POST payload for /api/pending */
function buildPendingPayload(videoId) {
  const canonicalLink = `https://www.youtube.com/watch?v=${videoId}`
  return [
    {
      videoId,
      link: canonicalLink,
      title: '',
      percent: '',
      created: formatDateTime(new Date()),
      completed: null,
      startedStems: null,
      finishStems: null,
      duration: '',
      voc: null,
      kar: null,
      meta: {
        playlistId: '',
        playlistName: '',
        source: 'youkar-FE',
        kind: 'karaoke-missing',
      },
    },
  ]
}

function buildGoogleSignInUrl() {
  if (!GOOGLE_CLIENT_ID) return null
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/request`,
    response_type: 'token',
    scope: 'openid email profile',
    state: 'google_signin',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export default function RequestPage() {
  const navigate = useNavigate()

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [authMethod, setAuthMethod] = useState('phone') // 'phone' | 'google'
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submittedVideoId, setSubmittedVideoId] = useState('')

  const validate = () => {
    const newErrors = {}
    if (!youtubeUrl.trim()) {
      newErrors.youtube = 'נא להזין לינק יוטיוב'
    } else if (!isValidYouTubeUrl(youtubeUrl)) {
      newErrors.youtube = 'לינק יוטיוב לא תקין'
    }
    if (authMethod === 'phone') {
      if (!phone.trim()) {
        newErrors.phone = 'נא להזין מספר טלפון'
      } else if (!isValidPhone(phone)) {
        newErrors.phone = 'מספר טלפון לא תקין'
      }
    }
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setLoading(true)

    const videoId = extractVideoId(youtubeUrl)
    const payload = buildPendingPayload(videoId)

    try {
      const res = await fetch(PENDING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`)
      }
    } catch (err) {
      setErrors({ submit: `שגיאה בשליחת הבקשה: ${err.message}` })
      setLoading(false)
      return
    }

    setSubmittedVideoId(videoId)
    setLoading(false)
    setSubmitted(true)
  }

  const handleGoogleSignIn = () => {
    const url = buildGoogleSignInUrl()
    if (url) {
      window.location.href = url
    }
  }

  return (
    <div className="request-page">
      {/* Header */}
      <header className="request-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← חזרה
        </button>
        <img src={LOGO_URL} alt="UKAR" className="request-logo" />
        <h1 className="request-title">הגשת בקשה לקריוקי</h1>
        <p className="request-subtitle">
          לאחר ביצוע התשלום, מלאו את הטופס וקבלו את קובץ הקריוקי שלכם
        </p>
      </header>

      <main className="request-main">
        {!submitted ? (
          <form className="request-form" onSubmit={handleSubmit} noValidate>
            {/* YouTube URL */}
            <div className="form-group">
              <label htmlFor="youtube-url" className="form-label">
                🎬 לינק שיר מיוטיוב
              </label>
              <input
                id="youtube-url"
                type="url"
                className={`form-input ${errors.youtube ? 'input-error' : ''}`}
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value)
                  setErrors((prev) => ({ ...prev, youtube: '' }))
                }}
                dir="ltr"
              />
              {errors.youtube && (
                <span className="error-msg">{errors.youtube}</span>
              )}
            </div>

            {/* Auth method toggle */}
            <div className="form-group">
              <label className="form-label">📲 פרטי קשר / זיהוי</label>
              <div className="auth-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${authMethod === 'phone' ? 'active' : ''}`}
                  onClick={() => setAuthMethod('phone')}
                >
                  📞 מספר טלפון
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${authMethod === 'google' ? 'active' : ''}`}
                  onClick={() => setAuthMethod('google')}
                >
                  <GoogleIcon /> Google
                </button>
              </div>
            </div>

            {/* Phone input */}
            {authMethod === 'phone' && (
              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  מספר טלפון
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`form-input ${errors.phone ? 'input-error' : ''}`}
                  placeholder="050-0000000"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setErrors((prev) => ({ ...prev, phone: '' }))
                  }}
                  dir="ltr"
                />
                {errors.phone && (
                  <span className="error-msg">{errors.phone}</span>
                )}
              </div>
            )}

            {/* Google sign-in */}
            {authMethod === 'google' && (
              <div className="form-group">
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={handleGoogleSignIn}
                >
                  <GoogleIcon />
                  Sign in with Google
                </button>
                {!GOOGLE_CLIENT_ID && (
                  <p className="google-note">
                    * Google Sign-In requires configuration of VITE_GOOGLE_CLIENT_ID
                  </p>
                )}
              </div>
            )}

            {/* Submit error */}
            {errors.submit && (
              <div className="submit-error">{errors.submit}</div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                '🎤 שליחת הבקשה'
              )}
            </button>
          </form>
        ) : (
          <SuccessPanel
            videoId={submittedVideoId}
            onNew={() => {
              setSubmitted(false)
              setYoutubeUrl('')
              setPhone('')
              setSubmittedVideoId('')
            }}
          />
        )}
      </main>
    </div>
  )
}

/* ── Success panel ── */
/** Strict YouTube video ID: exactly 11 word-chars or hyphens */
const VALID_VIDEO_ID_RE = /^[\w-]{11}$/

function SuccessPanel({ videoId, onNew }) {
  const safeId = VALID_VIDEO_ID_RE.test(videoId) ? videoId : ''
  const youtubeLink = safeId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(safeId)}`
    : '#'
  const thumbnail = safeId
    ? `https://img.youtube.com/vi/${encodeURIComponent(safeId)}/mqdefault.jpg`
    : ''

  return (
    <div className="success-panel">
      <div className="success-icon">✅</div>
      <h2 className="success-title">הבקשה התקבלה!</h2>
      <p className="success-desc">
        הבקשה לעיבוד הקריוקי נשלחה בהצלחה. קובץ הסאונד יהיה מוכן בקרוב.
      </p>

      {/* YouTube thumbnail */}
      <a
        href={youtubeLink}
        target="_blank"
        rel="noreferrer"
        className="yt-thumb-link"
      >
        <img
          src={thumbnail}
          alt="YouTube thumbnail"
          className="yt-thumbnail"
        />
        <span className="yt-play-overlay">▶</span>
      </a>

      <div className="pending-info">
        <span className="pending-label">Video ID:</span>
        <code className="pending-value" dir="ltr">{videoId}</code>
      </div>

      <p className="pending-note">
        🔔 קובץ הקריוקי יישלח אליכם ברגע שהעיבוד יסתיים.
      </p>

      <button className="new-request-btn" onClick={onNew}>
        ← בקשה נוספת
      </button>
    </div>
  )
}

/* ── Google icon SVG ── */
function GoogleIcon() {
  return (
    <svg
      className="google-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
