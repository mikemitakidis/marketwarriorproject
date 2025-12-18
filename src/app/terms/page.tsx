import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Market Warrior',
  description: 'Terms of Service for Market Warrior Trading Challenge',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="text-blue-400 hover:text-blue-300 mb-8 inline-block"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-gray-400">Last Updated: December 2024</p>
          
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing or using the Market Warrior 30-Day Trading Challenge (&quot;Service&quot;), 
              you agree to be bound by these Terms of Service. If you do not agree to these terms, 
              please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-300">
              Market Warrior provides an educational trading course consisting of 30 days of 
              structured learning content, including lessons, quizzes, and practical exercises. 
              The Service is designed for educational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Educational Disclaimer</h2>
            <p className="text-gray-300">
              <strong>Important:</strong> The content provided by Market Warrior is for 
              educational and informational purposes only. It does not constitute financial 
              advice, investment advice, trading advice, or any other sort of advice. 
              You should not treat any of the content as such.
            </p>
            <p className="text-gray-300 mt-4">
              Trading and investing in financial markets involves substantial risk of loss 
              and is not suitable for everyone. Past performance is not indicative of future 
              results. You should carefully consider your investment objectives, level of 
              experience, and risk appetite before making any investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. User Accounts</h2>
            <p className="text-gray-300">
              You are responsible for maintaining the confidentiality of your account 
              credentials and for all activities that occur under your account. You agree 
              to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payment and Refunds</h2>
            <p className="text-gray-300">
              Access to the full 30-Day Trading Challenge requires a one-time payment. 
              Due to the digital nature of our product, all sales are final. However, 
              we may consider refund requests on a case-by-case basis within 7 days of 
              purchase if you have not accessed more than 3 days of content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-300">
              All content included in the Service, including but not limited to text, 
              graphics, logos, images, audio clips, video clips, and software, is the 
              property of Market Warrior or its content suppliers and is protected by 
              international copyright laws.
            </p>
            <p className="text-gray-300 mt-4">
              You may not reproduce, distribute, modify, create derivative works of, 
              publicly display, publicly perform, republish, download, store, or transmit 
              any of the material on our Service without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Prohibited Uses</h2>
            <p className="text-gray-300">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li>Share your account credentials with others</li>
              <li>Copy, distribute, or share course content</li>
              <li>Use automated systems to access the Service</li>
              <li>Attempt to bypass security measures</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Resell or commercially exploit the content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Affiliate Program</h2>
            <p className="text-gray-300">
              Market Warrior offers an affiliate program. Affiliates earn commissions 
              on valid referrals according to our current commission structure. We reserve 
              the right to modify commission rates, terms, or terminate the program at 
              any time. Fraudulent referrals will result in immediate termination and 
              forfeiture of unpaid commissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300">
              In no event shall Market Warrior, its officers, directors, employees, or 
              agents be liable to you for any indirect, incidental, special, consequential, 
              or punitive damages, including without limitation, loss of profits, data, 
              use, goodwill, or other intangible losses, resulting from your access to 
              or use of or inability to access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Risk Acknowledgment</h2>
            <p className="text-gray-300">
              By using this Service, you acknowledge that trading financial instruments 
              carries a high level of risk and may not be suitable for all investors. 
              Leverage can work against you as well as for you. Before deciding to trade, 
              you should carefully consider your investment objectives, level of experience, 
              and risk appetite. The possibility exists that you could sustain a loss of 
              some or all of your initial investment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-300">
              We reserve the right to modify these Terms at any time. We will notify 
              users of any changes by posting the new Terms on this page and updating 
              the &quot;Last Updated&quot; date. Your continued use of the Service after any 
              changes indicates your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Governing Law</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws 
              of the United Kingdom, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact Information</h2>
            <p className="text-gray-300">
              If you have any questions about these Terms, please contact us at 
              support@marketwarrior.com
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
