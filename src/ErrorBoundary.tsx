import { Component, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="route-error" role="alert">
        <h1>Unable to open this instrument</h1>
        <p>Your saved work is still available.</p>
        <button
          onClick={() => {
            window.dispatchEvent(new Event("pagehide"));
            window.location.reload();
          }}
        >
          Retry
        </button>
        <a href="#/">Return to instruments</a>
      </section>
    ) : (
      this.props.children
    );
  }
}
