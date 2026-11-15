import React, { useEffect, useRef } from 'react';
import { FilePlus2 } from 'lucide-react';
import {
  BindingStyle,
  CAPACITY_PRESETS,
  CustomAlphabetMap,
  DeskTheme,
  FrameStyle,
  GridRowSpan,
  NotebookCapacity,
  NotebookPage,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAPER_TONE_COLORS,
  PaperStyle,
  PaperTone,
  StickerImage,
  Stroke,
  TextBlock,
  TextFont,
  ToolType,
} from '../types/notebook';
import { drawPaperBase } from '../utils/notebookRenderer';
import { NotebookSheet } from './NotebookSheet';

interface NotebookSpreadViewProps {
  leftPage: NotebookPage;
  leftIndex: number;
  rightPage: NotebookPage | null;
  rightIndex: number;
  totalPages: number;
  activePageIndex: number;
  paperStyle: PaperStyle;
  gridRowSpan?: GridRowSpan;
  paperTone: PaperTone;
  bindingStyle: BindingStyle;
  deskTheme: DeskTheme;
  capacity: NotebookCapacity;
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  activeFont: TextFont;
  activeFramePreset?: Exclude<FrameStyle, 'none'>;
  customAlphabet: CustomAlphabetMap;
  selectedTextId: string | null;
  zoom: number;
  isFlashing: boolean;
  readOnly?: boolean;
  onActivatePage: (index: number) => void;
  onAddOppositePage?: () => void;
  onChangeGridRowSpan?: (span: GridRowSpan) => void;
  onSmartPasteText?: (
    pageIndex: number,
    blockId: string,
    pastedText: string,
    selectionStart: number,
    selectionEnd: number
  ) => boolean;
  onRequestAiDraw?: (rect: { pageIndex: number; x: number; y: number; width: number; height: number }) => void;
  onSelectTextId: (id: string | null) => void;
  onAddStroke: (pageIndex: number, stroke: Stroke) => void;
  onAddTextBlock: (pageIndex: number, block: TextBlock) => void;
  onUpdateTextBlock: (pageIndex: number, id: string, patch: Partial<TextBlock>) => void;
  onDeleteTextBlock: (pageIndex: number, id: string) => void;
  onUpdateImage: (pageIndex: number, id: string, patch: Partial<StickerImage>) => void;
  onDeleteImage: (pageIndex: number, id: string) => void;
  onUpdatePageMeta: (pageIndex: number, patch: { title?: string; dateLabel?: string }) => void;
}

export const NotebookSpreadView: React.FC<NotebookSpreadViewProps> = ({
  leftPage,
  leftIndex,
  rightPage,
  rightIndex,
  totalPages,
  paperStyle,
  gridRowSpan = 2,
  paperTone,
  bindingStyle,
  deskTheme,
  capacity,
  activeTool,
  activeColor,
  activeWidth,
  activeFont,
  activeFramePreset = 'code',
  customAlphabet,
  selectedTextId,
  zoom,
  isFlashing,
  readOnly = false,
  onActivatePage,
  onAddOppositePage,
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
  const gutterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emptyRightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stackLayers = CAPACITY_PRESETS[capacity]?.stackLayers ?? 3;
  const tonePalette = PAPER_TONE_COLORS[paperTone];

  const spreadW = Math.round(PAGE_WIDTH * 2 * zoom);
  const spreadH = Math.round(PAGE_HEIGHT * zoom);

  // Draw matching ruled/grid paper background for empty opposite sheet if page count is odd
  useEffect(() => {
    if (rightPage) return;
    const canvas = emptyRightCanvasRef.current;
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
      { id: 'opposite_preview', title: '', dateLabel: '', strokes: [], textBlocks: [], images: [] },
      rightIndex,
      totalPages + 1,
      { paperStyle, gridRowSpan, paperTone, bindingStyle, deskTheme },
      true
    );
    ctx.restore();
  }, [rightPage, rightIndex, totalPages, paperStyle, gridRowSpan, paperTone, bindingStyle, deskTheme]);

  // Draw center spine gutter shadow + staples or spiral bridge
  useEffect(() => {
    const canvas = gutterCanvasRef.current;
    if (!canvas) return;
    const gutterW = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = gutterW * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, gutterW, PAGE_HEIGHT);

    const mid = gutterW / 2;
    const grad = ctx.createLinearGradient(0, 0, gutterW, 0);
    grad.addColorStop(0, 'rgba(24,24,27,0)');
    grad.addColorStop(0.42, 'rgba(24,24,27,0.14)');
    grad.addColorStop(0.5, 'rgba(24,24,27,0.34)');
    grad.addColorStop(0.58, 'rgba(24,24,27,0.14)');
    grad.addColorStop(1, 'rgba(24,24,27,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gutterW, PAGE_HEIGHT);

    if (bindingStyle === 'spiral') {
      const holeCount = 24;
      const startY = 48;
      const endY = PAGE_HEIGHT - 48;
      const step = (endY - startY) / (holeCount - 1);
      for (let i = 0; i < holeCount; i++) {
        const cy = startY + i * step;
        [mid - 18, mid + 18].forEach((hx) => {
          ctx.beginPath();
          ctx.ellipse(hx, cy, 5.5, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#3F3F46';
          ctx.fill();
        });
        const ringGrad = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
        ringGrad.addColorStop(0, '#52525B');
        ringGrad.addColorStop(0.4, '#F4F4F5');
        ringGrad.addColorStop(1, '#3F3F46');
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(mid - 18, cy - 1.5);
        ctx.quadraticCurveTo(mid, cy - 6, mid + 18, cy - 1.5);
        ctx.stroke();
      }
    } else if (bindingStyle === 'stitched' && capacity !== 96) {
      [280, PAGE_HEIGHT - 280].forEach((sy) => {
        ctx.fillStyle = '#D4D4D8';
        ctx.strokeStyle = '#52525B';
        ctx.lineWidth = 1;
        ctx.fillRect(mid - 2, sy, 4, 42);
        ctx.strokeRect(mid - 2, sy, 4, 42);
      });
    }

    ctx.restore();
  }, [bindingStyle, capacity]);

  return (
    <div
      className="relative mx-auto select-none"
      style={{
        width: spreadW,
        height: spreadH,
      }}
    >
      {/* 3D Stacked Paper Thickness Underneath Spread */}
      {Array.from({ length: stackLayers }).map((_, idx) => {
        const step = stackLayers - idx;
        const offset = Math.round(step * 2.2 * zoom);
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
                    ? '18px 28px 54px rgba(0, 0, 0, 0.72)'
                    : '16px 26px 48px rgba(24, 24, 27, 0.24)'
                  : undefined,
            }}
          />
        );
      })}

      {/* Side-by-side Pages */}
      <div className="relative flex items-start">
        <NotebookSheet
          page={leftPage}
          pageIndex={leftIndex}
          totalPages={totalPages}
          paperStyle={paperStyle}
          gridRowSpan={gridRowSpan}
          paperTone={paperTone}
          bindingStyle={bindingStyle}
          deskTheme={deskTheme}
          capacity={capacity}
          suppressStackAndBinding
          activeTool={activeTool}
          activeColor={activeColor}
          activeWidth={activeWidth}
          activeFont={activeFont}
          activeFramePreset={activeFramePreset}
          customAlphabet={customAlphabet}
          selectedTextId={selectedTextId}
          zoom={zoom}
          isFlashing={isFlashing}
          readOnly={readOnly}
          onActivateSheet={() => onActivatePage(leftIndex)}
          onChangeGridRowSpan={onChangeGridRowSpan}
          onSmartPasteText={
            onSmartPasteText
              ? (blockId, text, s, e) => onSmartPasteText(leftIndex, blockId, text, s, e)
              : undefined
          }
          onRequestAiDraw={onRequestAiDraw}
          onSelectTextId={onSelectTextId}
          onAddStroke={(s) => onAddStroke(leftIndex, s)}
          onAddTextBlock={(tb) => onAddTextBlock(leftIndex, tb)}
          onUpdateTextBlock={(id, patch) => onUpdateTextBlock(leftIndex, id, patch)}
          onDeleteTextBlock={(id) => onDeleteTextBlock(leftIndex, id)}
          onUpdateImage={(id, patch) => onUpdateImage(leftIndex, id, patch)}
          onDeleteImage={(id) => onDeleteImage(leftIndex, id)}
          onUpdatePageMeta={(patch) => onUpdatePageMeta(leftIndex, patch)}
        />

        {rightPage ? (
          <NotebookSheet
            page={rightPage}
            pageIndex={rightIndex}
            totalPages={totalPages}
            paperStyle={paperStyle}
            gridRowSpan={gridRowSpan}
            paperTone={paperTone}
            bindingStyle={bindingStyle}
            deskTheme={deskTheme}
            capacity={capacity}
            suppressStackAndBinding
            activeTool={activeTool}
            activeColor={activeColor}
            activeWidth={activeWidth}
            activeFont={activeFont}
            activeFramePreset={activeFramePreset}
            customAlphabet={customAlphabet}
            selectedTextId={selectedTextId}
            zoom={zoom}
            isFlashing={isFlashing}
            readOnly={readOnly}
            onActivateSheet={() => onActivatePage(rightIndex)}
            onChangeGridRowSpan={onChangeGridRowSpan}
            onSmartPasteText={
              onSmartPasteText
                ? (blockId, text, s, e) => onSmartPasteText(rightIndex, blockId, text, s, e)
                : undefined
            }
            onRequestAiDraw={onRequestAiDraw}
            onSelectTextId={onSelectTextId}
            onAddStroke={(s) => onAddStroke(rightIndex, s)}
            onAddTextBlock={(tb) => onAddTextBlock(rightIndex, tb)}
            onUpdateTextBlock={(id, patch) => onUpdateTextBlock(rightIndex, id, patch)}
            onDeleteTextBlock={(id) => onDeleteTextBlock(rightIndex, id)}
            onUpdateImage={(id, patch) => onUpdateImage(rightIndex, id, patch)}
            onDeleteImage={(id) => onDeleteImage(rightIndex, id)}
            onUpdatePageMeta={(patch) => onUpdatePageMeta(rightIndex, patch)}
          />
        ) : (
          <div
            onClick={() => {
              if (!readOnly) onAddOppositePage?.();
            }}
            role={readOnly ? undefined : 'button'}
            tabIndex={readOnly ? undefined : 0}
            onKeyDown={(e) => {
              if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onAddOppositePage?.();
              }
            }}
            className={`relative group overflow-hidden ${readOnly ? '' : 'cursor-pointer'}`}
            style={{
              width: Math.round(PAGE_WIDTH * zoom),
              height: spreadH,
              backgroundColor: tonePalette.bg,
              border: '1px solid rgba(24,24,27,0.14)',
            }}
          >
            <canvas
              ref={emptyRightCanvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                readOnly ? 'opacity-90' : 'opacity-70 group-hover:opacity-95 transition-opacity'
              }`}
            />
            {!readOnly && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/5 group-hover:bg-blue-600/5 transition-colors">
                <div className="bg-white/95 border border-zinc-200 shadow-lg rounded-xl px-5 py-4 flex flex-col items-center gap-2 max-w-xs">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                    <FilePlus2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-sm font-semibold text-zinc-900">
                    O‘ng tomon sahifasi mavjud emas
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Daftar toq sahifada tugagan. O‘ng tomonni ham ochish uchun bosing.
                  </p>
                  <span className="mt-1 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold">
                    + O‘ng sahifani qo‘shish
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center Spine Gutter Overlay */}
        <canvas
          ref={gutterCanvasRef}
          className="absolute top-0 bottom-0 pointer-events-none z-30"
          style={{
            left: Math.round((PAGE_WIDTH - 32) * zoom),
            width: Math.round(64 * zoom),
            height: spreadH,
          }}
        />
      </div>
    </div>
  );
};
