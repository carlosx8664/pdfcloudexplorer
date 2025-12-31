import React from 'react';

interface AiStatusBadgeProps {
  isAuthenticated: boolean;
  aiLoading: string | null;
  activeFileName?: string;
}

export const AiStatusBadge: React.FC<AiStatusBadgeProps> = ({ isAuthenticated, aiLoading, activeFileName }) => {
  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-[10px] font-medium text-gray-500 dark:text-gray-400 transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        <span>AI · Sign in to enable</span>
      </div>
    );
  }

  if (aiLoading) {
    return (
      <div className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 transition-colors">
        <div className="w-2.5 h-2.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="truncate max-w-[150px]">AI · Analyzing "{activeFileName}"...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300 transition-colors">
       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
       <span>AI · Ready (Gemini 3)</span>
    </div>
  );
};

export default AiStatusBadge;