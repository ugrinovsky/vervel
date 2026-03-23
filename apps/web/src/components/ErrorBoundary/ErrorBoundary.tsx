import { Component, ErrorInfo, ReactNode } from 'react';
import AccentButton from '../ui/AccentButton';
import ScreenHint from '../ScreenHint/ScreenHint';
import VerveLogo from '../VerveLogo/VerveLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4">
        <VerveLogo className="h-8 w-auto opacity-60" />
        <ScreenHint emoji="⚠️" className="w-full max-w-xs">
          {this.state.error?.message ?? 'Неизвестная ошибка'}
        </ScreenHint>
        <AccentButton size="sm" onClick={this.handleReload}>
          Перезагрузить
        </AccentButton>
      </div>
    );
  }
}
