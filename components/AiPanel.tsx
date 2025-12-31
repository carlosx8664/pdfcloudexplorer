
import React, { useEffect } from 'react';
import { AiFields, SummaryResult } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';

interface ExtendedAiFields extends AiFields {
  notes?: string;
}

interface AiPanelProps {
  isOpen: boolean;
  activeTab: 'summary' | 'fields';
  onTabChange: (tab: 'summary' | 'fields') => void;
  summary: SummaryResult | null;
  fields: ExtendedAiFields | null;
  loading: "summary" | "fields" | null;
  error: string | null;
  onClose: () => void;
}

const AiPanel: React.FC<AiPanelProps> = ({ 
  isOpen, 
  activeTab, 
  onTabChange, 
  summary, 
  fields, 
  loading, 
  error, 
  onClose 
}) => {
  const { isAuthenticated, user, initializeGsi, signOut } = useGoogleAuth();

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      const timer = setTimeout(() => {
        initializeGsi('ai-panel-google-signin');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAuthenticated, initializeGsi]);

  if (!isOpen) return null;

  const isCurrentTabLoading = loading === activeTab;

  return (
    <div className="w-80 bg-white dark:bg-[#252423] border-l border-[#e1dfdd] dark:border-[#3b3a39] h-full flex flex-col shadow-2xl z-20 transition-all">
      <div className="h-12 border-b border-[#e1dfdd] dark:border-[#3b3a39] flex flex-col px-4 bg-[#f3f2f1] dark:bg-[#201f1e] justify-center transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#323130] dark:text-[#f3f2f1] flex items-center space-x-2">
            <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 dark:bg-indigo-900/40 rounded text-indigo-600 dark:text-indigo-400">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
            <span>AI Insight</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[#edebe9] dark:hover:bg-[#323130] rounded text-[#605e5c] dark:text-[#a19f9d]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {isAuthenticated && user && (
          <div className="text-[9px] text-[#605e5c] dark:text-[#a19f9d] mt-0.5 flex items-center justify-between">
            <span className="truncate max-w-[140px]">Signed in as <span className="font-bold">{user.email}</span></span>
            <button onClick={signOut} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">Sign out</button>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#252423] transition-colors">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h3 className="text-sm font-bold text-[#323130] dark:text-[#f3f2f1] mb-2">Google Sign-In Required</h3>
          <p className="text-xs text-[#605e5c] dark:text-[#a19f9d] leading-relaxed mb-8">
            Sign in with Google to use AI Summarize and Extract Fields.
          </p>
          <div id="ai-panel-google-signin" className="flex justify-center min-h-[40px]"></div>
        </div>
      ) : (
        <>
          <div className="flex bg-[#f3f2f1] dark:bg-[#201f1e] border-b border-[#e1dfdd] dark:border-[#3b3a39] transition-colors">
            <button
              onClick={() => onTabChange('summary')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'summary' ? 'border-[#0078d4] text-[#0078d4] dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-[#252423]' : 'border-transparent text-[#605e5c] dark:text-[#a19f9d] hover:bg-[#edebe9] dark:hover:bg-[#323130]'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => onTabChange('fields')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'fields' ? 'border-[#0078d4] text-[#0078d4] dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-[#252423]' : 'border-transparent text-[#605e5c] dark:text-[#a19f9d] hover:bg-[#edebe9] dark:hover:bg-[#323130]'
              }`}
            >
              Extracted Fields
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-[#252423] transition-colors">
            {error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-xs">
                <p className="font-bold mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  Operation Failed
                </p>
                <p className="leading-relaxed">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-3 text-red-800 dark:text-red-300 font-bold hover:underline"
                >
                  Retry Connection
                </button>
              </div>
            ) : isCurrentTabLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-[#605e5c] dark:text-[#a19f9d]">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">Gemini 3 Processing</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'summary' ? (
                  <div className="prose prose-sm dark:prose-invert">
                    {summary ? (
                       <div className="space-y-6">
                          <div className="bg-blue-50/50 dark:bg-indigo-900/10 p-4 rounded-lg border border-blue-100 dark:border-indigo-900/30 shadow-inner">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Summary
                            </h3>
                            <div className="text-sm leading-relaxed text-[#323130] dark:text-[#f3f2f1] whitespace-pre-wrap">
                               {summary.summary.split('\n\n').map((paragraph, idx) => (
                                 <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
                               ))}
                            </div>
                          </div>

                          {summary.keyPoints && summary.keyPoints.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Key Takeaways
                                </h3>
                                <ul className="space-y-3">
                                {summary.keyPoints.map((point, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-[#323130] dark:text-[#f3f2f1]">
                                    <span className="text-purple-600 dark:text-purple-400 text-lg leading-none mt-0.5">•</span>
                                    <span className="flex-1 leading-relaxed">{point}</span>
                                    </li>
                                ))}
                                </ul>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-[#323130] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-xs text-[#605e5c] dark:text-[#a19f9d] italic">
                          Click 'AI Summarize' in the toolbar to generate an overview.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields ? (
                      <>
                        <div className="bg-white dark:bg-[#323130] border border-[#e1dfdd] dark:border-[#3b3a39] p-3 rounded group shadow-sm transition-all hover:border-indigo-300">
                          <div className="text-[10px] font-bold text-[#605e5c] dark:text-[#a19f9d] uppercase mb-1">Document Type</div>
                          <div className="text-sm font-semibold text-[#323130] dark:text-[#f3f2f1]">{fields.documentType}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Involved Parties</div>
                          <div className="bg-gray-50 dark:bg-[#1b1a19] rounded p-2 space-y-2 border border-[#e1dfdd] dark:border-[#3b3a39]">
                            {fields.parties.map((p, i) => (
                              <div key={i} className="text-xs bg-white dark:bg-[#252423] p-2 rounded shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-2 text-[#323130] dark:text-[#f3f2f1]">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold">{i+1}</span>
                                <span className="font-medium">{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {fields.notes && (
                          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg">
                            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">AI Analyst Notes</div>
                            <p className="text-xs text-[#323130] dark:text-[#f3f2f1] leading-relaxed italic">"{fields.notes}"</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-[#323130] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        </div>
                        <p className="text-xs text-[#605e5c] dark:text-[#a19f9d] italic">
                          No fields extracted yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-[#f3f2f1] dark:bg-[#201f1e] border-t border-[#e1dfdd] dark:border-[#3b3a39] transition-colors">
             <button 
               disabled={!fields}
               className={`w-full py-2 text-white text-xs font-bold rounded shadow transition-colors uppercase tracking-widest active:scale-95 ${!fields ? 'bg-indigo-300 dark:bg-indigo-900/50 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'}`}
             >
                Export JSON Data
             </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AiPanel;