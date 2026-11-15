import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Code2,
  GripVertical,
  Hash,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react';
import {
  BindingStyle,
  CAPACITY_PRESETS,
  CustomAlphabetMap,
  DeskTheme,
  FONT_MAP,
  FRAME_STYLE_PRESETS,
  FrameStyle,
  GRID_SIZE,
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
  StickerImage,
  Stroke,
  StrokePoint,
  TextBlock,
  TextFont,
  ToolType,
  getMetallicInkConfig,
} from '../types/notebook';
import {
  drawBindingOverlay,
  drawPaperBase,
  drawStroke,
  getTextareaGridBaselineShift,
  renderCustomHandwritingText,
  snapToGridX,
  snapToGridY,
  snapToLinedY,
} from '../utils/notebookRenderer';
import { getPaperTextGeometry, normalizePastedText } from '../utils/textFlow';

const CustomTextCanvas: React.FC<{
  block: TextBlock;
  customAlphabet: CustomAlphabetMap;
  isSelected: boolean;
  isEditing: boolean;
  gridRowHeight?: number;
}> = ({ block, customAlphabet, isSelected, isEditing, gridRowHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(() =>
    Math.max(gridRowHeight ?? 44, block.fontSize * 1.6)
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxWidth = Math.max(80, block.width - 12);
    const startY = gridRowHeight ? 0 : 4;
    const metrics = renderCustomHandwritingText(
      ctx,
      block.content,
      6,
      startY,
      maxWidth,
      block.fontSize,
      block.color,
      customAlphabet,
      true,
      gridRowHeight
    );

    const h = Math.max(gridRowHeight ? gridRowHeight + 8 : 44, metrics.height + 6);
    if (h !== canvasHeight) {
      setCanvasHeight(h);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = block.width * dpr;
    canvas.height = h * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, block.width, h);

    if (block.content.length > 0) {
      renderCustomHandwritingText(
        ctx,
        block.content,
        6,
        startY,
        maxWidth,
        block.fontSize,
        block.color,
        customAlphabet,
        false,
        gridRowHeight
      );
    } else if (!isEditing) {
      ctx.font = `500 15px ${FONT_MAP.sans.css}`;
      ctx.fillStyle = 'rgba(113, 113, 122, 0.55)';
      ctx.textBaseline = gridRowHeight ? 'alphabetic' : 'top';
      ctx.fillText('Klaviaturada yozing...', 8, gridRowHeight ? gridRowHeight - 4 : 8);
    }

    if (isEditing) {
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(metrics.caretX + 1, metrics.caretY + 2, 2, Math.round(block.fontSize * 1.1));
    }

    ctx.restore();
  }, [
    block.content,
    block.width,
    block.fontSize,
    block.color,
    customAlphabet,
    isEditing,
    canvasHeight,
    gridRowHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: block.width, height: canvasHeight }}
      className={`block rounded transition-colors ${
        isSelected ? 'ring-1 ring-blue-500/35' : ''
      }`}
    />
  );
};

const AutoSizedTextarea: React.FC<{
  value: string;
  width: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number | string;
  color: string;
  isMetallic?: boolean;
  padding: string;
  transform?: string;
  autoFocus: boolean;
  isRuled: boolean;
  isSelected: boolean;
  interactive: boolean;
  onFocus: () => void;
  onChangeValue: (val: string) => void;
  onPasteText?: (pastedText: string, start: number, end: number) => boolean;
}> = ({
  value,
  width,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  color,
  isMetallic,
  padding,
  transform,
  autoFocus,
  isRuled,
  isSelected,
  interactive,
  onFocus,
  onChangeValue,
  onPasteText,
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const minH = typeof lineHeight === 'number' ? lineHeight : Math.round(fontSize * 1.5);
    el.style.height = `${Math.max(minH, el.scrollHeight)}px`;
  }, [value, width, fontSize, lineHeight, fontFamily]);

  const metallicCfg = getMetallicInkConfig(color);
  const useMetallic = Boolean(isMetallic || metallicCfg);
  const shimmerStyle: React.CSSProperties = useMetallic
    ? {
        backgroundImage: `linear-gradient(125deg, ${
          metallicCfg?.shimmerStops?.[0] ?? color
        } 0%, ${metallicCfg?.shimmerStops?.[1] ?? '#FEF08A'} 38%, ${color} 60%, ${
          metallicCfg?.shimmerStops?.[1] ?? '#FEF08A'
        } 82%, ${metallicCfg?.shimmerStops?.[2] ?? color} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        caretColor: color,
      }
    : { color };

  return (
    <textarea
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      rows={1}
      onFocus={onFocus}
      onPaste={(e) => {
        if (!onPasteText) return;
        const raw = e.clipboardData?.getData('text/plain');
        if (!raw) return;
        const cleaned = normalizePastedText(raw);
        const start = e.currentTarget.selectionStart ?? value.length;
        const end = e.currentTarget.selectionEnd ?? value.length;
        const handled = onPasteText(cleaned, start, end);
        if (handled) {
          e.preventDefault();
        }
      }}
      onChange={(e) => onChangeValue(e.target.value)}
      placeholder="Bu yerga yozing yoki nusxalangan matnni qo‘ying..."
      className={`w-full resize-none bg-transparent outline-none rounded transition-colors ${
        isRuled ? 'overflow-visible' : 'overflow-hidden'
      } ${
        isSelected
          ? 'ring-1 ring-blue-500/30 bg-white/10'
          : interactive
            ? 'hover:bg-white/10'
            : ''
      }`}
      style={{
        fontFamily,
        fontWeight,
        fontSize: `${fontSize}px`,
        lineHeight: typeof lineHeight === 'number' ? `${lineHeight}px` : lineHeight,
        padding,
        transform,
        ...shimmerStyle,
      }}
    />
  );
};

interface NotebookSheetProps {
  page: NotebookPage;
  pageIndex: number;
  totalPages: number;
  paperStyle: PaperStyle;
  gridRowSpan?: GridRowSpan;
  paperTone: PaperTone;
  bindingStyle: BindingStyle;
  deskTheme: DeskTheme;
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  activeFont: TextFont;
  activeFramePreset?: Exclude<FrameStyle, 'none'>;
  customAlphabet: CustomAlphabetMap;
  selectedTextId: string | null;
  zoom: number;
  isFlashing: boolean;
  capacity?: NotebookCapacity;
  suppressStackAndBinding?: boolean;
  onActivateSheet?: () => void;
  onChangeGridRowSpan?: (span: GridRowSpan) => void;
  onSmartPasteText?: (
    blockId: string,
    pastedText: string,
    selectionStart: number,
    selectionEnd: number
  ) => boolean;
  onRequestAiDraw?: (rect: { pageIndex: number; x: number; y: number; width: number; height: number }) => void;
  onSelectTextId: (id: string | null) => void;
  onAddStroke: (stroke: Stroke) => void;
  onAddTextBlock: (block: TextBlock) => void;
  onUpdateTextBlock: (id: string, patch: Partial<TextBlock>) => void;
  onDeleteTextBlock: (id: string) => void;
  onUpdateImage: (id: string, patch: Partial<StickerImage>) => void;
  onDeleteImage: (id: string) => void;
  onUpdatePageMeta: (patch: { title?: string; dateLabel?: string }) => void;
}

export const NotebookSheet: React.FC<NotebookSheetProps> = ({
  page,
  pageIndex,
  totalPages,
  paperStyle,
  gridRowSpan = 2,
  paperTone,
  bindingStyle,
  deskTheme,
  activeTool,
  activeColor,
  activeWidth,
  activeFont,
  activeFramePreset = 'code',
  customAlphabet,
  selectedTextId,
  zoom,
  isFlashing,
  capacity = 12,
  suppressStackAndBinding = false,
  onActivateSheet,
  onChangeGridRowSpan,
  onSmartPasteText,
  onRequestAiDraw,
  onSelectTextId,
  onAddStroke,
  onAddTextBlock,
  onUpdateTextBlock,
  onDeleteTextBlock,
  onUpdateImage,
  onDeleteImage,
  onUpdatePageMeta,
}) => {
  const paperCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bindingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const [aiDragBox, setAiDragBox] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const aiDragBoxRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showFrameMenuForId, setShowFrameMenuForId] = useState<string | null>(null);

  const dragStateRef = useRef<{
    kind: 'text' | 'image' | 'resize-text';
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origWidth?: number;
  } | null>(null);

  const deskColorMap: Record<DeskTheme, string> = {
    linen: '#E7E2D8',
    slate: '#D8DDE3',
    walnut: '#211D19',
  };

  // Clear selection when page changes
  useEffect(() => {
    onSelectTextId(null);
    setSelectedImageId(null);
    setEditingTextId(null);
  }, [page.id, onSelectTextId]);

  // Render Paper Base Canvas
  useEffect(() => {
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PAGE_WIDTH * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawPaperBase(
      ctx,
      page,
      pageIndex,
      totalPages,
      { paperStyle, paperTone, bindingStyle, deskTheme },
      true // skipHeaderText because live inputs render them interactively
    );
    ctx.restore();
  }, [page.id, pageIndex, totalPages, paperStyle, paperTone, bindingStyle, deskTheme]);

  // Render Binding Hardware Overlay Canvas
  useEffect(() => {
    const canvas = bindingCanvasRef.current;
    if (!canvas) return;
    if (suppressStackAndBinding) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Allow 18px overhang on left for spiral rings
    const overhangLeft = 18;
    canvas.width = (PAGE_WIDTH + overhangLeft) * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PAGE_WIDTH + overhangLeft, PAGE_HEIGHT);
    ctx.translate(overhangLeft, 0);
    drawBindingOverlay(ctx, bindingStyle, deskColorMap[deskTheme]);
    ctx.restore();
  }, [bindingStyle, deskTheme, suppressStackAndBinding]);

  // Render Ink Strokes Canvas (committed strokes + active stroke)
  useEffect(() => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PAGE_WIDTH * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    for (const stroke of page.strokes) {
      drawStroke(ctx, stroke);
    }
    if (activeStroke) {
      drawStroke(ctx, activeStroke);
    }
    ctx.restore();
  }, [page.strokes, activeStroke]);

  const toSheetCoords = (clientX: number, clientY: number): StrokePoint => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(PAGE_WIDTH, (clientX - rect.left) / zoom)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, (clientY - rect.top) / zoom)),
      t: Date.now(),
    };
  };

  const isDrawableTool = (tool: ToolType): tool is Stroke['tool'] => {
    return (
      tool === 'pen' ||
      tool === 'pencil' ||
      tool === 'ballpoint' ||
      tool === 'highlighter' ||
      tool === 'eraser' ||
      tool === 'line' ||
      tool === 'rect' ||
      tool === 'circle' ||
      tool === 'arrow'
    );
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const pt = toSheetCoords(e.clientX, e.clientY);

    if (activeTool === 'ai_draw') {
      e.currentTarget.setPointerCapture(e.pointerId);
      const box = { startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y };
      aiDragBoxRef.current = box;
      setAiDragBox(box);
      onSelectTextId(null);
      setSelectedImageId(null);
      setEditingTextId(null);
      return;
    }

    if (activeTool === 'frame_box') {
      const preset = FRAME_STYLE_PRESETS[activeFramePreset];
      const geom = getPaperTextGeometry(paperStyle, gridRowSpan, preset.defaultFont);
      const defaultX = Math.max(48, Math.min(PAGE_WIDTH - 340, pt.x < 300 ? geom.leftX : pt.x));
      const defaultY = Math.max(HEADER_HEIGHT + 8, Math.min(PAGE_HEIGHT - 160, pt.y - 14));
      const fullWidth = Math.max(280, Math.min(540, geom.rightLimit - defaultX));

      const newBlock: TextBlock = {
        id: `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: defaultX,
        y: defaultY,
        width: fullWidth,
        content:
          preset.id === 'code'
            ? '// Kod yoki funksiya yozing\nfunction salom(ism) {\n  return `Salom, ${ism}!`;\n}'
            : '',
        font: preset.defaultFont,
        fontSize: preset.id === 'code' ? 14 : 17,
        color: preset.id === 'code' ? '#0F172A' : activeColor,
        frameStyle: preset.id,
        frameTitle: preset.defaultTitle,
        frameAccentColor: preset.defaultAccent,
        showLineNumbers: preset.id === 'code',
      };
      onAddTextBlock(newBlock);
      onSelectTextId(newBlock.id);
      setEditingTextId(newBlock.id);
      setSelectedImageId(null);
      return;
    }

    if (activeTool === 'text') {
      const geom = getPaperTextGeometry(paperStyle, gridRowSpan, activeFont);
      const isGrid = paperStyle === 'grid';
      const isLined =
        paperStyle === 'lined' || paperStyle === 'poetry' || paperStyle === 'poetry_ornate';

      const defaultX =
        pt.x < 340
          ? geom.leftX
          : isGrid
            ? snapToGridX(pt.x)
            : Math.min(PAGE_WIDTH - 240, Math.max(geom.leftX, pt.x));

      let defaultY: number;
      if (isGrid) {
        const cellRow = Math.floor((pt.y - GRID_START_Y) / GRID_SIZE);
        const topRow = Math.max(0, cellRow - (gridRowSpan === 2 ? 1 : 0));
        defaultY = Math.min(PAGE_HEIGHT - 72, GRID_START_Y + topRow * GRID_SIZE);
      } else if (isLined) {
        const lineRow = Math.max(0, Math.floor((pt.y - HEADER_HEIGHT) / LINE_SPACING));
        defaultY = Math.min(PAGE_HEIGHT - 72, HEADER_HEIGHT + lineRow * LINE_SPACING);
      } else {
        defaultY = Math.min(PAGE_HEIGHT - 80, Math.max(HEADER_HEIGHT + 8, pt.y - 12));
      }

      const fullWidth = Math.max(220, geom.rightLimit - defaultX);
      const isMetallic = Boolean(getMetallicInkConfig(activeColor));

      const newBlock: TextBlock = {
        id: `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: defaultX,
        y: defaultY,
        width: fullWidth,
        content: '',
        font: activeFont,
        fontSize: geom.defaultFontSize,
        color: activeColor,
        isMetallic,
      };
      onAddTextBlock(newBlock);
      onSelectTextId(newBlock.id);
      setEditingTextId(newBlock.id);
      setSelectedImageId(null);
      return;
    }

    if (activeTool === 'select') {
      onSelectTextId(null);
      setSelectedImageId(null);
      setEditingTextId(null);
      setShowFrameMenuForId(null);
      return;
    }

    if (!isDrawableTool(activeTool)) return;

    onSelectTextId(null);
    setSelectedImageId(null);
    setEditingTextId(null);

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const strokeWidth =
      activeTool === 'highlighter'
        ? Math.max(14, activeWidth * 3.2)
        : activeTool === 'eraser'
          ? Math.max(16, activeWidth * 3.5)
          : activeWidth;

    const newStroke: Stroke = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tool: activeTool,
      color: activeColor,
      width: strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.36 : activeTool === 'pencil' ? 0.85 : 1,
      isMetallic:
        activeTool !== 'highlighter' &&
        activeTool !== 'eraser' &&
        activeTool !== 'pencil' &&
        Boolean(getMetallicInkConfig(activeColor)),
      points: [pt],
    };

    activeStrokeRef.current = newStroke;
    setActiveStroke(newStroke);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (aiDragBoxRef.current) {
      const pt = toSheetCoords(e.clientX, e.clientY);
      const next = { ...aiDragBoxRef.current, curX: pt.x, curY: pt.y };
      aiDragBoxRef.current = next;
      setAiDragBox(next);
      return;
    }
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const pt = toSheetCoords(e.clientX, e.clientY);
    const current = activeStrokeRef.current;

    const isShape =
      current.tool === 'line' ||
      current.tool === 'rect' ||
      current.tool === 'circle' ||
      current.tool === 'arrow';

    const updatedPoints = isShape ? [current.points[0], pt] : [...current.points, pt];
    const updated: Stroke = {
      ...current,
      points: updatedPoints,
    };
    activeStrokeRef.current = updated;
    setActiveStroke(updated);
  };

  const finishStroke = () => {
    if (aiDragBoxRef.current) {
      const box = aiDragBoxRef.current;
      aiDragBoxRef.current = null;
      setAiDragBox(null);
      const rawW = Math.abs(box.curX - box.startX);
      const rawH = Math.abs(box.curY - box.startY);
      let x = Math.min(box.startX, box.curX);
      let y = Math.min(box.startY, box.curY);
      let width = rawW;
      let height = rawH;
      if (rawW < 36 || rawH < 36) {
        width = 280;
        height = 220;
        x = Math.max(48, Math.min(PAGE_WIDTH - width - 32, box.startX - width / 2));
        y = Math.max(HEADER_HEIGHT + 8, Math.min(PAGE_HEIGHT - height - 48, box.startY - height / 2));
      } else {
        x = Math.max(32, Math.min(PAGE_WIDTH - 96, x));
        y = Math.max(HEADER_HEIGHT + 4, Math.min(PAGE_HEIGHT - 96, y));
        width = Math.max(96, Math.min(PAGE_WIDTH - x - 28, width));
        height = Math.max(96, Math.min(PAGE_HEIGHT - y - 36, height));
      }
      onRequestAiDraw?.({ pageIndex, x, y, width, height });
      return;
    }

    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    isDrawingRef.current = false;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setActiveStroke(null);
    onAddStroke(finished);
  };

  // Dragging text blocks or images
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.startClientX) / zoom;
      const dy = (e.clientY - drag.startClientY) / zoom;

      if (drag.kind === 'resize-text') {
        const maxAllowed = Math.max(120, PAGE_WIDTH - 28 - drag.origX);
        const rawWidth = Math.max(120, Math.min(maxAllowed, (drag.origWidth ?? 360) + dx));
        const snappedWidth =
          paperStyle === 'grid'
            ? Math.max(GRID_SIZE * 4, Math.min(maxAllowed, Math.round(rawWidth / GRID_SIZE) * GRID_SIZE))
            : Math.round(rawWidth);
        onUpdateTextBlock(drag.id, { width: snappedWidth });
      } else if (drag.kind === 'text') {
        const draggedBlock = page.textBlocks.find((tb) => tb.id === drag.id);
        const isFramed = Boolean(draggedBlock?.frameStyle && draggedBlock.frameStyle !== 'none');
        const isLinedLike =
          paperStyle === 'lined' || paperStyle === 'poetry' || paperStyle === 'poetry_ornate';
        const rawX = Math.max(24, Math.min(PAGE_WIDTH - 100, drag.origX + dx));
        const rawY = Math.max(HEADER_HEIGHT, Math.min(PAGE_HEIGHT - 48, drag.origY + dy));
        onUpdateTextBlock(drag.id, {
          x: paperStyle === 'grid' && !isFramed ? snapToGridX(rawX) : rawX,
          y:
            paperStyle === 'grid' && !isFramed
              ? snapToGridY(rawY)
              : isLinedLike && !isFramed
                ? snapToLinedY(rawY)
                : rawY,
        });
      } else {
        onUpdateImage(drag.id, {
          x: Math.max(24, Math.min(PAGE_WIDTH - 80, drag.origX + dx)),
          y: Math.max(HEADER_HEIGHT, Math.min(PAGE_HEIGHT - 80, drag.origY + dy)),
        });
      }
    };

    const onUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [zoom, paperStyle, page.textBlocks, onUpdateTextBlock, onUpdateImage]);

  const tonePalette = PAPER_TONE_COLORS[paperTone];

  const cursorClass =
    activeTool === 'text' || activeTool === 'frame_box'
      ? 'cursor-text'
      : activeTool === 'select'
        ? 'cursor-default'
        : 'cursor-crosshair';

  const cycleFont = (current: TextFont): TextFont => {
    const order: TextFont[] = ['custom', 'handwriting', 'serif', 'sans', 'mono'];
    return order[(order.indexOf(current) + 1) % order.length];
  };

  const stackLayers = CAPACITY_PRESETS[capacity]?.stackLayers ?? 3;

  return (
    <div
      onPointerDownCapture={() => onActivateSheet?.()}
      className={`relative select-none ${suppressStackAndBinding ? '' : 'mx-auto'}`}
      style={{
        width: Math.round(PAGE_WIDTH * zoom),
        height: Math.round(PAGE_HEIGHT * zoom),
      }}
    >
      <div
        ref={sheetRef}
        className="relative origin-top-left"
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `scale(${zoom})`,
        }}
      >
        {/* 3D Stacked Paper Thickness Underneath (proportional to 12/24/36/96 varaq) */}
        {!suppressStackAndBinding &&
          Array.from({ length: stackLayers }).map((_, idx) => {
            const step = stackLayers - idx;
            const offset = step * 2.2;
            return (
              <div
                key={step}
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translate(${offset}px, ${offset}px)`,
                  backgroundColor:
                    step === stackLayers && capacity === 96
                      ? '#27272A'
                      : step % 2 === 0
                        ? '#D8D1C5'
                        : tonePalette.stackEdge,
                  border: '1px solid rgba(24,24,27,0.1)',
                  boxShadow:
                    step === stackLayers
                      ? deskTheme === 'walnut'
                        ? '16px 26px 48px rgba(0, 0, 0, 0.72), 4px 8px 18px rgba(0, 0, 0, 0.48)'
                        : '14px 24px 44px rgba(24, 24, 27, 0.22), 4px 8px 16px rgba(24, 24, 27, 0.12)'
                      : undefined,
                }}
              />
            );
          })}

        {/* Layer 0: Realistic Paper Base Canvas */}
        <canvas
          ref={paperCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            border: '1px solid rgba(24, 24, 27, 0.15)',
          }}
        />

        {/* Editable Page Title & Date in Header */}
        <input
          type="text"
          value={page.title}
          onChange={(e) => onUpdatePageMeta({ title: e.target.value })}
          placeholder="Sahifa sarlavhasi..."
          className="absolute z-10 bg-transparent border-0 outline-none font-editorial font-semibold text-[16px] text-zinc-900/85 placeholder:text-zinc-400/70 focus:bg-white/40 rounded px-1 -mx-1 transition-colors"
          style={{
            left: MARGIN_X + 14,
            top: HEADER_HEIGHT - 36,
            width: 440,
          }}
        />
        <input
          type="text"
          value={page.dateLabel}
          onChange={(e) => onUpdatePageMeta({ dateLabel: e.target.value })}
          placeholder="Sana"
          className="absolute z-10 bg-transparent border-0 outline-none font-code font-medium text-[12px] text-zinc-900/55 text-right placeholder:text-zinc-400/60 focus:bg-white/40 rounded px-1 transition-colors"
          style={{
            right: 30,
            top: HEADER_HEIGHT - 32,
            width: 140,
          }}
        />

        {/* Layer 1: Live Interactive Ink Canvas */}
        <canvas
          ref={inkCanvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className={`absolute inset-0 w-full h-full z-10 ${cursorClass}`}
          style={{ touchAction: 'none' }}
        />

        {/* AI Draw Target Selection Overlay */}
        {activeTool === 'ai_draw' && !aiDragBox && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-700/90 text-white text-[11px] font-medium shadow-md whitespace-nowrap">
            <Wand2 className="w-3 h-3" />
            <span>Chizma kerakli joyga ramka torting yoki bosing</span>
          </div>
        )}
        {aiDragBox && (
          <div
            className="absolute z-30 pointer-events-none border-2 border-dashed border-blue-600 bg-blue-500/10 rounded-lg flex items-center justify-center"
            style={{
              left: Math.min(aiDragBox.startX, aiDragBox.curX),
              top: Math.min(aiDragBox.startY, aiDragBox.curY),
              width: Math.max(12, Math.abs(aiDragBox.curX - aiDragBox.startX)),
              height: Math.max(12, Math.abs(aiDragBox.curY - aiDragBox.startY)),
            }}
          >
            <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-[10px] font-semibold shadow">
              AI chizma joyi
            </span>
          </div>
        )}

        {/* Layer 2: Pasted Sticker Images */}
        {page.images.map((img) => {
          const isSelected = selectedImageId === img.id;
          return (
            <div
              key={img.id}
              onPointerDown={(e) => {
                if (activeTool !== 'select' && activeTool !== 'text') return;
                e.stopPropagation();
                setSelectedImageId(img.id);
                onSelectTextId(null);
                dragStateRef.current = {
                  kind: 'image',
                  id: img.id,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  origX: img.x,
                  origY: img.y,
                };
              }}
              className={`absolute z-20 group ${
                activeTool === 'select' ? 'cursor-move' : 'pointer-events-none'
              }`}
              style={{
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                transform: `rotate(${img.rotation}deg)`,
              }}
            >
              {/* Masking tape decoration */}
              {img.hasTape && (
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-[68px] h-[18px] pointer-events-none z-10"
                  style={{
                    backgroundColor: 'rgba(245, 232, 188, 0.74)',
                    border: '1px solid rgba(180, 160, 110, 0.3)',
                    transform: 'rotate(-2deg)',
                  }}
                />
              )}
              <div
                className={`w-full h-full bg-white p-1 shadow-md transition-shadow ${
                  isSelected ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                <img
                  src={img.dataUrl}
                  alt="Daftar rasmi"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {isSelected && activeTool === 'select' && (
                <div className="absolute -top-9 left-0 flex items-center gap-1 bg-zinc-900 text-white px-2 py-1 rounded-md shadow-lg text-xs whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateImage(img.id, {
                        width: Math.max(80, img.width - 24),
                        height: Math.max(60, Math.round(img.height * ((img.width - 24) / img.width))),
                      });
                    }}
                    className="p-0.5 hover:bg-zinc-700 rounded"
                    title="Kichiklashtirish"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateImage(img.id, {
                        width: Math.min(540, img.width + 24),
                        height: Math.round(img.height * ((img.width + 24) / img.width)),
                      });
                    }}
                    className="p-0.5 hover:bg-zinc-700 rounded"
                    title="Kattalashtirish"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateImage(img.id, { hasTape: !img.hasTape });
                    }}
                    className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-[11px]"
                  >
                    Skotch
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(img.id);
                      setSelectedImageId(null);
                    }}
                    className="p-0.5 hover:bg-red-600 rounded text-red-300 hover:text-white"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Layer 2: Interactive Typed & Framed Text Blocks */}
        {page.textBlocks.map((block) => {
          const isSelected = selectedTextId === block.id;
          const isEditing = editingTextId === block.id;
          const interactive = activeTool === 'select' || activeTool === 'text' || activeTool === 'frame_box';
          const hasFrame = Boolean(block.frameStyle && block.frameStyle !== 'none');
          const frameStyle = block.frameStyle ?? 'none';
          const framePreset = frameStyle !== 'none' ? FRAME_STYLE_PRESETS[frameStyle] : null;
          const frameAccent = block.frameAccentColor || framePreset?.defaultAccent || '#1D4ED8';
          const isCodeFrame = frameStyle === 'code';
          const showLineNums = isCodeFrame && block.showLineNumbers !== false;
          const isCustomFont = block.font === 'custom' && !hasFrame;
          const effectiveFont: TextFont = hasFrame && block.font === 'custom' ? 'handwriting' : block.font;

          const isGrid = paperStyle === 'grid';
          const isLined =
            paperStyle === 'lined' || paperStyle === 'poetry' || paperStyle === 'poetry_ornate';
          const isRuled = !hasFrame && (isGrid || isLined);
          const rowHeight = isGrid
            ? gridRowSpan * GRID_SIZE
            : isLined
              ? LINE_SPACING
              : undefined;
          const displayX = isGrid && !hasFrame ? snapToGridX(block.x) : block.x;
          const displayY = isGrid && !hasFrame
            ? snapToGridY(block.y)
            : isLined && !hasFrame
              ? snapToLinedY(block.y)
              : block.y;
          const baselineShift =
            isRuled && rowHeight && !isCustomFont
              ? getTextareaGridBaselineShift(effectiveFont, block.fontSize, rowHeight) -
                (isLined ? 1 : 0)
              : 0;

          const frameLineHeight = hasFrame
            ? Math.round(block.fontSize * (isCodeFrame ? 1.48 : 1.44))
            : rowHeight ?? 1.42;

          const logicalLines = (block.content || '').split('\n');

          return (
            <div
              key={block.id}
              onPointerDown={(e) => {
                if (!interactive) return;
                e.stopPropagation();
                onSelectTextId(block.id);
                setSelectedImageId(null);
                if (activeTool === 'text' || activeTool === 'frame_box') {
                  setEditingTextId(block.id);
                }
              }}
              className={`absolute z-20 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
              style={{
                left: displayX,
                top: displayY,
                width: block.width,
              }}
            >
              {/* Floating format bar when selected */}
              {isSelected && interactive && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-9 left-0 flex items-center gap-1 bg-zinc-900 text-white px-2 py-1 rounded-md shadow-lg text-xs whitespace-nowrap z-30"
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      dragStateRef.current = {
                        kind: 'text',
                        id: block.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        origX: displayX,
                        origY: displayY,
                      };
                    }}
                    className="p-0.5 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing"
                    title="Surish"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateTextBlock(block.id, { font: cycleFont(block.font) })}
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-zinc-700 rounded text-[11px]"
                    title="Shriftni almashtirish"
                  >
                    <Type className="w-3 h-3" />
                    <span>{FONT_MAP[effectiveFont].label}</span>
                  </button>

                  {/* Frame / Code Box Switcher */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowFrameMenuForId((cur) => (cur === block.id ? null : block.id))
                      }
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                        hasFrame
                          ? 'bg-blue-700 text-white'
                          : 'hover:bg-zinc-700 text-zinc-200'
                      }`}
                      title="Kod yoki maxsus ramka qo‘yish"
                    >
                      {isCodeFrame ? (
                        <Code2 className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      <span>{framePreset ? framePreset.label : 'Ramka'}</span>
                    </button>

                    {showFrameMenuForId === block.id && (
                      <div className="absolute left-0 top-full mt-1.5 w-48 bg-white text-zinc-900 border border-zinc-200 rounded-xl shadow-xl p-1.5 z-50 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateTextBlock(block.id, { frameStyle: 'none' });
                            setShowFrameMenuForId(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-zinc-100 ${
                            !hasFrame ? 'bg-zinc-100 font-semibold' : ''
                          }`}
                        >
                          Ramkasiz (Oddiy matn)
                        </button>
                        {(Object.keys(FRAME_STYLE_PRESETS) as Exclude<FrameStyle, 'none'>[]).map(
                          (fKey) => {
                            const fp = FRAME_STYLE_PRESETS[fKey];
                            const active = frameStyle === fKey;
                            return (
                              <button
                                key={fKey}
                                type="button"
                                onClick={() => {
                                  onUpdateTextBlock(block.id, {
                                    frameStyle: fKey,
                                    frameTitle: block.frameTitle || fp.defaultTitle,
                                    frameAccentColor: fp.defaultAccent,
                                    font: fKey === 'code' ? 'mono' : block.font,
                                    fontSize: fKey === 'code' ? Math.min(16, block.fontSize) : block.fontSize,
                                    showLineNumbers: fKey === 'code',
                                  });
                                  setShowFrameMenuForId(null);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between hover:bg-zinc-100 ${
                                  active ? 'bg-blue-50 text-blue-800 font-semibold' : ''
                                }`}
                              >
                                <span>{fp.label}</span>
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: fp.defaultAccent }}
                                />
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  {isCodeFrame && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTextBlock(block.id, { showLineNumbers: !showLineNums })
                      }
                      className={`p-0.5 rounded ${
                        showLineNums ? 'bg-zinc-700 text-sky-300' : 'hover:bg-zinc-700 text-zinc-400'
                      }`}
                      title="Qator raqamlarini yoqish/o‘chirish"
                    >
                      <Hash className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isGrid && !hasFrame && onChangeGridRowSpan && (
                    <button
                      type="button"
                      onClick={() => onChangeGridRowSpan(gridRowSpan === 2 ? 1 : 2)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] font-code text-sky-300"
                      title="Matematika katak oralig‘ini almashtirish"
                    >
                      {gridRowSpan} katak
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTextBlock(block.id, { fontSize: Math.max(11, block.fontSize - 2) })
                    }
                    className="p-0.5 hover:bg-zinc-700 rounded"
                    title="Kichikroq shrift"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-code text-[10px] px-0.5 tabular-nums">{block.fontSize}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTextBlock(block.id, { fontSize: Math.min(44, block.fontSize + 2) })
                    }
                    className="p-0.5 hover:bg-zinc-700 rounded"
                    title="Kattaroq shrift"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const isPoetry = paperStyle === 'poetry' || paperStyle === 'poetry_ornate';
                      const rightEdge = isGrid ? 740 : isPoetry ? PAGE_WIDTH - 64 : PAGE_WIDTH - 34;
                      const leftAligned = isGrid ? 72 : isPoetry ? 96 : isLined ? MARGIN_X + 12 : 64;
                      onUpdateTextBlock(block.id, {
                        x: leftAligned,
                        width: Math.max(220, rightEdge - leftAligned),
                      });
                    }}
                    className="p-0.5 hover:bg-zinc-700 rounded"
                    title="Ramkani daftar eniga kengaytirish"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                  {block.pasteMeta?.isPasted && (
                    <span
                      title={block.pasteMeta.summary}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        block.pasteMeta.status === 'human_verified'
                          ? 'bg-blue-900/70 text-blue-200'
                          : 'bg-red-900/70 text-red-200'
                      }`}
                    >
                      {block.pasteMeta.status === 'human_verified' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      <span>Paste</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTextBlock(block.id);
                      onSelectTextId(null);
                      setEditingTextId(null);
                      setShowFrameMenuForId(null);
                    }}
                    className="p-0.5 hover:bg-red-600 rounded text-red-300 hover:text-white ml-0.5"
                    title="Matnni o‘chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Right-edge resize handle when selected */}
              {isSelected && interactive && (
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragStateRef.current = {
                      kind: 'resize-text',
                      id: block.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: displayX,
                      origY: displayY,
                      origWidth: block.width,
                    };
                  }}
                  title="Matn ramkasi enini o‘zgartirish"
                  className="absolute top-1 bottom-1 -right-1.5 w-3 cursor-ew-resize flex items-center justify-center z-30 group"
                >
                  <div className="w-1 h-6 rounded-full bg-blue-500/75 group-hover:bg-blue-700 transition-colors" />
                </div>
              )}

              {isCustomFont ? (
                <div className="relative">
                  <CustomTextCanvas
                    block={block}
                    customAlphabet={customAlphabet}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    gridRowHeight={rowHeight}
                  />
                  <textarea
                    value={block.content}
                    autoFocus={isEditing}
                    onFocus={() => {
                      onSelectTextId(block.id);
                      setEditingTextId(block.id);
                    }}
                    onBlur={() => {
                      setEditingTextId((prev) => (prev === block.id ? null : prev));
                    }}
                    onPaste={(e) => {
                      if (!onSmartPasteText) return;
                      const raw = e.clipboardData?.getData('text/plain');
                      if (!raw) return;
                      const cleaned = normalizePastedText(raw);
                      const start = e.currentTarget.selectionStart ?? block.content.length;
                      const end = e.currentTarget.selectionEnd ?? block.content.length;
                      const handled = onSmartPasteText(block.id, cleaned, start, end);
                      if (handled) e.preventDefault();
                    }}
                    onChange={(e) => {
                      onUpdateTextBlock(block.id, { content: e.target.value });
                    }}
                    aria-label="Mening yozuvim matni"
                    className="absolute inset-0 w-full h-full resize-none opacity-0 cursor-text"
                  />
                </div>
              ) : hasFrame && framePreset ? (
                <div
                  className={`overflow-hidden shadow-xs ${
                    frameStyle === 'double_border' ? 'rounded-[4px] p-[3px]' : 'rounded-lg'
                  }`}
                  style={{
                    backgroundColor: isCodeFrame
                      ? '#F8FAFC'
                      : frameStyle === 'note'
                        ? '#FFFBEB'
                        : `${frameAccent}0E`,
                    border: `${frameStyle === 'double_border' ? 2 : 1.5}px ${
                      frameStyle === 'dashed' ? 'dashed' : 'solid'
                    } ${frameAccent}`,
                    borderLeftWidth:
                      frameStyle === 'rule' || frameStyle === 'formula' ? 4.5 : undefined,
                  }}
                >
                  <div
                    className={
                      frameStyle === 'double_border'
                        ? 'border border-current/25 rounded-[2px] overflow-hidden'
                        : ''
                    }
                    style={{ borderColor: frameStyle === 'double_border' ? `${frameAccent}66` : undefined }}
                  >
                    {/* Frame Header Strip with Editable Title */}
                    <div
                      className="h-[30px] px-3 flex items-center gap-2"
                      style={{
                        backgroundColor: isCodeFrame ? frameAccent : `${frameAccent}1E`,
                      }}
                    >
                      {isCodeFrame && (
                        <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                      )}
                      <input
                        type="text"
                        value={block.frameTitle ?? framePreset.defaultTitle}
                        onChange={(e) => onUpdateTextBlock(block.id, { frameTitle: e.target.value })}
                        placeholder={framePreset.defaultTitle}
                        className={`bg-transparent border-0 outline-none text-[11px] w-full ${
                          isCodeFrame
                            ? 'font-code font-semibold text-slate-50 placeholder:text-slate-400'
                            : 'font-sans font-bold uppercase tracking-wide placeholder:opacity-60'
                        }`}
                        style={{
                          color: isCodeFrame ? '#F8FAFC' : frameAccent,
                        }}
                      />
                    </div>

                    {/* Framed Body (+ optional Line Numbers for Code) */}
                    <div className="flex items-stretch">
                      {showLineNums && (
                        <div
                          className="w-[34px] shrink-0 py-2.5 pr-1.5 text-right select-none font-code text-[11px] text-slate-400 bg-slate-900/[0.04] border-r border-slate-200/70"
                          style={{ lineHeight: `${frameLineHeight}px` }}
                          aria-hidden="true"
                        >
                          {logicalLines.map((_, lineIdx) => (
                            <div key={lineIdx}>{String(lineIdx + 1).padStart(2, '0')}</div>
                          ))}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <AutoSizedTextarea
                          value={block.content}
                          width={block.width - (showLineNums ? 34 : 0)}
                          fontFamily={FONT_MAP[effectiveFont].css}
                          fontWeight={effectiveFont === 'handwriting' ? 600 : 400}
                          fontSize={block.fontSize}
                          lineHeight={frameLineHeight}
                          color={block.color}
                          isMetallic={block.isMetallic}
                          padding="10px 14px 12px 14px"
                          autoFocus={isEditing}
                          isRuled={false}
                          isSelected={false}
                          interactive={interactive}
                          onFocus={() => {
                            onSelectTextId(block.id);
                            setEditingTextId(block.id);
                          }}
                          onChangeValue={(val) => onUpdateTextBlock(block.id, { content: val })}
                          onPasteText={
                            onSmartPasteText
                              ? (pasted, start, end) =>
                                  onSmartPasteText(block.id, pasted, start, end)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <AutoSizedTextarea
                  value={block.content}
                  width={block.width}
                  fontFamily={FONT_MAP[effectiveFont].css}
                  fontWeight={effectiveFont === 'handwriting' ? 600 : 400}
                  fontSize={block.fontSize}
                  lineHeight={rowHeight ?? 1.42}
                  color={block.color}
                  isMetallic={block.isMetallic}
                  padding={isRuled ? '0 6px' : '4px 6px'}
                  transform={baselineShift ? `translateY(${baselineShift}px)` : undefined}
                  autoFocus={isEditing}
                  isRuled={isRuled}
                  isSelected={isSelected}
                  interactive={interactive}
                  onFocus={() => {
                    onSelectTextId(block.id);
                    setEditingTextId(block.id);
                  }}
                  onChangeValue={(val) => onUpdateTextBlock(block.id, { content: val })}
                  onPasteText={
                    onSmartPasteText
                      ? (pasted, start, end) => onSmartPasteText(block.id, pasted, start, end)
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}

        {/* Layer 3: Realistic Binding Hardware Overlay (Spiral rings / Book spine) */}
        {!suppressStackAndBinding && (
          <canvas
            ref={bindingCanvasRef}
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{
              left: -18,
              width: PAGE_WIDTH + 18,
              height: PAGE_HEIGHT,
            }}
          />
        )}

        {/* Camera Shutter Flash Effect on Screenshot */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-shutter" />
        )}
      </div>
    </div>
  );
};
