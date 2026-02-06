
import React from 'react';
import { ThemeType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

const THEMES: { id: ThemeType; name: string; year: string; color: string }[] = [
  { id: 'win311', name: 'Windows 3.11', year: '1993', color: 'bg-[#008080]' },
  { id: 'win95', name: 'Windows 95', year: '1995', color: 'bg-[#c0c0c0]' },
  { id: 'win98', name: 'Windows 98', year: '1998', color: 'bg-[#c0c0c0]' },
  { id: 'winxp', name: 'Windows XP', year: '2001', color: 'bg-[#245edb]' },
  { id: 'vista', name: 'Windows Vista', year: '2007', color: 'bg-[#0a0a0a]' },
  { id: 'win11', name: 'Windows 11', year: '2024', color: 'bg-[#0078d4]' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentTheme, onThemeChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#252423] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-gray-200 dark:border-gray-700">
        
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
             </div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Visual Themes (Interface Era)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`group relative flex flex-col p-2 rounded-xl border-2 transition-all text-left ${
                  currentTheme === theme.id 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                    : 'border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className={`w-full aspect-video rounded-lg mb-3 shadow-inner relative overflow-hidden ${theme.color}`}>
                   {/* Preview elements */}
                   <div className="absolute top-2 left-2 right-2 h-4 bg-white/20 rounded flex items-center px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 mr-1"></div>
                      <div className="w-8 h-1 bg-white/30 rounded"></div>
                   </div>
                   <div className="absolute left-2 bottom-2 w-1/3 h-1/2 bg-white/10 rounded"></div>
                   <div className="absolute right-2 bottom-2 w-1/3 h-1/3 bg-white/15 rounded"></div>
                   
                   {currentTheme === theme.id && (
                     <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                        <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg">
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        </div>
                     </div>
                   )}
                </div>
                
                <div className="px-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{theme.name}</p>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Released in {theme.year}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-10 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
              <span className="font-bold">Note:</span> Themes only affect the application interface and borders. The PDF content viewer remains neutral to ensure accurate document display.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
