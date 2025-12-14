export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '48px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '24px', color: '#1e3a5f' }}>Privacy Policy</h1>
        
        <div style={{ color: '#374151', lineHeight: 1.8 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>1. Information We Collect</h2>
          <p>We collect your email address, name, and payment information to provide our services. We also collect usage data to improve your experience.</p>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>2. How We Use Your Information</h2>
          <p>We use your information to provide course access, send progress updates, and communicate important announcements.</p>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data. Payment processing is handled securely by Stripe.</p>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>4. Third-Party Services</h2>
          <p>We use Supabase for authentication, Stripe for payments, and Resend for email delivery. Each service has its own privacy policy.</p>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>5. Your Rights</h2>
          <p>You can request access to, correction of, or deletion of your personal data by contacting us.</p>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>6. Contact</h2>
          <p>For privacy concerns, contact us at privacy@marketwarrior.club</p>
        </div>
      </div>
    </div>
  );
}
