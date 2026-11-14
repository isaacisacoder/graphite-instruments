export default function SiteFooter() {
  const base = import.meta.env.BASE_URL;
  return (
    <footer className="release-footer">
      <span>© 2026 isaacisacoder</span>
      <nav aria-label="Legal and project information">
        <a href={`${base}legal/privacy.html`}>Privacy</a>
        <a href={`${base}legal/terms.html`}>Terms</a>
        <a href={`${base}legal/disclaimer.html`}>Disclaimer</a>
        <a href={`${base}legal/about.html`}>About & licenses</a>
        <a
          href="https://github.com/isaacisacoder/graphite-instruments"
          rel="noreferrer"
        >
          Source
        </a>
      </nav>
    </footer>
  );
}
