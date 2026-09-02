import './SkyStatus.css'

export type SkyState = 'scanning' | 'quiet' | 'error'

type SkyStatusProps = {
  state: SkyState
  onRetry: () => void
}

const COPY: Record<SkyState, string> = {
  scanning: 'Looking up',
  quiet: 'The sky is quiet.',
  error: 'Unable to reach the sky right now.',
}

/** Whatever is going on, it gets one line. Never a technical message, never a spinner. */
export function SkyStatus({ state, onRetry }: SkyStatusProps) {
  return (
    <div className={`status status--${state}`} role="status">
      {state === 'scanning' && <span className="status__scan" />}
      <p className="status__text">{COPY[state]}</p>
      {state === 'error' && (
        <button className="status__retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
