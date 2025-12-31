import React, { useState } from 'react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  isPro?: boolean;
  userEmail?: string;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, onUpgrade, isPro, userEmail }) => {
  // Removed complex error state to force rendering and simplify
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 cursor-auto p-4">
      <div 
        className="bg-white dark:bg-[#252423] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col md:flex-row min-h-[500px] border border-transparent dark:border-[#3b3a39]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-1.5 bg-white/80 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 backdrop-blur-sm"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isPro ? (
           <div className="w-full flex flex-col items-center justify-center py-16 px-8 text-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-[#2d2c2b] dark:to-[#1b1a19]">
            
            <div className="w-24 h-24 bg-white dark:bg-[#323130] rounded-2xl flex items-center justify-center mb-6 shadow-sm p-4">
                <img 
                  src="/pdfce.png?v=1" 
                  alt="PDF Cloud Explorer" 
                  className="w-full h-full object-contain"
                />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">You're a PRO Member!</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg">
              Thank you for supporting us. You have lifetime access to all premium features.
            </p>
            {userEmail && (
              <div className="mb-8 px-4 py-2 bg-white dark:bg-black/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Linked to: <span className="font-bold text-gray-700 dark:text-gray-200">{userEmail}</span>
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Back to Workspace
            </button>
          </div>
        ) : (
          <>
            {/* Left Side: Content */}
            <div className="p-8 md:p-10 md:w-3/5 bg-white dark:bg-[#252423] flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                
                <div className="w-16 h-16 bg-white dark:bg-[#323130] rounded-xl flex items-center justify-center p-2 border border-gray-100 dark:border-gray-700 shadow-sm">
                   <img 
                      src="/pdfce.png?v=1" 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Upgrade to PRO</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unlock AI powers & unlimited access</p>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Everything in PRO:</h3>
                <ul className="space-y-3.5">
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
                    <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300 group">
                      <div className="mt-0.5 mr-3 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                PRO features are being released gradually. Get locked-in pricing now.
              </div>
            </div>

            {/* Right Side: Pricing & CTA */}
            <div className="p-8 md:p-10 md:w-2/5 bg-gray-50 dark:bg-[#1f1e1d] border-l border-gray-100 dark:border-[#3b3a39] flex flex-col justify-center relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

               <div className="relative z-10 text-center">
                  <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    Launch Offer
                  </div>
                  
                  <div className="mb-2 flex items-center justify-center text-gray-900 dark:text-white">
                    <span className="text-3xl font-bold align-top mt-2">$</span>
                    <span className="text-6xl font-extrabold tracking-tight">4.99</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">
                    One-time payment<br/>Lifetime access
                  </p>
                  
                  <div className="space-y-4">
                    <button
                      onClick={onUpgrade}
                      className="w-full group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      <div className="absolute inset-0 w-full h-full bg-white/20 group-hover:animate-pulse rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        Get PRO Access
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </span>
                    </button>
                    
                    <button
                      onClick={onClose}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2"
                    >
                      No thanks, I'll continue with the Free plan
                    </button>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                     {/* Pseudo payment icons */}
                     <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                     <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                     <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProUpgradeModal;