import './TopBar.css'

type TopBarProps = { isLive: boolean; onOpenAbout: () => void }

/** The name on the left, a heartbeat on the right. Nothing else earns a place up here. */
export function TopBar({ isLive, onOpenAbout }: TopBarProps) {
  return (
    <header className="top-bar">
      <button className="top-bar__mark" onClick={onOpenAbout} aria-label="What this is">
        OVERHEAD
      </button>
      <span className={`top-bar__status${isLive ? ' is-live' : ''}`}>
        <span className="top-bar__pip" />
        {isLive ? 'LIVE' : 'OFFLINE'}
      </span>
    </header>
  )
}
