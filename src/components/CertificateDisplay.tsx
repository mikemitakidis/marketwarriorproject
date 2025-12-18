'use client';

interface CertificateDisplayProps {
  fullName: string;
  completionDate: string;
  certificateNumber: string;
}

export default function CertificateDisplay({ 
  fullName, 
  completionDate, 
  certificateNumber 
}: CertificateDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Certificate */}
      <div 
        id="certificate-content"
        className="certificate-print bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-4 border-emerald-500/50 rounded-xl p-8 md:p-12 shadow-2xl"
      >
        {/* Decorative corners */}
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-16 h-16 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
          <div className="absolute -top-4 -right-4 w-16 h-16 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>

          <div className="text-center py-8">
            {/* Header */}
            <div className="text-emerald-500 text-lg tracking-widest mb-2">CERTIFICATE OF COMPLETION</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Market Warrior</h1>
            <div className="text-gray-400 text-lg mb-8">30-Day Trading Challenge</div>

            {/* Award */}
            <div className="text-xl text-gray-300 mb-4">This is to certify that</div>
            <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-4 border-b-2 border-emerald-500/30 pb-4 mx-auto max-w-md">
              {fullName}
            </div>

            <div className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              has successfully completed all 30 days of the Market Warrior Trading Challenge, 
              demonstrating proficiency in trading fundamentals, technical analysis, 
              risk management, and trading psychology.
            </div>

            {/* Date and Certificate Number */}
            <div className="flex flex-col md:flex-row justify-center gap-8 text-gray-400 mb-8">
              <div>
                <div className="text-sm">Completion Date</div>
                <div className="text-white font-semibold">{completionDate}</div>
              </div>
              <div>
                <div className="text-sm">Certificate Number</div>
                <div className="text-white font-mono">{certificateNumber}</div>
              </div>
            </div>

            {/* Seal */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/50 flex items-center justify-center bg-emerald-900/30">
                <span className="text-4xl">🏆</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions - hide when printing */}
      <div className="flex justify-center gap-4 mt-8 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
        >
          🖨️ Print Certificate
        </button>
      </div>
    </>
  );
}
