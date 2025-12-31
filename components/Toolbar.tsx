import React from 'react';

interface ToolbarProps {
  onAction: (action: string) => void;
  activeFile: boolean;
  selectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  hasEdits: boolean;
  isDownloading?: boolean;
  isPro?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAction, activeFile, selectedCount, canUndo, canRedo, hasEdits, isDownloading, isPro }) => {
  const actions = [
    { id: 'merge', label: `Merge (${selectedCount})`, icon: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { id: 'split', label: 'Split', icon: <path d="M12 4v16m0 0l-3-3m3 3l3-3M3 12h18" /> },
    { id: 'rotate', label: 'Rotate', icon: <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
    { 
      id: 'download', 
      label: isDownloading ? 'Processing...' : 'Download PDF', 
      icon: isDownloading 
        ? <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
        : <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    }
  ];

  const aiActions = [
    { id: 'summarize', label: 'AI Summarize', color: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800', icon: <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /> },
    { id: 'extract', label: 'AI Extract Fields', color: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800', icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  ];

  return (
    <div className="h-12 bg-white dark:bg-[#201f1e] border-b border-[#e1dfdd] dark:border-[#3b3a39] flex items-center px-4 space-x-1 shadow-sm overflow-x-auto custom-scrollbar transition-colors">
      
      {/* Undo / Redo Group */}
      <div className="flex items-center space-x-1 mr-2 border-r border-[#e1dfdd] dark:border-[#3b3a39] pr-3">
         <button
            onClick={() => onAction('undo')}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${!canUndo ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-[#f3f2f1] dark:hover:bg-[#323130]'}`}
            title="Undo (Ctrl+Z)"
         >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
         </button>
         <button
            onClick={() => onAction('redo')}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${!canRedo ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-[#f3f2f1] dark:hover:bg-[#323130]'}`}
            title="Redo (Ctrl+Y)"
         >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
         </button>
      </div>

      {actions.map((action) => {
        const isMerge = action.id === 'merge';
        const isSplit = action.id === 'split';
        const isRotate = action.id === 'rotate';
        const isDownload = action.id === 'download';
        
        let disabled = false;
        if (isMerge) disabled = selectedCount < 2;
        else if (isSplit || isDownload || isRotate) disabled = !activeFile;
        
        if (isDownload && isDownloading) disabled = true;

        return (
          <button
            key={action.id}
            disabled={disabled}
            onClick={() => onAction(action.id)}
            className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              disabled
                ? 'text-[#a19f9d] cursor-not-allowed'
                : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-[#f3f2f1] dark:hover:bg-[#323130]'
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4">
              {action.icon}
            </div>
            <span className="whitespace-nowrap">{action.label}</span>
          </button>
        );
      })}

      {isPro && (
        <button
            onClick={() => onAction('sign')}
            disabled={!activeFile}
            className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              !activeFile
                ? 'text-[#a19f9d] cursor-not-allowed'
                : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400'
            }`}
        >
            <div className="flex items-center justify-center w-4 h-4">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <span className="whitespace-nowrap">Sign PDF</span>
        </button>
      )}

      <div className="w-px h-6 bg-[#e1dfdd] dark:bg-[#3b3a39] mx-2 flex-shrink-0"></div>

      {aiActions.map((action) => (
        <button
          key={action.id}
          disabled={!activeFile}
          onClick={() => onAction(action.id)}
          className={`flex-shrink-0 flex items-center space-x-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-all shadow-sm ${
             !activeFile 
             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
             : 'text-white ' + action.color
          }`}
          title={!activeFile ? "Select a PDF first" : "Use AI Tool"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {action.icon}
          </svg>
          <span className="whitespace-nowrap">{action.label}</span>
          {!activeFile && <span className="text-[10px] ml-1 opacity-70">(Pro)</span>}
        </button>
      ))}

      {/* Spacer to push Get PRO to the right */}
      <div className="flex-1" />

      {/* Get PRO Button (or PRO status) */}
      <button
        onClick={() => onAction('getPro')}
        className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-sm font-bold text-white transition-all transform hover:-translate-y-0.5"
        style={{
          background: isPro 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: isPro 
            ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
            : '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}
      >
        <span>{isPro ? '✨' : '🌟'}</span>
        <span>{isPro ? 'PRO' : 'Get PRO'}</span>
      </button>
    </div>
  );
};

export default Toolbar;