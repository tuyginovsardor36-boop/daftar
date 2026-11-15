import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  ALPHABET_GROUPS,
  CustomAlphabetMap,
  CustomGlyph,
  GlyphStroke,
} from '../types/notebook';
import { drawCustomGlyph, renderCustomHandwritingText } from '../utils/notebookRenderer';

interface AlphabetStudioModalProps {
  isOpen: boolean;
  alphabet: CustomAlphabetMap;
  onSaveGlyph: (char: string, glyph: CustomGlyph | null) => void;
  onResetAll: () => void;
  onClose: () => void;
}

const PAD_SIZE = 260;

const GlyphMiniPreview: React.FC<{ glyph?: CustomGlyph; fallbackChar: string; active: boolean }> = ({
  glyph,
  fallbackChar,
  active,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasStrokes = Boolean(glyph && glyph.strokes.length > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes || !glyph) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sz = 34;
    canvas.width = sz * dpr;
    canvas.height = sz * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, sz, sz);
    drawCustomGlyph(ctx, glyph, 2, 2, sz - 4, active ? '#1D4ED8' : '#18181B');
  }, [glyph, hasStrokes, active]);

  if (!hasStrokes) {
    return (
      <span className="text-sm font-handwriting text-zinc-400 leading-none select-none">
        {fallbackChar}
      </span>
    );
  }

  return <canvas ref={canvasRef} className="w-[34px] h-[34px] pointer-events-none" />;
};

export const AlphabetStudioModal: React.FC<AlphabetStudioModalProps> = ({
  isOpen,
  alphabet,
  onSaveGlyph,
  onResetAll,
  onClose,
}) => {
  const [groupIdx, setGroupIdx] = useState(0);
  const [selectedChar, setSelectedChar] = useState('a');
  const [showGhost, setShowGhost] = useState(true);
  const [strokeThickness, setStrokeThickness] = useState(0.036);
  const [testPhrase, setTestPhrase] = useState('Salom! Bu mening yozuvim.');
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const padCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<{ x: number; y: number }[]>([]);
  const [liveStroke, setLiveStroke] = useState<GlyphStroke | null>(null);

  const activeGroup = ALPHABET_GROUPS[groupIdx];
  const allChars = ALPHABET_GROUPS.flatMap((g) => g.chars);
  const drawnCount = allChars.filter((c) => alphabet[c]?.strokes?.length).length;

  const currentGlyph = alphabet[selectedChar];
  const currentStrokes = currentGlyph?.strokes ?? [];

  // Redraw large glyph pad
  useEffect(() => {
    if (!isOpen) return;
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PAD_SIZE * dpr;
    canvas.height = PAD_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PAD_SIZE, PAD_SIZE);

    // Cream notebook card background
    ctx.fillStyle = '#FCF9F2';
    ctx.fillRect(0, 0, PAD_SIZE, PAD_SIZE);

    // Subtle vertical center guide
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_SIZE / 2, 12);
    ctx.lineTo(PAD_SIZE / 2, PAD_SIZE - 12);
    ctx.stroke();

    // Horizontal typography guidelines: ascender, x-height, baseline, descender
    const ascY = PAD_SIZE * 0.22;
    const xHeightY = PAD_SIZE * 0.42;
    const baseY = PAD_SIZE * 0.72;
    const descY = PAD_SIZE * 0.88;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
    [ascY, xHeightY, descY].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(PAD_SIZE - 12, y);
      ctx.stroke();
    });

    // Baseline solid crimson guide
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(12, baseY);
    ctx.lineTo(PAD_SIZE - 12, baseY);
    ctx.stroke();

    // Ghost letter template
    if (showGhost) {
      ctx.save();
      ctx.fillStyle = 'rgba(24, 24, 27, 0.08)';
      ctx.font = "600 156px 'Caveat', cursive";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(selectedChar, PAD_SIZE / 2, baseY);
      ctx.restore();
    }

    // Committed strokes
    const tempGlyph: CustomGlyph = {
      char: selectedChar,
      strokes: liveStroke ? [...currentStrokes, liveStroke] : currentStrokes,
      minX: 0,
      maxX: 1,
    };
    drawCustomGlyph(ctx, tempGlyph, 0, 0, PAD_SIZE, '#18181B');

    ctx.restore();
  }, [isOpen, selectedChar, currentStrokes, liveStroke, showGhost]);

  // Redraw live test strip
  useEffect(() => {
    if (!isOpen) return;
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 520;
    const h = 58;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FCF9F2';
    ctx.fillRect(0, 0, w, h);

    // Single ruled line
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 42);
    ctx.lineTo(w - 12, 42);
    ctx.stroke();

    renderCustomHandwritingText(
      ctx,
      testPhrase || 'Namuna yozuv...',
      14,
      12,
      w - 28,
      24,
      '#1D4ED8',
      alphabet,
      false
    );
    ctx.restore();
  }, [isOpen, testPhrase, alphabet]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commitStrokes = (strokes: GlyphStroke[]) => {
    if (strokes.length === 0) {
      onSaveGlyph(selectedChar, null);
      return;
    }
    let minX = 1;
    let maxX = 0;
    for (const s of strokes) {
      for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
    }
    onSaveGlyph(selectedChar, {
      char: selectedChar,
      strokes,
      minX: Math.max(0, minX),
      maxX: Math.min(1, maxX),
    });
  };

  const toNormCoords = (clientX: number, clientY: number) => {
    const rect = padCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width)),
      y: Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height)),
    };
  };

  const handlePadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = toNormCoords(e.clientX, e.clientY);
    activePointsRef.current = [pt];
    setLiveStroke({ points: [pt], width: strokeThickness });
  };

  const handlePadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = toNormCoords(e.clientX, e.clientY);
    activePointsRef.current = [...activePointsRef.current, pt];
    setLiveStroke({ points: activePointsRef.current, width: strokeThickness });
  };

  const handlePadPointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const finished: GlyphStroke = {
      points: activePointsRef.current,
      width: strokeThickness,
    };
    activePointsRef.current = [];
    setLiveStroke(null);
    commitStrokes([...currentStrokes, finished]);
  };

  const handleUndoStroke = () => {
    if (currentStrokes.length === 0) return;
    commitStrokes(currentStrokes.slice(0, -1));
  };

  const handleClearChar = () => {
    commitStrokes([]);
  };

  const stepChar = (dir: -1 | 1) => {
    const idx = activeGroup.chars.indexOf(selectedChar);
    if (idx === -1) {
      setSelectedChar(activeGroup.chars[0]);
      return;
    }
    const nextIdx = (idx + dir + activeGroup.chars.length) % activeGroup.chars.length;
    setSelectedChar(activeGroup.chars[nextIdx]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#F9F8F5] border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Alifbo Studiyasi — Shaxsiy qo‘lyozma kiritish
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Harflarni qo‘lda chizing — klaviaturada yozganingizda daftar varag‘iga o‘zingizning yozuv uslubingizda tushadi
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-code tabular-nums text-zinc-500">
              {drawnCount} / {allChars.length} chizildi
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto studio-scroll grid grid-cols-1 md:grid-cols-12">
          {/* Left: Alphabet Picker Grid */}
          <div className="md:col-span-6 p-5 border-b md:border-b-0 md:border-r border-zinc-200 flex flex-col gap-4">
            {/* Group Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg">
              {ALPHABET_GROUPS.map((grp, idx) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => {
                    setGroupIdx(idx);
                    setSelectedChar(grp.chars[0]);
                  }}
                  className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    groupIdx === idx
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>

            {/* Character Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
              {activeGroup.chars.map((ch) => {
                const isSelected = selectedChar === ch;
                const glyph = alphabet[ch];
                const isDrawn = Boolean(glyph && glyph.strokes.length > 0);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChar(ch)}
                    className={`relative h-12 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : isDrawn
                          ? 'border-zinc-300 bg-white hover:border-zinc-400'
                          : 'border-zinc-200/80 bg-zinc-50/70 hover:bg-white'
                    }`}
                  >
                    <GlyphMiniPreview glyph={glyph} fallbackChar={ch} active={isSelected} />
                    <span className="absolute top-0.5 left-1 text-[9px] font-code text-zinc-400 leading-none">
                      {ch}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Reset All Option */}
            <div className="mt-auto pt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Qizil chiziq — yozuv asosi (baseline)</span>
              {confirmResetAll ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAll();
                      setConfirmResetAll(false);
                    }}
                    className="text-red-600 font-medium hover:underline cursor-pointer"
                  >
                    Hammasini o‘chirish
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(false)}
                    className="text-zinc-600 hover:text-zinc-900 cursor-pointer"
                  >
                    Bekor
                  </button>
                </div>
              ) : (
                drawnCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(true)}
                    className="text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Alifboni tozalash
                  </button>
                )
              )}
            </div>
          </div>

          {/* Right: Ruled Glyph Drawing Pad */}
          <div className="md:col-span-6 p-5 bg-white flex flex-col items-center justify-between gap-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Tanlangan belgi:</span>
                <span className="text-lg font-bold font-code text-zinc-900">
                  “{selectedChar}”
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGhost((g) => !g)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                {showGhost ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Shablon</span>
              </button>
            </div>

            {/* Drawing Pad */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-300 shadow-sm">
              <canvas
                ref={padCanvasRef}
                onPointerDown={handlePadPointerDown}
                onPointerMove={handlePadPointerMove}
                onPointerUp={handlePadPointerUp}
                onPointerCancel={handlePadPointerUp}
                className="w-[260px] h-[260px] cursor-crosshair block"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Pad Toolbar */}
            <div className="w-full flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndoStroke}
                  disabled={currentStrokes.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ortga</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearChar}
                  disabled={currentStrokes.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Tozalash</span>
                </button>
              </div>

              {/* Pen thickness */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md">
                {[
                  { val: 0.026, label: 'Ingichka' },
                  { val: 0.038, label: 'O‘rta' },
                  { val: 0.054, label: 'Qalin' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setStrokeThickness(opt.val)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                      Math.abs(strokeThickness - opt.val) < 0.005
                        ? 'bg-white text-zinc-900 font-medium shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prev / Next Navigation */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => stepChar(-1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Oldingi harf</span>
              </button>

              <button
                type="button"
                onClick={() => stepChar(1)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
              >
                <span>Keyingi harf</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Live Test Strip */}
        <div className="px-6 py-3.5 bg-[#F9F8F5] border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-zinc-700 whitespace-nowrap">Sinov:</span>
            <input
              type="text"
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
              placeholder="So‘z yozib ko‘ring..."
              className="px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-md outline-none focus:border-blue-600 w-full sm:w-52"
            />
          </div>

          <canvas
            ref={testCanvasRef}
            className="w-full sm:w-[440px] h-[50px] rounded border border-zinc-300 bg-[#FCF9F2]"
          />

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tayyor
          </button>
        </div>
      </div>
    </div>
  );
};
