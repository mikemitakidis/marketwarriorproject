import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">📧</div>
        <h1 className="text-3xl font-bold mb-4">Check Your Email</h1>
        <p className="text-gray-400 mb-8">
          We've sent you an email with a confirmation link. 
          Please check your inbox and click the link to verify your account.
        </p>
        <div className="card">
          <p className="text-sm text-gray-500 mb-4">
            Didn't receive an email? Check your spam folder or try registering again.
          </p>
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
