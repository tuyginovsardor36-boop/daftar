import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Circle,
  Code2,
  Crown,
  Eraser,
  Feather,
  FileText,
  Highlighter,
  ImagePlus,
  Keyboard,
  Minus,
  MousePointer2,
  Palette,
  PenTool,
  Pencil,
  PencilRuler,
  Plus,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BindingStyle,
  CAPACITY_PRESETS,
  DeskTheme,
  FONT_MAP,
  FRAME_STYLE_PRESETS,
  FrameStyle,
  GridRowSpan,
  HIGHLIGHTER_COLORS,
  INK_COLORS,
  NotebookCapacity,
  PAPER_TONE_COLORS,
  POETRY_SNIPPETS,
  PaperStyle,
  PaperTone,
  PlanTier,
  TextFont,
  ToolType,
  ViewLayout,
  getMetallicInkConfig,
  percentToWidth,
  widthToPercent,
} from '../types/notebook';

interface StudioToolbarProps {
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  activeFont: TextFont;
  activeFramePreset: Exclude<FrameStyle, 'none'>;
  paperStyle: PaperStyle;
  gridRowSpan: GridRowSpan;
  paperTone: PaperTone;
  bindingStyle: BindingStyle;
  deskTheme: DeskTheme;
  capacity: NotebookCapacity;
  viewLayout: ViewLayout;
  hasCover: boolean;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  isKeyboardOpen: boolean;
  isPoetryAiOpen: boolean;
  planTier: PlanTier;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onSelectWidth: (width: number) => void;
  onSelectFont: (font: TextFont) => void;
  onSelectFramePreset: (preset: Exclude<FrameStyle, 'none'>) => void;
  onQuickAiDrawCenter: () => void;
  onChangePaperStyle: (style: PaperStyle) => void;
  onChangeGridRowSpan: (span: GridRowSpan) => void;
  onChangePaperTone: (tone: PaperTone) => void;
  onChangeBinding: (binding: BindingStyle) => void;
  onChangeDeskTheme: (theme: DeskTheme) => void;
  onChangeCapacity: (cap: NotebookCapacity) => void;
  onChangeViewLayout: (layout: ViewLayout) => void;
  onToggleHasCover: () => void;
  onChangeZoom: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  onUploadImage: (dataUrl: string, width: number, height: number) => void;
  onToggleKeyboard: () => void;
  onOpenAlphabetStudio: () => void;
  onTogglePoetryAi: () => void;
  onInsertPoetrySnippet: (text: string) => void;
  onOpenPlanModal: () => void;
}

const TOOL_BUTTONS: {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'pen', label: 'Pero', icon: Feather },
  { id: 'pencil', label: 'Qalam', icon: Pencil },
  { id: 'ballpoint', label: 'Ruchka', icon: PenTool },
  { id: 'highlighter', label: 'Marker', icon: Highlighter },
  { id: 'text', label: 'Matn', icon: Type },
  { id: 'frame_box', label: 'Kod / Ramka', icon: Code2 },
  { id: 'ai_draw', label: 'AI Chizma', icon: Wand2 },
  { id: 'line', label: 'Chiziq', icon: Minus },
  { id: 'arrow', label: 'Strelka', icon: ArrowRight },
  { id: 'rect', label: 'Ramka', icon: Square },
  { id: 'circle', label: 'Doira', icon: Circle },
  { id: 'eraser', label: 'O‘chirg‘ich', icon: Eraser },
  { id: 'select', label: 'Tanlash', icon: MousePointer2 },
];

const QUICK_PERCENTS = [10, 25, 50, 75, 100];

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  activeTool,
  activeColor,
  activeWidth,
  activeFont,
  activeFramePreset,
  paperStyle,
  gridRowSpan,
  paperTone,
  bindingStyle,
  deskTheme,
  capacity,
  viewLayout,
  hasCover,
  zoom,
  canUndo,
  canRedo,
  isKeyboardOpen,
  isPoetryAiOpen,
  planTier,
  onSelectTool,
  onSelectColor,
  onSelectWidth,
  onSelectFont,
  onSelectFramePreset,
  onQuickAiDrawCenter,
  onChangePaperStyle,
  onChangeGridRowSpan,
  onChangePaperTone,
  onChangeBinding,
  onChangeDeskTheme,
  onChangeCapacity,
  onChangeViewLayout,
  onToggleHasCover,
  onChangeZoom,
  onUndo,
  onRedo,
  onClearPage,
  onUploadImage,
  onToggleKeyboard,
  onOpenAlphabetStudio,
  onTogglePoetryAi,
  onInsertPoetrySnippet,
  onOpenPlanModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showWidthMenu, setShowWidthMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const isHighlighter = activeTool === 'highlighter';
  const currentPercent = widthToPercent(activeWidth);
  const isPoetryMode = paperStyle === 'poetry' || paperStyle === 'poetry_ornate';

  // Show 6 quick swatches inline (including 2 shimmering inks when not highlighter)
  const quickInkSwatches = isHighlighter
    ? HIGHLIGHTER_COLORS
    : [
        INK_COLORS[0], // Qora
        INK_COLORS[1], // Ko'k
        INK_COLORS[4], // Qizil
        INK_COLORS[7], // Yashil
        INK_COLORS[12], // Yaltiroq oltin
        INK_COLORS[14], // Yaltiroq safir
      ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        onUploadImage(dataUrl, Math.round(img.width * scale), Math.round(img.height * scale));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderSwatchBackground = (hex: string) => {
    const metallic = !isHighlighter ? getMetallicInkConfig(hex) : undefined;
    if (metallic?.shimmerStops) {
      return `linear-gradient(135deg, ${metallic.shimmerStops[0]} 0%, ${metallic.shimmerStops[1]} 45%, ${metallic.shimmerStops[2]} 100%)`;
    }
    return hex;
  };

  return (
    <div className="relative z-30 bg-[#F9F8F5] border-b border-zinc-900/10 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
      {/* Drawing & Writing Tools */}
      <div className="flex items-center gap-1 bg-zinc-200/60 p-1 rounded-lg overflow-x-auto max-w-full">
        {TOOL_BUTTONS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              title={tool.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Color Swatches & Width Percentage / Font */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Inline Quick Swatches + Full Palette Popover */}
        <div className="relative flex items-center gap-1.5" role="group" aria-label="Ranglar">
          {quickInkSwatches.map((swatch) => {
            const isSelected = activeColor.toLowerCase() === swatch.hex.toLowerCase();
            const isMetallic = !isHighlighter && 'isMetallic' in swatch && Boolean(swatch.isMetallic);
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => onSelectColor(swatch.hex)}
                title={swatch.label}
                aria-label={swatch.label}
                className={`relative w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                  isSelected
                    ? 'scale-110 ring-2 ring-blue-600 ring-offset-2 ring-offset-[#F9F8F5] border-zinc-900/30'
                    : 'border-zinc-900/20 hover:scale-105'
                }`}
                style={{ background: renderSwatchBackground(swatch.hex) }}
              >
                {isMetallic && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border border-amber-500/70 shadow-xs pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setShowColorMenu((s) => !s);
              setShowWidthMenu(false);
              setShowAppearance(false);
            }}
            title="Barcha ranglar va yaltiroq siyohlar"
            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
              showColorMenu
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ranglar</span>
          </button>

          {showColorMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowColorMenu(false)} />
              <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl p-3.5 z-40 space-y-3">
                {isHighlighter ? (
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 mb-2">Marker ranglari</div>
                    <div className="grid grid-cols-7 gap-2">
                      {HIGHLIGHTER_COLORS.map((c) => {
                        const sel = activeColor.toLowerCase() === c.hex.toLowerCase();
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              onSelectColor(c.hex);
                              setShowColorMenu(false);
                            }}
                            title={c.label}
                            className={`w-7 h-7 rounded-full border cursor-pointer ${
                              sel ? 'ring-2 ring-blue-600 ring-offset-1' : 'border-zinc-300'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 mb-2">
                        Klassik siyoh ranglari
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {INK_COLORS.filter((c) => !c.isMetallic).map((c) => {
                          const sel = activeColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onSelectColor(c.hex);
                                setShowColorMenu(false);
                              }}
                              title={c.label}
                              className={`w-8 h-8 rounded-full border transition-transform hover:scale-105 cursor-pointer ${
                                sel
                                  ? 'ring-2 ring-blue-600 ring-offset-1 border-zinc-900/40'
                                  : 'border-zinc-900/15'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Yaltiroq (Metallik) siyohlar</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {INK_COLORS.filter((c) => c.isMetallic).map((c) => {
                          const sel = activeColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onSelectColor(c.hex);
                                setShowColorMenu(false);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors cursor-pointer ${
                                sel
                                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                                  : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full shrink-0 border border-black/15"
                                style={{ background: renderSwatchBackground(c.hex) }}
                              />
                              <span className="truncate">{c.label.replace('Yaltiroq ', '')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-600">Istalgan maxsus rang:</span>
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer">
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => onSelectColor(e.target.value)}
                      className="w-5 h-5 rounded border-0 bg-transparent p-0 cursor-pointer"
                    />
                    <span className="font-code text-[11px]">{activeColor.toUpperCase()}</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-zinc-900/10" aria-hidden="true" />

        {/* Text Fonts, Framed Box Presets, AI Draw Shortcut OR Stepped Percentage Ink Circle Size */}
        {activeTool === 'frame_box' ? (
          <div className="flex items-center gap-1 bg-zinc-200/60 p-0.5 rounded-md flex-wrap">
            {(Object.keys(FRAME_STYLE_PRESETS) as Exclude<FrameStyle, 'none'>[]).map((fKey) => (
              <button
                key={fKey}
                type="button"
                onClick={() => onSelectFramePreset(fKey)}
                className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFramePreset === fKey
                    ? 'bg-white text-blue-700 font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {FRAME_STYLE_PRESETS[fKey].label}
              </button>
            ))}
          </div>
        ) : activeTool === 'ai_draw' ? (
          <button
            type="button"
            onClick={onQuickAiDrawCenter}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-medium text-blue-800 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Markazga AI chizma chizish</span>
          </button>
        ) : activeTool === 'text' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-zinc-200/60 p-0.5 rounded-md">
              {(Object.keys(FONT_MAP) as TextFont[]).map((fontKey) => (
                <button
                  key={fontKey}
                  type="button"
                  onClick={() => onSelectFont(fontKey)}
                  className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeFont === fontKey
                      ? 'bg-white text-zinc-900 font-medium shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {FONT_MAP[fontKey].label}
                </button>
              ))}
            </div>

            {paperStyle === 'grid' && (
              <div
                className="flex items-center gap-0.5 bg-blue-50 border border-blue-200/80 p-0.5 rounded-md"
                title="Matematika katak daftarida qator balandligi"
              >
                {([2, 1] as GridRowSpan[]).map((span) => (
                  <button
                    key={span}
                    type="button"
                    onClick={() => onChangeGridRowSpan(span)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      gridRowSpan === span
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    {span} katak
                  </button>
                ))}
              </div>
            )}

            {isPoetryMode && (
              <div className="flex items-center gap-1">
                {POETRY_SNIPPETS.slice(0, 2).map((snip) => (
                  <button
                    key={snip.id}
                    type="button"
                    onClick={() => onInsertPoetrySnippet(snip.text)}
                    title="Tayyor she’r bandi shablonini qo‘yish"
                    className="px-2 py-1 rounded-md border border-amber-700/25 bg-amber-50/80 hover:bg-amber-100 text-[11px] font-medium text-amber-950 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    + {snip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex items-center gap-1" role="group" aria-label="Siyoh doirasi o‘lchami">
            <button
              type="button"
              onClick={() => onSelectWidth(percentToWidth(Math.max(5, currentPercent - 5)))}
              title="Siyoh doirasini kichraytirish (-5%)"
              className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-200/70 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowWidthMenu((s) => !s);
                setShowColorMenu(false);
                setShowAppearance(false);
              }}
              title="Siyoh doirasi hajmini foizda sozlash"
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs transition-colors cursor-pointer ${
                showWidthMenu
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <span
                  className="rounded-full transition-all"
                  style={{
                    width: Math.max(3, Math.min(15, 2 + (currentPercent / 100) * 13)),
                    height: Math.max(3, Math.min(15, 2 + (currentPercent / 100) * 13)),
                    background: showWidthMenu ? '#FFFFFF' : renderSwatchBackground(activeColor),
                  }}
                />
              </span>
              <span className="font-code tabular-nums text-[11px] font-semibold">
                {currentPercent}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectWidth(percentToWidth(Math.min(100, currentPercent + 5)))}
              title="Siyoh doirasini kattalashtirish (+5%)"
              className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-200/70 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {showWidthMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowWidthMenu(false)} />
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl p-3.5 z-40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">
                      Siyoh doirasi darajasi
                    </span>
                    <span className="font-code tabular-nums text-xs font-bold text-blue-700">
                      {currentPercent}% ({activeWidth.toFixed(1)}px)
                    </span>
                  </div>

                  {/* Proportional Visual Circle Preview */}
                  <div className="h-10 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center">
                    <span
                      className="rounded-full transition-all shadow-xs"
                      style={{
                        width: Math.max(4, Math.min(26, 3 + (currentPercent / 100) * 23)),
                        height: Math.max(4, Math.min(26, 3 + (currentPercent / 100) * 23)),
                        background: renderSwatchBackground(activeColor),
                      }}
                    />
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={currentPercent}
                    onChange={(e) => onSelectWidth(percentToWidth(Number(e.target.value)))}
                    aria-label="Siyoh doirasi foizi"
                    className="w-full accent-blue-700 cursor-pointer"
                  />

                  <div className="grid grid-cols-5 gap-1">
                    {QUICK_PERCENTS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => onSelectWidth(percentToWidth(pct))}
                        className={`py-1 rounded text-[11px] font-code tabular-nums border transition-colors cursor-pointer ${
                          currentPercent === pct
                            ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Studio Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Bekor qilish (Ctrl+Z)"
          className="p-2 rounded-md text-zinc-700 hover:bg-zinc-200/70 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Qaytarish (Ctrl+Y)"
          className="p-2 rounded-md text-zinc-700 hover:bg-zinc-200/70 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-zinc-900/10 mx-0.5" aria-hidden="true" />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Sahifaga rasm qo‘shish"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-200/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Rasm</span>
        </button>

        <button
          type="button"
          onClick={onOpenAlphabetStudio}
          title="Shaxsiy alifboni chizib kiritish"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-200/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PencilRuler className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Alifbo</span>
        </button>

        <button
          type="button"
          onClick={onToggleKeyboard}
          title="Ekrandagi klaviaturani ochish/yopish"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isKeyboardOpen
              ? 'bg-blue-700 text-white'
              : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Klaviatura</span>
        </button>

        {/* Universal AI Chat Assistant + Plan */}
        <button
          type="button"
          onClick={onTogglePoetryAi}
          title="AI bilan suhbatlashib matn, kod, she’r yozdirish va chizdirish"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isPoetryAiOpen
              ? 'bg-blue-700 text-white'
              : 'bg-blue-50 border border-blue-300/80 text-blue-900 hover:bg-blue-100'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Suhbat</span>
        </button>

        <button
          type="button"
          onClick={onOpenPlanModal}
          title="Free va Premium tarif rejasi"
          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-[11px] font-semibold text-zinc-800 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Crown className="w-3 h-3 text-amber-600" />
          <span>{planTier === 'free' ? 'Free' : 'Premium'}</span>
        </button>

        {/* Single Page vs Two-Page Spread Toggle */}
        <div className="flex items-center gap-0.5 bg-zinc-200/70 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeViewLayout('single')}
            title="Bir sahifali ko‘rinish"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              viewLayout === 'single'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1 sahifa</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewLayout('spread')}
            title="Ikki sahifali ochilgan daftar"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              viewLayout === 'spread'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2 sahifa</span>
          </button>
        </div>

        {/* Paper & Notebook Style Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAppearance((prev) => !prev);
              setShowColorMenu(false);
              setShowWidthMenu(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showAppearance
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-200/70'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Daftar uslubi</span>
          </button>

          {showAppearance && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowAppearance(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 z-40 space-y-4 max-h-[80vh] overflow-y-auto studio-scroll">
                {/* Notebook Capacity & Davlat Standarti */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-900">Varaq hajmi (Standart)</span>
                    <span className="text-[11px] font-code text-zinc-500">{capacity} varaq</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([12, 24, 36, 96] as NotebookCapacity[]).map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => onChangeCapacity(cap)}
                        className={`px-2.5 py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                          capacity === cap
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="text-xs font-semibold">{CAPACITY_PRESETS[cap].label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {cap === 12
                            ? 'Davlat standarti'
                            : cap === 96
                              ? 'Qalin umumiy'
                              : 'O‘quv standarti'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titul Cover Toggle */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 border border-zinc-200/80">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">Titul yuza varoq</div>
                    <div className="text-[11px] text-zinc-500">Muqova va egasi ma’lumotlari</div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleHasCover}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      hasCover
                        ? 'bg-blue-700 text-white'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                  >
                    {hasCover ? 'Yoqilgan' : 'Qo‘shish'}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-900 mb-2">Qog‘oz chizig‘i va shablonlar</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'lined', label: 'Chiziqli (Ona tili)' },
                        { id: 'grid', label: 'Katak (Matematika)' },
                        { id: 'poetry', label: 'She’riyat (Klassik)' },
                        { id: 'poetry_ornate', label: 'She’riyat (Naqshli)' },
                        { id: 'dot', label: 'Nuqtali' },
                        { id: 'blank', label: 'Toza oq' },
                      ] as { id: PaperStyle; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangePaperStyle(item.id)}
                        className={`px-2.5 py-1.5 text-xs rounded-md border text-left transition-colors cursor-pointer ${
                          paperStyle === item.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {paperStyle === 'grid' && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-200/80">
                      <div className="text-[11px] font-semibold text-zinc-700 mb-1.5">
                        Matematika shrift oralig‘i
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onChangeGridRowSpan(2)}
                          className={`px-2.5 py-1.5 text-xs rounded-md border text-left transition-colors cursor-pointer ${
                            gridRowSpan === 2
                              ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div>2 katak</div>
                          <div className="text-[10px] text-zinc-500">Standart</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeGridRowSpan(1)}
                          className={`px-2.5 py-1.5 text-xs rounded-md border text-left transition-colors cursor-pointer ${
                            gridRowSpan === 1
                              ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div>1 katak</div>
                          <div className="text-[10px] text-zinc-500">Zich yozuv</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-900 mb-2">Qog‘oz rangi</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(PAPER_TONE_COLORS) as PaperTone[]).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => onChangePaperTone(tone)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                          paperTone === tone
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-300 shrink-0"
                          style={{ backgroundColor: PAPER_TONE_COLORS[tone].bg }}
                        />
                        <span className="truncate">{PAPER_TONE_COLORS[tone].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-900 mb-2">Muqova turi</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'stitched', label: 'Tikilgan' },
                        { id: 'spiral', label: 'Spiral' },
                        { id: 'clean', label: 'Oddiy' },
                      ] as { id: BindingStyle; label: string }[]
                    ).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onChangeBinding(b.id)}
                        className={`px-2 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                          bindingStyle === b.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-900 mb-2">Stol foni</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'linen', label: 'Krem' },
                        { id: 'slate', label: 'Kulrang' },
                        { id: 'walnut', label: 'Yog‘och' },
                      ] as { id: DeskTheme; label: string }[]
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onChangeDeskTheme(d.id)}
                        className={`px-2 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                          deskTheme === d.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-0.5 bg-zinc-200/60 px-1 py-0.5 rounded-md">
          <button
            type="button"
            onClick={() => onChangeZoom(Math.max(0.45, Number((zoom - 0.1).toFixed(2))))}
            title="Kichiklashtirish"
            className="p-1 text-zinc-600 hover:text-zinc-900 rounded cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-code text-[11px] text-zinc-700 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onChangeZoom(Math.min(1.4, Number((zoom + 0.1).toFixed(2))))}
            title="Kattalashtirish"
            className="p-1 text-zinc-600 hover:text-zinc-900 rounded cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clear current page with inline confirm */}
        {confirmClear ? (
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-md">
            <button
              type="button"
              onClick={() => {
                onClearPage();
                setConfirmClear(false);
              }}
              className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap cursor-pointer"
            >
              Tozalash
            </button>
            <span className="text-zinc-300">/</span>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="text-xs text-zinc-600 hover:text-zinc-900 whitespace-nowrap cursor-pointer"
            >
              Bekor
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            title="Joriy sahifani tozalash"
            className="p-2 rounded-md text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
