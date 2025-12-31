
import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#252423] rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-[#3b3a39]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#323130] dark:text-[#f3f2f1] mb-2">Confirm Deletion</h3>
          <p className="text-sm text-[#605e5c] dark:text-[#a19f9d] leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-[#323130] dark:text-[#f3f2f1]">"{fileName}"</span>? 
            This action cannot be undone.
          </p>
        </div>
        <div className="bg-[#f3f2f1] dark:bg-[#201f1e] px-6 py-4 flex flex-row-reverse space-x-reverse space-x-3 border-t dark:border-[#3b3a39]">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            Delete Item
          </button>
          <button
            onClick={onCancel}
            className="bg-white dark:bg-[#323130] border border-[#e1dfdd] dark:border-[#3b3a39] text-[#323130] dark:text-[#f3f2f1] hover:bg-[#edebe9] dark:hover:bg-[#3b3a39] px-4 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
