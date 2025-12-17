import LoginForm from './login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Login</h1>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        {/*
          LoginForm uses useSearchParams() (client hook). When Next pre-renders
          this route it requires a Suspense boundary to avoid build-time errors.
        */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
