import { jsPDF } from 'jspdf';
import {
  BindingStyle,
  CAPACITY_PRESETS,
  COVER_THEMES,
  CoverData,
  CoverEmblem,
  CoverLayoutStyle,
  CustomAlphabetMap,
  CustomGlyph,
  DeskTheme,
  FONT_MAP,
  FRAME_STYLE_PRESETS,
  GRID_SIZE,
  GRID_START_X,
  GRID_START_Y,
  GridRowSpan,
  HEADER_HEIGHT,
  LINE_SPACING,
  MARGIN_X,
  NotebookCapacity,
  NotebookPage,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAPER_TONE_COLORS,
  PaperStyle,
  PaperTone,
  SheetSide,
  StickerImage,
  Stroke,
  TextBlock,
  TextFont,
  getMetallicInkConfig,
} from '../types/notebook';

export interface AntiAiStampOptions {
  enabled: boolean;
  status: 'human_verified' | 'pasted_ai_detected' | 'spam_flagged';
  stampText: string;
  checkedDate: string;
  pastedCount: number;
  aiProbability?: number;
}

export interface RenderDocOptions {
  paperStyle: PaperStyle;
  gridRowSpan?: GridRowSpan;
  paperTone: PaperTone;
  bindingStyle: BindingStyle;
  deskTheme: DeskTheme;
  capacity?: NotebookCapacity;
  sheetSide?: SheetSide;
  customAlphabet?: CustomAlphabetMap;
  antiAiStamp?: AntiAiStampOptions;
}

export function snapToGridX(x: number): number {
  return Math.max(
    GRID_START_X,
    Math.min(
      PAGE_WIDTH - 120,
      GRID_START_X + Math.round((x - GRID_START_X) / GRID_SIZE) * GRID_SIZE
    )
  );
}

export function snapToGridY(y: number): number {
  return Math.max(
    GRID_START_Y,
    Math.min(
      PAGE_HEIGHT - 72,
      GRID_START_Y + Math.round((y - GRID_START_Y) / GRID_SIZE) * GRID_SIZE
    )
  );
}

export function snapToLinedY(y: number): number {
  return Math.max(
    HEADER_HEIGHT,
    Math.min(
      PAGE_HEIGHT - 72,
      HEADER_HEIGHT + Math.round((y - HEADER_HEIGHT) / LINE_SPACING) * LINE_SPACING
    )
  );
}

let measureCanvas: HTMLCanvasElement | null = null;

/**
 * Computes the vertical translateY shift (in px) so a <textarea> with line-height = rowHeight
 * aligns its alphabetic text baseline directly onto the bottom horizontal grid line (rowHeight - 1).
 */
export function getTextareaGridBaselineShift(
  font: TextFont,
  fontSize: number,
  rowHeight: number
): number {
  if (typeof document === 'undefined') return 0;
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
  }
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;

  ctx.font = `${font === 'handwriting' ? '600' : '400'} ${fontSize}px ${FONT_MAP[font].css}`;
  const metrics = ctx.measureText('Hygp');
  const fontAscent = metrics.fontBoundingBoxAscent || fontSize * 0.86;
  const fontDescent = metrics.fontBoundingBoxDescent || fontSize * 0.24;
  const cssBaseline = rowHeight / 2 + (fontAscent - fontDescent) / 2;
  return Number((rowHeight - 1 - cssBaseline).toFixed(2));
}

export interface ScreenshotCaptureOptions {
  includeDeskFrame: boolean;
  scale: number;
}

/**
 * Draws a single stroke onto a 2D canvas context.
 * Expects to be called on a dedicated transparent ink layer so 'eraser' uses destination-out safely.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const { points, tool, color, width, opacity } = stroke;
  if (!points || points.length === 0) return;

  const metallic = tool !== 'eraser' && tool !== 'highlighter' ? getMetallicInkConfig(color) : undefined;
  const isMetallic = Boolean((stroke.isMetallic || metallic) && tool !== 'eraser' && tool !== 'highlighter');

  ctx.save();
  ctx.lineJoin = 'round';

  const makeMetallicPaint = () => {
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x + 24;
    let maxY = points[0].y + 24;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const stops = metallic?.shimmerStops ?? [color, '#FFFBEB', color];
    const grad = ctx.createLinearGradient(minX, minY, maxX + 12, maxY + 12);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.28, stops[1]);
    grad.addColorStop(0.55, color);
    grad.addColorStop(0.78, stops[1]);
    grad.addColorStop(1, stops[2]);
    return grad;
  };

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
  } else if (tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity ?? 0.36;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'square';
    ctx.lineWidth = width;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity ?? 1;
    const paint = isMetallic ? makeMetallicPaint() : color;
    ctx.strokeStyle = paint;
    ctx.fillStyle = paint;
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    if (isMetallic) {
      ctx.shadowColor = metallic?.shimmerStops?.[1] ?? 'rgba(255,255,255,0.45)';
      ctx.shadowBlur = Math.max(1.5, width * 0.45);
    }
  }

  // Geometric shape tools
  if (tool === 'line' || tool === 'arrow') {
    const start = points[0];
    const end = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    if (tool === 'arrow') {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = Math.max(12, width * 4);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 7),
        end.y - headLen * Math.sin(angle - Math.PI / 7)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 7),
        end.y - headLen * Math.sin(angle + Math.PI / 7)
      );
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (tool === 'rect') {
    const start = points[0];
    const end = points[points.length - 1];
    ctx.beginPath();
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (tool === 'circle') {
    const start = points[0];
    const end = points[points.length - 1];
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Freehand strokes
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (tool === 'pencil') {
    // Authentic graphite pencil tooth + secondary soft grain pass
    const baseAlpha = opacity ?? 0.85;
    const strokeSmoothPath = (offsetX: number, offsetY: number, lw: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2 + offsetX;
        const midY = (points[i].y + points[i + 1].y) / 2 + offsetY;
        ctx.quadraticCurveTo(points[i].x + offsetX, points[i].y + offsetY, midX, midY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x + offsetX, last.y + offsetY);
      ctx.stroke();
      ctx.restore();
    };
    strokeSmoothPath(0, 0, Math.max(0.8, width * 0.88), baseAlpha * 0.72);
    strokeSmoothPath(0.65, 0.45, Math.max(0.6, width * 0.55), baseAlpha * 0.34);

    // Subtle paper grain stippling along pencil path
    ctx.save();
    ctx.fillStyle = color;
    const step = Math.max(1, Math.floor(points.length / 40));
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const gx = (((i * 23) % 7) - 3) * (width * 0.22);
      const gy = (((i * 41) % 7) - 3) * (width * 0.22);
      ctx.globalAlpha = baseAlpha * 0.22;
      ctx.fillRect(p.x + gx, p.y + gy, 1.1, 1.1);
    }
    ctx.restore();
  } else if (tool === 'pen' && points.length > 2) {
    // Variable-width ink feel using quadratic smoothing
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const next = points[i + 1];

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);
      const speedFactor = Math.max(0.72, Math.min(1.18, 1.15 - dist / 48));
      ctx.lineWidth = width * speedFactor;

      ctx.beginPath();
      if (i === 1) {
        ctx.moveTo(p0.x, p0.y);
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.lineTo(midX, midY);
      } else {
        const prevMidX = (points[i - 2].x + p0.x) / 2;
        const prevMidY = (points[i - 2].y + p0.y) / 2;
        const midX = next ? (p0.x + p1.x) / 2 : p1.x;
        const midY = next ? (p0.y + p1.y) / 2 : p1.y;
        ctx.moveTo(prevMidX, prevMidY);
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      ctx.stroke();
    }
  } else {
    // Ballpoint / Highlighter / Eraser smooth quadratic path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  // Deterministic metallic glitter specks for shimmering ink
  if (isMetallic) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    const stride = Math.max(3, Math.floor(points.length / 26));
    for (let i = 0; i < points.length; i += stride) {
      const pt = points[i];
      const offsetX = (((i * 17) % 5) - 2) * (width * 0.14);
      const offsetY = (((i * 31) % 5) - 2) * (width * 0.14);
      const r = Math.max(0.65, Math.min(1.6, width * 0.17));
      ctx.beginPath();
      ctx.arc(pt.x + offsetX, pt.y + offsetY, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws the realistic paper sheet background, fibers, ruled/grid/dot pattern, margin, and header/footer.
 */
export function drawPaperBase(
  ctx: CanvasRenderingContext2D,
  page: NotebookPage,
  pageIndex: number,
  totalPages: number,
  options: RenderDocOptions,
  skipHeaderText = false
): void {
  const palette = PAPER_TONE_COLORS[options.paperTone];

  // Paper base fill
  ctx.save();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  // Subtle organic paper grain (deterministic pseudo-random dots)
  ctx.fillStyle = options.paperTone === 'white' ? 'rgba(15,23,42,0.015)' : 'rgba(92,68,38,0.025)';
  let seed = 4219;
  for (let i = 0; i < 1400; i++) {
    seed = (seed * 16807) % 2147483647;
    const gx = (seed % PAGE_WIDTH);
    seed = (seed * 16807) % 2147483647;
    const gy = (seed % PAGE_HEIGHT);
    ctx.fillRect(gx, gy, 1.2, 1.2);
  }

  const sheetSide: SheetSide = options.sheetSide ?? 'right';

  // Spine crease shadow on the inner binding side of the paper
  const spineWidth = options.bindingStyle === 'spiral' ? 54 : options.bindingStyle === 'stitched' ? 42 : 18;
  if (sheetSide === 'left') {
    const spineGrad = ctx.createLinearGradient(PAGE_WIDTH - spineWidth, 0, PAGE_WIDTH, 0);
    spineGrad.addColorStop(0, 'rgba(24, 24, 27, 0)');
    spineGrad.addColorStop(0.65, 'rgba(24, 24, 27, 0.035)');
    spineGrad.addColorStop(1, 'rgba(24, 24, 27, 0.11)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(PAGE_WIDTH - spineWidth, 0, spineWidth, PAGE_HEIGHT);

    // Subtle left outer-edge highlight/depth
    const leftGrad = ctx.createLinearGradient(0, 0, 10, 0);
    leftGrad.addColorStop(0, 'rgba(24,24,27,0.035)');
    leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 10, PAGE_HEIGHT);
  } else {
    const spineGrad = ctx.createLinearGradient(0, 0, spineWidth, 0);
    spineGrad.addColorStop(0, 'rgba(24, 24, 27, 0.11)');
    spineGrad.addColorStop(0.35, 'rgba(24, 24, 27, 0.035)');
    spineGrad.addColorStop(1, 'rgba(24, 24, 27, 0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(0, 0, spineWidth, PAGE_HEIGHT);

    // Subtle right-edge paper highlight/depth
    const rightGrad = ctx.createLinearGradient(PAGE_WIDTH - 10, 0, PAGE_WIDTH, 0);
    rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rightGrad.addColorStop(1, 'rgba(24,24,27,0.035)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(PAGE_WIDTH - 10, 0, 10, PAGE_HEIGHT);
  }

  // Paper patterns
  if (options.paperStyle === 'lined') {
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    for (let y = HEADER_HEIGHT + LINE_SPACING; y < PAGE_HEIGHT - 44; y += LINE_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(PAGE_WIDTH, y + 0.5);
      ctx.stroke();
    }

    // Header double rule
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT - 3.5);
    ctx.lineTo(PAGE_WIDTH, HEADER_HEIGHT - 3.5);
    ctx.stroke();

    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT + 0.5);
    ctx.lineTo(PAGE_WIDTH, HEADER_HEIGHT + 0.5);
    ctx.stroke();

    // Paired crimson margins keep writing clear of both page edges.
    ctx.strokeStyle = palette.margin;
    ctx.lineWidth = 1.35;
    for (const marginLineX of [MARGIN_X + 0.5, PAGE_WIDTH - MARGIN_X - 0.5]) {
      ctx.beginPath();
      ctx.moveTo(marginLineX, 0);
      ctx.lineTo(marginLineX, PAGE_HEIGHT);
      ctx.stroke();
    }
  } else if (options.paperStyle === 'grid') {
    const step = GRID_SIZE;
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 0.85;
    const startX = GRID_START_X;
    const endX = PAGE_WIDTH - 28;
    const startY = GRID_START_Y;
    const endY = PAGE_HEIGHT - 44;

    for (let x = startX; x <= endX; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, startY);
      ctx.lineTo(x + 0.5, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.beginPath();
      ctx.moveTo(startX, y + 0.5);
      ctx.lineTo(endX, y + 0.5);
      ctx.stroke();
    }
    // Clean outer math margin frame
    ctx.strokeStyle = palette.margin;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(startX + 0.5, startY + 0.5, endX - startX - ((endX - startX) % step), endY - startY - ((endY - startY) % step));
  } else if (options.paperStyle === 'poetry' || options.paperStyle === 'poetry_ornate') {
    const isOrnate = options.paperStyle === 'poetry_ornate';
    // Soft warm sepia-gold lines for poetry stanzas
    ctx.strokeStyle = isOrnate ? 'rgba(146, 64, 14, 0.16)' : 'rgba(120, 93, 60, 0.18)';
    ctx.lineWidth = 1;
    for (let y = HEADER_HEIGHT + LINE_SPACING; y < PAGE_HEIGHT - 56; y += LINE_SPACING) {
      ctx.beginPath();
      ctx.moveTo(54, y + 0.5);
      ctx.lineTo(PAGE_WIDTH - 48, y + 0.5);
      ctx.stroke();
    }

    // Top golden header divider
    ctx.strokeStyle = isOrnate ? 'rgba(146, 64, 14, 0.34)' : 'rgba(146, 64, 14, 0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(54, HEADER_HEIGHT + 0.5);
    ctx.lineTo(PAGE_WIDTH - 48, HEADER_HEIGHT + 0.5);
    ctx.stroke();

    // Soft left poetic stanza indent line
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(86.5, HEADER_HEIGHT + 4);
    ctx.lineTo(86.5, PAGE_HEIGHT - 52);
    ctx.stroke();

    // Outer double decorative poetic border
    ctx.strokeStyle = isOrnate ? 'rgba(146, 64, 14, 0.38)' : 'rgba(120, 93, 60, 0.26)';
    ctx.lineWidth = isOrnate ? 1.5 : 1.1;
    ctx.strokeRect(42.5, 34.5, PAGE_WIDTH - 76, PAGE_HEIGHT - 68);
    if (isOrnate) {
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.22)';
      ctx.lineWidth = 0.85;
      ctx.strokeRect(48.5, 40.5, PAGE_WIDTH - 88, PAGE_HEIGHT - 80);

      // Corner rosette diamonds
      const corners: [number, number][] = [
        [45.5, 37.5],
        [PAGE_WIDTH - 36.5, 37.5],
        [45.5, PAGE_HEIGHT - 36.5],
        [PAGE_WIDTH - 36.5, PAGE_HEIGHT - 36.5],
      ];
      ctx.fillStyle = 'rgba(146, 64, 14, 0.42)';
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx - 5, cy);
        ctx.closePath();
        ctx.fill();
      }
      // Subtle center diamond on top rule
      const midX = (54 + PAGE_WIDTH - 48) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, HEADER_HEIGHT - 4);
      ctx.lineTo(midX + 5, HEADER_HEIGHT + 0.5);
      ctx.lineTo(midX, HEADER_HEIGHT + 5);
      ctx.lineTo(midX - 5, HEADER_HEIGHT + 0.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (options.paperStyle === 'dot') {
    const step = 24;
    ctx.fillStyle = palette.dot;
    for (let x = 60; x <= PAGE_WIDTH - 36; x += step) {
      for (let y = HEADER_HEIGHT + 8; y <= PAGE_HEIGHT - 48; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const titleX = MARGIN_X + 12;
  const rightMetaEdge =
    options.paperStyle === 'lined' ? PAGE_WIDTH - MARGIN_X - 12 : PAGE_WIDTH - 32;

  // Page header metadata (clean editorial typography)
  if (!skipHeaderText) {
    ctx.fillStyle = 'rgba(24, 24, 27, 0.56)';
    ctx.font = "500 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textBaseline = 'alphabetic';
    if (page.title) {
      ctx.fillStyle = 'rgba(24, 24, 27, 0.82)';
      ctx.font = "600 16px 'Lora', Georgia, serif";
      ctx.fillText(page.title, titleX, HEADER_HEIGHT - 16);
    }

    if (page.dateLabel) {
      ctx.fillStyle = 'rgba(24, 24, 27, 0.52)';
      ctx.font = "500 12px 'JetBrains Mono', monospace";
      const dateWidth = ctx.measureText(page.dateLabel).width;
      ctx.fillText(page.dateLabel, rightMetaEdge - dateWidth, HEADER_HEIGHT - 16);
    }
  }

  // Footer page numbering
  ctx.fillStyle = 'rgba(24, 24, 27, 0.42)';
  ctx.font = "500 11px 'JetBrains Mono', monospace";
  const pageNumLabel = `${String(pageIndex + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
  const numWidth = ctx.measureText(pageNumLabel).width;
  ctx.fillText(pageNumLabel, rightMetaEdge - numWidth, PAGE_HEIGHT - 20);

  ctx.restore();
}

/**
 * Draws realistic 3D spiral rings or stitched hardcover binding hardware on top of the left edge.
 */
export function drawBindingOverlay(
  ctx: CanvasRenderingContext2D,
  bindingStyle: BindingStyle,
  deskBgColor = '#D5CFC4'
): void {
  if (bindingStyle === 'clean') return;

  ctx.save();

  if (bindingStyle === 'stitched') {
    // Hardcover book spine lip on far left
    const coverGrad = ctx.createLinearGradient(0, 0, 22, 0);
    coverGrad.addColorStop(0, '#2B2623');
    coverGrad.addColorStop(0.65, '#3E3733');
    coverGrad.addColorStop(1, '#1C1917');
    ctx.fillStyle = coverGrad;
    ctx.fillRect(0, 0, 20, PAGE_HEIGHT);

    // Subtle metallic foil crease line
    ctx.strokeStyle = 'rgba(255, 245, 225, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15.5, 0);
    ctx.lineTo(15.5, PAGE_HEIGHT);
    ctx.stroke();

    // Sewn thread accents along crease
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    for (let y = 72; y < PAGE_HEIGHT - 60; y += 96) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(24, y + 18);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Spiral wire binding (26 punched holes + metallic double-loop wire rings)
  const holeCount = 24;
  const startY = 48;
  const endY = PAGE_HEIGHT - 48;
  const step = (endY - startY) / (holeCount - 1);

  for (let i = 0; i < holeCount; i++) {
    const cy = startY + i * step;
    const holeX = 24;

    // Punched hole inner drop shadow + desk peek
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(holeX, cy, 7.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = deskBgColor;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.25)';
    ctx.stroke();

    // Inner hole rim shadow
    ctx.beginPath();
    ctx.ellipse(holeX - 0.8, cy - 0.8, 6.5, 5.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.stroke();
    ctx.restore();

    // Cast shadow of metallic wire onto paper
    ctx.save();
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.22)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, cy + 3);
    ctx.quadraticCurveTo(10, cy + 5, 26, cy + 2.5);
    ctx.stroke();
    ctx.restore();

    // Metallic double-loop spiral ring
    const ringGrad = ctx.createLinearGradient(0, cy - 5, 0, cy + 5);
    ringGrad.addColorStop(0, '#52525B');
    ringGrad.addColorStop(0.35, '#F4F4F5');
    ringGrad.addColorStop(0.65, '#A1A1AA');
    ringGrad.addColorStop(1, '#3F3F46');

    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, cy - 2);
    ctx.bezierCurveTo(2, cy - 6, 16, cy - 5, 25, cy - 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, cy + 3.5);
    ctx.bezierCurveTo(2, cy + 0.5, 16, cy + 1, 25, cy + 3);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a single normalized CustomGlyph inside a target box at (x, y) with given boxSize and color.
 */
export function drawCustomGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: CustomGlyph,
  originX: number,
  originY: number,
  boxSize: number,
  color: string
): void {
  if (!glyph.strokes || glyph.strokes.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of glyph.strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    ctx.lineWidth = Math.max(1.25, stroke.width * boxSize);

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(originX + p.x * boxSize, originY + p.y * boxSize, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(originX + stroke.points[0].x * boxSize, originY + stroke.points[0].y * boxSize);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const curr = stroke.points[i];
      const next = stroke.points[i + 1];
      const midX = ((curr.x + next.x) / 2) * boxSize + originX;
      const midY = ((curr.y + next.y) / 2) * boxSize + originY;
      ctx.quadraticCurveTo(
        originX + curr.x * boxSize,
        originY + curr.y * boxSize,
        midX,
        midY
      );
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(originX + last.x * boxSize, originY + last.y * boxSize);
    ctx.stroke();
  }

  ctx.restore();
}

function getCharAdvance(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontSize: number,
  boxSize: number,
  customAlphabet: CustomAlphabetMap
): number {
  if (char === ' ') return fontSize * 0.42;
  const glyph = customAlphabet[char];
  if (glyph && glyph.strokes.length > 0) {
    const inkWidth = Math.max(0.18, glyph.maxX - glyph.minX);
    return (inkWidth + 0.14) * boxSize;
  }
  ctx.font = `600 ${fontSize}px ${FONT_MAP.handwriting.css}`;
  return ctx.measureText(char).width + 1;
}

/**
 * Draws or measures custom-drawn handwriting text with word wrapping.
 * When gridRowHeight is provided (24 or 48), aligns each line's baseline directly onto the grid line.
 */
export function renderCustomHandwritingText(
  ctx: CanvasRenderingContext2D,
  content: string,
  startX: number,
  startY: number,
  maxWidth: number,
  fontSize: number,
  color: string,
  customAlphabet: CustomAlphabetMap,
  dryRun = false,
  gridRowHeight?: number
): { height: number; caretX: number; caretY: number; lineHeight: number } {
  const lineHeight = gridRowHeight ?? Math.round(fontSize * 1.48);
  const boxSize = gridRowHeight
    ? gridRowHeight <= 24
      ? Math.min(fontSize * 1.32, 26)
      : Math.min(fontSize * 1.45, 44)
    : fontSize * 1.48;
  const paragraphs = content.split('\n');

  let cursorX = startX;
  let lineIndex = 0;

  const getLineBaselineY = (idx: number) => startY + (idx + 1) * lineHeight - 1;

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx];
    cursorX = startX;

    if (para.length > 0) {
      const tokens = para.split(/( )/);
      for (const token of tokens) {
        if (token === '') continue;

        let tokenWidth = 0;
        for (const ch of token) {
          tokenWidth += getCharAdvance(ctx, ch, fontSize, boxSize, customAlphabet);
        }

        if (token !== ' ' && cursorX > startX && cursorX + tokenWidth - startX > maxWidth) {
          cursorX = startX;
          lineIndex += 1;
        }

        if (token === ' ' && cursorX === startX) {
          continue;
        }

        for (const ch of token) {
          const adv = getCharAdvance(ctx, ch, fontSize, boxSize, customAlphabet);
          if (cursorX > startX && cursorX + adv - startX > maxWidth) {
            cursorX = startX;
            lineIndex += 1;
          }

          if (!dryRun && ch !== ' ') {
            const glyph = customAlphabet[ch];
            if (glyph && glyph.strokes.length > 0) {
              const offsetX = cursorX - glyph.minX * boxSize + 0.05 * boxSize;
              const offsetY = gridRowHeight
                ? getLineBaselineY(lineIndex) - 0.72 * boxSize
                : startY + lineIndex * lineHeight - boxSize * 0.12;
              drawCustomGlyph(ctx, glyph, offsetX, offsetY, boxSize, color);
            } else {
              ctx.save();
              ctx.font = `600 ${fontSize}px ${FONT_MAP.handwriting.css}`;
              ctx.fillStyle = color;
              if (gridRowHeight) {
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(ch, cursorX, getLineBaselineY(lineIndex));
              } else {
                ctx.textBaseline = 'top';
                ctx.fillText(ch, cursorX, startY + lineIndex * lineHeight + fontSize * 0.06);
              }
              ctx.restore();
            }
          }

          cursorX += adv;
        }
      }
    }

    if (pIdx < paragraphs.length - 1) {
      lineIndex += 1;
      cursorX = startX;
    }
  }

  const totalHeight = Math.max(lineHeight, (lineIndex + 1) * lineHeight + 6);
  const caretY = gridRowHeight
    ? getLineBaselineY(lineIndex) - Math.round(fontSize * 0.92)
    : startY + lineIndex * lineHeight;

  return {
    height: totalHeight,
    caretX: cursorX,
    caretY,
    lineHeight,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(24, 24, 27, ${alpha})`;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Wraps and draws a TextBlock (plain or framed code/callout box) accurately on a 2D canvas.
 */
function drawTextBlockOnCanvas(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  customAlphabet?: CustomAlphabetMap,
  options?: RenderDocOptions
): void {
  const hasFrame = Boolean(block.frameStyle && block.frameStyle !== 'none');
  if (!block.content.trim() && !hasFrame) return;

  const isGrid = options?.paperStyle === 'grid';
  const isLined =
    options?.paperStyle === 'lined' ||
    options?.paperStyle === 'poetry' ||
    options?.paperStyle === 'poetry_ornate';
  const isRuled = !hasFrame && (isGrid || isLined);
  const rowHeight = isGrid
    ? (options.gridRowSpan ?? 2) * GRID_SIZE
    : isLined
      ? LINE_SPACING
      : undefined;
  const baseX = isGrid && !hasFrame ? snapToGridX(block.x) : block.x;
  const baseY = isGrid && !hasFrame ? snapToGridY(block.y) : isLined && !hasFrame ? snapToLinedY(block.y) : block.y;

  if (block.font === 'custom' && !hasFrame) {
    const maxWidth = Math.max(80, block.width - 12);
    renderCustomHandwritingText(
      ctx,
      block.content,
      baseX + 6,
      isRuled ? baseY : baseY + 4,
      maxWidth,
      block.fontSize,
      block.color,
      customAlphabet || {},
      false,
      rowHeight
    );
    return;
  }

  ctx.save();
  const effectiveFont: TextFont = block.font === 'custom' ? 'handwriting' : block.font;
  const fontFamily = FONT_MAP[effectiveFont].css;
  const lineHeight = hasFrame
    ? Math.round(block.fontSize * (block.frameStyle === 'code' ? 1.48 : 1.44))
    : rowHeight ?? Math.round(block.fontSize * 1.42);
  ctx.font = `${effectiveFont === 'handwriting' ? '600' : '400'} ${block.fontSize}px ${fontFamily}`;

  const headerH = hasFrame ? 30 : 0;
  const padX = hasFrame ? 14 : 6;
  const gutterW = hasFrame && block.frameStyle === 'code' && block.showLineNumbers !== false ? 34 : 0;
  const maxWidth = Math.max(60, block.width - padX * 2 - gutterW);

  // Pre-wrap lines so framed boxes know their exact height
  const paragraphs = (block.content || ' ').split('\n');
  const wrappedLines: { text: string; isNewPara: boolean }[] = [];
  for (const para of paragraphs) {
    if (para === '') {
      wrappedLines.push({ text: '', isNewPara: true });
      continue;
    }
    const words = para.split(' ');
    let line = '';
    let firstInPara = true;
    for (let n = 0; n < words.length; n++) {
      const word = words[n];
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        wrappedLines.push({ text: line, isNewPara: firstInPara });
        firstInPara = false;
        line = '';
      }
      if (ctx.measureText(word).width > maxWidth) {
        for (const ch of word) {
          const candidate = line + ch;
          if (ctx.measureText(candidate).width > maxWidth && line) {
            wrappedLines.push({ text: line, isNewPara: firstInPara });
            firstInPara = false;
            line = ch;
          } else {
            line = candidate;
          }
        }
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) {
      wrappedLines.push({ text: line, isNewPara: firstInPara });
    }
  }
  if (wrappedLines.length === 0) {
    wrappedLines.push({ text: '', isNewPara: true });
  }

  // Draw framed container shell when frameStyle is active
  if (hasFrame && block.frameStyle && block.frameStyle !== 'none') {
    const preset = FRAME_STYLE_PRESETS[block.frameStyle];
    const accent = block.frameAccentColor || preset.defaultAccent;
    const title = (block.frameTitle || preset.defaultTitle).trim();
    const bodyPadTop = 10;
    const bodyPadBottom = 12;
    const boxH = headerH + bodyPadTop + wrappedLines.length * lineHeight + bodyPadBottom;

    ctx.save();
    // Subtle card fill
    const fillBg =
      block.frameStyle === 'code'
        ? '#F8FAFC'
        : block.frameStyle === 'note'
          ? '#FFFBEB'
          : hexToRgba(accent, 0.055);
    drawRoundedRectPath(ctx, baseX, baseY, block.width, boxH, block.frameStyle === 'double_border' ? 4 : 8);
    ctx.fillStyle = fillBg;
    ctx.fill();

    // Header strip for code / rule / formula / note
    if (block.frameStyle === 'code') {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = accent;
      ctx.fillRect(baseX, baseY, block.width, headerH);
      // 3 clean terminal dots
      ['#F87171', '#FBBF24', '#34D399'].forEach((dotColor, i) => {
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(baseX + 14 + i * 11, baseY + headerH / 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#F8FAFC';
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textBaseline = 'middle';
      ctx.fillText(title, baseX + 52, baseY + headerH / 2 + 0.5);

      if (gutterW > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.045)';
        ctx.fillRect(baseX, baseY + headerH, gutterW + 4, boxH - headerH);
      }
      ctx.restore();
    } else {
      // Accent header bar / badge
      ctx.save();
      ctx.clip();
      ctx.fillStyle = hexToRgba(accent, 0.12);
      ctx.fillRect(baseX, baseY, block.width, headerH);
      ctx.fillStyle = accent;
      ctx.font = "700 11px 'Plus Jakarta Sans', sans-serif";
      ctx.textBaseline = 'middle';
      ctx.fillText(title.toUpperCase(), baseX + 14, baseY + headerH / 2 + 0.5);
      ctx.restore();
    }

    // Outer & special borders
    drawRoundedRectPath(ctx, baseX, baseY, block.width, boxH, block.frameStyle === 'double_border' ? 4 : 8);
    ctx.strokeStyle = block.frameStyle === 'code' ? hexToRgba(accent, 0.85) : accent;
    ctx.lineWidth = block.frameStyle === 'double_border' ? 2 : 1.5;
    if (block.frameStyle === 'dashed') {
      ctx.setLineDash([7, 5]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (block.frameStyle === 'double_border') {
      ctx.strokeStyle = hexToRgba(accent, 0.45);
      ctx.lineWidth = 0.9;
      ctx.strokeRect(baseX + 4, baseY + 4, block.width - 8, boxH - 8);
    }

    if (block.frameStyle === 'rule' || block.frameStyle === 'formula') {
      ctx.fillStyle = accent;
      ctx.fillRect(baseX, baseY + 2, 4.5, boxH - 4);
    }

    // Line numbers column for code blocks
    if (gutterW > 0) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.72)';
      ctx.font = `500 ${Math.max(10, block.fontSize - 2)}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      let paraNum = 1;
      wrappedLines.forEach((wl, idx) => {
        if (wl.isNewPara) {
          ctx.fillText(String(paraNum).padStart(2, '0'), baseX + gutterW - 2, baseY + headerH + bodyPadTop + idx * lineHeight + 1);
          paraNum += 1;
        }
      });
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // Restore text font and draw text fill
  ctx.font = `${effectiveFont === 'handwriting' ? '600' : '400'} ${block.fontSize}px ${fontFamily}`;
  const metallic = getMetallicInkConfig(block.color);
  if (block.isMetallic || metallic) {
    const stops = metallic?.shimmerStops ?? [block.color, '#FEF08A', block.color];
    const grad = ctx.createLinearGradient(baseX, baseY, baseX + Math.max(220, block.width), baseY + 180);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.32, stops[1]);
    grad.addColorStop(0.55, block.color);
    grad.addColorStop(0.78, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
    ctx.shadowBlur = 1.2;
  } else {
    ctx.fillStyle = block.color;
  }

  ctx.textBaseline = isRuled ? 'alphabetic' : 'top';
  const textX = baseX + padX + gutterW;
  const textStartY = hasFrame ? baseY + headerH + 10 : baseY + 4;

  wrappedLines.forEach((wl, idx) => {
    if (!wl.text) return;
    if (isRuled && rowHeight) {
      const baselineY = baseY + (idx + 1) * rowHeight - (isLined ? 2 : 1);
      ctx.fillText(wl.text, textX, baselineY);
    } else {
      ctx.fillText(wl.text, textX, textStartY + idx * lineHeight);
    }
  });

  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function drawStickerImageOnCanvas(ctx: CanvasRenderingContext2D, item: StickerImage): Promise<void> {
  try {
    const img = await loadImage(item.dataUrl);
    ctx.save();
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((item.rotation * Math.PI) / 180);

    // Subtle photo shadow on paper
    ctx.shadowColor = 'rgba(24, 24, 27, 0.18)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-item.width / 2 - 4, -item.height / 2 - 4, item.width + 8, item.height + 8);

    ctx.shadowColor = 'transparent';
    ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);

    // Translucent masking tape strip at top center
    if (item.hasTape) {
      ctx.fillStyle = 'rgba(245, 232, 188, 0.72)';
      ctx.strokeStyle = 'rgba(180, 160, 110, 0.28)';
      ctx.lineWidth = 1;
      ctx.save();
      ctx.translate(0, -item.height / 2 - 2);
      ctx.rotate(-0.04);
      ctx.fillRect(-34, -9, 68, 18);
      ctx.strokeRect(-34, -9, 68, 18);
      ctx.restore();
    }

    ctx.restore();
  } catch {
    // Skip failed image gracefully
  }
}

function drawDeskBackground(
  ctx: CanvasRenderingContext2D,
  totalW: number,
  totalH: number,
  deskTheme: DeskTheme
): string {
  const deskColorMap: Record<DeskTheme, string> = {
    linen: '#E7E2D8',
    slate: '#D8DDE3',
    walnut: '#211D19',
  };
  const deskBg = deskColorMap[deskTheme];
  ctx.fillStyle = deskBg;
  ctx.fillRect(0, 0, totalW, totalH);

  ctx.fillStyle = deskTheme === 'walnut' ? 'rgba(255,248,235,0.04)' : 'rgba(24,24,27,0.045)';
  for (let gx = 10; gx < totalW; gx += 22) {
    for (let gy = 10; gy < totalH; gy += 22) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }
  return deskBg;
}

function drawNotebookStack(
  ctx: CanvasRenderingContext2D,
  padX: number,
  padY: number,
  width: number,
  height: number,
  capacity: NotebookCapacity,
  paperTone: PaperTone,
  deskTheme: DeskTheme
): void {
  const palette = PAPER_TONE_COLORS[paperTone];
  const layers = CAPACITY_PRESETS[capacity]?.stackLayers ?? 3;
  const maxOffset = layers * 2.4;

  ctx.save();
  ctx.shadowColor = deskTheme === 'walnut' ? 'rgba(0,0,0,0.68)' : 'rgba(24,24,27,0.25)';
  ctx.shadowBlur = 32 + layers * 2;
  ctx.shadowOffsetX = 10 + layers;
  ctx.shadowOffsetY = 18 + layers;
  ctx.fillStyle = capacity === 96 ? '#27272A' : palette.stackEdge;
  ctx.fillRect(padX + maxOffset, padY + maxOffset, width, height);
  ctx.restore();

  // For 96-sheet hardcover, draw dark back cover lip first
  if (capacity === 96) {
    ctx.fillStyle = '#2B2623';
    ctx.fillRect(padX + maxOffset + 1, padY + maxOffset + 1, width, height);
  }

  for (let i = layers; i >= 1; i--) {
    const offset = i * 2.2;
    ctx.fillStyle = i % 2 === 0 ? '#D8D1C5' : palette.stackEdge;
    ctx.fillRect(padX + offset, padY + offset, width, height);
    ctx.strokeStyle = 'rgba(24,24,27,0.09)';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(padX + offset, padY + offset, width, height);
  }
}

export interface CoverFieldSlot {
  key: keyof CoverData;
  label: string;
  placeholder: string;
  y: number;
  x: number;
  width: number;
}

export function getCoverLayoutGeometry(cover: CoverData): {
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  headingY: number;
  subtitleY: number;
  emblemY: number;
  fields: CoverFieldSlot[];
} {
  const layout: CoverLayoutStyle = cover.layoutStyle ?? 'classic_standard';
  const boxX = layout === 'minimal_modern' ? 104 : 120;
  const boxW = PAGE_WIDTH - (layout === 'minimal_modern' ? 172 : 204);
  const boxY = layout === 'academic_crest' ? 290 : layout === 'poetry_edition' ? 276 : 254;
  const boxH = layout === 'academic_crest' ? 540 : 520;

  const colLeft = boxX + 34;
  const fullRowW = boxW - 68;
  const halfW = Math.floor((fullRowW - 24) / 2);
  const colRight = colLeft + halfW + 24;

  const fields: CoverFieldSlot[] = [
    { key: 'subject', label: 'Fan / Yo‘nalish:', placeholder: 'Masalan: Matematika / Ona tili', x: colLeft, y: boxY + 72, width: fullRowW },
    { key: 'ownerName', label: 'O‘quvchi / Egasi:', placeholder: 'Ismingiz va familiyangiz...', x: colLeft, y: boxY + 144, width: fullRowW },
    { key: 'gradeOrGroup', label: 'Sinf / Guruh:', placeholder: '9-A sinf / 214-guruh', x: colLeft, y: boxY + 216, width: halfW },
    { key: 'serialNumber', label: 'Daftar №:', placeholder: '№ 01', x: colRight, y: boxY + 216, width: halfW },
    { key: 'institution', label: 'Muassasa:', placeholder: 'Maktab, litsey yoki universitet', x: colLeft, y: boxY + 288, width: fullRowW },
    { key: 'teacherName', label: 'O‘qituvchi / Rahbar:', placeholder: 'Ustoz F.I.Sh. (ixtiyoriy)', x: colLeft, y: boxY + 360, width: fullRowW },
    { key: 'cityOrRegion', label: 'Shahar / Tuman:', placeholder: 'Toshkent sh.', x: colLeft, y: boxY + 432, width: halfW },
    { key: 'year', label: 'O‘quv yili / Sana:', placeholder: '2026–2027', x: colRight, y: boxY + 432, width: halfW },
  ];

  return {
    boxX,
    boxY,
    boxW,
    boxH,
    emblemY: layout === 'academic_crest' ? 116 : 92,
    headingY: layout === 'academic_crest' ? 198 : 172,
    subtitleY: layout === 'academic_crest' ? 236 : 210,
    fields,
  };
}

function isHexColorDark(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.58;
}

function drawCoverEmblemVector(
  ctx: CanvasRenderingContext2D,
  emblem: CoverEmblem,
  cx: number,
  cy: number,
  color: string
): void {
  if (emblem === 'none') return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Medallion ring
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.92;

  if (emblem === 'book') {
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(-8, -12, -14, -8);
    ctx.lineTo(-14, 9);
    ctx.quadraticCurveTo(-8, 5, 0, 10);
    ctx.quadraticCurveTo(8, 5, 14, 9);
    ctx.lineTo(14, -8);
    ctx.quadraticCurveTo(8, -12, 0, -8);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 10);
    ctx.stroke();
  } else if (emblem === 'atom') {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (emblem === 'math') {
    ctx.font = "700 22px 'Lora', Georgia, serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('π · ∑', 0, 1);
  } else if (emblem === 'feather') {
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.quadraticCurveTo(-4, -8, 12, -13);
    ctx.quadraticCurveTo(9, 2, -6, 9);
    ctx.moveTo(-12, 14);
    ctx.lineTo(7, -6);
    ctx.stroke();
  } else if (emblem === 'compass') {
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(-10, 11);
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 11);
    ctx.moveTo(-7, 2);
    ctx.quadraticCurveTo(0, 6, 7, 2);
    ctx.stroke();
  } else if (emblem === 'star') {
    // 8-pointed eastern geometric star
    for (let rot = 0; rot < 2; rot++) {
      ctx.save();
      ctx.rotate((rot * Math.PI) / 4);
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * Draws the realistic Titul Yuza Varoq (Cover & Title Page) onto a 2D canvas.
 */
export function drawCoverBase(
  ctx: CanvasRenderingContext2D,
  cover: CoverData,
  capacity: NotebookCapacity,
  bindingStyle: BindingStyle,
  skipInputs = false
): void {
  const theme = COVER_THEMES[cover.theme] ?? COVER_THEMES.forest;
  const bg = cover.customBgColor || theme.bg;
  const isDarkBg = isHexColorDark(bg);
  const textOnBg = isDarkBg ? theme.textOnBg || '#F8FAFC' : '#1C1917';
  const accentColor = cover.customAccentColor || theme.accent;
  const borderColor = cover.customAccentColor || theme.border;
  const layout: CoverLayoutStyle = cover.layoutStyle ?? 'classic_standard';
  const borderPattern = cover.borderPattern ?? 'double';
  const emblem = cover.emblem ?? 'book';
  const labelShape = cover.labelShape ?? 'rect';
  const coverFont = cover.coverFont ?? 'handwriting';
  const geom = getCoverLayoutGeometry(cover);

  ctx.save();
  // Cover background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  // Subtle textured cardstock grain
  ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.032)' : 'rgba(41, 37, 36, 0.035)';
  let seed = 7331;
  for (let i = 0; i < 1800; i++) {
    seed = (seed * 16807) % 2147483647;
    const gx = seed % PAGE_WIDTH;
    seed = (seed * 16807) % 2147483647;
    const gy = seed % PAGE_HEIGHT;
    ctx.fillRect(gx, gy, 1.3, 1.3);
  }

  // Spine strip & fold groove on left
  ctx.fillStyle = cover.customBgColor ? hexToRgba('#000000', 0.25) : theme.spine;
  ctx.fillRect(0, 0, 38, PAGE_HEIGHT);

  const creaseGrad = ctx.createLinearGradient(34, 0, 56, 0);
  creaseGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
  creaseGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  creaseGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = creaseGrad;
  ctx.fillRect(34, 0, 22, PAGE_HEIGHT);

  // Minimal Modern layout vertical accent band
  if (layout === 'minimal_modern') {
    ctx.fillStyle = hexToRgba(accentColor, isDarkBg ? 0.2 : 0.16);
    ctx.fillRect(58, 0, 18, PAGE_HEIGHT);
  }

  // Outer cover border patterns
  const frameStroke = isDarkBg ? 'rgba(255, 255, 255, 0.28)' : 'rgba(41, 37, 36, 0.28)';
  if (borderPattern !== 'none') {
    ctx.save();
    ctx.strokeStyle = borderPattern === 'ornate' ? hexToRgba(accentColor, 0.55) : frameStroke;
    if (borderPattern === 'dashed') {
      ctx.setLineDash([8, 6]);
    }
    ctx.lineWidth = borderPattern === 'minimal' ? 1.2 : 1.75;
    ctx.strokeRect(64, 42, PAGE_WIDTH - 104, PAGE_HEIGHT - 84);
    ctx.setLineDash([]);

    if (borderPattern === 'double' || borderPattern === 'ornate') {
      ctx.lineWidth = 0.85;
      ctx.strokeRect(72, 50, PAGE_WIDTH - 120, PAGE_HEIGHT - 100);
    }

    if (borderPattern === 'ornate' || layout === 'poetry_edition') {
      const corners: [number, number][] = [
        [68, 46],
        [PAGE_WIDTH - 44, 46],
        [68, PAGE_HEIGHT - 46],
        [PAGE_WIDTH - 44, PAGE_HEIGHT - 46],
      ];
      ctx.fillStyle = hexToRgba(accentColor, 0.65);
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx + 7, cy);
        ctx.lineTo(cx, cy + 7);
        ctx.lineTo(cx - 7, cy);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Top Standard Emblem Header & Decorative Emblem
  const centerX = PAGE_WIDTH / 2 + 12;
  ctx.fillStyle = textOnBg;
  ctx.textAlign = 'center';
  if (cover.isStateStandard) {
    ctx.font = "600 11.5px 'JetBrains Mono', monospace";
    ctx.fillText('O‘ZDST · DAVLAT STANDARTI ASOSIDA', centerX, 74);
  }

  drawCoverEmblemVector(ctx, emblem, centerX, geom.emblemY + 26, textOnBg);

  // Main Cover Heading ("DAFTAR" / "UMUMIY DAFTAR") & Subtitle
  const headingFontCss =
    coverFont === 'mono'
      ? "'JetBrains Mono', monospace"
      : coverFont === 'sans'
        ? "'Plus Jakarta Sans', sans-serif"
        : "'Lora', Georgia, serif";
  ctx.font = `700 40px ${headingFontCss}`;
  const headingText = cover.heading || (capacity === 96 ? 'UMUMIY DAFTAR' : 'DAFTAR');
  if (!skipInputs) {
    ctx.fillText(headingText, centerX, geom.headingY + 28);
    if (cover.subtitle?.trim()) {
      ctx.globalAlpha = 0.82;
      ctx.font = "500 15px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(cover.subtitle.trim(), centerX, geom.subtitleY + 18);
      ctx.globalAlpha = 1;
    }
  }

  // Titul Label Card / Box
  const { boxX, boxY, boxW, boxH } = geom;
  const radius = labelShape === 'rounded' ? 18 : labelShape === 'card' ? 10 : 0;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = layout === 'kraft_vintage' ? '#F7EFE0' : '#FCF9F2';
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();

  // Frame around label box
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = layout === 'minimal_modern' ? 1.5 : 2.2;
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.stroke();

  if (layout !== 'minimal_modern') {
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.18)';
    ctx.lineWidth = 1;
    drawRoundedRectPath(ctx, boxX + 8, boxY + 8, boxW - 16, boxH - 16, Math.max(0, radius - 5));
    ctx.stroke();
  }
  ctx.restore();

  // Label rows inside Titul Box
  const valueFontCss =
    coverFont === 'serif'
      ? "600 20px 'Lora', Georgia, serif"
      : coverFont === 'sans'
        ? "600 18px 'Plus Jakarta Sans', sans-serif"
        : coverFont === 'mono'
          ? "600 16px 'JetBrains Mono', monospace"
          : "600 24px 'Caveat', cursive";

  ctx.textAlign = 'left';
  for (const field of geom.fields) {
    ctx.fillStyle = 'rgba(24, 24, 27, 0.58)';
    ctx.font = "500 11.5px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(field.label, field.x, field.y - 22);

    ctx.strokeStyle = 'rgba(24, 24, 27, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(field.x, field.y + 6);
    ctx.lineTo(field.x + field.width, field.y + 6);
    ctx.stroke();

    const val = String(cover[field.key] ?? '');
    if (!skipInputs && val) {
      ctx.fillStyle = '#18181B';
      ctx.font = valueFontCss;
      ctx.fillText(val, field.x + 4, field.y - 1);
    }
  }

  // Optional Grade / Verification box in bottom area
  if (cover.showGradeBox) {
    const gx = boxX + boxW - 184;
    const gy = PAGE_HEIGHT - 178;
    ctx.save();
    ctx.fillStyle = '#FCF9F2';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.4;
    drawRoundedRectPath(ctx, gx, gy, 184, 62, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
    ctx.font = "600 10px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('BAHO / TEKSHIRUV:', gx + 12, gy + 18);
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.25)';
    ctx.beginPath();
    ctx.moveTo(gx + 12, gy + 48);
    ctx.lineTo(gx + 172, gy + 48);
    ctx.stroke();
    ctx.restore();
  }

  // Bottom Capacity & Binding Standard Mark
  ctx.textAlign = 'center';
  ctx.fillStyle = textOnBg;
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  const capLabel = `${capacity} VARAQ · ${bindingStyle === 'spiral' ? 'SPIRAL' : capacity === 96 ? 'QATTIQ MUQOVA' : 'TIKILGAN STANDART'}`;
  ctx.fillText(capLabel, centerX, PAGE_HEIGHT - 82);

  if (bindingStyle === 'stitched' && capacity !== 96) {
    ctx.fillStyle = '#D4D4D8';
    ctx.strokeStyle = '#52525B';
    ctx.lineWidth = 1;
    [280, PAGE_HEIGHT - 280].forEach((sy) => {
      ctx.fillRect(14, sy, 5, 42);
      ctx.strokeRect(14, sy, 5, 42);
    });
  }

  ctx.restore();
}

/**
 * Captures an authentic high-DPI PNG screenshot of the Titul Yuza Varoq (Cover Page).
 */
export async function captureCoverScreenshot(
  cover: CoverData,
  docOptions: RenderDocOptions,
  captureOptions: ScreenshotCaptureOptions
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const capacity = docOptions.capacity ?? 12;
  const { includeDeskFrame, scale } = captureOptions;
  const padX = includeDeskFrame ? 72 : 0;
  const padY = includeDeskFrame ? 64 : 0;
  const totalW = PAGE_WIDTH + padX * 2;
  const totalH = PAGE_HEIGHT + padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(totalH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D konteksti yaratilmadi');

  ctx.scale(scale, scale);

  let deskBg = '#EAE6DF';
  if (includeDeskFrame) {
    deskBg = drawDeskBackground(ctx, totalW, totalH, docOptions.deskTheme);
    drawNotebookStack(ctx, padX, padY, PAGE_WIDTH, PAGE_HEIGHT, capacity, docOptions.paperTone, docOptions.deskTheme);
  }

  ctx.save();
  ctx.translate(padX, padY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.clip();

  drawCoverBase(ctx, cover, capacity, docOptions.bindingStyle, false);

  // Freehand cover strokes / signature
  if (cover.strokes && cover.strokes.length > 0) {
    const inkCanvas = document.createElement('canvas');
    inkCanvas.width = Math.round(PAGE_WIDTH * scale);
    inkCanvas.height = Math.round(PAGE_HEIGHT * scale);
    const inkCtx = inkCanvas.getContext('2d');
    if (inkCtx) {
      inkCtx.scale(scale, scale);
      for (const stroke of cover.strokes) {
        drawStroke(inkCtx, stroke);
      }
      ctx.drawImage(inkCanvas, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(24, 24, 27, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, PAGE_WIDTH - 1, PAGE_HEIGHT - 1);

  if (docOptions.bindingStyle === 'spiral') {
    drawBindingOverlay(ctx, 'spiral', includeDeskFrame ? deskBg : '#EAE6DF');
  }

  ctx.restore();
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Draws an authentic inked Anti-AI / Anti-Spam rubber stamp onto a page canvas.
 */
export function drawAntiAiStamp(
  ctx: CanvasRenderingContext2D,
  stamp: AntiAiStampOptions
): void {
  if (!stamp.enabled) return;

  const isFlagged = stamp.status === 'spam_flagged' || stamp.status === 'pasted_ai_detected';
  const inkColor = isFlagged ? 'rgba(185, 28, 28, 0.84)' : 'rgba(29, 78, 216, 0.84)';
  const cx = PAGE_WIDTH - 142;
  const cy = PAGE_HEIGHT - 122;
  const r = 64;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.18); // Authentic tilted rubber stamp (-10.3 deg)

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;

  // Outer double ring
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
  ctx.stroke();

  // Inner seal rectangle ribbon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(-r - 6, -15, (r + 6) * 2, 30);
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-r - 6, -15, (r + 6) * 2, 30);

  // Top & Bottom stamp captions
  ctx.fillStyle = inkColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "700 8.5px 'JetBrains Mono', monospace";
  ctx.fillText('ANTI-AI · ANTI-SPAM', 0, -32);
  ctx.fillText(
    stamp.pastedCount > 0 ? `PASTE: ${stamp.pastedCount} TA` : 'QO‘LDA YOZILGAN',
    0,
    27
  );
  ctx.font = "600 8px 'JetBrains Mono', monospace";
  ctx.fillText(stamp.checkedDate, 0, 41);

  // Center main stamp label
  ctx.font = "700 10.5px 'JetBrains Mono', monospace";
  ctx.fillText(stamp.stampText.slice(0, 20), 0, 0);

  ctx.restore();
}

/**
 * Helper to render a single page sheet at origin (0,0) of ctx.
 */
async function renderPageContentIntoContext(
  ctx: CanvasRenderingContext2D,
  page: NotebookPage,
  pageIndex: number,
  totalPages: number,
  docOptions: RenderDocOptions,
  scale: number
): Promise<void> {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.clip();

  drawPaperBase(ctx, page, pageIndex, totalPages, docOptions);

  const inkCanvas = document.createElement('canvas');
  inkCanvas.width = Math.round(PAGE_WIDTH * scale);
  inkCanvas.height = Math.round(PAGE_HEIGHT * scale);
  const inkCtx = inkCanvas.getContext('2d');
  if (inkCtx) {
    inkCtx.scale(scale, scale);
    for (const stroke of page.strokes) {
      drawStroke(inkCtx, stroke);
    }
    ctx.drawImage(inkCanvas, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }

  for (const img of page.images) {
    await drawStickerImageOnCanvas(ctx, img);
  }

  for (const block of page.textBlocks) {
    drawTextBlockOnCanvas(ctx, block, docOptions.customAlphabet, docOptions);
  }

  if (docOptions.antiAiStamp?.enabled) {
    const pastedBlocks = page.textBlocks.filter((tb) => tb.pasteMeta?.isPasted);
    const hasFlagged = pastedBlocks.some(
      (tb) => tb.pasteMeta?.status === 'spam_flagged' || tb.pasteMeta?.status === 'pasted_ai_detected'
    );
    const pageStamp: AntiAiStampOptions = {
      ...docOptions.antiAiStamp,
      pastedCount: pastedBlocks.length,
      status: hasFlagged ? 'pasted_ai_detected' : docOptions.antiAiStamp.status,
      stampText:
        pastedBlocks.length > 0
          ? pastedBlocks.find((tb) => tb.pasteMeta?.stampText)?.pasteMeta?.stampText ||
            docOptions.antiAiStamp.stampText
          : docOptions.antiAiStamp.stampText,
    };
    drawAntiAiStamp(ctx, pageStamp);
  }

  ctx.restore();
}

/**
 * Captures an authentic high-DPI PNG screenshot of a realistic single notebook page.
 */
export async function captureNotebookPageScreenshot(
  page: NotebookPage,
  pageIndex: number,
  totalPages: number,
  docOptions: RenderDocOptions,
  captureOptions: ScreenshotCaptureOptions
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const capacity = docOptions.capacity ?? 12;
  const { includeDeskFrame, scale } = captureOptions;
  const padX = includeDeskFrame ? 72 : 0;
  const padY = includeDeskFrame ? 64 : 0;
  const totalW = PAGE_WIDTH + padX * 2;
  const totalH = PAGE_HEIGHT + padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(totalH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D konteksti yaratilmadi');

  ctx.scale(scale, scale);

  let deskBg = '#EAE6DF';
  if (includeDeskFrame) {
    deskBg = drawDeskBackground(ctx, totalW, totalH, docOptions.deskTheme);
    drawNotebookStack(ctx, padX, padY, PAGE_WIDTH, PAGE_HEIGHT, capacity, docOptions.paperTone, docOptions.deskTheme);
  }

  ctx.save();
  ctx.translate(padX, padY);

  await renderPageContentIntoContext(ctx, page, pageIndex, totalPages, docOptions, scale);

  ctx.strokeStyle = 'rgba(24, 24, 27, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, PAGE_WIDTH - 1, PAGE_HEIGHT - 1);

  drawBindingOverlay(ctx, docOptions.bindingStyle, includeDeskFrame ? deskBg : '#EAE6DF');

  ctx.restore();

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Captures a realistic 2-Page Spread (Ikki sahifali ochilgan daftar) PNG screenshot.
 */
export async function captureSpreadScreenshot(
  leftPage: NotebookPage,
  leftIndex: number,
  rightPage: NotebookPage | null,
  rightIndex: number,
  totalPages: number,
  docOptions: RenderDocOptions,
  captureOptions: ScreenshotCaptureOptions
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const capacity = docOptions.capacity ?? 12;
  const { includeDeskFrame, scale } = captureOptions;
  const padX = includeDeskFrame ? 72 : 0;
  const padY = includeDeskFrame ? 64 : 0;
  const spreadW = PAGE_WIDTH * 2;
  const totalW = spreadW + padX * 2;
  const totalH = PAGE_HEIGHT + padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(totalH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D konteksti yaratilmadi');

  ctx.scale(scale, scale);

  if (includeDeskFrame) {
    drawDeskBackground(ctx, totalW, totalH, docOptions.deskTheme);
    drawNotebookStack(ctx, padX, padY, spreadW, PAGE_HEIGHT, capacity, docOptions.paperTone, docOptions.deskTheme);
  }

  ctx.save();
  ctx.translate(padX, padY);

  // Left Page
  await renderPageContentIntoContext(
    ctx,
    leftPage,
    leftIndex,
    totalPages,
    { ...docOptions, sheetSide: 'left' },
    scale
  );

  // Right Page (or blank matching sheet if odd count)
  ctx.save();
  ctx.translate(PAGE_WIDTH, 0);
  if (rightPage) {
    await renderPageContentIntoContext(
      ctx,
      rightPage,
      rightIndex,
      totalPages,
      { ...docOptions, sheetSide: 'right' },
      scale
    );
  } else {
    drawPaperBase(
      ctx,
      { id: 'blank_end', title: '', dateLabel: '', strokes: [], textBlocks: [], images: [] },
      rightIndex,
      totalPages,
      { ...docOptions, sheetSide: 'right' },
      true
    );
  }
  ctx.restore();

  // Center Gutter Spine Shadow
  const gutterGrad = ctx.createLinearGradient(PAGE_WIDTH - 28, 0, PAGE_WIDTH + 28, 0);
  gutterGrad.addColorStop(0, 'rgba(24,24,27,0)');
  gutterGrad.addColorStop(0.45, 'rgba(24,24,27,0.16)');
  gutterGrad.addColorStop(0.5, 'rgba(24,24,27,0.34)');
  gutterGrad.addColorStop(0.55, 'rgba(24,24,27,0.16)');
  gutterGrad.addColorStop(1, 'rgba(24,24,27,0)');
  ctx.fillStyle = gutterGrad;
  ctx.fillRect(PAGE_WIDTH - 28, 0, 56, PAGE_HEIGHT);

  // Center binding hardware (Staples or Spiral bridge rings)
  if (docOptions.bindingStyle === 'spiral') {
    const holeCount = 24;
    const startY = 48;
    const endY = PAGE_HEIGHT - 48;
    const step = (endY - startY) / (holeCount - 1);
    for (let i = 0; i < holeCount; i++) {
      const cy = startY + i * step;
      // Left and right punched holes
      [PAGE_WIDTH - 18, PAGE_WIDTH + 18].forEach((hx) => {
        ctx.beginPath();
        ctx.ellipse(hx, cy, 5.5, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#3F3F46';
        ctx.fill();
      });
      // Wire bridge
      const ringGrad = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
      ringGrad.addColorStop(0, '#52525B');
      ringGrad.addColorStop(0.4, '#F4F4F5');
      ringGrad.addColorStop(1, '#3F3F46');
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(PAGE_WIDTH - 18, cy - 1.5);
      ctx.quadraticCurveTo(PAGE_WIDTH, cy - 6, PAGE_WIDTH + 18, cy - 1.5);
      ctx.stroke();
    }
  } else if (docOptions.bindingStyle === 'stitched' && capacity !== 96) {
    // Authentic metallic staples down center crease
    [280, PAGE_HEIGHT - 280].forEach((sy) => {
      ctx.fillStyle = '#D4D4D8';
      ctx.strokeStyle = '#52525B';
      ctx.lineWidth = 1;
      ctx.fillRect(PAGE_WIDTH - 2, sy, 4, 42);
      ctx.strokeRect(PAGE_WIDTH - 2, sy, 4, 42);
    });
  }

  ctx.strokeStyle = 'rgba(24, 24, 27, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, spreadW - 1, PAGE_HEIGHT - 1);

  ctx.restore();
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Generates a real PDF file directly from captured PNG screenshots (screenshot-to-PDF).
 * Automatically uses Landscape A4 for wide 2-page spreads and Portrait A4 for single pages / cover.
 */
export async function exportScreenshotsToPdf(
  screenshots: { dataUrl: string; width: number; height: number }[],
  filename: string
): Promise<void> {
  if (screenshots.length === 0) return;

  const firstIsWide = screenshots[0].width > screenshots[0].height;
  const pdf = new jsPDF({
    orientation: firstIsWide ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  screenshots.forEach((shot, index) => {
    const isWide = shot.width > shot.height;
    const orientation = isWide ? 'landscape' : 'portrait';
    const pageW = isWide ? 297 : 210;
    const pageH = isWide ? 210 : 297;

    if (index > 0) {
      pdf.addPage('a4', orientation);
    }

    const imgRatio = shot.width / shot.height;
    const pageRatio = pageW / pageH;

    let renderW = pageW;
    let renderH = pageH;
    let offsetX = 0;
    let offsetY = 0;

    if (Math.abs(imgRatio - pageRatio) > 0.01) {
      if (imgRatio > pageRatio) {
        renderW = pageW;
        renderH = pageW / imgRatio;
        offsetY = (pageH - renderH) / 2;
      } else {
        renderH = pageH;
        renderW = pageH * imgRatio;
        offsetX = (pageW - renderW) / 2;
      }
    }

    pdf.addImage(shot.dataUrl, 'PNG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
  });

  const safeName = filename.trim() ? filename.trim().replace(/[^\w\s-]/g, '') : 'Daftar';
  pdf.save(`${safeName || 'Daftar'}.pdf`);
}
