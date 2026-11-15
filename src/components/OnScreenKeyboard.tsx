import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, CornerDownLeft, Delete, PencilRuler, X } from 'lucide-react';
import { CustomAlphabetMap, CustomGlyph, FONT_MAP, TextFont } from '../types/notebook';
import { drawCustomGlyph } from '../utils/notebookRenderer';

interface OnScreenKeyboardProps {
  isOpen: boolean;
  activeFont: TextFont;
  customAlphabet: CustomAlphabetMap;
  onSelectFont: (font: TextFont) => void;
  onOpenAlphabetStudio: () => void;
  onKeyInput: (text: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onClose: () => void;
}

const ROW_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', "'"];
const ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '!', '?'];
const UZ_DIGRAPHS = ["o'", "g'", 'sh', 'ch'];

const KeycapGlyphPreview: React.FC<{ glyph: CustomGlyph }> = ({ glyph }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sz = 20;
    canvas.width = sz * dpr;
    canvas.height = sz * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, sz, sz);
    drawCustomGlyph(ctx, glyph, 1, 1, sz - 2, '#1D4ED8');
  }, [glyph]);

  return <canvas ref={ref} className="w-[20px] h-[20px] pointer-events-none" />;
};

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({
  isOpen,
  activeFont,
  customAlphabet,
  onSelectFont,
  onOpenAlphabetStudio,
  onKeyInput,
  onBackspace,
  onEnter,
  onClose,
}) => {
  const [shift, setShift] = useState(false);

  if (!isOpen) return null;

  const formatChar = (ch: string) => {
    if (!shift) return ch;
    return ch.toUpperCase();
  };

  const renderKey = (rawChar: string, wide = false) => {
    const ch = formatChar(rawChar);
    const glyph = activeFont === 'custom' ? customAlphabet[ch] : undefined;
    const hasCustom = Boolean(glyph && glyph.strokes.length > 0);

    return (
      <button
        key={rawChar}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onKeyInput(ch);
          if (shift) setShift(false);
        }}
        className={`relative h-10 ${
          wide ? 'px-3.5' : 'min-w-[36px] sm:min-w-[42px] px-2'
        } rounded-lg bg-white border border-zinc-300/90 shadow-[0_1px_0_rgba(24,24,27,0.12)] hover:bg-zinc-50 active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-all cursor-pointer select-none`}
      >
        {hasCustom && glyph ? (
          <>
            <KeycapGlyphPreview glyph={glyph} />
            <span className="absolute top-0.5 right-1 text-[8px] font-code text-zinc-400 leading-none">
              {ch}
            </span>
          </>
        ) : (
          <span className="text-sm font-medium text-zinc-800">{ch}</span>
        )}
      </button>
    );
  };

  return (
    <div className="shrink-0 bg-[#F4F2ED] border-t border-zinc-900/15 px-3 sm:px-6 py-3 z-30 shadow-[0_-8px_24px_rgba(24,24,27,0.08)]">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Keyboard Header Bar: Font Switcher & Alphabet Studio CTA */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-500 mr-1">Yozuv turi:</span>
            <div className="flex items-center gap-1 bg-zinc-200/80 p-0.5 rounded-lg flex-wrap">
              {(Object.keys(FONT_MAP) as TextFont[]).map((fontKey) => (
                <button
                  key={fontKey}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectFont(fontKey)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeFont === fontKey
                      ? 'bg-white text-blue-700 font-semibold shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {FONT_MAP[fontKey].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenAlphabetStudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <PencilRuler className="w-3.5 h-3.5" />
              <span>Alifboni chizish</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Klaviaturani yopish"
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Number & Symbol Row */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {ROW_NUMS.map((ch) => renderKey(ch))}
        </div>

        {/* QWERTY Row 1 */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {ROW_1.map((ch) => renderKey(ch))}
        </div>

        {/* QWERTY Row 2 */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {ROW_2.map((ch) => renderKey(ch))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBackspace}
            title="O‘chirish"
            className="h-10 px-3 rounded-lg bg-zinc-200/80 border border-zinc-300 text-zinc-700 hover:bg-zinc-300/70 active:translate-y-[1px] flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* QWERTY Row 3 + Shift + Enter */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShift((s) => !s)}
            title="Bosh harf (Shift)"
            className={`h-10 px-3 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              shift
                ? 'bg-blue-700 border-blue-700 text-white'
                : 'bg-zinc-200/80 border-zinc-300 text-zinc-700 hover:bg-zinc-300/70'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {ROW_3.map((ch) => renderKey(ch))}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onEnter}
            title="Yangi qator"
            className="h-10 px-3 rounded-lg bg-zinc-200/80 border border-zinc-300 text-zinc-700 hover:bg-zinc-300/70 active:translate-y-[1px] flex items-center justify-center cursor-pointer"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Row: Uzbek Digraphs + Spacebar */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {UZ_DIGRAPHS.map((pair) => {
            const label = shift ? pair.charAt(0).toUpperCase() + pair.slice(1) : pair;
            return (
              <button
                key={pair}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onKeyInput(label);
                  if (shift) setShift(false);
                }}
                className="h-9 px-3 rounded-lg bg-white border border-zinc-300/90 shadow-[0_1px_0_rgba(24,24,27,0.12)] hover:bg-zinc-50 active:translate-y-[1px] text-xs font-semibold text-zinc-700 cursor-pointer"
              >
                {label}
              </button>
            );
          })}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onKeyInput(' ')}
            className="h-9 flex-1 max-w-xs min-w-[160px] rounded-lg bg-white border border-zinc-300/90 shadow-[0_1px_0_rgba(24,24,27,0.12)] hover:bg-zinc-50 active:translate-y-[1px] text-xs text-zinc-500 font-medium cursor-pointer"
          >
            Bo‘sh joy
          </button>
        </div>
      </div>
    </div>
  );
};
