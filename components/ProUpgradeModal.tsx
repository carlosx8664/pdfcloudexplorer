
import React, { useState } from 'react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: (reference?: string) => void;
  isPro?: boolean;
  userEmail?: string;
  userId?: string;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  isPro, 
  userEmail,
  userId 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planType: string) => {
    if (!userEmail || !userId) {
      setError('User information is missing. Please log in again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (onUpgrade) {
        // Passing plan type in the reference for internal tracking
        await onUpgrade(`manual_${planType}_${Date.now()}`);
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Upgrade failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 cursor-auto p-4">
      <div 
        className="bg-white dark:bg-[#252423] rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col lg:flex-row min-h-[600px] border border-transparent dark:border-[#3b3a39]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-30 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-2 bg-white/80 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 backdrop-blur-sm"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isPro ? (
           <div className="w-full flex flex-col items-center justify-center py-24 px-8 text-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-[#2d2c2b] dark:to-[#1b1a19]">
            <div className="w-24 h-24 bg-white dark:bg-[#323130] rounded-2xl flex items-center justify-center mb-6 shadow-sm p-4">
                <img 
                  src="https://res.cloudinary.com/dlyw9jsqs/image/upload/v1767359061/pdfce_hcnokl.jpg" 
                  alt="PDF Cloud Explorer" 
                  className="w-full h-full object-contain"
                />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">You're a PRO Member!</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-lg leading-relaxed">
              Thank you for supporting us. You have unlocked all AI features and expanded workspace limits.
            </p>
            {userEmail && (
              <div className="mb-10 px-6 py-3 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Account: <span className="font-bold text-gray-800 dark:text-gray-100">{userEmail}</span>
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white px-10 py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95 text-lg"
            >
              Enter Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Left Column: Branding & Features */}
            <div className="p-10 lg:w-2/5 bg-white dark:bg-[#252423] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-[#3b3a39]">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-white dark:bg-[#323130] rounded-2xl flex items-center justify-center p-2 border border-gray-100 dark:border-gray-700 shadow-sm">
                   <img 
                      src="https://res.cloudinary.com/dlyw9jsqs/image/upload/v1767359061/pdfce_hcnokl.jpg" 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Elevate to PRO</h2>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-bold tracking-tight">The ultimate PDF toolset</p>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Premium Workspace Benefits:</h3>
                <ul className="space-y-4">
                  {[
                    "✨ Unlimited file size (up to 100MB)",
                    "📄 Multiple PDF workspace (10 files)",
                    "✏️ Signature Tools & Image Support",
                    "🧠 AI Summarize (10 credits/mo)",
                    "📊 AI Data Extraction (10 credits/mo)",
                    "⚡ Priority Processing Speed",
                    "🎨 Smart Font & Style Detection",
                    "🔧 Advanced Layout Preservation"
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                      <div className="mt-0.5 mr-4 flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-10 p-4 bg-gray-50 dark:bg-black/20 rounded-2xl text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed border border-gray-100 dark:border-gray-800">
                🚀 Join thousands of professionals optimizing their document workflows with our advanced AI suite.
              </div>
            </div>

            {/* Right Column: Two-Plan Pricing Grid */}
            <div className="flex-1 bg-gray-50/50 dark:bg-[#1f1e1d] p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
               {/* Background Glows */}
               <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
               <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] -ml-40 -mb-40"></div>

               {error && (
                 <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-600 dark:text-red-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                   <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                   <p className="font-medium">{error}</p>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {/* Option 1: Monthly */}
                  <div className="bg-white dark:bg-[#252423] rounded-[2.5rem] p-8 shadow-xl border-2 border-gray-100 dark:border-[#3b3a39] flex flex-col items-center text-center relative group transition-all hover:border-blue-500/50">
                    <div className="absolute -top-3 px-4 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Most Popular
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">PRO Monthly</h4>
                    <div className="mb-1 flex items-baseline justify-center text-gray-900 dark:text-white">
                      <span className="text-5xl font-black">$7.99</span>
                      <span className="text-gray-400 dark:text-gray-500 font-bold ml-1">/mo</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-10">Cancel anytime</p>
                    
                    <button
                      onClick={() => handleUpgrade('monthly')}
                      disabled={isProcessing}
                      className="w-full mt-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-6 rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Subscribe to PRO →'}
                    </button>
                  </div>

                  {/* Option 2: Lifetime */}
                  <div className="bg-white dark:bg-[#252423] rounded-[2.5rem] p-8 shadow-xl border-2 border-purple-500/50 dark:border-purple-500/30 flex flex-col items-center text-center relative group transition-all hover:shadow-purple-500/10">
                    <div className="absolute -top-3 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      Best Value
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Lifetime Access</h4>
                    
                    <div className="relative mb-1">
                      <div className="flex items-center justify-center gap-3">
                         <span className="text-2xl text-gray-300 dark:text-gray-600 line-through font-bold">$149</span>
                         <span className="text-5xl font-black text-gray-900 dark:text-white">$99</span>
                      </div>
                      <div className="absolute -right-4 -top-4 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                        SAVE $50
                      </div>
                    </div>
                    
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-10">One-time payment</p>
                    
                    <button
                      onClick={() => handleUpgrade('lifetime')}
                      disabled={isProcessing}
                      className="w-full mt-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 px-6 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Get Lifetime Access →'}
                    </button>
                  </div>
               </div>

               <div className="mt-12 text-center">
                  <button
                    onClick={onClose}
                    className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-widest"
                  >
                    Maybe later, keep free plan
                  </button>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProUpgradeModal;
