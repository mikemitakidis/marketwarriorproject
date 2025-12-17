export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>MarketWarrior</h1>
        <p style={{ opacity: .9 }}>
          Landing page placeholder.
        </p>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn btnPrimary" href="/register">Register</a>
          <a className="btn" href="/login">Login</a>
          <a className="btn" href="/affiliate">Affiliate</a>
        </div>
      </div>
    </main>
  );
}
