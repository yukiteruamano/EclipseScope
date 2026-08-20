import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null }

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) }
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error('ErrorBoundary', err, info)
  }

  reset = () => this.setState({ hasError: false, message: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div role="alert" className="glass rounded-2xl p-5 text-sm">
          <p className="font-semibold text-red-300">Algo salió mal</p>
          <p className="mt-1 text-slate-300">{this.state.message ?? 'Error inesperado'}</p>
          <button
            type="button"
            onClick={this.reset}
            className="touch-target mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-solar-500/50 hover:text-solar-300"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
