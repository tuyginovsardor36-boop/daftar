import {
  CustomAlphabetMap,
  FONT_MAP,
  GRID_SIZE,
  GRID_START_X,
  GRID_START_Y,
  GridRowSpan,
  HEADER_HEIGHT,
  LINE_SPACING,
  MARGIN_X,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PaperStyle,
  PasteInspectionMeta,
  TextFont,
} from '../types/notebook';
import { renderCustomHandwritingText } from './notebookRenderer';

export function normalizePastedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

export function analyzePasteHeuristics(text: string, isPasted = true): PasteInspectionMeta {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = trimmed ? trimmed.split('\n').length : 0;
  const hasUrlOrPromo = /(https?:\/\/|t\.me\/|www\.|subscribe|click here|promo)/i.test(trimmed);
  const repeatedChars = /(.)\1{6,}/.test(trimmed);
  const aiMarkers =
    /(xulosa qilib aytganda|shuningdek|birinchidan.*ikkinchidan|albatta, men sizga|ushbu maqolada|in conclusion|furthermore|moreover)/i.test(
      trimmed
    );

  let aiProbability = isPasted ? 34 : 8;
  if (words > 45 && isPasted) aiProbability += 20;
  if (aiMarkers) aiProbability += 28;
  if (hasUrlOrPromo || repeatedChars) aiProbability += 24;
  aiProbability = Math.min(96, Math.max(4, aiProbability));

  let status: PasteInspectionMeta['status'] = 'human_verified';
  let verdictLabel = 'Anti-AI: Toza nusxa';
  let stampText = 'ANTI-AI TASDIQLANDI';
  let summary = `Nusxalangan matn (${words} so‘z, ${lines} qator) tekshirildi.`;

  if (hasUrlOrPromo || repeatedChars) {
    status = 'spam_flagged';
    verdictLabel = 'Anti-Spam: Shubhali matn';
    stampText = 'ANTI-SPAM NAZORATI';
    summary = 'Matnda havola yoki takroriy spam belgilari aniqlandi.';
  } else if (aiProbability >= 52) {
    status = 'pasted_ai_detected';
    verdictLabel = 'Anti-AI: Nusxa / AI ehtimoli';
    stampText = 'ANTI-AI: PASTE PECHATI';
    summary = `Nusxalangan matn (${words} so‘z) uchun Anti-AI nazorati qayd etildi (${aiProbability}%).`;
  }

  return {
    isPasted,
    pastedAt: Date.now(),
    charCount: trimmed.length,
    status,
    aiProbability,
    verdictLabel,
    summary,
    stampText,
  };
}

export function getPaperTextGeometry(
  paperStyle: PaperStyle,
  gridRowSpan: GridRowSpan,
  font: TextFont
): {
  leftX: number;
  rightLimit: number;
  fullWidth: number;
  firstRowY: number;
  rowHeight: number;
  defaultFontSize: number;
} {
  const isHand = font === 'handwriting' || font === 'custom';

  if (paperStyle === 'grid') {
    const rowHeight = gridRowSpan * GRID_SIZE;
    const leftX = GRID_START_X + GRID_SIZE; // 72
    const rightLimit = 740;
    const defaultFontSize = gridRowSpan === 1 ? (isHand ? 20 : 14) : isHand ? 26 : 18;
    return {
      leftX,
      rightLimit,
      fullWidth: rightLimit - leftX,
      firstRowY: GRID_START_Y,
      rowHeight,
      defaultFontSize,
    };
  }

  if (paperStyle === 'poetry' || paperStyle === 'poetry_ornate') {
    const leftX = 96;
    const rightLimit = PAGE_WIDTH - 64; // 730
    return {
      leftX,
      rightLimit,
      fullWidth: rightLimit - leftX,
      firstRowY: HEADER_HEIGHT,
      rowHeight: LINE_SPACING,
      defaultFontSize: isHand ? 24 : 17,
    };
  }

  if (paperStyle === 'lined') {
    const leftX = MARGIN_X + 12;
    const rightLimit = PAGE_WIDTH - MARGIN_X - 12;
    return {
      leftX,
      rightLimit,
      fullWidth: rightLimit - leftX,
      firstRowY: HEADER_HEIGHT,
      rowHeight: LINE_SPACING,
      defaultFontSize: isHand ? 24 : 16,
    };
  }

  const leftX = 64;
  const rightLimit = PAGE_WIDTH - 36;
  return {
    leftX,
    rightLimit,
    fullWidth: rightLimit - leftX,
    firstRowY: HEADER_HEIGHT + 12,
    rowHeight: Math.round((isHand ? 26 : 16) * 1.42),
    defaultFontSize: isHand ? 26 : 16,
  };
}

let wrapCanvas: HTMLCanvasElement | null = null;

function wrapIntoVisualLines(
  text: string,
  maxWidth: number,
  font: TextFont,
  fontSize: number,
  customAlphabet: CustomAlphabetMap
): string[] {
  if (!wrapCanvas && typeof document !== 'undefined') {
    wrapCanvas = document.createElement('canvas');
  }
  const ctx = wrapCanvas?.getContext('2d');
  if (!ctx) {
    return text.split('\n');
  }

  if (font === 'custom') {
    // Use word-level splitting informed by custom glyph width approximation
    const lines: string[] = [];
    for (const para of text.split('\n')) {
      if (para === '') {
        lines.push('');
        continue;
      }
      const words = para.split(' ');
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const m = renderCustomHandwritingText(
          ctx,
          candidate,
          0,
          0,
          99999,
          fontSize,
          '#18181B',
          customAlphabet,
          true
        );
        if (m.caretX > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  ctx.font = `${font === 'handwriting' ? '600' : '400'} ${fontSize}px ${FONT_MAP[font].css}`;
  const lines: string[] = [];

  for (const para of text.split('\n')) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = '';
      }
      if (ctx.measureText(word).width > maxWidth) {
        for (const ch of word) {
          const cand = line + ch;
          if (ctx.measureText(cand).width > maxWidth && line) {
            lines.push(line);
            line = ch;
          } else {
            line = cand;
          }
        }
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Splits long pasted text into chunks: the first chunk fits from `firstPageStartY` down to
 * the bottom writing margin, and each overflow chunk fills a full subsequent notebook page.
 */
export function splitTextAcrossPages(params: {
  text: string;
  firstPageStartY: number;
  subsequentPageStartY: number;
  rowHeight: number;
  width: number;
  font: TextFont;
  fontSize: number;
  customAlphabet: CustomAlphabetMap;
}): string[] {
  const {
    text,
    firstPageStartY,
    subsequentPageStartY,
    rowHeight,
    width,
    font,
    fontSize,
    customAlphabet,
  } = params;

  const maxWidth = Math.max(80, width - 12);
  const visualLines = wrapIntoVisualLines(text, maxWidth, font, fontSize, customAlphabet);
  if (visualLines.length === 0) return [text];

  const bottomLimit = PAGE_HEIGHT - 44;
  const firstPageRows = Math.max(1, Math.floor((bottomLimit - firstPageStartY) / rowHeight));
  const nextPageRows = Math.max(1, Math.floor((bottomLimit - subsequentPageStartY) / rowHeight));

  const chunks: string[] = [];
  let cursor = 0;

  // First page slice
  const firstSlice = visualLines.slice(0, firstPageRows);
  chunks.push(firstSlice.join('\n').trimEnd());
  cursor += firstSlice.length;

  // Subsequent pages
  while (cursor < visualLines.length) {
    // Skip leading empty lines at top of new page
    while (cursor < visualLines.length && visualLines[cursor] === '') {
      cursor += 1;
    }
    if (cursor >= visualLines.length) break;
    const slice = visualLines.slice(cursor, cursor + nextPageRows);
    chunks.push(slice.join('\n').trimEnd());
    cursor += slice.length;
  }

  return chunks;
}
