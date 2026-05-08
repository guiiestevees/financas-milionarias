import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="p-6 rounded-xl" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.3)' }}>
        <div className="text-rose-300 font-semibold mb-2">Algo quebrou ao renderizar essa aba</div>
        <div className="text-xs text-white/60 font-mono whitespace-pre-wrap break-all mb-3">
          {String(this.state.error?.message || this.state.error)}
        </div>
        {this.state.info?.componentStack && (
          <details className="text-xs text-white/45 mb-3">
            <summary className="cursor-pointer">Stack</summary>
            <pre className="whitespace-pre-wrap break-all mt-2">{this.state.info.componentStack}</pre>
          </details>
        )}
        <button onClick={this.reset} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">
          Tentar de novo
        </button>
      </div>
    )
  }
}
