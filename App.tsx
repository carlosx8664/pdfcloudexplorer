import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, FileSystemItem, AiFields, TextAnnotation, TextStyle, EditTextPatch, WorkspaceState, ImageAnnotation } from './types';
import { INITIAL_FILE_SYSTEM } from './services/mockData';
import { usePdfOperations } from './hooks/usePdfOperations';
import { uint8ArrayToBase64 } from './utils/encoding';
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
import SignatureTool from './components/SignatureTool';
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext';
import { savePdfWithAnnotations, downloadPdf } from './services/pdfService';
import { getUserSubscription, isPro, Subscription, upgradeUserToPro } from './services/subscriptionService';
import { useAiCredit } from './services/aiCreditService';

const PdfWorkspaceContent: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileSystemItem[]>(INITIAL_FILE_SYSTEM);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isAuthenticated, user, signOut, aiCredits, refreshCredits } = useGoogleAuth();

  const [isGuestMode, setIsGuestMode] = useState(false);

  // Subscription State
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'free',
    status: 'active',
    expiresAt: null
  });
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

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

  useEffect(() => {
    async function loadSubscription() {
      if (isAuthenticated && user?.email) {
        setIsLoadingSubscription(true);
        try {
          const sub = await getUserSubscription(user.email);
          setSubscription(sub);

          // Show PRO modal for FREE users (only once per session)
          if (sub.plan === 'free' && !hasSeenProModal) {
            setShowProModal(true);
            setHasSeenProModal(true);
          }
        } catch (error) {
          console.error('Failed to load subscription:', error);
        } finally {
          setIsLoadingSubscription(false);
        }
      } else {
        setSubscription({
          plan: 'free',
          status: 'active',
          expiresAt: null
        });
      }
    }
    
    loadSubscription();
  }, [isAuthenticated, user, hasSeenProModal]);

  const userIsPro = isPro(subscription);

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

  // Reset workspace state logic
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
    console.log('✅ Workspace cleared');
  }, []);

  const handleSignOut = useCallback(() => {
    setIsProfileOpen(false);
    resetWorkspace();
    signOut();
    setIsGuestMode(false); // Reset guest mode on sign out to show login modal
  }, [resetWorkspace, signOut]);

  // Reset rotation when active file changes
  useEffect(() => {
    // This effect runs when activeFile ID changes. 
    // Handled in handleSelectFile to avoid race conditions
  }, [state.activeFile?.id]);

  // Calculate if the active file has any edits (annotations or patches)
  const hasEditsForActiveFile = useMemo(() => {
    if (!state.activeFile) return false;
    const fileId = state.activeFile.id;
    const anns = annotationsByFile[fileId] || [];
    const imgs = imageAnnotationsByFile[fileId] || [];
    const patches = textPatchesByFile[fileId] || [];
    return anns.length > 0 || imgs.length > 0 || patches.length > 0;
  }, [state.activeFile, annotationsByFile, imageAnnotationsByFile, textPatchesByFile]);

  // --- Logic to handle Text Mode Toggle with Cleanup ---
  const handleToggleTextMode = (enable: boolean) => {
    setIsTextMode(enable);

    // If turning OFF edit mode, cleanup empty/unused boxes
    if (!enable && state.activeFile) {
        const fileId = state.activeFile.id;

        // Cleanup Annotations (New Text boxes)
        setAnnotationsByFile(prev => {
            const current = prev[fileId] || [];
            const cleaned = current.filter(a => {
                const t = a.text.trim();
                // Remove if empty or is the default placeholder
                return t !== '' && t !== 'New Text';
            });
            // Only update if something changed
            if (cleaned.length === current.length) return prev;
            return { ...prev, [fileId]: cleaned };
        });

        // Cleanup Patches (Edits to existing text)
        setTextPatchesByFile(prev => {
            const current = prev[fileId] || [];
            const cleaned = current.filter(p => {
                const t = p.newText.trim();
                // Remove if empty, explicitly "New Text", or if it exactly matches the original (no edit made)
                return t !== '' && t !== 'New Text' && t !== p.originalText;
            });
            if (cleaned.length === current.length) return prev;
            return { ...prev, [fileId]: cleaned };
        });

        // Deselect everything when leaving edit mode
        setSelectedAnnotationId(null);
        setSelectedPatchId(null);
    }
  };

  // --- History Helpers ---

  const getCurrentWorkspaceState = useCallback((): WorkspaceState => {
    // Collect all PDF bytes into a map as requested
    const bytesMap = new Map<string, Uint8Array>();
    const collectBytes = (nodes: FileSystemItem[]) => {
      nodes.forEach(node => {
        if (node.data) bytesMap.set(node.id, node.data);
        if (node.children) collectBytes(node.children);
      });
    };
    collectBytes(fileTree);

    return {
      fileTree: JSON.parse(JSON.stringify(fileTree)), // Deep copy structure
      // Re-attach binary data since JSON.stringify kills it
      pdfBytesMap: bytesMap, 
      annotationsByFile: JSON.parse(JSON.stringify(annotationsByFile)),
      imageAnnotationsByFile: JSON.parse(JSON.stringify(imageAnnotationsByFile)),
      textPatchesByFile: JSON.parse(JSON.stringify(textPatchesByFile))
    };
  }, [fileTree, annotationsByFile, imageAnnotationsByFile, textPatchesByFile]);

  // Special helper to re-attach binary data to tree after JSON restore
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
    
    // Safety check for active file
    setState(prev => {
        if (prev.activeFile) {
            // Check if active file still exists in restored tree
            return prev;
        }
        return prev;
    });
  }, []);

  const canUndo = historyIndex >= 0;
  // We can redo if index is not at the end. 
  // Note: if historyIndex == length - 1, we are at the tip of *saved* history.
  // But if we have unsaved changes (the current live state), standard Undo requires saving it.
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
           handleRedo();
        } else {
           handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape' && pendingSignature) {
        setPendingSignature(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, handleUndo, handleRedo, pendingSignature]); 

  // --- End History Helpers ---

  function createUniqueId() {
    return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function insertFolder(tree: FileSystemItem[], folder: FileSystemItem, parentId?: string): FileSystemItem[] {
    if (!parentId) {
      return [...tree, folder];
    }
    return tree.map(node => {
      if (node.id === parentId && node.type === "folder") {
        const children = node.children ?? [];
        return { ...node, children: [...children, folder] };
      }
      if (node.children) {
        return { ...node, children: insertFolder(node.children, folder, parentId) };
      }
      return node;
    });
  }

  const handleCreateFolder = (parentFolderId?: string) => {
    const name = window.prompt("Folder name", "New Folder");
    if (!name) return;
    
    pushHistory(); 

    const newFolder: FileSystemItem = {
      id: createUniqueId(),
      name,
      type: "folder",
      children: [],
      modifiedAt: new Date().toISOString().split('T')[0]
    };
    setFileTree(prev => insertFolder(prev, newFolder, parentFolderId));
    
    if (parentFolderId) {
      handleExpandFolder(parentFolderId);
    }
  };

  const handleRenameItem = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return;
    pushHistory();
    
    setFileTree(prev => {
      const updateNode = (nodes: FileSystemItem[]): FileSystemItem[] => {
        return nodes.map(node => {
          if (node.id === id) {
            return { ...node, name: newName };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prev);
    });

    if (state.activeFile && state.activeFile.id === id) {
        setState(prev => ({
            ...prev,
            activeFile: prev.activeFile ? { ...prev.activeFile, name: newName } : prev.activeFile
        }));
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    if (file.type === 'folder') {
      setSelectedFolderId(file.id);
    } else {
      setSelectedFolderId(null);
      setCurrentPage(1);
      setPageRotations({});
      setPendingSignature(null);
    }

    setState(prev => {
      const nextSelected = new Set(prev.selectedFileIds);
      if (isMultiSelect) {
        if (nextSelected.has(file.id)) nextSelected.delete(file.id);
        else nextSelected.add(file.id);
      } else {
        nextSelected.clear();
        nextSelected.add(file.id);
      }
      return {
        ...prev,
        activeFile: file,
        selectedFileIds: nextSelected,
        aiSummary: null,
        aiFields: null,
        aiLoading: null,
        aiError: null,
      };
    });
    
    setSelectedAnnotationId(null);
    setSelectedPatchId(null);
  }, []);

  const handleDeleteFile = useCallback((fileId: string) => {
    const node = findNodeById(fileTree, fileId);
    if (node) {
      setDeleteTarget({ id: node.id, name: node.name });
    }
  }, [fileTree, findNodeById]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    pushHistory();

    const fileId = deleteTarget.id;
    setAnnotationsByFile(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
    setImageAnnotationsByFile(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
    setTextPatchesByFile(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

    const findNodeAndDescendants = (items: FileSystemItem[], id: string): string[] | null => {
      for (const item of items) {
        if (item.id === id) {
          const ids = [item.id];
          const collect = (node: FileSystemItem) => {
            if (node.children) {
              node.children.forEach(child => {
                ids.push(child.id);
                collect(child);
              });
            }
          };
          collect(item);
          return ids;
        }
        if (item.children) {
          const result = findNodeAndDescendants(item.children, id);
          if (result) return result;
        }
      }
      return null;
    };

    const idsToRemove = findNodeAndDescendants(fileTree, fileId);
    if (!idsToRemove) {
      setDeleteTarget(null);
      return;
    }

    setFileTree(prev => {
      const removeItem = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.reduce((acc, item) => {
          if (item.id === fileId) return acc;
          if (item.children) {
            return [...acc, { ...item, children: removeItem(item.children) }];
          }
          return [...acc, item];
        }, [] as FileSystemItem[]);
      };
      return removeItem(prev);
    });

    setState(prev => {
      const nextSelected = new Set(prev.selectedFileIds);
      idsToRemove.forEach(id => nextSelected.delete(id));
      
      const isActiveRemoved = prev.activeFile && idsToRemove.includes(prev.activeFile.id);
      
      if (isActiveRemoved) {
        return {
          ...prev,
          activeFile: null,
          selectedFileIds: nextSelected,
          aiSummary: null,
          aiFields: null,
          aiLoading: null,
          aiError: null,
        };
      }
      
      return {
        ...prev,
        selectedFileIds: nextSelected
      };
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
      if (node.children) {
        count += getPdfCount(node.children);
      }
    }
    return count;
  }, []);

  const handleUploadFiles = async (files: FileList) => {
    // Check Limits
    const currentPdfCount = getPdfCount(fileTree);
    
    if (!userIsPro) {
        if (files.length > 1) {
            alert("Free plan users can only upload one file at a time. Upgrade to PRO to manage multiple files!");
            setShowProModal(true);
            return;
        }
        if (currentPdfCount >= 1) {
             alert("Free workspace is limited to 1 PDF. Please delete the existing file to upload a new one, or upgrade to PRO.");
             setShowProModal(true);
             return;
        }
    } else {
        if (currentPdfCount + files.length > 10) {
            alert(`PRO workspace is limited to 10 PDFs. You currently have ${currentPdfCount}.`);
            return;
        }
    }

    const MAX_FREE_BYTES = 10 * 1024 * 1024; // 10MB
    const MAX_PRO_BYTES = 100 * 1024 * 1024; // 100MB
    const limit = userIsPro ? MAX_PRO_BYTES : MAX_FREE_BYTES;
    const limitLabel = userIsPro ? '100MB' : '10MB';

    const validFiles: File[] = [];
    let rejectedCount = 0;

    for (let i = 0; i < files.length; i++) {
        if (files[i].size <= limit) {
            validFiles.push(files[i]);
        } else {
            rejectedCount++;
        }
    }

    if (rejectedCount > 0) {
        if (!userIsPro) {
            alert(`File(s) too large. Free plan is limited to 10MB per file. Upgrade to PRO to upload larger files.`);
            setShowProModal(true);
        } else {
            alert(`File(s) too large. Maximum allowed size is ${limitLabel}.`);
        }
    }

    if (validFiles.length === 0) return;

    const dt = new DataTransfer();
    validFiles.forEach(f => dt.items.add(f));

    pushHistory();
    await pdfOps.uploadFiles(dt.files);
  };

  const handleAddAnnotation = (ann: TextAnnotation) => {
    if (!state.activeFile) return;
    pushHistory();
    setAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), ann]
    }));
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<TextAnnotation>) => {
    if (!state.activeFile) return;
    setAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  };
  
  const handleDeleteAnnotation = () => {
    if (!state.activeFile) return;
    pushHistory();
    
    if (selectedAnnotationId) {
      setAnnotationsByFile(prev => ({
        ...prev,
        [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(a => a.id !== selectedAnnotationId)
      }));
      setSelectedAnnotationId(null);
    }
  };

  const handleDeleteAnnotationById = (id: string) => {
    if (!state.activeFile) return;
    setAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(a => a.id !== id)
    }));
  };

  const handleAddImageAnnotation = (ann: ImageAnnotation) => {
    if (!state.activeFile) return;
    pushHistory();
    setImageAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), ann]
    }));
  };

  const handleUpdateImageAnnotation = (id: string, updates: Partial<ImageAnnotation>) => {
    if (!state.activeFile) return;
    setImageAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  };

  const handleDeleteImageAnnotation = (id: string) => {
    if (!state.activeFile) return;
    pushHistory();
    setImageAnnotationsByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(a => a.id !== id)
    }));
  };

  const handleAddPatch = (patch: EditTextPatch) => {
    if (!state.activeFile) return;
    pushHistory();
    setTextPatchesByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: [...(prev[state.activeFile!.id] || []), patch]
    }));
    setSelectedPatchId(patch.id);
  };

  const handleUpdatePatch = (id: string, updates: Partial<EditTextPatch>) => {
    if (!state.activeFile) return;
    setTextPatchesByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  };

  const handleDeletePatchById = (id: string) => {
    if (!state.activeFile) return;
    setTextPatchesByFile(prev => ({
      ...prev,
      [state.activeFile!.id]: (prev[state.activeFile!.id] || []).filter(p => p.id !== id)
    }));
  }

  const handleStyleChange = (newStyle: TextStyle) => {
    if (state.activeFile && (selectedAnnotationId || selectedPatchId)) {
        pushHistory();
    }
    setTextStyle(newStyle);
    
    if (!state.activeFile) return;

    if (selectedAnnotationId) {
      handleUpdateAnnotation(selectedAnnotationId, newStyle);
    }
    
    if (selectedPatchId) {
      handleUpdatePatch(selectedPatchId, newStyle);
    }
  };

  const handleDownloadPDF = async () => {
    if (!state.activeFile || !state.activeFile.data) return;

    const annotations = annotationsByFile[state.activeFile.id] || [];
    const patches = textPatchesByFile[state.activeFile.id] || [];
    const images = imageAnnotationsByFile[state.activeFile.id] || [];
    const hasRotation = Object.values(pageRotations).some(r => r !== 0);
    const hasEdits = annotations.length > 0 || patches.length > 0 || images.length > 0 || hasRotation;

    setIsDownloading(true);
    await new Promise(r => setTimeout(r, 100));

    try {
      if (hasEdits) {
        const editedBytes = await savePdfWithAnnotations(state.activeFile.data, annotations, patches, pageRotations, images);
        const fileName = state.activeFile.name.replace(/\.pdf$/i, '') + '_edited.pdf';
        downloadPdf(editedBytes, fileName);
      } else {
        pdfOps.downloadActive();
      }
    } catch (e: any) {
      alert("Failed to download PDF: " + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMoveInQueue = (index: number, direction: 'up' | 'down') => {
    setMergeQueue(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleRemoveFromQueue = (index: number) => {
    setMergeQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalMerge = async () => {
    if (mergeQueue.length < 2) return;
    setIsMerging(true);
    try {
      pushHistory();
      await pdfOps.performMergeByIds(mergeQueue);
      setMergeModalOpen(false);
      setMergeQueue([]);
      setState(prev => ({ ...prev, selectedFileIds: new Set() }));
    } catch (err: any) {
      alert("Merge failed: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const handleFinalSplit = async (folderName: string) => {
    setIsSplitting(true);
    try {
      pushHistory();
      if (!state.activeFile) return;
      const annotations = annotationsByFile[state.activeFile.id] || [];
      const patches = textPatchesByFile[state.activeFile.id] || [];
      const images = imageAnnotationsByFile[state.activeFile.id] || [];
      
      await pdfOps.splitIntoFolder(folderName, annotations, patches, pageRotations, images);
      
      setSplitModalOpen(false);
    } catch (err: any) {
      alert("Split failed: " + err.message);
    } finally {
      setIsSplitting(false);
    }
  };

  const handleRotate = () => {
    setPageRotations(prev => ({
      ...prev,
      [currentPage]: ((prev[currentPage] || 0) + 90) % 360
    }));
  };

  const handleAiSummarize = async () => {
    if (!state.activeFile || !state.activeFile.data) return;

    if (!userIsPro) {
      alert("AI Summarize is a PRO feature. Upgrade to unlock AI powers!");
      setShowProModal(true);
      return;
    }

    if (!user?.email) return;

    // Credit Check
    if (!aiCredits || aiCredits.remaining <= 0) {
      alert(`You have used all your AI credits for this month. Reset date: ${aiCredits?.resetAt ? new Date(aiCredits.resetAt).toLocaleDateString() : 'Next Month'}`);
      return;
    }

    setState(prev => ({ ...prev, aiPanelOpen: true, aiTab: 'summary', aiLoading: 'summary', aiError: null }));

    try {
      // Consume Credit
      await useAiCredit(user.email);
      // Refresh context to update UI count
      await refreshCredits();

      const summary = await summarizePdf(state.activeFile.data);
      setState(prev => ({ ...prev, aiSummary: summary, aiLoading: null }));
    } catch (error: any) {
      setState(prev => ({ ...prev, aiLoading: null, aiError: error.message || 'Summarization failed' }));
    }
  };

  const handleAiExtractFields = async () => {
    if (!state.activeFile || !state.activeFile.data) return;

    if (!userIsPro) {
      alert("AI Extraction is a PRO feature. Upgrade to unlock AI powers!");
      setShowProModal(true);
      return;
    }

    if (!user?.email) return;

    // Credit Check
    if (!aiCredits || aiCredits.remaining <= 0) {
      alert(`You have used all your AI credits for this month. Reset date: ${aiCredits?.resetAt ? new Date(aiCredits.resetAt).toLocaleDateString() : 'Next Month'}`);
      return;
    }

    setState(prev => ({ ...prev, aiPanelOpen: true, aiTab: 'fields', aiLoading: 'fields', aiError: null }));

    try {
      // Consume Credit
      await useAiCredit(user.email);
      await refreshCredits();

      const fields = await extractFields(state.activeFile.data);
      setState(prev => ({ ...prev, aiFields: fields, aiLoading: null }));
    } catch (error: any) {
      setState(prev => ({ ...prev, aiLoading: null, aiError: error.message || 'Extraction failed' }));
    }
  };

  const handleSignatureComplete = (dataUrl: string) => {
    setPendingSignature(dataUrl);
    setShowSignatureTool(false);
  };

  const handleUpgradeUser = async () => {
      if (!user?.email) return;
      try {
        await upgradeUserToPro(user.email, 'manual-upgrade', 4.99, 'USD');
        // Refresh subscription after upgrade to see changes immediately
        const sub = await getUserSubscription(user.email);
        setSubscription(sub);
        await refreshCredits();
        
        setShowProModal(false);
        setHasSeenProModal(true);
        alert("Welcome to PRO! AI credits initialized.");
      } catch (e) {
        alert("Upgrade failed. Please check console.");
      }
  };

  const handleAction = async (action: string) => {
    switch (action) {
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      case 'summarize':
        await handleAiSummarize();
        break;

      case 'extract':
        await handleAiExtractFields();
        break;
      
      case 'sign':
        if (!state.activeFile) return;
        setShowSignatureTool(true);
        break;

      case 'merge':
        if (state.selectedFileIds.size >= 2) {
          const validIds = Array.from(state.selectedFileIds).filter(id => {
            const node = findNodeById(fileTree, id);
            return node && node.data;
          });
          
          if (validIds.length < 2) {
            alert("Only uploaded files can be merged. Please upload your PDFs first.");
            return;
          }

          setMergeQueue(validIds);
          setMergeModalOpen(true);
        }
        break;

      case 'split':
        if (state.activeFile && state.activeFile.data) {
          setSplitModalOpen(true);
        } else {
          alert("Please select an uploaded PDF to split.");
        }
        break;

      case 'rotate':
        handleRotate();
        break;
      
      case 'download':
        await handleDownloadPDF();
        break;

      case 'open':
        document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
        break;
      
      case 'getPro':
        setShowProModal(true);
        break;

      default:
        break;
    }
  };

  const mergeItems = useMemo(() => {
    return mergeQueue.map(id => findNodeById(fileTree, id)).filter((item): item is FileSystemItem => !!item);
  }, [mergeQueue, fileTree, findNodeById]);

  // Derived State for StatusBar
  const totalNodeCount = useMemo(() => {
    const countNodes = (nodes: FileSystemItem[]): number => {
      let count = 0;
      for (const node of nodes) {
        count++; 
        if (node.children) {
          count += countNodes(node.children);
        }
      }
      return count;
    };
    return countNodes(fileTree);
  }, [fileTree]);

  const totalPdfCount = useMemo(() => {
    return getPdfCount(fileTree);
  }, [fileTree, getPdfCount]);

  const aiStatus = useMemo(() => {
    if (!isAuthenticated) return 'unauthenticated';
    if (state.aiLoading) return 'processing';
    return 'idle';
  }, [isAuthenticated, state.aiLoading]);

  const currentViewRotation = pageRotations[currentPage] || 0;

  return (
    <div className={`h-screen w-screen flex flex-col ${isDarkMode ? 'dark bg-[#201f1e] text-[#f3f2f1]' : 'bg-[#f3f2f1] text-[#323130]'} font-sans`}>
      <header className="h-10 bg-[#0078d4] dark:bg-[#111111] flex items-center px-4 justify-between select-none shadow-md z-30 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="bg-white dark:bg-[#252423] p-0.5 rounded shadow-inner w-7 h-7 flex items-center justify-center overflow-hidden">
             <img 
               src="/pdfce.png?v=1" 
               alt="Logo" 
               className="w-full h-full object-contain" 
             />
          </div>
          <h1 className="text-white text-sm font-bold tracking-tight">PDF Cloud Explorer</h1>
        </div>
        <div className="flex items-center space-x-4">
           {/* Theme Toggle */}
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
             title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
           >
             {isDarkMode ? (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             )}
           </button>

           {isAuthenticated && user ? (
            <div 
              ref={profileRef}
              className="relative ml-2"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors outline-none"
              >
                 {user.picture ? (
                  <img src={user.picture} alt="profile" className="w-6 h-6 rounded-full border border-white/20" />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-[10px] shadow-inner">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-white hidden sm:block truncate max-w-[100px]">{user.name}</span>
                <svg className={`w-3 h-3 text-white/70 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-1 w-60 bg-white dark:bg-[#252423] rounded-xl shadow-2xl border border-gray-200 dark:border-[#3b3a39] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      {userIsPro ? (
                         <>
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mr-1.5"></span>
                            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">PRO Member</span>
                         </>
                      ) : (
                         'Free Plan'
                      )}
                    </p>
                  </div>
                  
                  {userIsPro && (
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">AI Credits</p>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                {aiCredits?.remaining || 0} / {aiCredits?.total || 10}
                            </span>
                            {aiCredits?.resetAt && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Resets {new Date(aiCredits.resetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                           <div 
                             className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                             style={{ width: `${((aiCredits?.remaining || 0) / (aiCredits?.total || 1)) * 100}%` }}
                           ></div>
                        </div>
                    </div>
                  )}

                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2d2c2b] transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>Account Settings</span>
                  </button>

                  {!userIsPro && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowProModal(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-bold flex items-center space-x-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span>Upgrade to PRO</span>
                    </button>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                    >
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                       <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
           ) : (
             <button
                onClick={() => setIsGuestMode(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
             >
                Sign In
             </button>
           )}
           <AiStatusBadge 
             isAuthenticated={isAuthenticated} 
             aiLoading={state.aiLoading} 
             activeFileName={state.activeFile?.name} 
           />
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <SidebarFileExplorer
          items={fileTree}
          expandedFolders={state.expandedFolders}
          activeFileId={state.activeFile?.id}
          selectedFileIds={state.selectedFileIds}
          onToggleFolder={handleToggleFolder}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          onRenameItem={handleRenameItem}
          onUpload={handleUploadFiles}
          onCreateFolder={handleCreateFolder}
          selectedFolderId={selectedFolderId}
          nodeCount={totalNodeCount}
          isPro={userIsPro}
          onTriggerUpgrade={() => setShowProModal(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <Toolbar 
            onAction={handleAction} 
            activeFile={!!state.activeFile} 
            selectedCount={state.selectedFileIds.size}
            canUndo={canUndo}
            canRedo={canRedo}
            hasEdits={hasEditsForActiveFile || Object.keys(pageRotations).length > 0}
            isDownloading={isDownloading}
            isPro={userIsPro}
          />
          <TextEditingToolbar
            currentStyle={textStyle}
            onStyleChange={handleStyleChange}
            isTextMode={isTextMode}
            setIsTextMode={handleToggleTextMode}
            activeFile={!!state.activeFile}
            onDeleteAnnotation={handleDeleteAnnotation}
            hasSelectedAnnotation={!!selectedAnnotationId || !!selectedPatchId}
          />
          <PdfViewer 
            file={state.activeFile}
            annotations={state.activeFile ? (annotationsByFile[state.activeFile.id] || []) : []}
            patches={state.activeFile ? (textPatchesByFile[state.activeFile.id] || []) : []}
            imageAnnotations={state.activeFile ? (imageAnnotationsByFile[state.activeFile.id] || []) : []}
            onAddAnnotation={handleAddAnnotation}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotationById}
            onSelectAnnotation={setSelectedAnnotationId}
            selectedAnnotationId={selectedAnnotationId}
            onAddPatch={handleAddPatch}
            onUpdatePatch={handleUpdatePatch}
            onDeletePatch={handleDeletePatchById}
            onSelectPatch={setSelectedPatchId}
            selectedPatchId={selectedPatchId}
            onAddImageAnnotation={handleAddImageAnnotation}
            onUpdateImageAnnotation={handleUpdateImageAnnotation}
            onDeleteImageAnnotation={handleDeleteImageAnnotation}
            isTextMode={isTextMode}
            currentStyle={textStyle}
            rotation={currentViewRotation}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pendingSignature={pendingSignature}
            onPlaceSignature={() => setPendingSignature(null)}
          />
        </div>

        <AiPanel
          isOpen={state.aiPanelOpen}
          activeTab={state.aiTab}
          onTabChange={(tab) => setState(p => ({ ...p, aiTab: tab }))}
          summary={state.aiSummary}
          fields={state.aiFields}
          loading={state.aiLoading}
          error={state.aiError}
          onClose={() => setState(p => ({ ...p, aiPanelOpen: false }))}
        />
      </div>

      <StatusBar 
        nodeCount={totalNodeCount}
        selectedCount={state.selectedFileIds.size}
        aiStatus={aiStatus}
        activeFileName={state.activeFile?.name}
      />

      <DeleteConfirmationModal 
        isOpen={!!deleteTarget}
        fileName={deleteTarget?.name || ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <MergeModal
        isOpen={mergeModalOpen}
        items={mergeItems}
        onMoveUp={(idx) => handleMoveInQueue(idx, 'up')}
        onMoveDown={(idx) => handleMoveInQueue(idx, 'down')}
        onRemove={handleRemoveFromQueue}
        onConfirm={handleFinalMerge}
        onCancel={() => {
          setMergeModalOpen(false);
          setMergeQueue([]);
        }}
        isMerging={isMerging}
      />

      <SplitModal
        isOpen={splitModalOpen}
        fileName={state.activeFile?.name || ''}
        pageCount={null}
        onConfirm={handleFinalSplit}
        onCancel={() => setSplitModalOpen(false)}
        isProcessing={isSplitting}
      />
      
      <ProUpgradeModal 
        isOpen={showProModal} 
        onClose={() => {
          setShowProModal(false);
          setHasSeenProModal(true);
        }} 
        isPro={userIsPro}
        userEmail={user?.email}
        onUpgrade={handleUpgradeUser}
      />

      <LoginModal 
        isOpen={!isAuthenticated && !isGuestMode} 
        onGuestAccess={() => setIsGuestMode(true)}
      />
      
      {showSignatureTool && (
        <SignatureTool
          onSignatureComplete={handleSignatureComplete}
          onClose={() => setShowSignatureTool(false)}
        />
      )}
    </div>
  );
};

const PdfWorkspaceApp: React.FC = () => (
  <GoogleAuthProvider>
    <PdfWorkspaceContent />
  </GoogleAuthProvider>
);

export default PdfWorkspaceApp;