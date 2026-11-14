import { useState } from "react";
import { readRecent } from "./recent";
import { INSTRUMENTS } from "./catalog";
function InstrumentDrawing({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 280 126"
      aria-hidden="true"
      className="instrument-drawing"
    >
      {["basic", "scientific", "graphing"].includes(id) ? (
        <g>
          <rect
            x="91"
            y="4"
            width="98"
            height="119"
            rx="13"
            className="drawing-body"
          />
          <rect
            x="102"
            y="17"
            width="76"
            height="36"
            rx="3"
            className="drawing-screen"
          />
          {Array.from({ length: 20 }, (_, i) => (
            <rect
              key={i}
              x={102 + (i % 5) * 15.4}
              y={64 + Math.floor(i / 5) * 12.5}
              width="12"
              height="9"
              rx="2"
              className={i === 19 ? "drawing-accent" : "drawing-key"}
            />
          ))}
          {id === "graphing" ? (
            <path
              d="M107 42Q140 7 173 43M108 38H171M140 21V49"
              className="drawing-line"
            />
          ) : (
            <text x="169" y="42" textAnchor="end" className="drawing-digits">
              {id === "basic" ? "128" : "sin(π/2)"}
            </text>
          )}
        </g>
      ) : id === "financial" ? (
        <g>
          <path d="M40 102H247M54 106V21" className="drawing-muted" />
          <path d="M54 94C115 90 162 73 231 19" className="drawing-line" />
          <path
            d="M54 94C115 90 162 73 231 19V102H54Z"
            className="drawing-area"
          />
          <text x="177" y="105" className="drawing-formula">
            (1+r)ⁿ
          </text>
        </g>
      ) : id === "cas" ? (
        <g>
          <text x="53" y="47" className="drawing-equation">
            x² − 1
          </text>
          <text x="140" y="68" textAnchor="middle" className="drawing-formula">
            =
          </text>
          <text x="36" y="97" className="drawing-equation small">
            (x − 1)(x + 1)
          </text>
        </g>
      ) : id === "calculus" ? (
        <g>
          <path d="M34 104H248M57 108V15" className="drawing-muted" />
          <path
            d="M58 96Q118 100 214 22L214 104H58Z"
            className="drawing-area"
          />
          <path d="M58 96Q118 100 214 22" className="drawing-line" />
          <path
            d="M112 104V81M158 104V61M200 104V33"
            className="drawing-muted"
          />
          <text x="223" y="46" className="drawing-equation">
            ∫
          </text>
        </g>
      ) : id === "statistics" ? (
        <g>
          <path d="M30 103H250" className="drawing-muted" />
          <path
            d="M33 103C88 103 93 22 140 22S192 103 247 103Z"
            className="drawing-area"
          />
          <path
            d="M33 103C88 103 93 22 140 22S192 103 247 103"
            className="drawing-line"
          />
          <path
            d="M140 23V105M108 48V105M172 48V105"
            className="drawing-muted"
          />
          <text x="134" y="122" className="drawing-formula">
            μ
          </text>
        </g>
      ) : id === "matrix" ? (
        <g>
          <path
            d="M77 16H65V111H77M203 16H215V111H203"
            className="drawing-line"
          />
          {[1, 0, 2, 0, 1, 3, 4, 2, 1].map((n, i) => (
            <text
              key={i}
              x={91 + (i % 3) * 42}
              y={39 + Math.floor(i / 3) * 29}
              className="drawing-matrix"
            >
              {n}
            </text>
          ))}
        </g>
      ) : (
        <g>
          <path
            d="M140 28L100 47M140 28L210 47M100 60L65 78M100 60L135 78M135 92L110 107M135 92L165 107"
            className="drawing-muted"
          />
          {[
            [140, 22, "84"],
            [100, 55, "12"],
            [210, 55, "7"],
            [65, 88, "3"],
            [135, 88, "4"],
            [110, 122, "2"],
            [165, 122, "2"],
          ].map(([x, y, n]) => (
            <text
              key={`${x}`}
              x={x}
              y={y}
              textAnchor="middle"
              className="drawing-matrix"
            >
              {n}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
export default function Home() {
  const [saved, setSaved] = useState(readRecent);
  const favorite = (id: (typeof INSTRUMENTS)[number]["id"]) => {
    const next = {
      ...saved,
      favorites: saved.favorites.includes(id)
        ? saved.favorites.filter((v) => v !== id)
        : [...saved.favorites, id],
    };
    setSaved(next);
    try {
      localStorage.setItem("graphite:recent", JSON.stringify(next));
    } catch {
      /* Optional favorites. */
    }
  };
  return (
    <main className="suite-home">
      <div className="catalog-title">
        <h1>Graphite</h1>
        <p>Math instruments</p>
      </div>
      {(saved.last || saved.recent.length > 0) && (
        <nav className="recent-instruments" aria-label="Recent instruments">
          {saved.last && <a href={saved.last}>Continue working</a>}
          {saved.recent.slice(0, 3).map((id) => (
            <a key={id} href={`#/${id}`}>
              {INSTRUMENTS.find((i) => i.id === id)?.name}
            </a>
          ))}
        </nav>
      )}
      <section className="instrument-catalog" aria-label="Calculators">
        {[...INSTRUMENTS]
          .sort(
            (a, b) =>
              Number(saved.favorites.includes(b.id)) -
              Number(saved.favorites.includes(a.id)),
          )
          .map((item, i) => (
            <div className="instrument-item" key={item.id}>
              <button
                className="favorite-instrument"
                aria-label={`${saved.favorites.includes(item.id) ? "Unfavorite" : "Favorite"} ${item.name}`}
                aria-pressed={saved.favorites.includes(item.id)}
                onClick={() => favorite(item.id)}
              >
                {saved.favorites.includes(item.id) ? "★" : "☆"}
              </button>
              <a
                key={item.id}
                className="instrument-choice"
                href={`#/${item.id}`}
                aria-label={`Open ${item.name} calculator`}
              >
                <div className="choice-top">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <InstrumentDrawing id={item.id} />
                <h2>{item.name}</h2>
                <p>{item.functions}</p>
              </a>
            </div>
          ))}
      </section>
    </main>
  );
}
