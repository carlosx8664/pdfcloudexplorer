
import React, { useState, useEffect } from 'react';

interface SplitModalProps {
  isOpen: boolean;
  fileName: string;
  pageCount: number | null;
  onConfirm: (folderName: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  fileName,
  pageCount,
  onConfirm,
  onCancel,
  isProcessing
}) => {
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const defaultName = `${fileName.replace('.pdf', '')} - Split Pages`;
      setFolderName(defaultName);
    }
  }, [isOpen, fileName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#252423] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-[#3b3a39] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b dark:border-[#3b3a39]">
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-3-3m3 3l3-3M3 12h18" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#323130] dark:text-[#f3f2f1]">Split PDF into Folder</h3>
          </div>
          <p className="text-sm text-[#605e5c] dark:text-[#a19f9d]">
            This document {pageCount ? `(${pageCount} pages)` : ''} will be separated into individual files.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#605e5c] dark:text-[#a19f9d] uppercase tracking-widest mb-1.5">
              New Folder Name
            </label>
            <input
              autoFocus
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-[#faf9f8] dark:bg-[#1b1a19] border border-[#e1dfdd] dark:border-[#3b3a39] rounded px-3 py-2 text-sm text-[#323130] dark:text-[#f3f2f1] focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Enter folder name..."
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-start space-x-3">
             <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
               Each page will be saved as a separate PDF file inside the new folder. The original document remains unchanged.
             </p>
          </div>
        </div>

        <div className="bg-[#f3f2f1] dark:bg-[#201f1e] px-6 py-4 flex flex-row-reverse space-x-reverse space-x-3 border-t dark:border-[#3b3a39]">
          <button
            disabled={!folderName.trim() || isProcessing}
            onClick={() => onConfirm(folderName)}
            className={`px-5 py-2 rounded-md text-sm font-bold shadow-md transition-all active:scale-95 flex items-center space-x-2 ${
              !folderName.trim() || isProcessing
                ? 'bg-blue-300 dark:bg-blue-900/50 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <span>Create & Split</span>
            )}
          </button>
          <button
            disabled={isProcessing}
            onClick={onCancel}
            className="bg-white dark:bg-[#323130] border border-[#e1dfdd] dark:border-[#3b3a39] text-[#323130] dark:text-[#f3f2f1] hover:bg-[#edebe9] dark:hover:bg-[#3b3a39] px-5 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitModal;
