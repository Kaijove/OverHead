import { Component, type ReactNode } from 'react'
// Deliberately wears the location gate's clothes: same voice, same layout, nothing new to learn.
import './LocationGate/LocationGate.css'

type Props = { children: ReactNode }
type State = { hasFailed: boolean }

/**
 * A blank screen is the one state OVERHEAD must never show. If the map throws -- a bad tile, a
 * hostile browser, a coordinate that should not exist -- the app says so in the same quiet voice
 * it uses for everything else and offers the only useful action.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasFailed: false }

  static getDerivedStateFromError(): State {
    return { hasFailed: true }
  }

  render() {
    if (!this.state.hasFailed) return this.props.children

    return (
      <section className="gate">
        <h1 className="gate__lead">OVERHEAD lost the sky.</h1>
        <button className="gate__primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </section>
    )
  }
}
