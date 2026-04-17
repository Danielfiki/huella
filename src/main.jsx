import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
          justifyContent: 'center', height: '100dvh', padding: '24px',
          fontFamily: 'sans-serif', background: '#fdf6f0', color: '#3a2e28',
          textAlign: 'center', gap: '12px',
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Error al iniciar la app</h2>
          <p style={{ color: '#8a7a70', maxWidth: '360px', margin: 0 }}>
            {this.state.error.message}
          </p>
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
