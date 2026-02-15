
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, FileSystemItem, AiFields, TextAnnotation, TextStyle, EditTextPatch, WorkspaceState, ImageAnnotation, ThemeType } from './types';
import { INITIAL_FILE_SYSTEM } from './services/mockData';
import { usePdfOperations } from './hooks/usePdfOperations';
import { summarizePdf, extractFields } from './services/geminiService';
import SidebarFileExplorer from './components/SidebarFileExplorer';
import Toolbar from './components/Toolbar';
import TextEditingToolbar from './components/TextEditingToolbar';
import PdfViewer from './components/PdfViewer';
import AiPanel from './components/AiPanel';
import StatusBar from './components/StatusBar';
import AiStatusBadge from './components/AiStatusBadge';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import MergeModal from './components/MergeModal';
import SplitModal from './components/SplitModal';
import ProUpgradeModal from './components/ProUpgradeModal';
import LoginModal from './components/LoginModal';
import SettingsModal from './components/SettingsModal';
import SignatureTool from './components/SignatureTool';
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext';
import { savePdfWithAnnotations, downloadPdf } from './services/pdfService';
import { useAiCredit } from './services/aiCreditService';

const PdfWorkspaceContent: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileSystemItem[]>(INITIAL_FILE_SYSTEM);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { isAuthenticated, user, signOut, aiCredits, refreshCredits, isPro: userIsPro } = useGoogleAuth();

  const [isGuestMode, setIsGuestMode] = useState(false);

  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('pce_theme') as ThemeType) || 'win11';
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Modals state
  const [showProModal, setShowProModal] = useState(false);
  const [hasSeenProModal, setHasSeenProModal] = useState(false);
  
  // Signature Tool State
  const [showSignatureTool, setShowSignatureTool] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show Pro Modal once per session if not pro
  useEffect(() => {
    if (isAuthenticated && !userIsPro && !hasSeenProModal) {
      const timer = setTimeout(() => {
        setShowProModal(true);
        setHasSeenProModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userIsPro, hasSeenProModal]);

  // View State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});

  // Text Editing State
  const [isTextMode, setIsTextMode] = useState(false);
  const [textStyle, setTextStyle] = useState<TextStyle>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Liberation Sans',
    textAlign: 'left'
  });
  const [annotationsByFile, setAnnotationsByFile] = useState<Record<string, TextAnnotation[]>>({});
  const [imageAnnotationsByFile, setImageAnnotationsByFile] = useState<Record<string, ImageAnnotation[]>>({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  // Patches State (In-place editing)
  const [textPatchesByFile, setTextPatchesByFile] = useState<Record<string, EditTextPatch[]>>({});
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<WorkspaceState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Modal states
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeQueue, setMergeQueue] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);

  const [state, setState] = useState<AppState>({
    activeFile: null,
    selectedFileIds: new Set(),
    expandedFolders: new Set(),
    aiPanelOpen: false,
    aiTab: 'summary',
    aiSummary: null,
    aiFields: null,
    aiLoading: null,
    aiError: null,
  });

  const handleThemeChange = useCallback((theme: ThemeType) => {
    setCurrentTheme(theme);
    localStorage.setItem('pce_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const resetWorkspace = useCallback(() => {
    setFileTree(INITIAL_FILE_SYSTEM);
    setSelectedFolderId(null);
    setDeleteTarget(null);
    setCurrentPage(1);
    setPageRotations({});
    setIsTextMode(false);
    setAnnotationsByFile({});
    setImageAnnotationsByFile({});
    setTextPatchesByFile({});
    setSelectedAnnotationId(null);
    setSelectedPatchId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setPendingSignature(null);
    setState({
        activeFile: null,
        selectedFileIds: new Set(),
        expandedFolders: new Set(),
        aiPanelOpen: false,
        aiTab: 'summary',
        aiSummary: null,
        aiFields: null,
        aiLoading: null,
        aiError: null,
    });
  }, []);

  const handleSignOut = useCallback(() => {
    setIsProfileOpen(false);
    resetWorkspace();
    signOut();
    setIsGuestMode(false);
  }, [resetWorkspace, signOut]);

  const hasEditsForActiveFile = useMemo(() => {
    if (!state.activeFile) return false;
    const fileId = state.activeFile.id;
    const anns = annotationsByFile[fileId] || [];
    const imgs = imageAnnotationsByFile[fileId] || [];
    const patches = textPatchesByFile[fileId] || [];
    return anns.length > 0 || imgs.length > 0 || patches.length > 0;
  }, [state.activeFile, annotationsByFile, imageAnnotationsByFile, textPatchesByFile]);

  const handleToggleTextMode = (enable: boolean) => {
    setIsTextMode(enable);
    if (!enable && state.activeFile) {
        const fileId = state.activeFile.id;
        setAnnotationsByFile(prev => {
            const current = prev[fileId] || [];
            const cleaned = current.filter(a => {
                const t = a.text.trim();
                return t !== '' && t !== 'New Text';
            });
            if (cleaned.length === current.length) return prev;
            return { ...prev, [fileId]: cleaned };
        });
        setTextPatchesByFile(prev => {
            const current = prev[fileId] || [];
            const cleaned = current.filter(p => {
                const t = p.newText.trim();
                return t !== '' && t !== 'New Text' && t !== p.originalText;
            });
            if (cleaned.length === current.length) return prev;
            return { ...prev, [fileId]: cleaned };
        });
        setSelectedAnnotationId(null);
        setSelectedPatchId(null);
    }
  };

  const getCurrentWorkspaceState = useCallback((): WorkspaceState => {
    const bytesMap = new Map<string, Uint8Array>();
    const collectBytes = (nodes: FileSystemItem[]) => {
      nodes.forEach(node => {
        if (node.data) bytesMap.set(node.id, node.data);
        if (node.children) collectBytes(node.children);
      });
    };
    collectBytes(fileTree);
    return {
      fileTree: JSON.parse(JSON.stringify(fileTree)),
      pdfBytesMap: bytesMap, 
      annotationsByFile: JSON.parse(JSON.stringify(annotationsByFile)),
      imageAnnotationsByFile: JSON.parse(JSON.stringify(imageAnnotationsByFile)),
      textPatchesByFile: JSON.parse(JSON.stringify(textPatchesByFile))
    };
  }, [fileTree, annotationsByFile, imageAnnotationsByFile, textPatchesByFile]);

  const restoreBinaryData = (nodes: FileSystemItem[], bytesMap: Map<string, Uint8Array>): FileSystemItem[] => {
    return nodes.map(node => ({
      ...node,
      data: bytesMap.get(node.id) || node.data,
      children: node.children ? restoreBinaryData(node.children, bytesMap) : undefined
    }));
  };

  const pushHistory = useCallback(() => {
    const currentState = getCurrentWorkspaceState();
    setHistory(prev => {
      const trimmed = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : [];
      return [...trimmed, currentState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [getCurrentWorkspaceState, historyIndex]);

  const restoreWorkspaceState = useCallback((ws: WorkspaceState) => {
    const restoredTree = restoreBinaryData(ws.fileTree, ws.pdfBytesMap);
    setFileTree(restoredTree);
    setAnnotationsByFile(ws.annotationsByFile);
    setImageAnnotationsByFile(ws.imageAnnotationsByFile);
    setTextPatchesByFile(ws.textPatchesByFile);
  }, []);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    if (historyIndex === history.length - 1) {
        const currentLive = getCurrentWorkspaceState();
        setHistory(prev => [...prev, currentLive]);
    }
    const stateToRestore = history[historyIndex];
    restoreWorkspaceState(stateToRestore);
    setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    const newIndex = historyIndex + 1;
    if (newIndex >= history.length) return;
    const stateToRestore = history[newIndex];
    restoreWorkspaceState(stateToRestore);
    setHistoryIndex(newIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, handleUndo, handleRedo]); 

  const handleCreateFolder = (parentFolderId?: string) => {
    const name = window.prompt("Folder name", "New Folder");
    if (!name) return;
    pushHistory(); 
    const newFolder: FileSystemItem = {
      id: `node-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      type: "folder",
      children: [],
      modifiedAt: new Date().toISOString().split('T')[0]
    };
    const insert = (tree: FileSystemItem[], folder: FileSystemItem, pid?: string): FileSystemItem[] => {
      if (!pid) return [...tree, folder];
      return tree.map(n => {
        if (n.id === pid && n.type === "folder") return { ...n, children: [...(n.children || []), folder] };
        if (n.children) return { ...n, children: insert(n.children, folder, pid) };
        return n;
      });
    };
    setFileTree(prev => insert(prev, newFolder, parentFolderId));
    if (parentFolderId) handleExpandFolder(parentFolderId);
  };

  const handleRenameItem = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return;
    pushHistory();
    setFileTree(prev => {
      const updateNode = (nodes: FileSystemItem[]): FileSystemItem[] => {
        return nodes.map(node => {
          if (node.id === id) return { ...node, name: newName };
          if (node.children) return { ...node, children: updateNode(node.children) };
          return node;
        });
      };
      return updateNode(prev);
    });
    if (state.activeFile?.id === id) {
        setState(prev => ({ ...prev, activeFile: prev.activeFile ? { ...prev.activeFile, name: newName } : null }));
    }
  }, [pushHistory, state.activeFile]);

  const findNodeById = useCallback((items: FileSystemItem[], id: string): FileSystemItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findNodeById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleToggleFolder = useCallback((id: string) => {
    setState(prev => {
      const next = new Set(prev.expandedFolders);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, expandedFolders: next };
    });
  }, []);

  const handleExpandFolder = useCallback((id: string) => {
    setState(prev => {
      const next = new Set(prev.expandedFolders);
      next.add(id);
      return { ...prev, expandedFolders: next };
    });
  }, []);

  const handleSelectFile = useCallback((file: FileSystemItem, isMultiSelect: boolean) => {
    if (file.type === 'folder') setSelectedFolderId(file.id); else {
      setSelectedFolderId(null);
      setCurrentPage(1);
      setPageRotations({});
      setPendingSignature(null);
    }
    setState(prev => {
      const nextSelected = new Set(prev.selectedFileIds);
      if (isMultiSelect) {
        if (nextSelected.has(file.id)) nextSelected.delete(file.id); else nextSelected.add(file.id);
      } else {
        nextSelected.clear();
        nextSelected.add(file.id);
      }
      return { ...prev, activeFile: file, selectedFileIds: nextSelected, aiSummary: null, aiFields: null, aiLoading: null, aiError: null };
    });
    setSelectedAnnotationId(null);
    setSelectedPatchId(null);
  }, []);

  const handleDeleteFile = useCallback((fileId: string) => {
    const node = findNodeById(fileTree, fileId);
    if (node) setDeleteTarget({ id: node.id, name: node.name });
  }, [fileTree, findNodeById]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    pushHistory();
    const fileId = deleteTarget.id;
    const removeItem = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.reduce((acc, item) => {
        if (item.id === fileId) return acc;
        if (item.children) return [...acc, { ...item, children: removeItem(item.children) }];
        return [...acc, item];
      }, [] as FileSystemItem[]);
    };
    setFileTree(prev => removeItem(prev));
    setState(prev => {
      const nextSelected = new Set(prev.selectedFileIds);
      nextSelected.delete(fileId);
      return { ...prev, activeFile: prev.activeFile?.id === fileId ? null : prev.activeFile, selectedFileIds: nextSelected };
    });
    setDeleteTarget(null);
  }, [fileTree, deleteTarget, pushHistory]);

  const pdfOps = usePdfOperations({
    fileSystem: fileTree,
    setFileSystem: setFileTree,
    activeFile: state.activeFile,
    selectedFileIds: state.selectedFileIds,
    onFileSelect: handleSelectFile,
    onExpandFolder: handleExpandFolder,
    annotationsByFile,
    imageAnnotationsByFile,
    textPatchesByFile,
    pageRotations
  });

  const getPdfCount = useCallback((nodes: FileSystemItem[]): number => {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'pdf') count++;
      if (node.children) count += getPdfCount(node.children);
    }
    return count;
  }, []);

  const handleUploadFiles = async (files: FileList) => {
    const currentPdfCount = getPdfCount(fileTree);
    if (!userIsPro) {
        if (files.length > 1 || currentPdfCount >= 1) {
            alert("Free plan is limited to 1 active PDF. Upgrade to PRO for more!");
            setShowProModal(true); return;
        }
    }
    // PRO users have no total file count limit in the logic now.
    const limit = userIsPro ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const valid = Array.from(files).filter(f => f.size <= limit);
    if (valid.length < files.length) {
        alert(`Some files exceed the ${userIsPro ? '100MB' : '10MB'} limit.`);
    }
    if (valid.length === 0) return;
    const dt = new DataTransfer(); valid.forEach(f => dt.items.add(f));
    pushHistory();
    await pdfOps.uploadFiles(dt.files);
  };

  const handleAddAnnotation = (ann: TextAnnotation) => {
    if (!state.activeFile) return;
    pushHistory();
    setAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), ann] }));
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<TextAnnotation>) => {
    if (!state.activeFile) return;
    setAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(a => a.id === id ? { ...a, ...updates } : a) }));
  };
  
  const handleDeleteAnnotation = () => {
    if (!state.activeFile || !selectedAnnotationId) return;
    pushHistory();
    setAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(a => a.id !== selectedAnnotationId) }));
    setSelectedAnnotationId(null);
  };

  const handleAddImageAnnotation = (ann: ImageAnnotation) => {
    if (!state.activeFile) return;
    pushHistory();
    setImageAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), ann] }));
  };

  const handleUpdateImageAnnotation = (id: string, updates: Partial<ImageAnnotation>) => {
    if (!state.activeFile) return;
    setImageAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(p => p.id === id ? { ...p, ...updates } : p) }));
  };

  const handleDeleteImageAnnotation = (id: string) => {
    if (!state.activeFile) return;
    pushHistory();
    setImageAnnotationsByFile(prev => ({ ...prev, [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(a => a.id !== id) }));
  };

  const handleAddPatch = (patch: EditTextPatch) => {
    if (!state.activeFile) return;
    pushHistory();
    setTextPatchesByFile(prev => ({ ...prev, [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), patch] }));
    setSelectedPatchId(patch.id);
  };

  const handleUpdatePatch = (id: string, updates: Partial<EditTextPatch>) => {
    if (!state.activeFile) return;
    setTextPatchesByFile(prev => ({ ...prev, [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(p => p.id === id ? { ...p, ...updates } : p) }));
  };

  const handleStyleChange = (newStyle: TextStyle) => {
    if (state.activeFile && (selectedAnnotationId || selectedPatchId)) pushHistory();
    setTextStyle(newStyle);
    if (!state.activeFile) return;
    if (selectedAnnotationId) handleUpdateAnnotation(selectedAnnotationId, newStyle);
    if (selectedPatchId) handleUpdatePatch(selectedPatchId, newStyle);
  };

  const handleDownloadPDF = async () => {
    if (!state.activeFile || !state.activeFile.data) return;
    const id = state.activeFile.id;
    const anns = annotationsByFile[id] || [];
    const patches = textPatchesByFile[id] || [];
    const images = imageAnnotationsByFile[id] || [];
    const hasRotation = Object.values(pageRotations).some(r => r !== 0);
    setIsDownloading(true);
    try {
      if (anns.length > 0 || patches.length > 0 || images.length > 0 || hasRotation) {
        const edited = await savePdfWithAnnotations(state.activeFile.data, anns, patches, pageRotations, images);
        downloadPdf(edited, state.activeFile.name.replace(/\.pdf$/i, '') + '_edited.pdf');
      } else {
        pdfOps.downloadActive();
      }
    } catch (e: any) { alert("Download failed: " + e.message); } finally { setIsDownloading(false); }
  };

  const handleFinalMerge = async () => {
    if (mergeQueue.length < 2) return;
    setIsMerging(true);
    try {
      pushHistory();
      await pdfOps.performMergeByIds(mergeQueue);
      setMergeModalOpen(false); setMergeQueue([]);
      setState(prev => ({ ...prev, selectedFileIds: new Set() }));
    } catch (err: any) { alert("Merge failed: " + err.message); } finally { setIsMerging(false); }
  };

  /* Fix: Added missing handlers for merge queue order management */
  const handleMoveInQueue = useCallback((index: number, direction: 'up' | 'down') => {
    setMergeQueue(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const handleRemoveFromQueue = useCallback((index: number) => {
    setMergeQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  /* Fix: Added missing handler for performing the split PDF operation */
  const handleFinalSplit = async (folderName: string) => {
    if (!state.activeFile) return;
    setIsSplitting(true);
    try {
      pushHistory();
      await pdfOps.splitIntoFolder(
        folderName,
        annotationsByFile[state.activeFile.id] || [],
        textPatchesByFile[state.activeFile.id] || [],
        pageRotations,
        imageAnnotationsByFile[state.activeFile.id] || []
      );
      setSplitModalOpen(false);
    } catch (err: any) {
      alert("Split failed: " + err.message);
    } finally {
      setIsSplitting(false);
    }
  };

  /* Fix: Added missing handler to receive signature data and close tool */
  const handleSignatureComplete = useCallback((signatureDataUrl: string) => {
    setPendingSignature(signatureDataUrl);
    setShowSignatureTool(false);
  }, []);

  const handleRotate = () => {
    setPageRotations(prev => ({ ...prev, [currentPage]: ((prev[currentPage] || 0) + 90) % 360 }));
  };

  const handleAiSummarize = async () => {
    if (!state.activeFile?.data || !user?.email) return;
    if (!userIsPro) { setShowProModal(true); return; }
    if (!aiCredits || aiCredits.remaining <= 0) { alert("No AI credits remaining."); return; }
    setState(prev => ({ ...prev, aiPanelOpen: true, aiTab: 'summary', aiLoading: 'summary', aiError: null }));
    try {
      await useAiCredit(user.email);
      await refreshCredits();
      const summary = await summarizePdf(state.activeFile.data);
      setState(prev => ({ ...prev, aiSummary: summary, aiLoading: null }));
    } catch (error: any) { setState(prev => ({ ...prev, aiLoading: null, aiError: error.message })); }
  };

  const handleAiExtractFields = async () => {
    if (!state.activeFile?.data || !user?.email) return;
    if (!userIsPro) { setShowProModal(true); return; }
    if (!aiCredits || aiCredits.remaining <= 0) { alert("No AI credits remaining."); return; }
    setState(prev => ({ ...prev, aiPanelOpen: true, aiTab: 'fields', aiLoading: 'fields', aiError: null }));
    try {
      await useAiCredit(user.email);
      await refreshCredits();
      const fields = await extractFields(state.activeFile.data);
      setState(prev => ({ ...prev, aiFields: fields, aiLoading: null }));
    } catch (error: any) { setState(prev => ({ ...prev, aiLoading: null, aiError: error.message })); }
  };

  const handleAction = async (action: string) => {
    switch (action) {
      case 'undo': handleUndo(); break;
      case 'redo': handleRedo(); break;
      case 'summarize': await handleAiSummarize(); break;
      case 'extract': await handleAiExtractFields(); break;
      case 'sign': if (state.activeFile) setShowSignatureTool(true); break;
      case 'merge': 
        if (state.selectedFileIds.size >= 2) {
          const valid = Array.from(state.selectedFileIds).filter(id => findNodeById(fileTree, id)?.data);
          if (valid.length < 2) { alert("Upload PDFs first to merge."); return; }
          setMergeQueue(valid); setMergeModalOpen(true);
        }
        break;
      case 'split': if (state.activeFile?.data) setSplitModalOpen(true); break;
      case 'rotate': handleRotate(); break;
      case 'download': await handleDownloadPDF(); break;
      case 'getPro': setShowProModal(true); break;
      default: break;
    }
  };

  const mergeItems = useMemo(() => mergeQueue.map(id => findNodeById(fileTree, id)).filter((item): item is FileSystemItem => !!item), [mergeQueue, fileTree, findNodeById]);
  const totalNodeCount = useMemo(() => {
    const count = (nodes: FileSystemItem[]): number => nodes.reduce((acc, n) => acc + 1 + (n.children ? count(n.children) : 0), 0);
    return count(fileTree);
  }, [fileTree]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f3f2f1] text-[#323130] font-sans">
      <header className="h-10 bg-[#0078d4] flex items-center px-4 justify-between select-none shadow-md z-30 transition-colors win-header">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-0.5 rounded shadow-inner w-7 h-7 flex items-center justify-center overflow-hidden">
             <img src="https://res.cloudinary.com/dlyw9jsqs/image/upload/v1767359061/pdfce_hcnokl.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white text-sm font-bold tracking-tight">PDF Cloud Explorer</h1>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={() => setShowSettingsModal(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white" title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </button>
           {isAuthenticated && user ? (
            <div ref={profileRef} className="relative ml-1" onMouseEnter={() => setIsProfileOpen(true)} onMouseLeave={() => setIsProfileOpen(false)}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors outline-none">
                 {user.picture ? <img src={user.picture} alt="profile" className="w-6 h-6 rounded-full border border-white/20" /> : <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-[10px] shadow-inner">{user.email[0].toUpperCase()}</div>}
                <span className="text-xs font-medium text-white hidden sm:block truncate max-w-[100px]">{user.name}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-1 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 win-popup">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">{userIsPro ? <><span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mr-1.5"></span><span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">PRO Member</span></> : 'Free Plan'}</p>
                  </div>
                  {userIsPro && (
                    <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">AI Credits</p>
                        <div className="flex items-center justify-between"><span className="text-sm font-bold text-purple-700">{aiCredits?.remaining || 0} / {aiCredits?.total || 10}</span></div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden"><div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${((aiCredits?.remaining || 0) / (aiCredits?.total || 1)) * 100}%` }}></div></div>
                    </div>
                  )}
                  <div className="border-t border-gray-100 mt-1">
                    <button onClick={handleSignOut} className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2">
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                       <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
           ) : (
             <button onClick={() => setIsGuestMode(false)} className="px-4 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20">Sign In</button>
           )}
           <AiStatusBadge isAuthenticated={isAuthenticated} aiLoading={state.aiLoading} activeFileName={state.activeFile?.name} />
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <SidebarFileExplorer items={fileTree} expandedFolders={state.expandedFolders} activeFileId={state.activeFile?.id} selectedFileIds={state.selectedFileIds} onToggleFolder={handleToggleFolder} onSelectFile={handleSelectFile} onDeleteFile={handleDeleteFile} onRenameItem={handleRenameItem} onUpload={handleUploadFiles} onCreateFolder={handleCreateFolder} selectedFolderId={selectedFolderId} nodeCount={totalNodeCount} isPro={userIsPro} onTriggerUpgrade={() => setShowProModal(true)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <Toolbar onAction={handleAction} activeFile={!!state.activeFile} selectedCount={state.selectedFileIds.size} canUndo={canUndo} canRedo={canRedo} hasEdits={hasEditsForActiveFile || Object.keys(pageRotations).length > 0} isDownloading={isDownloading} isPro={userIsPro} />
          <TextEditingToolbar currentStyle={textStyle} onStyleChange={handleStyleChange} isTextMode={isTextMode} setIsTextMode={handleToggleTextMode} activeFile={!!state.activeFile} onDeleteAnnotation={handleDeleteAnnotation} hasSelectedAnnotation={!!selectedAnnotationId || !!selectedPatchId} />
          <PdfViewer file={state.activeFile} annotations={state.activeFile ? (annotationsByFile[state.activeFile.id] || []) : []} patches={state.activeFile ? (textPatchesByFile[state.activeFile.id] || []) : []} imageAnnotations={state.activeFile ? (imageAnnotationsByFile[state.activeFile.id] || []) : []} onAddAnnotation={handleAddAnnotation} onUpdateAnnotation={handleUpdateAnnotation} onDeleteAnnotation={(id) => setAnnotationsByFile(p => ({ ...p, [state.activeFile!.id]: (p[state.activeFile!.id] || []).filter(a => a.id !== id) }))} onSelectAnnotation={setSelectedAnnotationId} selectedAnnotationId={selectedAnnotationId} onAddPatch={handleAddPatch} onUpdatePatch={handleUpdatePatch} onDeletePatch={(id) => setTextPatchesByFile(p => ({ ...p, [state.activeFile!.id]: (p[state.activeFile!.id] || []).filter(a => a.id !== id) }))} onSelectPatch={setSelectedPatchId} selectedPatchId={selectedPatchId} onAddImageAnnotation={handleAddImageAnnotation} onUpdateImageAnnotation={handleUpdateImageAnnotation} onDeleteImageAnnotation={handleDeleteImageAnnotation} isTextMode={isTextMode} currentStyle={textStyle} rotation={pageRotations[currentPage] || 0} currentPage={currentPage} onPageChange={setCurrentPage} pendingSignature={pendingSignature} onPlaceSignature={() => setPendingSignature(null)} />
        </div>
        <AiPanel isOpen={state.aiPanelOpen} activeTab={state.aiTab} onTabChange={(tab) => setState(p => ({ ...p, aiTab: tab }))} summary={state.aiSummary} fields={state.aiFields} loading={state.aiLoading} error={state.aiError} onClose={() => setState(p => ({ ...p, aiPanelOpen: false }))} />
      </div>
      <StatusBar nodeCount={totalNodeCount} selectedCount={state.selectedFileIds.size} aiStatus={isAuthenticated ? (state.aiLoading ? 'processing' : 'idle') : 'unauthenticated'} activeFileName={state.activeFile?.name} />
      <DeleteConfirmationModal isOpen={!!deleteTarget} fileName={deleteTarget?.name || ''} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      <MergeModal isOpen={mergeModalOpen} items={mergeItems} onMoveUp={(idx) => handleMoveInQueue(idx, 'up')} onMoveDown={(idx) => handleMoveInQueue(idx, 'down')} onRemove={handleRemoveFromQueue} onConfirm={handleFinalMerge} onCancel={() => { setMergeModalOpen(false); setMergeQueue([]); }} isMerging={isMerging} />
      <SplitModal isOpen={splitModalOpen} fileName={state.activeFile?.name || ''} pageCount={null} onConfirm={handleFinalSplit} onCancel={() => setSplitModalOpen(false)} isProcessing={isSplitting} />
      <ProUpgradeModal isOpen={showProModal} onClose={() => setShowProModal(false)} isPro={userIsPro} userEmail={user?.email} userId={user?.email} />
      <LoginModal isOpen={!isAuthenticated && !isGuestMode} onGuestAccess={() => setIsGuestMode(true)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} currentTheme={currentTheme} onThemeChange={handleThemeChange} />
      {showSignatureTool && <SignatureTool onSignatureComplete={handleSignatureComplete} onClose={() => setShowSignatureTool(false)} />}
    </div>
  );
};

const PdfWorkspaceApp: React.FC = () => (
  <GoogleAuthProvider>
    <PdfWorkspaceContent />
  </GoogleAuthProvider>
);

export default PdfWorkspaceApp;
