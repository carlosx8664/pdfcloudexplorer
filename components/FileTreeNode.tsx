import React, { useState, useRef, useEffect } from 'react';
import { FileSystemItem } from '../types';

interface FileTreeNodeProps {
  item: FileSystemItem;
  level: number;
  expandedFolders: Set<string>;
  activeFileId?: string;
  focusedNodeId?: string | null;
  selectedFileIds: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectFile: (item: FileSystemItem, isMultiSelect: boolean) => void;
  onDeleteFile: (id: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  onFolderSelect?: (id: string) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  item,
  level,
  expandedFolders,
  activeFileId,
  focusedNodeId,
  selectedFileIds,
  onToggleFolder,
  onSelectFile,
  onDeleteFile,
  onRenameItem,
  onFolderSelect
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedFolders.has(item.id);
  const isActive = activeFileId === item.id;
  const isFocused = focusedNodeId === item.id;
  const isSelected = selectedFileIds.has(item.id);
  const isFolder = item.type === 'folder';

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder && onFolderSelect) {
      onFolderSelect(item.id);
    }
    onSelectFile(item, e.ctrlKey || e.metaKey);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectFile(item, true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteFile(item.id);
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameName(item.name);
  };

  const handleRenameSubmit = () => {
    setIsRenaming(false);
    if (renameName.trim() && renameName !== item.name) {
      onRenameItem(item.id, renameName.trim());
    } else {
      setRenameName(item.name); // Revert
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsRenaming(false);
      setRenameName(item.name);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer transition-all duration-150 rounded-sm select-none group relative ${
          isActive || isSelected
            ? 'bg-[#c7e0f4] dark:bg-blue-900/40 text-[#323130] dark:text-[#f3f2f1]' 
            : 'hover:bg-[#e1dfdd] dark:hover:bg-[#323130] text-[#323130] dark:text-[#f3f2f1]'
        } ${
          isFocused ? 'ring-1 ring-inset ring-blue-500/50 bg-blue-50/10' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1.5 flex items-center justify-center w-4 h-4 text-[10px]">
          {isFolder ? (
             <div onClick={(e) => { e.stopPropagation(); onToggleFolder(item.id); }} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
             </div>
          ) : (
            <div 
              onClick={handleCheckboxClick}
              className={`w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors ${
                isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-transparent border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100'
              }`}
            >
              {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
          )}
        </span>
        
        <span className="mr-2 flex-shrink-0">
          {isFolder ? (
            <svg className="w-4 h-4 text-[#f8d775] dark:text-[#d2b14c]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#f40f02] dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          )}
        </span>
        
        {isRenaming ? (
            <input 
                ref={inputRef}
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-white dark:bg-[#323130] text-[#323130] dark:text-[#f3f2f1] border border-blue-500 rounded px-1 text-sm focus:outline-none h-6"
            />
        ) : (
            <span 
                className={`text-sm truncate flex-1 ${isFocused ? 'font-bold' : 'font-medium'}`}
                onDoubleClick={handleStartRename}
                title="Double-click to rename"
            >
                {item.name}
            </span>
        )}

        {/* Action Buttons Group */}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2 pointer-events-auto text-gray-500 dark:text-gray-400">
            <button 
                type="button"
                onClick={handleStartRename}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400"
                title="Rename"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
            <button 
                type="button"
                onClick={handleDeleteClick}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400"
                title="Delete Node"
            >
                <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
      </div>

      {isFolder && isExpanded && item.children && (
        <div className="mt-0.5">
          {item.children.map((child) => (
            <FileTreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              activeFileId={activeFileId}
              focusedNodeId={focusedNodeId}
              selectedFileIds={selectedFileIds}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              onRenameItem={onRenameItem}
              onFolderSelect={onFolderSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileTreeNode;