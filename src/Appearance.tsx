import { useCallback, useContext, useRef, useState } from "react";
import { SuiteEnvironment } from "./suite/environment";
import KeyStylePicker from "./KeyStylePicker";
import BackgroundPicker, { BACKGROUNDS } from "./BackgroundPicker";
import { useModalFocus } from "./useModalFocus";
export default function Appearance() {
  const e = useContext(SuiteEnvironment),
    [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null),
    close = useCallback(() => setOpen(false), []);
  useModalFocus(open, root, close);
  if (!e) return null;
  return (
    <>
      <button
        onClick={(event) => {
          event.currentTarget.focus();
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        Appearance
      </button>
      {open && (
        <div className="appearance-backdrop">
          <div
            data-appearance
            ref={root}
            className="appearance-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Appearance"
          >
            <div className="appearance-heading">
              <h2>Appearance</h2>
              <button onClick={close} aria-label="Close appearance">
                Close
              </button>
            </div>
            <KeyStylePicker value={e.keyStyle} onChange={e.setKeyStyle} />
            <div
              className="appearance-sample calculator instrument-material"
              data-key-style={e.keyStyle}
              data-shell={
                e.keyStyle.startsWith("clear-")
                  ? "clear"
                  : [
                        "blush",
                        "sage",
                        "lavender-mint",
                        "retro-typewriter",
                        "porcelain",
                        "stone",
                      ].includes(e.keyStyle)
                    ? "light"
                    : undefined
              }
              aria-hidden="true"
            >
              <div className="lite-display">2 + 3 = 5</div>
              <div className="lite-keys">
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>+</span>
              </div>
            </div>
            <BackgroundPicker value={e.background} onChange={e.setBackground} />
            <div className="background-previews">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  data-background={b.id}
                  className={`background-preview ${b.dark ? "dark" : "light"}`}
                  aria-label={`Background ${b.name}`}
                  aria-pressed={e.background === b.id}
                  onClick={() => e.setBackground(b.id)}
                >
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
            <label className="appearance-sound">
              <input
                type="checkbox"
                aria-label="Key sounds"
                checked={e.keys.sound}
                onChange={(event) => e.keys.setSound(event.target.checked)}
              />
              Key sounds
            </label>
            <label>
              Volume
              <input
                aria-label="Sound volume"
                type="range"
                min="0"
                max="100"
                value={e.keys.volume * 100}
                onChange={(event) =>
                  e.keys.setVolume(event.target.valueAsNumber / 100)
                }
              />
            </label>
            <label>
              Sound profile
              <select
                aria-label="Sound profile"
                value={e.keys.profile}
                onChange={(event) =>
                  e.keys.setProfile(event.target.value as typeof e.keys.profile)
                }
              >
                <option value="plastic">Plastic</option>
                <option value="mechanical">Muted Mechanical</option>
                <option value="typewriter">Typewriter</option>
              </select>
            </label>
            <button
              data-key-code="preview"
              disabled={!e.keys.sound || e.keys.volume === 0}
              onClick={() => e.keys.feedback("ENTER")}
            >
              Preview sound
            </button>
          </div>
        </div>
      )}
    </>
  );
}
