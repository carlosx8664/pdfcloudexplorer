import { PDFDocument, degrees, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { TextAnnotation, EditTextPatch, ImageAnnotation } from "../types";
import { base64ToUint8Array } from "../utils/encoding";

export const mergePdfs = async (pdfBytesArray: Uint8Array[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfBytes of pdfBytesArray) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
};

export const splitPdf = async (pdfBytes: Uint8Array): Promise<Uint8Array[]> => {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const pageCount = originalPdf.getPageCount();
  const splitDocs: Uint8Array[] = [];

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    // Copy the specific page (indices must be valid)
    const [copiedPage] = await newDoc.copyPages(originalPdf, [i]);
    newDoc.addPage(copiedPage);
    const bytes = await newDoc.save();
    splitDocs.push(bytes);
  }

  return splitDocs;
};

/**
 * Rotates all pages in the PDF by 90 degrees clockwise.
 */
export const rotatePdf = async (pdfBytes: Uint8Array): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  pages.forEach((page) => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + 90));
  });

  return await pdfDoc.save();
};

export const downloadPdf = (data: Uint8Array, fileName: string) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to convert hex to rgb (0-1)
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

// Conversion: pixels to points
// 1 inch = 96 CSS pixels
// 1 inch = 72 PDF points
const pixelsToPoints = (px: number) => {
  return (px / 96) * 72;
};

// Helper to parse HTML string into styled segments for PDF generation
export const parseHTMLFormatting = (html: string) => {
  if (!html) return [];
  // Use browser's DOM parser to handle complex nesting and entities
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const segments: Array<{
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
  }> = [];
  
  const walk = (node: Node, bold = false, italic = false, underline = false, strike = false) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // Only add non-empty text segments
      if (text) {
        segments.push({
          text,
          bold,
          italic,
          underline,
          strike
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName;
      const style = element.style;
      
      // Determine styles based on tag names and CSS styles (execCommand uses both)
      const isBold = bold || tagName === 'B' || tagName === 'STRONG' || style.fontWeight === 'bold' || parseInt(style.fontWeight || '0') >= 600;
      const isItalic = italic || tagName === 'I' || tagName === 'EM' || style.fontStyle === 'italic';
      const isUnderline = underline || tagName === 'U' || style.textDecoration.includes('underline');
      const isStrike = strike || tagName === 'STRIKE' || tagName === 'S' || style.textDecoration.includes('line-through');
      
      Array.from(node.childNodes).forEach(child => 
        walk(child, isBold, isItalic, isUnderline, isStrike)
      );
    }
  };
  
  walk(div);
  return segments;
};

export const savePdfWithAnnotations = async (
  pdfBytes: Uint8Array, 
  annotations: TextAnnotation[],
  patches: EditTextPatch[] = [],
  pageRotations: Record<number, number> = {},
  imageAnnotations: ImageAnnotation[] = []
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Embed all standard fonts to support rich text variations
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const courierOblique = await pdfDoc.embedFont(StandardFonts.CourierOblique);
  const courierBoldOblique = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);

  // Helper to select the correct font variation based on base family and bold/italic flags
  const getFont = (family: string | undefined, bold: boolean | undefined, italic: boolean | undefined): PDFFont => {
    let fontBase;
    switch (family) {
      case 'Liberation Serif': fontBase = { regular: timesFont, bold: timesBold, italic: timesItalic, bi: timesBoldItalic }; break;
      case 'DejaVu Sans Mono': fontBase = { regular: courierFont, bold: courierBold, italic: courierOblique, bi: courierBoldOblique }; break;
      case 'Liberation Sans': 
      default: fontBase = { regular: helveticaFont, bold: helveticaBold, italic: helveticaOblique, bi: helveticaBoldOblique }; break;
    }

    if (bold && italic) return fontBase.bi;
    if (bold) return fontBase.bold;
    if (italic) return fontBase.italic;
    return fontBase.regular;
  };

  const pages = pdfDoc.getPages();

  // 0. Apply Page Rotations
  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    const rotation = pageRotations[pageNum];
    if (rotation !== undefined && rotation !== 0) {
      // Add rotation to the existing page rotation
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + rotation));
    }
  });

  // Internal helper to draw segments of text
  const drawSegments = (
    page: any,
    segments: any[],
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize: number,
    baseFontFamily: string | undefined,
    baseColor: any,
    alignment: string | undefined,
    paddingX: number,
    paddingY: number
  ) => {
    let currentX = x + paddingX;
    let currentY = y + h - paddingY - fontSize; // Baseline approximation

    // Calculate total width of the line to support alignment
    // (This simplified logic assumes single-line content for alignment)
    let totalLineWidth = 0;
    const measuredSegments = segments.map(seg => {
        const font = getFont(baseFontFamily, seg.bold, seg.italic);
        const width = font.widthOfTextAtSize(seg.text, fontSize);
        totalLineWidth += width;
        return { ...seg, width, font };
    });

    if (alignment === 'center') {
        currentX = x + (w / 2) - (totalLineWidth / 2);
    } else if (alignment === 'right') {
        currentX = x + w - paddingX - totalLineWidth;
    }

    // Draw each segment sequentially
    measuredSegments.forEach(seg => {
        page.drawText(seg.text, {
            x: currentX,
            y: currentY,
            size: fontSize,
            font: seg.font,
            color: baseColor
        });

        // Draw Underline
        if (seg.underline) {
             page.drawLine({
                start: { x: currentX, y: currentY - 2 },
                end: { x: currentX + seg.width, y: currentY - 2 },
                thickness: 1,
                color: baseColor,
            });
        }

        // Draw Strikethrough
        if (seg.strike) {
            page.drawLine({
                start: { x: currentX, y: currentY + (fontSize / 3) },
                end: { x: currentX + seg.width, y: currentY + (fontSize / 3) },
                thickness: 1,
                color: baseColor,
            });
        }

        currentX += seg.width;
    });
  };

  // Helper to handle mixed content (HTML vs Plain Text)
  const drawContent = (
    page: any,
    html: string | undefined,
    fallbackText: string,
    x: number,
    y: number,
    w: number,
    h: number,
    baseFontSize: number,
    baseFontFamily: string | undefined,
    baseColor: any,
    alignment: string | undefined,
    baseBold: boolean,
    baseItalic: boolean
  ) => {
    const fontSize = pixelsToPoints(baseFontSize);
    const paddingX = pixelsToPoints(6);
    const paddingY = pixelsToPoints(4);
    
    // Fallback if no HTML or if HTML parsing fails/is empty
    if (!html) {
        const segments = [{ text: fallbackText, bold: baseBold, italic: baseItalic, underline: false, strike: false }];
        drawSegments(page, segments, x, y, w, h, fontSize, baseFontFamily, baseColor, alignment, paddingX, paddingY);
        return;
    }

    const segments = parseHTMLFormatting(html);
    if (segments.length === 0) {
         // Fallback if HTML resulted in no text segments
         const segments = [{ text: fallbackText, bold: baseBold, italic: baseItalic, underline: false, strike: false }];
         drawSegments(page, segments, x, y, w, h, fontSize, baseFontFamily, baseColor, alignment, paddingX, paddingY);
         return;
    }

    drawSegments(page, segments, x, y, w, h, fontSize, baseFontFamily, baseColor, alignment, paddingX, paddingY);
  };


  // 1. Apply Text Patches (In-place editing)
  for (const patch of patches) {
    if (patch.page < 1 || patch.page > pages.length) continue;
    const page = pages[patch.page - 1];
    const { width, height } = page.getSize();

    // Calculate position and size in PDF coordinates
    const x = patch.bbox.x * width;
    const w = patch.bbox.width * width;
    const h = patch.bbox.height * height;
    const y = height - (patch.bbox.y * height) - h; 

    // A. "Whiteout" the original text
    page.drawRectangle({
      x: x, 
      y: y,
      width: w,
      height: h,
      color: rgb(1, 1, 1), 
    });

    // B. Draw rich text
    const color = patch.color ? hexToRgb(patch.color) : rgb(0, 0, 0);
    drawContent(
        page, 
        patch.html || patch.newText, 
        patch.newText, 
        x, y, w, h, 
        patch.fontSize || 12, 
        patch.fontFamily, 
        color, 
        patch.textAlign, 
        !!patch.bold, 
        !!patch.italic
    );
  }

  // 2. Apply Free Text Annotations
  for (const ann of annotations) {
    if (ann.page < 1 || ann.page > pages.length) continue;
    
    const page = pages[ann.page - 1];
    const { width, height } = page.getSize();
    
    const x = ann.x * width;
    const maxWidth = (ann.width || 0.32) * width;
    
    const fontSize = pixelsToPoints(ann.fontSize);
    const paddingX = pixelsToPoints(6);
    const paddingY = pixelsToPoints(4);
    const lineHeight = fontSize * 1.3;
    
    // Estimate Height for background
    const avgCharWidth = fontSize * 0.5;
    const textWidth = ann.text.length * avgCharWidth;
    const contentWidth = maxWidth - (paddingX * 2);
    const estimatedLines = Math.max(1, Math.ceil(textWidth / contentWidth));
    const estimatedHeight = (estimatedLines * lineHeight) + (paddingY * 2);

    const y = height - (ann.y * height) - estimatedHeight; 

    // Draw White Background
    page.drawRectangle({
        x: x,
        y: y,
        width: maxWidth,
        height: estimatedHeight,
        color: rgb(1, 1, 1)
    });

    const color = hexToRgb(ann.color);

    drawContent(
        page, 
        ann.html || ann.text, 
        ann.text, 
        x, y, maxWidth, estimatedHeight, 
        ann.fontSize, 
        ann.fontFamily, 
        color, 
        ann.textAlign, 
        !!ann.bold, 
        !!ann.italic
    );
  }

  // 3. Apply Image Annotations (Signatures)
  for (const imgAnn of imageAnnotations) {
    if (imgAnn.page < 1 || imgAnn.page > pages.length) continue;
    const page = pages[imgAnn.page - 1];
    const { width, height } = page.getSize();

    const x = imgAnn.x * width;
    const w = imgAnn.width * width;
    const h = imgAnn.height * height;
    const y = height - (imgAnn.y * height) - h;

    try {
      const imgBytes = base64ToUint8Array(imgAnn.dataUrl);
      
      // Determine image format (simple check)
      const header = imgBytes.slice(0, 4);
      let embeddedImage;
      
      // Check for PNG signature (89 50 4E 47)
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else {
        // Assume JPG
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: w,
        height: h
      });

    } catch (error) {
      console.error("Failed to embed image annotation:", error);
    }
  }

  return await pdfDoc.save();
};