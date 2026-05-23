export default function Page() {
  return (
    <main className="shell">
      <section className="card">
        <span className="eyebrow">Next.js App Router</span>
        <h1>ui-inspect is active in an App Router page.</h1>
        <p>
          This example injects the browser client from the root layout and serves
          the Diana sprite through an App Router route.
        </p>
        <div className="actions">
          <button type="button">Inspect this button</button>
          <a href="https://nextjs.org/docs/app" rel="noreferrer" target="_blank">
            Next App docs
          </a>
        </div>
      </section>
    </main>
  );
}
