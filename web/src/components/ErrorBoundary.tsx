import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so a single broken screen cannot leave the
 * whole app blank. Event-handler errors still surface through the toast/API
 * layer as before.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UI render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="rt-fatal" role="alert">
        <span className="rt-fatal-icon" aria-hidden="true">
          <i className="bi bi-exclamation-triangle" />
        </span>
        <h1>Halaman gagal dimuat</h1>
        <p>Terjadi kesalahan saat merender halaman ini. Muat ulang untuk melanjutkan.</p>
        <pre>{this.state.error.message}</pre>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" /> Muat ulang
        </button>
      </div>
    );
  }
}
