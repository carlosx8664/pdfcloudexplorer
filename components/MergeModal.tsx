
import React from 'react';
import { FileSystemItem } from '../types';

interface MergeModalProps {
  isOpen: boolean;
  items: FileSystemItem[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isMerging: boolean;
}

const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  items,
  onMoveUp,
  onMoveDown,
  onRemove,
  onConfirm,
  onCancel,
  isMerging
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#252423] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-[#3b3a39] flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b dark:border-[#3b3a39]">
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#323130] dark:text-[#f3f2f1]">Merge Documents</h3>
          </div>
          <p className="text-sm text-[#605e5c] dark:text-[#a19f9d]">
            Arrange the order of your documents. Pages will be combined starting from the top.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#faf9f8] dark:bg-[#1b1a19]">
          {items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm italic">
              No files selected for merging.
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={item.id} 
                className="flex items-center bg-white dark:bg-[#252423] p-3 rounded-lg border border-[#e1dfdd] dark:border-[#3b3a39] shadow-sm group hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-semibold text-[#323130] dark:text-[#f3f2f1] truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold">
                    {item.size || 'Unknown Size'}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#3b3a39] text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button 
                    onClick={() => onMoveDown(index)}
                    disabled={index === items.length - 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#3b3a39] text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                  <button 
                    onClick={() => onRemove(index)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove from Merge"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-[#f3f2f1] dark:bg-[#201f1e] px-6 py-4 flex flex-row-reverse space-x-reverse space-x-3 border-t dark:border-[#3b3a39]">
          <button
            disabled={items.length < 2 || isMerging}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-md text-sm font-bold shadow-md transition-all active:scale-95 flex items-center space-x-2 ${
              items.length < 2 || isMerging
                ? 'bg-blue-300 dark:bg-blue-900/50 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isMerging ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Merging...</span>
              </>
            ) : (
              <span>Merge {items.length} Files</span>
            )}
          </button>
          <button
            disabled={isMerging}
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

export default MergeModal;
