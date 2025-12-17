export default function CheckEmailPage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Confirm your email</h1>
        <p style={{ opacity: .9 }}>
          Please open your inbox and click the confirmation link. After confirmation, you will be redirected here and sent to payment.
        </p>
        <p style={{ opacity: .9 }}>
          If you already confirmed, try logging in again.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn btnPrimary" href="/login">Go to login</a>
          <a className="btn" href="/">Back home</a>
        </div>
      </div>
    </main>
  );
}
