// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.ADMIN_EMAIL_ALLOWLIST = 'admin@test.com'
process.env.NODE_ENV = 'test'
process.env.LOOPS_API_KEY = 'test-loops-api-key'
process.env.CRON_SECRET = 'test-cron-secret'
