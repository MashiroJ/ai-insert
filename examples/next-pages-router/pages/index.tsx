export default function Home() {
  return (
    <main className="shell">
      <section className="card">
        <span className="eyebrow">Next.js Pages Router</span>
        <h1>ui-inspect is active in a Pages Router page.</h1>
        <p>
          This example injects the browser client from custom App and serves the
          Diana sprite through a Pages API route.
        </p>
        <div className="actions">
          <button type="button">Inspect this button</button>
          <a href="https://nextjs.org/docs/pages" rel="noreferrer" target="_blank">
            Next Pages docs
          </a>
        </div>
      </section>
    </main>
  );
}
