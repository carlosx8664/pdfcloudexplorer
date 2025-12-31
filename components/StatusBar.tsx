import React from 'react';

export interface StatusBarProps {
  nodeCount: number;
  selectedCount: number;
  aiStatus: 'unauthenticated' | 'idle' | 'processing';
  activeFileName?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ 
  nodeCount, 
  selectedCount, 
  aiStatus, 
  activeFileName 
}) => {
  
  const getSelectionText = () => {
    if (selectedCount === 0) return 'Selection · 0 items';
    if (selectedCount === 1) return 'Selection · 1 item';
    return `Selection · ${selectedCount} items`;
  };

  const renderAiStatus = () => {
    if (aiStatus === 'unauthenticated') {
      return (
        <span className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400">
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
           <span>AI · Sign in to enable</span>
        </span>
      );
    }

    if (aiStatus === 'processing') {
      return (
        <span className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-medium">
          <div className="w-3 h-3 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="truncate max-w-[200px]">AI · Processing "{activeFileName}"...</span>
        </span>
      );
    }

    // Idle / Ready
    return (
      <span className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300">
         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
         <span>AI · Ready (Gemini 3)</span>
      </span>
    );
  };

  return (
    <footer className="h-6 bg-[#f3f2f1] dark:bg-[#1b1a19] border-t border-[#e1dfdd] dark:border-[#3b3a39] flex items-center justify-between px-4 select-none text-[11px] transition-colors z-30">
      {/* Left: Storage Info */}
      <div className="flex items-center text-[#605e5c] dark:text-[#a19f9d] min-w-[150px]">
        <span>Local workspace · {nodeCount} items</span>
      </div>

      {/* Center: Selection Info */}
      <div className="flex items-center text-[#605e5c] dark:text-[#a19f9d]">
        <div className="w-px h-3 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-3 hidden sm:block"></div>
        <span>{getSelectionText()}</span>
        <div className="w-px h-3 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-3 hidden sm:block"></div>
      </div>

      {/* Right: AI Status */}
      <div className="flex items-center justify-end min-w-[150px]">
        {renderAiStatus()}
      </div>
    </footer>
  );
};

export default StatusBar;