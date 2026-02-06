
export type FileType = 'folder' | 'pdf';
export type ThemeType = 'win311' | 'win95' | 'win98' | 'winxp' | 'vista' | 'win11';

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileType;
  children?: FileSystemItem[];
  parentId?: string;
  size?: string;
  modifiedAt?: string;
  data?: Uint8Array; // Real binary data stored in-memory
}

export interface AiFields {
  documentType: string;
  parties: string[];
  amounts: string[];
  dates: string[];
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export interface TextAnnotation {
  id: string;
  page: number; // 1-based index
  x: number;  // normalized 0–1
  y: number;  // normalized 0–1
  width?: number; // normalized 0–1
  height?: number; // normalized 0–1
  text: string;
  html?: string; // Rich text HTML content
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontSize: number;
  color: string; // hex
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface ImageAnnotation {
  id: string;
  page: number; // 1-based index
  x: number;  // normalized 0–1
  y: number;  // normalized 0–1
  width: number; // normalized 0–1
  height: number; // normalized 0–1
  dataUrl: string;
}

export interface EditTextPatch {
  id: string;
  fileId: string;
  page: number; // 1-based index
  // Bounding box normalized 0-1 relative to page width/height
  bbox: { 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
  }; 
  originalText: string;
  newText: string;
  html?: string; // Rich text HTML content
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontSize: number;
  color: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface AppState {
  activeFile: FileSystemItem | null;
  selectedFileIds: Set<string>; // For multi-select merge
  expandedFolders: Set<string>;
  aiPanelOpen: boolean;
  aiTab: 'summary' | 'fields';
  // AI Specific State
  aiSummary: SummaryResult | null;
  aiFields: AiFields | null;
  aiLoading: "summary" | "fields" | null;
  aiError: string | null;
}

export type WorkspaceState = {
  fileTree: FileSystemItem[];
  // Note: In this app, binary data is stored within fileTree items, 
  // but we include this map to satisfy the requirement if needed, 
  // or we can treat it as a derived view for the history snapshot.
  pdfBytesMap: Map<string, Uint8Array>; 
  annotationsByFile: Record<string, TextAnnotation[]>;
  imageAnnotationsByFile: Record<string, ImageAnnotation[]>;
  textPatchesByFile: Record<string, EditTextPatch[]>;
};
