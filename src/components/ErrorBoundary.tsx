import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message || '未知錯誤' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-bold text-red-600 mb-2">畫面載入失敗</h1>
            <p className="text-sm text-gray-600 mb-4">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-field-green text-white rounded-xl py-3 font-medium"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
