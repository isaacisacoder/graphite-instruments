import { useRoute } from "./suite/useRoute";
import SiteFooter from "./SiteFooter";
import { readRecent } from "./suite/recent";
import Appearance from "./Appearance";
import ErrorBoundary from "./ErrorBoundary";
import OfflineStatus from "./OfflineStatus";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BACKGROUNDS, readBackground } from "./BackgroundPicker";
import { readKeyStyle } from "./KeyStylePicker";
import { useKeyFeedback } from "./useKeyFeedback";
import "./keyStyles.css";
import "./colorways.css";
import Home from "./suite/Home";
import { INSTRUMENTS } from "./suite/catalog";
import { SuiteEnvironment } from "./suite/environment";
import "./suite/suite.css";
const Graphing = lazy(() => import("./App")),
  Tool = lazy(() => import("./suite/Tool")),
  Lite = lazy(() => import("./suite/LiteCalculator")),
  Plot = lazy(() => import("./suite/PlotWorkspace")),
  Surface = lazy(() => import("./suite/SurfacePlot"));
export default function GraphiteRoot() {
  const route = useRoute();
  const [background, setBackground] = useState(readBackground),
    [graphVisited, setGraphVisited] = useState(route === "graphing");
  const [keyStyle, setKeyStyle] = useState(readKeyStyle);
  const keys = useKeyFeedback();
  useEffect(() => {
    try {
      localStorage.setItem("graphite84:key-style", keyStyle);
    } catch {
      /* Optional preference. */
    }
  }, [keyStyle]);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (route === "graphing") setGraphVisited(true);
    if (route !== "home") {
      const r = readRecent(),
        id = route === "plot" || route === "surface" ? "graphing" : route;
      try {
        localStorage.setItem(
          "graphite:recent",
          JSON.stringify({
            ...r,
            recent: [id, ...r.recent.filter((v) => v !== id)].slice(0, 9),
            last: `#/${route}`,
          }),
        );
      } catch {
        /* Local recent instruments are optional. */
      }
    }
    document.title =
      route === "home"
        ? "Graphite — Math instruments"
        : `Graphite — ${route === "plot" ? "Graph workspace" : route === "surface" ? "3D Graphing" : INSTRUMENTS.find((item) => item.id === route)?.name}`;
    content.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [route]);
  useEffect(() => {
    try {
      localStorage.setItem("graphite84:background", background);
    } catch {
      /* Local customization remains optional. */
    }
  }, [background]);
  const dark = BACKGROUNDS.find((theme) => theme.id === background)?.dark;
  return (
    <SuiteEnvironment.Provider
      value={{ background, setBackground, keyStyle, setKeyStyle, keys }}
    >
      {route !== "graphing" && (
        <div
          className={`workspace suite-workspace ${dark ? "dark" : "light"}`}
          data-background={background}
          onClickCapture={(event) => {
            if (
              (event.target as HTMLElement).closest("button") &&
              !(event.target as HTMLElement).closest(
                "[data-sound-toggle], [data-key-code]",
              )
            )
              keys.feedback("__ui__");
          }}
          onKeyDownCapture={(event) => {
            const target = event.target;
            if (
              !(
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement
              ) ||
              event.ctrlKey ||
              event.metaKey ||
              event.altKey
            )
              return;
            if (
              event.key === "Enter" &&
              target instanceof HTMLInputElement &&
              target.closest("form")
            )
              return;
            if (
              event.key.length === 1 ||
              ["Enter", "Backspace", "Delete"].includes(event.key)
            )
              keys.feedback("__ui__");
          }}
        >
          <header className="site-header suite-header">
            <a className="wordmark" href="#/" aria-label="Graphite home">
              <span className="brand-symbol">g.</span>
              <span>
                GRAPHITE
                <span className="brand-divider" />
                INSTRUMENTS
              </span>
            </a>
            <div className="header-actions">
              <a
                className="instruments-link"
                href="#/"
                aria-current={route === "home" ? "page" : undefined}
              >
                Instruments
              </a>
              <a className="instruments-link" href="#/plot">
                Graph workspace
              </a>
              <Appearance />
              <OfflineStatus />
            </div>
          </header>
          <div ref={content} className="route-content" tabIndex={-1}>
            <ErrorBoundary key={route}>
              <Suspense
                fallback={
                  <p className="suite-loading" role="status">
                    Loading instrument…
                  </p>
                }
              >
                {route === "home" ? (
                  <Home />
                ) : route === "basic" || route === "scientific" ? (
                  <Lite key={route} scientific={route === "scientific"} />
                ) : route === "plot" ? (
                  <Plot />
                ) : route === "surface" ? (
                  <Surface />
                ) : (
                  <Tool key={route} id={route} />
                )}
              </Suspense>
            </ErrorBoundary>
          </div>
          <SiteFooter />
        </div>
      )}
      {graphVisited && (
        <div hidden={route !== "graphing"}>
          <ErrorBoundary>
            <Suspense
              fallback={
                <p className="suite-loading" role="status">
                  Loading instrument…
                </p>
              }
            >
              <Graphing active={route === "graphing"} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </SuiteEnvironment.Provider>
  );
}
