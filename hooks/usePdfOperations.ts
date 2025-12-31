import React, { useCallback } from 'react';
import { FileSystemItem, TextAnnotation, EditTextPatch, ImageAnnotation } from '../types';
import { mergePdfs, splitPdf, downloadPdf, savePdfWithAnnotations } from '../services/pdfService';

interface UsePdfOperationsProps {
  fileSystem: FileSystemItem[];
  setFileSystem: React.Dispatch<React.SetStateAction<FileSystemItem[]>>;
  activeFile: FileSystemItem | null;
  selectedFileIds: Set<string>;
  onFileSelect: (file: FileSystemItem, isMultiSelect: boolean) => void;
  onExpandFolder: (id: string) => void;
  annotationsByFile: Record<string, TextAnnotation[]>;
  textPatchesByFile: Record<string, EditTextPatch[]>;
  imageAnnotationsByFile: Record<string, ImageAnnotation[]>;
  pageRotations: Record<number, number>;
}

/**
 * Pure helper to recursively insert a new node into the file system tree.
 */
export const insertNode = (tree: FileSystemItem[], newNode: FileSystemItem, parentId?: string): FileSystemItem[] => {
  if (!parentId) return [...tree, newNode];
  return tree.map(node => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.children) {
      return { ...node, children: insertNode(node.children, newNode, parentId) };
    }
    return node;
  });
};

export const usePdfOperations = ({
  fileSystem,
  setFileSystem,
  activeFile,
  selectedFileIds,
  onFileSelect,
  onExpandFolder,
  annotationsByFile,
  textPatchesByFile,
  imageAnnotationsByFile,
  pageRotations
}: UsePdfOperationsProps) => {

  const findFileById = useCallback((id: string, items: FileSystemItem[]): FileSystemItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findFileById(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const findParentId = useCallback((targetId: string, items: FileSystemItem[]): string | null => {
    for (const item of items) {
      if (item.children) {
        if (item.children.some(child => child.id === targetId)) return item.id;
        const found = findParentId(targetId, item.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const addItemsToFolder = useCallback((newItems: FileSystemItem[], folderId?: string) => {
    setFileSystem(prev => {
      let currentTree = prev;
      newItems.forEach(item => {
        currentTree = insertNode(currentTree, item, folderId);
      });
      return currentTree;
    });
    
    // Expand the parent folder so we can see the new item
    if (folderId) {
      onExpandFolder(folderId);
    }
    
    // If we added a single file, select it (optional UX polish)
    if (newItems.length > 0 && newItems[newItems.length - 1].type === 'pdf') {
      onFileSelect(newItems[newItems.length - 1], false);
    }
  }, [setFileSystem, onFileSelect, onExpandFolder]);

  const createNewFolder = useCallback((name: string, targetParentId?: string) => {
    const newFolder: FileSystemItem = {
      id: `folder-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name,
      type: 'folder',
      children: [],
      modifiedAt: new Date().toISOString().split('T')[0]
    };

    let parentId = targetParentId;

    // Contextual auto-detection if no specific parent provided
    if (!parentId) {
      if (activeFile) {
        if (activeFile.type === 'folder') {
          parentId = activeFile.id;
        } else {
          parentId = findParentId(activeFile.id, fileSystem) || undefined;
        }
      } else {
        parentId = undefined; // Default to root
      }
    }

    setFileSystem(prev => insertNode(prev, newFolder, parentId));
    if (parentId) {
      onExpandFolder(parentId);
    }
    
    return newFolder.id;
  }, [activeFile, fileSystem, findParentId, setFileSystem, onExpandFolder]);

  const uploadFiles = useCallback(async (fileList: FileList) => {
    const newItems: FileSystemItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf') continue;
      
      const buffer = await file.arrayBuffer();
      newItems.push({
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        type: 'pdf',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        modifiedAt: new Date().toISOString().split('T')[0],
        data: new Uint8Array(buffer)
      });
    }
    
    let targetId: string | undefined = undefined;
    if (activeFile) {
      if (activeFile.type === 'folder') targetId = activeFile.id;
      else targetId = findParentId(activeFile.id, fileSystem) || undefined;
    }
    
    if (newItems.length > 0) addItemsToFolder(newItems, targetId);
  }, [addItemsToFolder, activeFile, findParentId, fileSystem]);

  const performMergeByIds = useCallback(async (ids: string[]) => {
    // 1. Gather all files and apply edits if necessary
    const blobsToMerge: Uint8Array[] = [];

    for (const id of ids) {
      const file = findFileById(id, fileSystem);
      if (!file || !file.data) continue;

      // Get edits for this file
      const annotations = annotationsByFile[id] || [];
      const patches = textPatchesByFile[id] || [];
      const images = imageAnnotationsByFile[id] || [];
      
      // Rotations are only tracked for the *active* file in this app's state
      // If the file being merged is the active one, apply the rotations
      const rotations = (activeFile && activeFile.id === id) ? pageRotations : {};

      const hasEdits = annotations.length > 0 || patches.length > 0 || images.length > 0 || Object.keys(rotations).some(k => rotations[Number(k)] !== 0);

      if (hasEdits) {
        // Apply edits to generate a temporary PDF for merging
        const editedBytes = await savePdfWithAnnotations(file.data, annotations, patches, rotations, images);
        blobsToMerge.push(editedBytes);
      } else {
        // No edits, use original data
        blobsToMerge.push(file.data);
      }
    }

    if (blobsToMerge.length < 2) {
      throw new Error("Need at least 2 valid files to merge.");
    }

    // 2. Merge the (possibly edited) blobs
    const mergedBytes = await mergePdfs(blobsToMerge);
    
    const newItem: FileSystemItem = {
      id: `merge-${Date.now()}`,
      name: `Merged-${new Date().getTime()}.pdf`,
      type: 'pdf',
      size: `${(mergedBytes.length / 1024).toFixed(1)} KB`,
      modifiedAt: new Date().toISOString().split('T')[0],
      data: mergedBytes
    };
    
    const firstParent = findParentId(ids[0], fileSystem) || undefined;
    addItemsToFolder([newItem], firstParent);
  }, [fileSystem, findFileById, addItemsToFolder, findParentId, annotationsByFile, textPatchesByFile, imageAnnotationsByFile, pageRotations, activeFile]);

  const splitIntoFolder = useCallback(async (
    folderName: string,
    annotations: TextAnnotation[] = [],
    patches: EditTextPatch[] = [],
    pageRotations: Record<number, number> = {},
    imageAnnotations: ImageAnnotation[] = []
  ) => {
    if (!activeFile || !activeFile.data) return;

    // Apply edits first to ensure split files contain all changes
    const editedBytes = await savePdfWithAnnotations(
      activeFile.data, 
      annotations, 
      patches, 
      pageRotations,
      imageAnnotations
    );

    const parentOfActive = findParentId(activeFile.id, fileSystem) || undefined;
    
    // Split the EDITED PDF
    const splitPages = await splitPdf(editedBytes);
    if (splitPages.length === 0) {
      throw new Error("PDF splitting resulted in 0 pages.");
    }

    // Use a robust random ID to ensure no collisions in loops
    const baseId = Date.now();
    
    const splitFiles: FileSystemItem[] = splitPages.map((bytes, idx) => ({
      id: `split-${baseId}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${activeFile.name.replace('.pdf', '')}-page-${idx + 1}.pdf`,
      type: 'pdf',
      size: `${(bytes.length / 1024).toFixed(1)} KB`,
      modifiedAt: new Date().toISOString().split('T')[0],
      data: bytes
    }));
    
    const newFolderId = `folder-split-${baseId}-${Math.random().toString(36).substr(2, 9)}`;
    const newFolder: FileSystemItem = {
      id: newFolderId,
      name: folderName,
      type: 'folder',
      children: splitFiles, // Assign children immediately
      modifiedAt: new Date().toISOString().split('T')[0]
    };

    // Add the folder (with its children) to the tree
    addItemsToFolder([newFolder], parentOfActive);
    
    // CRITICAL: Expand the NEW folder so the user sees the generated files immediately
    onExpandFolder(newFolderId);

  }, [activeFile, findParentId, fileSystem, addItemsToFolder, onExpandFolder]);

  const downloadActive = useCallback(() => {
    if (activeFile && activeFile.data) {
      downloadPdf(activeFile.data, activeFile.name);
    } else {
      alert("Selected file has no live data. Please upload a real PDF file first.");
    }
  }, [activeFile]);

  return {
    uploadFiles,
    performMergeByIds,
    splitIntoFolder,
    downloadActive,
    createNewFolder
  };
};