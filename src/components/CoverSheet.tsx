import React, { useEffect, useRef, useState } from 'react';
import { Award, Check, Palette, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  BindingStyle,
  CAPACITY_PRESETS,
  COVER_EMBLEMS,
  COVER_LAYOUT_PRESETS,
  COVER_THEMES,
  CoverBorderPattern,
  CoverData,
  CoverEmblem,
  CoverFontStyle,
  CoverLabelShape,
  CoverLayoutStyle,
  CoverTheme,
  DeskTheme,
  NotebookCapacity,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAPER_TONE_COLORS,
  PaperTone,
  Stroke,
  StrokePoint,
  ToolType,
  getMetallicInkConfig,
} from '../types/notebook';
import {
  drawBindingOverlay,
  drawCoverBase,
  drawStroke,
  getCoverLayoutGeometry,
} from '../utils/notebookRenderer';

interface CoverSheetProps {
  cover: CoverData;
  capacity: NotebookCapacity;
  bindingStyle: BindingStyle;
  paperTone: PaperTone;
  deskTheme: DeskTheme;
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  zoom: number;
  isFlashing: boolean;
  onUpdateCover: (patch: Partial<CoverData>) => void;
  onAddCoverStroke: (stroke: Stroke) => void;
}

const COVER_PRESET_TEMPLATES: {
  id: string;
  label: string;
  patch: Partial<CoverData>;
}[] = [
  {
    id: 'school_std',
    label: 'Maktab (O‘zDSt)',
    patch: {
      theme: 'forest',
      customBgColor: undefined,
      customAccentColor: undefined,
      layoutStyle: 'classic_standard',
      borderPattern: 'double',
      emblem: 'book',
      labelShape: 'rect',
      coverFont: 'handwriting',
      isStateStandard: true,
      showGradeBox: false,
      heading: 'DAFTAR',
      subtitle: 'O‘quv mashg‘ulotlari va uy vazifalari uchun',
    },
  },
  {
    id: 'academic_uni',
    label: 'Universitet / Akademik',
    patch: {
      theme: 'royal_gold',
      customBgColor: undefined,
      customAccentColor: undefined,
      layoutStyle: 'academic_crest',
      borderPattern: 'ornate',
      emblem: 'atom',
      labelShape: 'card',
      coverFont: 'serif',
      isStateStandard: true,
      showGradeBox: true,
      heading: 'MA’RUZA DAFTARI',
      subtitle: 'Mustaqil ishlar va laboratoriya qaydlari',
    },
  },
  {
    id: 'poetry_book',
    label: 'She’riyat devoni',
    patch: {
      theme: 'burgundy',
      customBgColor: undefined,
      customAccentColor: undefined,
      layoutStyle: 'poetry_edition',
      borderPattern: 'ornate',
      emblem: 'feather',
      labelShape: 'rounded',
      coverFont: 'serif',
      isStateStandard: false,
      showGradeBox: false,
      heading: 'SHE’RIYAT DAFTARI',
      subtitle: 'Ilhomiy satrlar, g‘azallar va ruboiylar',
    },
  },
  {
    id: 'it_minimal',
    label: 'IT / Zamonaviy',
    patch: {
      theme: 'charcoal',
      customBgColor: undefined,
      customAccentColor: undefined,
      layoutStyle: 'minimal_modern',
      borderPattern: 'minimal',
      emblem: 'compass',
      labelShape: 'card',
      coverFont: 'mono',
      isStateStandard: false,
      showGradeBox: false,
      heading: 'KOD VA KONSPEKT',
      subtitle: 'Algoritmlar, kod parchalari va arxitektura',
    },
  },
  {
    id: 'vintage_kraft',
    label: 'Kraft Arxiv',
    patch: {
      theme: 'kraft',
      customBgColor: undefined,
      customAccentColor: undefined,
      layoutStyle: 'kraft_vintage',
      borderPattern: 'dashed',
      emblem: 'star',
      labelShape: 'rect',
      coverFont: 'handwriting',
      isStateStandard: true,
      showGradeBox: true,
      heading: 'UMUMIY DAFTAR',
      subtitle: 'Arxiv yozuvlari va ijodiy qaydlar',
    },
  },
];

export const CoverSheet: React.FC<CoverSheetProps> = ({
  cover,
  capacity,
  bindingStyle,
  paperTone,
  deskTheme,
  activeTool,
  activeColor,
  activeWidth,
  zoom,
  isFlashing,
  onUpdateCover,
  onAddCoverStroke,
}) => {
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bindingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [showDesigner, setShowDesigner] = useState(true);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  const deskColorMap: Record<DeskTheme, string> = {
    linen: '#E7E2D8',
    slate: '#D8DDE3',
    walnut: '#211D19',
  };

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PAGE_WIDTH * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawCoverBase(ctx, cover, capacity, bindingStyle, true);
    ctx.restore();
  }, [
    cover.theme,
    cover.layoutStyle,
    cover.borderPattern,
    cover.emblem,
    cover.labelShape,
    cover.coverFont,
    cover.customBgColor,
    cover.customAccentColor,
    cover.isStateStandard,
    cover.showGradeBox,
    capacity,
    bindingStyle,
  ]);

  useEffect(() => {
    const canvas = bindingCanvasRef.current;
    if (!canvas) return;
    if (bindingStyle !== 'spiral') {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const overhangLeft = 18;
    canvas.width = (PAGE_WIDTH + overhangLeft) * dpr;
    canvas.height = PAGE_HEIGHT * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PAGE_WIDTH + overhangLeft, PAGE_HEIGHT);
    ctx.translate(overhangLeft, 0);
    drawBindingOverlay(ctx, 'spiral', deskColorMap[deskTheme]);
    ctx.restore();
  }, [bindingStyle, deskTheme]);

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
    for (const s of cover.strokes) {
      drawStroke(ctx, s);
    }
    if (activeStroke) {
      drawStroke(ctx, activeStroke);
    }
    ctx.restore();
  }, [cover.strokes, activeStroke]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!isDrawableTool(activeTool)) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = toSheetCoords(e.clientX, e.clientY);

    const strokeWidth =
      activeTool === 'highlighter'
        ? Math.max(16, activeWidth * 3.5)
        : activeTool === 'eraser'
          ? Math.max(18, activeWidth * 4)
          : activeWidth;

    const newStroke: Stroke = {
      id: `cst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tool: activeTool,
      color: activeColor,
      width: strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.36 : activeTool === 'pencil' ? 0.85 : 1,
      isMetallic:
        activeTool !== 'highlighter' &&
        activeTool !== 'eraser' &&
        Boolean(getMetallicInkConfig(activeColor)),
      points: [pt],
    };
    activeStrokeRef.current = newStroke;
    setActiveStroke(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const pt = toSheetCoords(e.clientX, e.clientY);
    const current = activeStrokeRef.current;
    const isShape =
      current.tool === 'line' ||
      current.tool === 'rect' ||
      current.tool === 'circle' ||
      current.tool === 'arrow';

    const updated: Stroke = {
      ...current,
      points: isShape ? [current.points[0], pt] : [...current.points, pt],
    };
    activeStrokeRef.current = updated;
    setActiveStroke(updated);
  };

  const finishStroke = () => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    isDrawingRef.current = false;
    const done = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setActiveStroke(null);
    onAddCoverStroke(done);
  };

  const theme = COVER_THEMES[cover.theme] ?? COVER_THEMES.forest;
  const effectiveBg = cover.customBgColor || theme.bg;
  const isLightCover = (() => {
    const clean = effectiveBg.replace('#', '').trim();
    if (clean.length !== 6) return Boolean(theme.isLight);
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 >= 0.58;
  })();

  const tonePalette = PAPER_TONE_COLORS[paperTone];
  const stackLayers = CAPACITY_PRESETS[capacity]?.stackLayers ?? 3;
  const geom = getCoverLayoutGeometry(cover);
  const coverFont = cover.coverFont ?? 'handwriting';
  const inputFontClass =
    coverFont === 'serif'
      ? 'font-editorial font-semibold text-[19px]'
      : coverFont === 'sans'
        ? 'font-sans font-semibold text-[17px]'
        : coverFont === 'mono'
          ? 'font-code font-medium text-[15px]'
          : 'font-handwriting font-semibold text-[24px]';
  const headingFontClass =
    coverFont === 'mono'
      ? 'font-code font-bold text-[34px]'
      : coverFont === 'sans'
        ? 'font-sans font-bold text-[38px]'
        : 'font-editorial font-bold text-[38px]';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
      {/* Compact Quick Bar + Toggle Full Titul Designer */}
      <div className="w-full bg-white/95 border border-zinc-900/10 rounded-xl px-4 py-2.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-700" />
              <span>Titul varoq dizayni</span>
            </span>
            <div className="h-4 w-px bg-zinc-200" aria-hidden="true" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {(Object.keys(COVER_THEMES) as CoverTheme[]).map((key) => {
                const isSelected = !cover.customBgColor && cover.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      onUpdateCover({
                        theme: key,
                        customBgColor: undefined,
                        customAccentColor: undefined,
                      })
                    }
                    title={COVER_THEMES[key].label}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      isSelected
                        ? 'scale-115 ring-2 ring-blue-600 ring-offset-2 border-zinc-900/40'
                        : 'border-zinc-900/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: COVER_THEMES[key].bg }}
                  />
                );
              })}
              <label
                title="Maxsus muqova rangi"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-[11px] text-zinc-700 cursor-pointer"
              >
                <Palette className="w-3 h-3" />
                <input
                  type="color"
                  value={effectiveBg}
                  onChange={(e) => onUpdateCover({ customBgColor: e.target.value })}
                  className="w-4 h-4 rounded border-0 bg-transparent p-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDesigner((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showDesigner
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showDesigner ? 'Sozlamalarni yig‘ish' : 'Mukammal sozlash'}</span>
          </button>
        </div>

        {showDesigner && (
          <div className="pt-3 border-t border-zinc-200/80 space-y-3">
            {/* 1-Click Ready Templates */}
            <div>
              <div className="text-[11px] font-semibold text-zinc-600 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Tayyor titul shablonlari (1 bosishda qo‘llash)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COVER_PRESET_TEMPLATES.map((tpl) => {
                  const isActive =
                    cover.layoutStyle === tpl.patch.layoutStyle && cover.theme === tpl.patch.theme;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => onUpdateCover(tpl.patch)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {isActive && <Check className="w-3 h-3" />}
                      <span>{tpl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Layout Style */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Titul uslubi
                </label>
                <select
                  value={cover.layoutStyle ?? 'classic_standard'}
                  onChange={(e) => onUpdateCover({ layoutStyle: e.target.value as CoverLayoutStyle })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-blue-600"
                >
                  {(Object.keys(COVER_LAYOUT_PRESETS) as CoverLayoutStyle[]).map((key) => (
                    <option key={key} value={key}>
                      {COVER_LAYOUT_PRESETS[key].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Border Pattern */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Ramka naqshi
                </label>
                <select
                  value={cover.borderPattern ?? 'double'}
                  onChange={(e) =>
                    onUpdateCover({ borderPattern: e.target.value as CoverBorderPattern })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-blue-600"
                >
                  <option value="double">Qo‘sh chiziqli (Standart)</option>
                  <option value="ornate">Naqshli (Burchak bezakli)</option>
                  <option value="minimal">Yagona nafis chiziq</option>
                  <option value="dashed">Uzuk chiziqli</option>
                  <option value="none">Ramkasiz</option>
                </select>
              </div>

              {/* Cover Emblem */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Muqova nishoni
                </label>
                <select
                  value={cover.emblem ?? 'book'}
                  onChange={(e) => onUpdateCover({ emblem: e.target.value as CoverEmblem })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-blue-600"
                >
                  {COVER_EMBLEMS.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cover Typography & Box Shape */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Shrift va yorliq shakli
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={coverFont}
                    onChange={(e) => onUpdateCover({ coverFont: e.target.value as CoverFontStyle })}
                    className="px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-blue-600"
                  >
                    <option value="handwriting">Qo‘lyozma</option>
                    <option value="serif">Kitobiy</option>
                    <option value="sans">Zamonaviy</option>
                    <option value="mono">Kod</option>
                  </select>
                  <select
                    value={cover.labelShape ?? 'rect'}
                    onChange={(e) => onUpdateCover({ labelShape: e.target.value as CoverLabelShape })}
                    className="px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus:border-blue-600"
                  >
                    <option value="rect">To‘g‘ri burchak</option>
                    <option value="card">Yengil yumaloq</option>
                    <option value="rounded">Yumaloq ramka</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Secondary Toggles & Accent Color */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cover.isStateStandard}
                    onChange={(e) => onUpdateCover({ isStateStandard: e.target.checked })}
                    className="rounded border-zinc-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Davlat standarti yorlig‘i (O‘zDSt)</span>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(cover.showGradeBox)}
                    onChange={(e) => onUpdateCover({ showGradeBox: e.target.checked })}
                    className="rounded border-zinc-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Baho / Tekshiruv katagi</span>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-700 cursor-pointer">
                  <span>Ramka aksent rangi:</span>
                  <input
                    type="color"
                    value={cover.customAccentColor || theme.border}
                    onChange={(e) => onUpdateCover({ customAccentColor: e.target.value })}
                    className="w-5 h-5 rounded border-0 bg-transparent p-0 cursor-pointer"
                  />
                </label>
              </div>

              {(cover.customBgColor || cover.customAccentColor) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCover({ customBgColor: undefined, customAccentColor: undefined })
                  }
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Asl rangga qaytarish</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Physical Cover Sheet */}
      <div
        className="relative select-none mx-auto"
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
          {/* Dynamic 3D Stacked Paper Thickness Underneath Cover */}
          {Array.from({ length: stackLayers }).map((_, idx) => {
            const step = stackLayers - idx;
            const offset = step * 2.3;
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
                  border: '1px solid rgba(24,24,27,0.12)',
                  boxShadow:
                    step === stackLayers
                      ? deskTheme === 'walnut'
                        ? '16px 28px 50px rgba(0, 0, 0, 0.72)'
                        : '14px 24px 44px rgba(24, 24, 27, 0.25)'
                      : undefined,
                }}
              />
            );
          })}

          {/* Base Cover Canvas */}
          <canvas
            ref={baseCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ border: '1px solid rgba(24,24,27,0.2)' }}
          />

          {/* Editable Main Heading & Optional Subtitle */}
          <input
            type="text"
            value={cover.heading}
            onChange={(e) => onUpdateCover({ heading: e.target.value })}
            placeholder="DAFTAR"
            className={`absolute z-20 bg-transparent border-0 outline-none text-center tracking-wide focus:bg-black/10 rounded px-2 transition-colors ${headingFontClass}`}
            style={{
              left: 112,
              top: geom.headingY - 12,
              width: PAGE_WIDTH - 200,
              color: isLightCover ? '#1C1917' : theme.textOnBg || '#F8FAFC',
            }}
          />
          <input
            type="text"
            value={cover.subtitle ?? ''}
            onChange={(e) => onUpdateCover({ subtitle: e.target.value })}
            placeholder="Qo‘shimcha sarlavha yoki izoh (ixtiyoriy)..."
            className="absolute z-20 bg-transparent border-0 outline-none text-center text-[15px] font-medium focus:bg-black/10 rounded px-2 transition-colors placeholder:opacity-55"
            style={{
              left: 132,
              top: geom.subtitleY,
              width: PAGE_WIDTH - 240,
              color: isLightCover ? 'rgba(28,25,23,0.78)' : 'rgba(255,255,255,0.85)',
            }}
          />

          {/* Interactive Ink Canvas over Cover */}
          <canvas
            ref={inkCanvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            className={`absolute inset-0 w-full h-full z-10 ${
              isDrawableTool(activeTool) ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{ touchAction: 'none' }}
          />

          {/* Editable Titul Label Fields (aligned 1:1 with getCoverLayoutGeometry) */}
          {geom.fields.map((field) => (
            <input
              key={field.key}
              type="text"
              value={String(cover[field.key] ?? '')}
              onChange={(e) => onUpdateCover({ [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className={`absolute z-20 bg-transparent border-0 outline-none text-zinc-900 placeholder:text-zinc-400/70 focus:bg-white/65 rounded px-1 transition-colors ${inputFontClass}`}
              style={{
                left: field.x + 2,
                top: field.y - 24,
                width: field.width - 4,
              }}
            />
          ))}

          {/* Spiral Overlay if Spiral Binding */}
          <canvas
            ref={bindingCanvasRef}
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{
              left: -18,
              width: PAGE_WIDTH + 18,
              height: PAGE_HEIGHT,
            }}
          />

          {isFlashing && (
            <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-shutter" />
          )}
        </div>
      </div>
    </div>
  );
};
