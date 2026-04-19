import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
if (plausibleDomain) {
  const s = document.createElement('script')
  s.defer = true
  s.setAttribute('data-domain', plausibleDomain)
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100dvh', padding: '32px',
          fontFamily: 'sans-serif', background: '#fdf6f0', color: '#3a2e28',
          textAlign: 'center', gap: '14px', maxWidth: '400px', margin: '0 auto',
        }}>
          <div style={{ fontSize: '44px' }}>😔</div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Algo salió mal</h2>
          <p style={{ color: '#8a7a70', margin: 0, lineHeight: 1.65, fontSize: '14px' }}>
            La aplicación tuvo un problema inesperado. Puedes recargar para intentar de nuevo — tus datos están guardados en la nube.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '4px', padding: '13px 28px',
              background: '#c96f45', color: '#fff', border: 'none',
              borderRadius: '12px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.2px',
            }}
          >
            Recargar app
          </button>
          <a
            href="/panel"
            style={{ fontSize: '13px', color: '#8a7a70', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Volver al inicio
          </a>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{
              marginTop: '8px', padding: '12px', background: '#f5e9e3',
              borderRadius: '8px', fontSize: '11px', textAlign: 'left',
              maxWidth: '100%', overflow: 'auto', color: '#c0392b',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
