import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileSystemItem, TextAnnotation, TextStyle, EditTextPatch, ImageAnnotation } from '../types';

// Set worker path - use CDN for reliability
// Using cdnjs as unpkg can sometimes be unreliable or slow
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  file: FileSystemItem | null;
  annotations: TextAnnotation[];
  patches: EditTextPatch[];
  imageAnnotations?: ImageAnnotation[];
  
  onAddAnnotation: (ann: TextAnnotation) => void;
  onUpdateAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
  selectedAnnotationId: string | null;
  
  onAddPatch: (patch: EditTextPatch) => void;
  onUpdatePatch: (id: string, updates: Partial<EditTextPatch>) => void;
  onDeletePatch: (id: string) => void;
  onSelectPatch: (id: string | null) => void;
  selectedPatchId: string | null;

  onAddImageAnnotation?: (ann: ImageAnnotation) => void;
  onUpdateImageAnnotation?: (id: string, updates: Partial<ImageAnnotation>) => void;
  onDeleteImageAnnotation?: (id: string) => void;
  
  isTextMode: boolean;
  currentStyle: TextStyle;
  rotation: number;
  currentPage: number;
  onPageChange: (page: number) => void;

  pendingSignature?: string | null; // Data URL of signature waiting to be placed
  onPlaceSignature?: () => void; // Callback when signature is placed
}

// Unified type for rendering
type EditableOverlay = {
  id: string;
  fileId: string;
  page: number;
  x: number;  // normalized 0–1
  y: number;  // normalized 0–1
  width: number; // normalized 0-1
  height?: number; // normalized 0-1 (only for patches, usually)
  text?: string;
  html?: string; // Rich text
  dataUrl?: string;
  kind: "annotation" | "patch" | "image";
  sourceId: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
};

// --- Cursor Management Helpers ---
const saveCursorPosition = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
};

const restoreCursorPosition = (element: HTMLElement, position: number) => {
  const selection = window.getSelection();
  if (!selection) return;
  
  const range = document.createRange();
  // Default to start of element if path finding fails
  range.setStart(element, 0);
  range.collapse(true);

  let charCount = 0;
  const nodeStack: Node[] = [element];
  let node: Node | undefined;
  let foundStart = false;
  
  while (!foundStart && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLen = node.textContent?.length || 0;
      const nextCharCount = charCount + textLen;
      if (position <= nextCharCount) {
        range.setStart(node, position - charCount);
        range.collapse(true);
        foundStart = true;
      }
      charCount = nextCharCount;
    } else {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }
  
  selection.removeAllRanges();
  selection.addRange(range);
};

// Helper to map font names to CSS font stacks
const getCssFontFamily = (fontName?: string) => {
  switch (fontName) {
    case 'Liberation Serif': return '"Times New Roman", Times, serif';
    case 'DejaVu Sans Mono': return '"Courier New", Courier, monospace';
    case 'Liberation Sans': 
    default: return 'Arial, Helvetica, sans-serif';
  }
};

// Helper to sanitize text and remove HTML/bullets
const normalizeEditedText = (raw: string): string => {
  return raw
    .replace(/<[^>]+>/g, '') // Strip all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace named non-breaking space
    .replace(/\u00A0/g, ' ') // Replace unicode non-breaking space
    .trim();
};

// Helper to convert RGB to Hex
const rgbToHex = (rgbStr: string): string => {
  const match = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Font Detection
const detectFontStyle = (element: HTMLElement): Partial<EditTextPatch> => {
  const computed = window.getComputedStyle(element);
  
  // Font Family: Always default to Arial (Liberation Sans)
  const fontFamily = 'Liberation Sans';
  
  // Font Size: Use the exact computed size from the text layer span
  const fontSize = parseFloat(computed.fontSize);

  // Weight and Style
  const fontWeight = computed.fontWeight; 
  const fontStyle = computed.fontStyle;
  
  const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 600;
  const isItalic = fontStyle === 'italic' || fontStyle === 'oblique';
  const textDecoration = computed.textDecorationLine;
  const isUnderline = textDecoration.includes('underline');
  const isStrike = textDecoration.includes('line-through');
  const textAlign = (computed.textAlign === 'center' || computed.textAlign === 'right') 
      ? computed.textAlign 
      : 'left';
  
  const color = rgbToHex(computed.color);

  return {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    bold: isBold,
    italic: isItalic,
    underline: isUnderline,
    strike: isStrike,
    textAlign,
    color
  };
};

// Coordinate Transform Helpers
const transformRect = (x: number, y: number, w: number, h: number, rotation: number) => {
  const r = rotation % 360;
  if (r === 90) {
    return { x: 1 - y - (h || 0), y: x, w: h || 0.05, h: w };
  } else if (r === 180) {
    return { x: 1 - x - w, y: 1 - y - (h || 0), w: w, h: h || 0 };
  } else if (r === 270) {
    return { x: y, y: 1 - x - w, w: h || 0.05, h: w };
  }
  return { x, y, w, h: h || 0 };
};

const inverseTransformRect = (x: number, y: number, w: number, h: number, rotation: number) => {
  const r = rotation % 360;
  // Inverse of 90 is 270 logic
  if (r === 90) {
    return { x: y, y: 1 - x - w, w: h, h: w };
  } 
  // Inverse of 180 is 180 logic
  else if (r === 180) {
    return { x: 1 - x - w, y: 1 - y - h, w: w, h: h };
  } 
  // Inverse of 270 is 90 logic
  else if (r === 270) {
    return { x: 1 - y - h, y: x, w: h, h: w };
  }
  return { x, y, w, h };
};


interface EditableTextOverlayProps {
  overlay: EditableOverlay;
  pageContainerRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  isEditing: boolean;
  draftText: string;
  onSelect: () => void;
  onEnterEdit: () => void;
  onChangeBounds: (x: number, y: number, w: number, h: number) => void;
  onChangeText: (html: string, plainText: string) => void;
  onApplyEdit: () => void;
  onCancelEdit: () => void;
  rotation: number;
  isTextMode: boolean;
}

const EditableTextOverlay: React.FC<EditableTextOverlayProps> = ({
  overlay,
  pageContainerRef,
  isSelected,
  isEditing,
  draftText,
  onSelect,
  onEnterEdit,
  onChangeBounds,
  onChangeText,
  onApplyEdit,
  onCancelEdit,
  rotation,
  isTextMode
}) => {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    direction: string;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<number | null>(null);

  // Restore cursor position after React update
  useLayoutEffect(() => {
    if (cursorRef.current !== null && editorRef.current && isEditing) {
      restoreCursorPosition(editorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
        cursorRef.current = saveCursorPosition(editorRef.current);
    }
    const html = e.currentTarget.innerHTML;
    const plainText = e.currentTarget.innerText;
    onChangeText(html, plainText);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;

    onSelect();

    if (!pageContainerRef.current) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.x,
      initialY: overlay.y,
      isDragging: false
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !pageContainerRef.current) return;

      const { startX, startY, initialX, initialY } = dragRef.current;
      const rect = pageContainerRef.current.getBoundingClientRect();

      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      if (!dragRef.current.isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        dragRef.current.isDragging = true;
      }

      if (dragRef.current.isDragging) {
        const deltaXPercent = deltaX / rect.width;
        const deltaYPercent = deltaY / rect.height;

        const newX = Math.max(0, Math.min(0.99, initialX + deltaXPercent));
        const newY = Math.max(0, Math.min(0.99, initialY + deltaYPercent));

        onChangeBounds(newX, newY, overlay.width, overlay.height || 0);
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!pageContainerRef.current) return;
    
    let startH = overlay.height;
    if (!startH && editorRef.current && pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        startH = editorRef.current.offsetHeight / rect.height;
    }
    
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.x,
      initialY: overlay.y,
      initialW: overlay.width,
      initialH: startH || 0.05,
      direction
    };

    const handleResizeMove = (ev: MouseEvent) => {
      if (!resizeRef.current || !pageContainerRef.current) return;

      const { startX, startY, initialX, initialY, initialW, initialH, direction } = resizeRef.current;
      const rect = pageContainerRef.current.getBoundingClientRect();

      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;

      let newX = initialX;
      let newY = initialY;
      let newW = initialW;
      let newH = initialH;

      if (direction.includes('left')) {
        newX = initialX + dx;
        newW = initialW - dx;
      }
      if (direction.includes('right')) {
        newW = initialW + dx;
      }
      if (direction.includes('top')) {
        newY = initialY + dy;
        newH = initialH - dy;
      }
      if (direction.includes('bottom')) {
        newH = initialH + dy;
      }

      const minW = 60 / rect.width;
      const minH = 20 / rect.height;
      
      if (newW < minW) {
         if (direction.includes('left')) newX = initialX + (initialW - minW);
         newW = minW;
      }
      if (newH < minH) {
         if (direction.includes('top')) newY = initialY + (initialH - minH);
         newH = minH;
      }

      onChangeBounds(newX, newY, newW, newH);
    };

    const handleResizeUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  // Define CSS variables for font properties
  const cssVars = {
    '--detected-font': getCssFontFamily(overlay.fontFamily),
    '--detected-size': `${overlay.fontSize || 12}px`,
    // Don't set weight/style variables that might be used by inheritance unless we're not editing
    '--detected-weight': overlay.fontWeight || (overlay.bold ? 'bold' : 'normal'),
    '--detected-style': overlay.fontStyle || (overlay.italic ? 'italic' : 'normal'),
    '--detected-color': overlay.color || '#000000',
    '--detected-align': overlay.textAlign || 'left',
  } as React.CSSProperties;

  // Outer container is positioned based on the transformed coordinates (screen space)
  const containerStyle: React.CSSProperties = {
    left: `${overlay.x * 100}%`,
    top: `${overlay.y * 100}%`,
    width: `${overlay.width * 100}%`,
    height: overlay.height ? `${overlay.height * 100}%` : 'auto',
    // Interactions
    pointerEvents: isTextMode ? 'auto' : 'none',
    cursor: isTextMode ? 'move' : 'default',
    ...cssVars
  };

  const contentStyle: React.CSSProperties = {
    textAlign: overlay.textAlign || 'left',
    whiteSpace: 'pre-wrap', // Important for contentEditable to behave like textarea
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    // Apply font family and size, but AVOID fontWeight/fontStyle to let execCommand (<b>, <i>) take precedence
    fontFamily: getCssFontFamily(overlay.fontFamily),
    fontSize: `${overlay.fontSize || 12}px`,
    color: overlay.color || '#000000',
  };

  const htmlContent = isEditing ? draftText : (overlay.html || overlay.text);

  return (
    <div
      onMouseDown={isTextMode ? handleMouseDown : undefined}
      onDoubleClick={(e) => { 
        if (isTextMode) {
          e.stopPropagation(); 
          onEnterEdit(); 
        }
      }}
      className={`pdf-text-overlay-container ${isSelected && isTextMode ? 'is-selected' : ''} ${isEditing ? 'is-editing' : ''}`}
      style={containerStyle}
    >
      <div 
        className={`relative w-full h-full group ${isEditing ? '' : (isTextMode ? 'cursor-move' : 'cursor-default')}`}
      >
          {isEditing ? (
            <div className="relative w-full h-full">
               <div
                 ref={editorRef}
                 contentEditable
                 suppressContentEditableWarning
                 onInput={handleInput}
                 onKeyDown={handleKeyDown}
                 className="pdf-text-editor"
                 style={contentStyle}
                 onMouseDown={(e) => e.stopPropagation()}
                 dangerouslySetInnerHTML={{ __html: draftText }}
               />

               {isEditing && (
                 <>
                  <div className="resize-handle top-left" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
                  <div className="resize-handle top-right" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                  <div className="resize-handle bottom-left" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                  <div className="resize-handle bottom-right" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
                  <div className="resize-handle top-center" onMouseDown={(e) => handleResizeStart(e, 'top-center')} />
                  <div className="resize-handle bottom-center" onMouseDown={(e) => handleResizeStart(e, 'bottom-center')} />
                  <div className="resize-handle left-center" onMouseDown={(e) => handleResizeStart(e, 'left-center')} />
                  <div className="resize-handle right-center" onMouseDown={(e) => handleResizeStart(e, 'right-center')} />
                 </>
               )}

               <div className="absolute -top-10 left-0 flex items-center space-x-1 bg-white dark:bg-[#323130] rounded shadow-lg p-1 border border-gray-200 dark:border-gray-600 z-50 pointer-events-auto cursor-default">
                 <button onClick={(e) => { e.stopPropagation(); onApplyEdit(); }} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 rounded">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
            </div>
          ) : (
             <div 
                className="pdf-text-overlay select-none h-full" 
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: overlay.html || overlay.text || '' }}
             />
          )}
      </div>
    </div>
  );
};

interface EditableImageOverlayProps {
  overlay: EditableOverlay;
  pageContainerRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onChangeBounds: (x: number, y: number, w: number, h: number) => void;
}

const EditableImageOverlay: React.FC<EditableImageOverlayProps> = ({
  overlay,
  pageContainerRef,
  isSelected,
  onSelect,
  onDelete,
  onChangeBounds
}) => {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    direction: string;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    if (!pageContainerRef.current) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.x,
      initialY: overlay.y,
      isDragging: false
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !pageContainerRef.current) return;

      const { startX, startY, initialX, initialY } = dragRef.current;
      const rect = pageContainerRef.current.getBoundingClientRect();

      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      if (!dragRef.current.isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        dragRef.current.isDragging = true;
      }

      if (dragRef.current.isDragging) {
        const deltaXPercent = deltaX / rect.width;
        const deltaYPercent = deltaY / rect.height;

        const newX = Math.max(0, Math.min(0.99, initialX + deltaXPercent));
        const newY = Math.max(0, Math.min(0.99, initialY + deltaYPercent));

        onChangeBounds(newX, newY, overlay.width, overlay.height || 0);
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!pageContainerRef.current) return;
    
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlay.x,
      initialY: overlay.y,
      initialW: overlay.width,
      initialH: overlay.height || 0.1,
      direction
    };

    const handleResizeMove = (ev: MouseEvent) => {
      if (!resizeRef.current || !pageContainerRef.current) return;

      const { startX, startY, initialX, initialY, initialW, initialH, direction } = resizeRef.current;
      const rect = pageContainerRef.current.getBoundingClientRect();

      const dx = (ev.clientX - startX) / rect.width;
      
      const aspectRatio = initialH / initialW;

      let newX = initialX;
      let newY = initialY;
      let newW = initialW;
      let newH = initialH;

      // Aspect Ratio Preserving Resize
      if (direction === 'bottom-right') {
        newW = initialW + dx;
        if (newW < 0.05) newW = 0.05;
        newH = newW * aspectRatio;
      } else if (direction === 'bottom-left') {
        newW = initialW - dx;
        if (newW < 0.05) newW = 0.05;
        newH = newW * aspectRatio;
        newX = initialX + (initialW - newW);
      } else if (direction === 'top-right') {
        newW = initialW + dx;
        if (newW < 0.05) newW = 0.05;
        newH = newW * aspectRatio;
        newY = initialY + (initialH - newH);
      } else if (direction === 'top-left') {
        newW = initialW - dx;
        if (newW < 0.05) newW = 0.05;
        newH = newW * aspectRatio;
        newX = initialX + (initialW - newW);
        newY = initialY + (initialH - newH);
      }
      
      onChangeBounds(newX, newY, newW, newH);
    };

    const handleResizeUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
  };

  const containerStyle: React.CSSProperties = {
    left: `${overlay.x * 100}%`,
    top: `${overlay.y * 100}%`,
    width: `${overlay.width * 100}%`,
    height: overlay.height ? `${overlay.height * 100}%` : 'auto',
    position: 'absolute',
    cursor: 'move',
    pointerEvents: 'auto'
  };

  return (
    <div 
      style={containerStyle}
      onMouseDown={handleMouseDown}
      className={`group ${isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:ring-1 hover:ring-blue-300'}`}
    >
      <img 
        src={overlay.dataUrl} 
        alt="Signature" 
        className="w-full h-full object-contain pointer-events-none select-none"
      />
      
      {isSelected && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-50"
            title="Delete Signature"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="resize-handle top-left" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
          <div className="resize-handle top-right" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
          <div className="resize-handle bottom-left" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
          <div className="resize-handle bottom-right" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
        </>
      )}
    </div>
  );
};

const PdfViewer: React.FC<PdfViewerProps> = ({ 
  file, 
  annotations,
  patches,
  imageAnnotations = [],
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  selectedAnnotationId,
  onAddPatch,
  onUpdatePatch,
  onDeletePatch,
  onSelectPatch,
  selectedPatchId,
  onAddImageAnnotation,
  onUpdateImageAnnotation,
  onDeleteImageAnnotation,
  isTextMode,
  currentStyle,
  rotation,
  currentPage,
  onPageChange,
  pendingSignature,
  onPlaceSignature
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  // draftText now holds HTML string
  const [draftText, setDraftText] = useState('');
  const [draftPlainText, setDraftPlainText] = useState('');
  
  // Selection state for images
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Auto-place signature when pendingSignature changes
  useEffect(() => {
    if (pendingSignature && pageContainerRef.current) {
      const rect = pageContainerRef.current.getBoundingClientRect();
      const img = new Image();
      img.onload = () => {
         const aspectRatio = img.width / img.height;
         // Default width 150px or 20% of page
         const baseWidthPx = 150;
         const baseHeightPx = baseWidthPx / aspectRatio;
         
         const normW = baseWidthPx / rect.width;
         const normH = baseHeightPx / rect.height;
         
         // Center on page
         const finalX = (1 - normW) / 2;
         const finalY = (1 - normH) / 2;
         
         const original = inverseTransformRect(finalX, finalY, normW, normH, rotation);
         const newId = `sig-${Date.now()}`;
         
         if (onAddImageAnnotation) {
           onAddImageAnnotation({
             id: newId,
             page: currentPage,
             x: original.x,
             y: original.y,
             width: original.w,
             height: original.h,
             dataUrl: pendingSignature
           });
           
           if (onPlaceSignature) onPlaceSignature();
           
           setSelectedImageId(newId);
           onSelectAnnotation(null);
           onSelectPatch(null);
         }
      };
      img.src = pendingSignature;
    }
  }, [pendingSignature, currentPage, onAddImageAnnotation, onPlaceSignature, onSelectAnnotation, onSelectPatch, rotation]);

  const pageOverlays = useMemo<EditableOverlay[]>(() => {
    const anns: EditableOverlay[] = annotations
      .filter(a => a.page === currentPage)
      .map(a => {
        const transformed = transformRect(a.x, a.y, a.width || 0.32, a.height || 0.05, rotation);
        return {
          id: a.id,
          fileId: file?.id || '',
          page: a.page,
          x: transformed.x,
          y: transformed.y,
          width: transformed.w,
          height: transformed.h,
          text: a.text,
          html: a.html,
          kind: 'annotation',
          sourceId: a.id,
          fontFamily: a.fontFamily,
          fontSize: a.fontSize,
          bold: a.bold,
          italic: a.italic,
          underline: a.underline,
          strike: a.strike,
          color: a.color,
          fontWeight: a.fontWeight,
          fontStyle: a.fontStyle,
          textAlign: a.textAlign
        };
      });

    const pts: EditableOverlay[] = patches
      .filter(p => p.page === currentPage)
      .map(p => {
        const transformed = transformRect(p.bbox.x, p.bbox.y, p.bbox.width, p.bbox.height, rotation);
        return {
          id: p.id,
          fileId: file?.id || '',
          page: p.page,
          x: transformed.x,
          y: transformed.y,
          width: transformed.w,
          height: transformed.h,
          text: p.newText,
          html: p.html,
          kind: 'patch',
          sourceId: p.id,
          fontFamily: p.fontFamily,
          fontSize: p.fontSize,
          bold: p.bold,
          italic: p.italic,
          underline: p.underline,
          strike: p.strike,
          color: p.color,
          fontWeight: p.fontWeight,
          fontStyle: p.fontStyle,
          textAlign: p.textAlign
        };
      });

    const imgs: EditableOverlay[] = imageAnnotations
      .filter(img => img.page === currentPage)
      .map(img => {
        const transformed = transformRect(img.x, img.y, img.width, img.height, rotation);
        return {
          id: img.id,
          fileId: file?.id || '',
          page: img.page,
          x: transformed.x,
          y: transformed.y,
          width: transformed.w,
          height: transformed.h,
          dataUrl: img.dataUrl,
          kind: 'image',
          sourceId: img.id
        };
      });
    
    return [...pts, ...anns, ...imgs];
  }, [annotations, patches, imageAnnotations, currentPage, file, rotation]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = pageContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';

    const currentPatches = patches.filter(p => p.page === currentPage);
    
    currentPatches.forEach(p => {
        // Transform patch bbox to match rotation
        const transformed = transformRect(p.bbox.x, p.bbox.y, p.bbox.width, p.bbox.height, rotation);
        
        const x = transformed.x * canvas.width;
        const y = transformed.y * canvas.height;
        const w = transformed.w * canvas.width;
        const h = transformed.h * canvas.height;
        
        ctx.fillRect(x, y, w, h);
    });

  }, [patches, currentPage, rotation]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    window.addEventListener('resize', redrawCanvas);
    return () => window.removeEventListener('resize', redrawCanvas);
  }, [redrawCanvas]);


  useEffect(() => {
    if (file?.data) {
      setIsLoading(true);
      setLoadProgress(0);
      const blob = new Blob([file.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setFileUrl(null);
      setNumPages(null);
      setIsLoading(false);
    }
  }, [file]);

  // Reset selected signature when file changes
  useEffect(() => {
    setSelectedImageId(null);
  }, [file?.id]);

  useEffect(() => {
    const selectedId = selectedAnnotationId || selectedPatchId;
    if (selectedId && selectedId !== editingId) {
       setEditingId(null); 
    } else if (!selectedId) {
       setEditingId(null);
    }
    
    // Clear image selection if others are selected
    if (selectedAnnotationId || selectedPatchId) {
      setSelectedImageId(null);
    }
  }, [selectedAnnotationId, selectedPatchId]);
  
  // Clear text selection if image is selected
  useEffect(() => {
    if (selectedImageId) {
      onSelectAnnotation(null);
      onSelectPatch(null);
    }
  }, [selectedImageId]);

  function onDocumentLoadProgress({ loaded, total }: { loaded: number; total: number }) {
    if (total > 0) {
      setLoadProgress((loaded / total) * 100);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    setTimeout(redrawCanvas, 100);
  }

  function onDocumentLoadError() {
    setIsLoading(false);
  }

  const handlePageClick = (e: React.MouseEvent) => {
    // Note: Signature auto-placement is now handled via useEffect above.
    // Manual placement logic removed.

    if (isTextMode && (e.target as HTMLElement).tagName === 'SPAN') {
      const targetSpan = e.target as HTMLElement;
      if (targetSpan.closest('.react-pdf__Page__textContent') && pageContainerRef.current) {
        e.stopPropagation();
        
        const pageRect = pageContainerRef.current.getBoundingClientRect();
        const spanRect = targetSpan.getBoundingClientRect();

        // Calculate screen-space coordinates
        const screenX = (spanRect.left - pageRect.left) / pageRect.width;
        const screenY = (spanRect.top - pageRect.top) / pageRect.height;
        const screenW = spanRect.width / pageRect.width;
        const screenH = spanRect.height / pageRect.height;

        // Inverse transform to get original data coordinates
        const originalCoords = inverseTransformRect(screenX, screenY, screenW, screenH, rotation);

        // Detect Font Styles
        const detectedStyle = detectFontStyle(targetSpan);

        const patch: EditTextPatch = {
          id: `patch-${Date.now()}`,
          fileId: file!.id,
          page: currentPage,
          bbox: { 
             x: originalCoords.x, 
             y: originalCoords.y, 
             width: originalCoords.w, 
             height: originalCoords.h 
          },
          originalText: targetSpan.innerText,
          newText: targetSpan.innerText,
          html: targetSpan.innerText, // Init HTML same as text
          ...currentStyle,
          ...detectedStyle // Apply detected styles
        };

        onAddPatch(patch);
        onSelectPatch(patch.id);
        onSelectAnnotation(null);
        setEditingId(patch.id);
        setDraftText(patch.html || patch.newText);
        setDraftPlainText(patch.newText);
        return;
      }
    }

    const target = e.target as HTMLElement;
    if (
      target.closest('.pdf-text-overlay-container')
    ) {
      return; 
    }

    // Deselect Image if clicking empty space
    setSelectedImageId(null);

    if (!isTextMode) {
      onSelectAnnotation(null);
      onSelectPatch(null);
      return;
    }

    if (pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        const screenX = (e.clientX - rect.left) / rect.width;
        const screenY = (e.clientY - rect.top) / rect.height;

        const defaultWidth = 260 / rect.width;

        // Map click to original coordinate space
        const originalCoords = inverseTransformRect(screenX, screenY, defaultWidth, 0.05, rotation);

        const newAnnotation: TextAnnotation = {
          id: `ann-${Date.now()}`,
          page: currentPage,
          x: originalCoords.x,
          y: originalCoords.y,
          width: originalCoords.w,
          // We let height be auto usually, but if rotated, dimensions might matter
          text: "New Text",
          html: "New Text",
          ...currentStyle
        };

        onAddAnnotation(newAnnotation);
        onSelectAnnotation(newAnnotation.id);
        onSelectPatch(null);
        setEditingId(newAnnotation.id);
        setDraftText(newAnnotation.html || newAnnotation.text);
        setDraftPlainText(newAnnotation.text);
    }
  };

  const handleApplyEdit = () => {
    // Save the raw HTML into 'html' and stripped text into 'text'
    // This allows mixed formatting to persist while having fallback
    const html = draftText;
    const cleanText = normalizeEditedText(draftText); // Or use draftPlainText if tracking sync
    
    if (editingId) {
      if (annotations.some(a => a.id === editingId)) {
        onUpdateAnnotation(editingId, { text: cleanText, html: html });
      } else if (patches.some(p => p.id === editingId)) {
        onUpdatePatch(editingId, { newText: cleanText, html: html });
      }
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    if (editingId) {
      if (annotations.some(a => a.id === editingId)) {
        onDeleteAnnotation(editingId);
      } else if (patches.some(p => p.id === editingId)) {
        onDeletePatch(editingId);
      }
      setEditingId(null);
      onSelectAnnotation(null);
      onSelectPatch(null);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 bg-[#faf9f8] dark:bg-[#1b1a19] flex flex-items justify-center items-center flex-col transition-colors">
        <div className="p-12 bg-white dark:bg-[#252423] rounded-xl shadow-lg border border-[#e1dfdd] dark:border-[#3b3a39] flex flex-col items-center max-w-md text-center">
           <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-[#0078d4] dark:text-blue-400">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
             </svg>
           </div>
          <h3 className="text-xl font-bold text-[#323130] dark:text-[#f3f2f1] mb-2">Workspace Ready</h3>
          <p className="text-xs text-[#605e5c] dark:text-[#a19f9d] mb-6">
            Upload your PDF documents to begin. Your files are processed locally.
          </p>
          <button 
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            className="bg-[#0078d4] dark:bg-indigo-600 text-white px-6 py-2 rounded-md font-semibold text-sm shadow-md hover:bg-[#106ebe] dark:hover:bg-indigo-700 transition-all"
          >
            Choose Files
          </button>
        </div>
      </div>
    );
  }

  const isRealData = !!file.data;

  return (
    <div className="flex-1 bg-[#888] dark:bg-[#111111] flex flex-col relative overflow-hidden transition-colors">
      <div className="h-10 bg-white dark:bg-[#252423] border-b border-[#e1dfdd] dark:border-[#3b3a39] flex items-center px-4 justify-between z-10 transition-colors flex-shrink-0">
         <div className="flex items-center space-x-2">
           <svg className="w-4 h-4 text-[#f40f02] dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
             <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
           </svg>
           <span className="text-sm font-semibold text-[#323130] dark:text-[#f3f2f1] truncate max-w-[300px]">{file?.name}</span>
           <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${isRealData ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
             {isRealData ? 'Live Data' : 'Mock Preview'}
           </span>
           {patches.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {patches.length} Edits
              </span>
           )}
           {rotation > 0 && (
             <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {rotation}° View
              </span>
           )}
         </div>
         <div className="flex items-center space-x-4">
           <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Size: {file?.size || 'Unknown'} | Modified: {file?.modifiedAt || 'N/A'}
           </div>
         </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex flex-col items-center custom-scrollbar relative">
        {isLoading && (
          <div className="pdf-loading-overlay">
            <div className="pdf-loading-box">
              <div className="pdf-loading-bar">
                {loadProgress !== null && (
                  <div style={{ width: `${loadProgress}%` }}></div>
                )}
              </div>
              <div className="pdf-loading-text">
                {file ? `Loading "${file.name}"...` : "Loading PDF..."}
              </div>
            </div>
          </div>
        )}

        {fileUrl ? (
          <div className="shadow-2xl flex-shrink-0 mb-20 bg-white relative select-none">
            <div 
              ref={pageContainerRef}
              className="relative"
              onClick={handlePageClick}
              style={{ cursor: isTextMode ? 'text' : 'default' }}
            >
              <canvas ref={canvasRef} className="pdf-canvas-overlay" />

              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadProgress={onDocumentLoadProgress}
                onLoadError={onDocumentLoadError}
                loading={null}
                rotate={rotation}
              >
                <Page 
                  pageNumber={currentPage} 
                  width={816}
                  renderTextLayer={true} 
                  renderAnnotationLayer={false}
                  rotate={rotation}
                />
              </Document>

              {pageOverlays.map(overlay => {
                if (overlay.kind === 'image') {
                   return (
                     <EditableImageOverlay
                        key={overlay.id}
                        overlay={overlay}
                        pageContainerRef={pageContainerRef}
                        isSelected={selectedImageId === overlay.id}
                        onSelect={() => setSelectedImageId(overlay.id)}
                        onDelete={() => onDeleteImageAnnotation && onDeleteImageAnnotation(overlay.id)}
                        onChangeBounds={(x, y, w, h) => {
                           const original = inverseTransformRect(x, y, w, h, rotation);
                           if (onUpdateImageAnnotation) {
                               onUpdateImageAnnotation(overlay.id, {
                                   x: original.x,
                                   y: original.y,
                                   width: original.w,
                                   height: original.h
                               });
                           }
                        }}
                     />
                   );
                }

                const isSelected = selectedAnnotationId === overlay.id || selectedPatchId === overlay.id;
                const isEditing = editingId === overlay.id;
                
                return (
                  <EditableTextOverlay
                    key={overlay.id}
                    overlay={overlay}
                    pageContainerRef={pageContainerRef}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    draftText={isEditing ? draftText : (overlay.text || '')}
                    onSelect={() => {
                        if (overlay.kind === 'annotation') {
                            onSelectAnnotation(overlay.id);
                            onSelectPatch(null);
                        } else {
                            onSelectPatch(overlay.id);
                            onSelectAnnotation(null);
                        }
                    }}
                    onEnterEdit={() => {
                        setEditingId(overlay.id);
                        setDraftText(overlay.html || overlay.text || '');
                    }}
                    onChangeBounds={(x, y, w, h) => {
                        // Transform user changes back to original Data Coordinates
                        const original = inverseTransformRect(x, y, w, h, rotation);

                        if (overlay.kind === 'annotation') {
                            onUpdateAnnotation(overlay.id, { 
                                x: original.x, 
                                y: original.y, 
                                width: original.w, 
                                height: original.h 
                            });
                        } else {
                            const patch = patches.find(p => p.id === overlay.id);
                            if (patch) {
                                onUpdatePatch(overlay.id, { 
                                    bbox: { ...patch.bbox, x: original.x, y: original.y, width: original.w, height: original.h }
                                });
                            }
                        }
                    }}
                    onChangeText={(html, plainText) => {
                       setDraftText(html);
                       setDraftPlainText(plainText);
                    }}
                    onApplyEdit={handleApplyEdit}
                    onCancelEdit={handleCancelEdit}
                    rotation={rotation}
                    isTextMode={isTextMode}
                  />
                );
              })}
            </div>
          </div>
        ) : (
           <div className="bg-white dark:bg-[#252423] shadow-2xl w-[8.5in] h-[11in] flex-shrink-0 relative overflow-hidden border border-gray-200 dark:border-[#3b3a39]">
              {/* Mock content */}
              <div className="absolute inset-0 bg-gray-50/10 flex items-center justify-center z-20 pointer-events-none">
                <div className="transform -rotate-45 text-4xl font-black text-gray-100 dark:text-gray-900 opacity-20 uppercase tracking-[2rem] select-none text-center">
                  MOCK PREVIEW<br/><span className="text-xl tracking-[0.5rem]">UPLOAD FILE TO VIEW</span>
                </div>
              </div>
              <div className="p-16 flex flex-col h-full space-y-6">
                 <div className="mt-12 w-full border-t border-gray-100 dark:border-[#3b3a39] pt-8 flex-1">
                  <div className="space-y-4">
                     <div className="h-32 bg-gray-50 dark:bg-[#1b1a19] border border-dashed border-gray-200 dark:border-[#3b3a39] rounded-lg flex items-center justify-center text-[#a19f9d] text-xs px-8 text-center">
                       This is a placeholder. Please upload a real PDF file to see actual content and use AI features.
                    </div>
                  </div>
               </div>
            </div>
           </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-gray-900/90 dark:bg-black/80 backdrop-blur-md rounded-full px-6 py-3 shadow-2xl space-x-6 border border-white/10 transition-all hover:bg-black z-20">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="text-white hover:text-blue-400 disabled:text-gray-600 transition-colors p-1 active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex flex-col items-center min-w-[100px] select-none">
           <span className="text-white text-[9px] font-black tracking-widest opacity-60">PAGE</span>
           <span className="text-white text-sm font-bold">{currentPage} <span className="text-white/40 font-normal">OF</span> {numPages || '--'}</span>
        </div>
        <button 
          onClick={() => onPageChange(Math.min(numPages || currentPage, currentPage + 1))}
          disabled={!!numPages && currentPage >= numPages}
          className="text-white hover:text-blue-400 disabled:text-gray-600 transition-colors p-1 active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;