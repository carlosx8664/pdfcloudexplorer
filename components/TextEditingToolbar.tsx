import React from 'react';
import { TextStyle } from '../types';

interface TextEditingToolbarProps {
  currentStyle: TextStyle;
  onStyleChange: (newStyle: TextStyle) => void;
  isTextMode: boolean;
  setIsTextMode: (mode: boolean) => void;
  activeFile: boolean;
  onDeleteAnnotation: () => void;
  hasSelectedAnnotation: boolean;
}

const TextEditingToolbar: React.FC<TextEditingToolbarProps> = ({
  currentStyle,
  onStyleChange,
  isTextMode,
  setIsTextMode,
  activeFile,
  onDeleteAnnotation,
  hasSelectedAnnotation
}) => {
  if (!activeFile) return null;

  // For rich text commands (Bold, Italic, Underline, Strike), we use execCommand
  // This applies the style to the *selection* inside the contentEditable
  const handleExecCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    
    // We also update the global style state so new boxes pick up these preferences,
    // although for existing boxes, execCommand handles the DOM.
    // Mapping command to style prop:
    if (command === 'bold') onStyleChange({ ...currentStyle, bold: !currentStyle.bold });
    if (command === 'italic') onStyleChange({ ...currentStyle, italic: !currentStyle.italic });
    if (command === 'underline') onStyleChange({ ...currentStyle, underline: !currentStyle.underline });
    if (command === 'strikeThrough') onStyleChange({ ...currentStyle, strike: !currentStyle.strike });
    if (command === 'justifyLeft') onStyleChange({ ...currentStyle, textAlign: 'left' });
    if (command === 'justifyCenter') onStyleChange({ ...currentStyle, textAlign: 'center' });
    if (command === 'justifyRight') onStyleChange({ ...currentStyle, textAlign: 'right' });
  };

  // For block-level styles like Font Family/Size/Color, we update state which propels the react component style
  // OR we can use execCommand for some (like foreColor, fontName).
  // Let's use execCommand where possible for better rich text support.

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = parseInt(e.target.value);
    onStyleChange({ ...currentStyle, fontSize: size });
    // execCommand 'fontSize' uses 1-7 scale, which is not pixel accurate. 
    // So we rely on the React style prop for font size on the container.
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const color = e.target.value;
    onStyleChange({ ...currentStyle, color });
    document.execCommand('foreColor', false, color);
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    onStyleChange({ ...currentStyle, fontFamily: font });
    document.execCommand('fontName', false, font);
  };

  // Helper to prevent focus loss on click
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="h-10 bg-[#f3f2f1] dark:bg-[#252423] border-b border-[#e1dfdd] dark:border-[#3b3a39] flex items-center px-4 space-x-4 shadow-inner transition-colors select-none">
      <div className="flex items-center space-x-2 border-r border-[#c8c6c4] dark:border-[#3b3a39] pr-4">
         <button
            onClick={() => setIsTextMode(!isTextMode)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold transition-colors ${
                isTextMode 
                ? 'bg-[#0078d4] text-white shadow-sm' 
                : 'bg-white dark:bg-[#323130] text-[#323130] dark:text-[#f3f2f1] border border-[#e1dfdd] dark:border-[#3b3a39] hover:bg-gray-100 dark:hover:bg-[#3b3a39]'
            }`}
         >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span>Edit Text</span>
         </button>
      </div>

      <div className={`flex items-center space-x-2 transition-opacity ${!isTextMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <select 
            value={currentStyle.fontFamily || 'Liberation Sans'}
            onChange={handleFontFamilyChange}
            className="bg-transparent text-xs font-medium text-[#323130] dark:text-[#f3f2f1] border border-[#e1dfdd] dark:border-[#3b3a39] rounded px-1 py-1 focus:outline-none focus:border-blue-500 w-32"
            title="Font Family"
        >
            <option value="Liberation Sans">Liberation Sans (Arial)</option>
            <option value="Liberation Serif">Liberation Serif (Times)</option>
            <option value="DejaVu Sans Mono">DejaVu Mono (Courier)</option>
        </select>

        <div className="w-px h-5 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-2"></div>

        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('bold')}
            className={`w-7 h-7 flex items-center justify-center rounded text-sm font-serif font-bold transition-colors ${
                currentStyle.bold ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Bold"
        >
            B
        </button>
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('italic')}
            className={`w-7 h-7 flex items-center justify-center rounded text-sm font-serif italic transition-colors ${
                currentStyle.italic ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Italic"
        >
            I
        </button>
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('underline')}
            className={`w-7 h-7 flex items-center justify-center rounded text-sm font-serif underline transition-colors ${
                currentStyle.underline ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Underline"
        >
            U
        </button>
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('strikeThrough')}
            className={`w-7 h-7 flex items-center justify-center rounded text-sm font-serif line-through transition-colors ${
                currentStyle.strike ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Strikethrough"
        >
            S
        </button>

        <div className="w-px h-5 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-2"></div>

        {/* Alignment Buttons */}
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('justifyLeft')}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                currentStyle.textAlign === 'left' ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Align Left"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h7" /></svg>
        </button>
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('justifyCenter')}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                currentStyle.textAlign === 'center' ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Align Center"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M9 18h6" /></svg>
        </button>
        <button
            onMouseDown={preventFocusLoss}
            onClick={() => handleExecCommand('justifyRight')}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                currentStyle.textAlign === 'right' ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-[#323130] dark:text-[#f3f2f1] hover:bg-gray-200 dark:hover:bg-[#3b3a39]'
            }`}
            title="Align Right"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M13 18h7" /></svg>
        </button>

        <div className="w-px h-5 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-2"></div>

        <select 
            value={currentStyle.fontSize}
            onChange={handleFontSizeChange}
            className="bg-transparent text-xs font-medium text-[#323130] dark:text-[#f3f2f1] border border-[#e1dfdd] dark:border-[#3b3a39] rounded px-1 py-1 focus:outline-none focus:border-blue-500"
        >
            {[8, 10, 12, 14, 16, 18, 20, 24, 32, 48].map(size => (
                <option key={size} value={size}>{size}px</option>
            ))}
        </select>

        <select 
            value={currentStyle.color}
            onChange={handleColorChange}
            className="bg-transparent text-xs font-medium text-[#323130] dark:text-[#f3f2f1] border border-[#e1dfdd] dark:border-[#3b3a39] rounded px-1 py-1 focus:outline-none focus:border-blue-500 w-24"
        >
            <option value="#000000">Black</option>
            <option value="#ff0000">Red</option>
            <option value="#0000ff">Blue</option>
            <option value="#008000">Green</option>
            <option value="#ffa500">Orange</option>
            <option value="#800080">Purple</option>
        </select>

        <div className="w-px h-5 bg-[#c8c6c4] dark:bg-[#3b3a39] mx-2"></div>

        <button
            onClick={onDeleteAnnotation}
            disabled={!hasSelectedAnnotation}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                hasSelectedAnnotation
                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Delete Selected Text"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span>Delete</span>
        </button>
      </div>
    </div>
  );
};

export default TextEditingToolbar;