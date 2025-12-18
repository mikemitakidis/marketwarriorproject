import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Market Warrior',
  description: 'Privacy Policy for Market Warrior Trading Challenge',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-400 hover:text-blue-300 mb-8 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-400">Last Updated: December 2024</p>
          
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-300">
              Market Warrior (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is 
              committed to protecting your personal data. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you 
              use our 30-Day Trading Challenge platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Personal Information</h3>
            <p className="text-gray-300">When you register or use our Service, we may collect:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li>Email address</li>
              <li>Full name</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Account credentials</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">Usage Data</h3>
            <p className="text-gray-300">We automatically collect certain information when you use our Service:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li>Course progress and completion status</li>
              <li>Quiz scores and attempts</li>
              <li>Trading journal entries (if you use this feature)</li>
              <li>Device information and IP address</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li>Provide and maintain our Service</li>
              <li>Process your payments</li>
              <li>Track your course progress</li>
              <li>Send you important updates about the Service</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Improve our Service and develop new features</li>
              <li>Prevent fraud and unauthorized access</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-300">
              Your data is stored securely using Supabase, which provides enterprise-grade 
              security including encryption at rest and in transit. We implement appropriate 
              technical and organizational measures to protect your personal data against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-gray-300 mt-4">
              Payment information is processed by Stripe and is never stored on our servers. 
              Stripe is PCI-DSS compliant and maintains the highest security standards for 
              payment processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-300">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (e.g., Stripe for payments, Supabase for data storage, email service providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-300">
              We use cookies and similar tracking technologies to maintain your session 
              and remember your preferences. These are essential for the proper functioning 
              of our Service.
            </p>
            <p className="text-gray-300 mt-4">Types of cookies we use:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p className="text-gray-300">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
            </ul>
            <p className="text-gray-300 mt-4">
              To exercise any of these rights, please contact us at privacy@marketwarrior.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Data Retention</h2>
            <p className="text-gray-300">
              We retain your personal data for as long as your account is active or as 
              needed to provide you with our Service. We will also retain and use your 
              data as necessary to comply with legal obligations, resolve disputes, and 
              enforce our agreements.
            </p>
            <p className="text-gray-300 mt-4">
              If you request deletion of your account, we will delete your personal data 
              within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. International Transfers</h2>
            <p className="text-gray-300">
              Your data may be transferred to and processed in countries outside your 
              country of residence. We ensure that appropriate safeguards are in place 
              to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Children&apos;s Privacy</h2>
            <p className="text-gray-300">
              Our Service is not intended for individuals under the age of 18. We do not 
              knowingly collect personal information from children. If you are a parent 
              or guardian and believe your child has provided us with personal information, 
              please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-300">
              We may update this Privacy Policy from time to time. We will notify you of 
              any changes by posting the new Privacy Policy on this page and updating the 
              &quot;Last Updated&quot; date. You are advised to review this Privacy Policy 
              periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions about this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <ul className="list-none text-gray-300 mt-4 space-y-2">
              <li>Email: privacy@marketwarrior.com</li>
              <li>Support: support@marketwarrior.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. UK/EU Residents</h2>
            <p className="text-gray-300">
              If you are a resident of the United Kingdom or European Union, you have 
              additional rights under the UK GDPR and EU GDPR. You have the right to 
              lodge a complaint with a supervisory authority if you believe our 
              processing of your personal data violates applicable law.
            </p>
            <p className="text-gray-300 mt-4">
              For UK residents, you can contact the Information Commissioner&apos;s Office (ICO) 
              at ico.org.uk
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link 
            href="/" 
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
