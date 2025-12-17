import RegisterForm from './register-form';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Create account</h1>

        {/* PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design) */}

        {/*
          RegisterForm uses useSearchParams() (client hook). When Next pre-renders
          this route it requires a Suspense boundary to avoid build-time errors.
        */}
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
