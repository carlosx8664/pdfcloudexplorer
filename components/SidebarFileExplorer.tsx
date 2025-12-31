import React, { useRef, useState, useMemo, useCallback } from 'react';
import { FileSystemItem } from '../types';
import FileTreeNode from './FileTreeNode';

interface SidebarFileExplorerProps {
  items: FileSystemItem[];
  expandedFolders: Set<string>;
  activeFileId?: string;
  selectedFileIds: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectFile: (item: FileSystemItem, isMultiSelect: boolean) => void;
  onDeleteFile: (id: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  onUpload: (files: FileList) => void;
  onCreateFolder: (parentFolderId?: string) => void;
  selectedFolderId: string | null;
  nodeCount: number;
  isPro?: boolean;
  onTriggerUpgrade?: () => void;
}

const SidebarFileExplorer: React.FC<SidebarFileExplorerProps> = ({
  items,
  expandedFolders,
  activeFileId,
  selectedFileIds,
  onToggleFolder,
  onSelectFile,
  onDeleteFile,
  onRenameItem,
  onUpload,
  onCreateFolder,
  selectedFolderId,
  nodeCount,
  isPro,
  onTriggerUpgrade
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(activeFileId || null);

  // Flatten the visible tree based on current expansion state
  const visibleNodes = useMemo(() => {
    const flatten = (nodes: FileSystemItem[]): FileSystemItem[] => {
      let result: FileSystemItem[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.type === 'folder' && expandedFolders.has(node.id) && node.children) {
          result = [...result, ...flatten(node.children)];
        }
      }
      return result;
    };
    return flatten(items);
  }, [items, expandedFolders]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if we are leaving the main container
    // relatedTarget is the element we are entering
    if (explorerRef.current && !explorerRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleNodes.length === 0) return;

    const currentIndex = focusedNodeId 
      ? visibleNodes.findIndex(n => n.id === focusedNodeId) 
      : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % visibleNodes.length;
      const nextNode = visibleNodes[nextIndex];
      setFocusedNodeId(nextNode.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? visibleNodes.length - 1 : currentIndex - 1;
      const prevNode = visibleNodes[prevIndex];
      setFocusedNodeId(prevNode.id);
    } else if (e.key === 'Enter' && focusedNodeId) {
      e.preventDefault();
      const node = visibleNodes.find(n => n.id === focusedNodeId);
      if (node) {
        if (node.type === 'folder') {
          onToggleFolder(node.id);
        } else {
          onSelectFile(node, e.ctrlKey || e.metaKey);
        }
      }
    }
  };

  const handleNodeClick = useCallback((item: FileSystemItem, isMulti: boolean) => {
    setFocusedNodeId(item.id);
    onSelectFile(item, isMulti);
  }, [onSelectFile]);

  return (
    <div 
      ref={explorerRef}
      tabIndex={0}
      className={`w-64 flex-shrink-0 bg-[#f3f2f1] dark:bg-[#252423] border-r border-[#e1dfdd] dark:border-[#3b3a39] h-full flex flex-col transition-colors duration-200 outline-none focus:ring-inset focus:ring-1 focus:ring-blue-400/50 ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-400 z-50' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
    >
      <div className={`p-4 border-b border-[#e1dfdd] dark:border-[#3b3a39] bg-white dark:bg-[#201f1e] space-y-2 pointer-events-none ${isDragging ? 'opacity-50' : 'opacity-100 pointer-events-auto'}`}>
        <button 
          onClick={handleUploadClick}
          className="w-full bg-[#0078d4] hover:bg-[#106ebe] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2 px-4 rounded flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 font-semibold text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{isPro ? 'Upload PDFs' : 'Upload PDF'}</span>
        </button>

        <div className="text-center pt-1 space-y-1">
          {isPro ? (
            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
              <span>✨</span> PRO: Unlimited Size · 10 Files Max
            </p>
          ) : (
            <>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Limit: 1 active PDF · 10MB size
              </p>
              <button 
                onClick={onTriggerUpgrade}
                className="text-[10px] text-[#0078d4] dark:text-indigo-400 hover:underline font-bold flex items-center justify-center w-full gap-1"
              >
                Upgrade for multiple files ⚡
              </button>
            </>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          multiple={isPro}
          className="hidden"
        />
      </div>

      <div className={`p-3 flex items-center justify-between text-[#605e5c] dark:text-[#a19f9d] ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
        <h2 className="text-[10px] font-bold uppercase tracking-widest">Explorer</h2>
        <button className="hover:bg-[#edebe9] dark:hover:bg-[#323130] p-1 rounded">
           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
      
      {isDragging ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-blue-500 dark:text-blue-400 animate-in fade-in duration-200">
            <svg className="w-16 h-16 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-bold">Drop files here</p>
            <p className="text-sm opacity-70">to upload instantly</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
                <p className="text-xs text-[#a19f9d] italic">No files yet. Upload or drag files here.</p>
            </div>
            ) : (
            items.map((item) => (
                <FileTreeNode
                key={item.id}
                item={item}
                level={0}
                expandedFolders={expandedFolders}
                activeFileId={activeFileId}
                focusedNodeId={focusedNodeId}
                selectedFileIds={selectedFileIds}
                onToggleFolder={onToggleFolder}
                onSelectFile={handleNodeClick}
                onDeleteFile={onDeleteFile}
                onRenameItem={onRenameItem}
                onFolderSelect={onCreateFolder}
                />
            ))
            )}
        </div>
      )}
    </div>
  );
};

export default SidebarFileExplorer;