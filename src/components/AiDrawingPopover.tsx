import React, { useState } from 'react';
import { Compass, Feather, Loader2, Pencil, Sparkles, Wand2, X } from 'lucide-react';
import {
  AiDrawingResponse,
  AiDrawingStyle,
  INK_COLORS,
  Stroke,
  TextBlock,
  getMetallicInkConfig,
} from '../types/notebook';

export interface AiTargetBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AiDrawingPopoverProps {
  targetBox: AiTargetBox | null;
  activeColor: string;
  activeWidth: number;
  onInsertDrawing: (pageIndex: number, strokes: Stroke[], labels: TextBlock[]) => void;
  onAiUsed: () => void;
  onClose: () => void;
}

const STYLE_OPTIONS: {
  id: AiDrawingStyle;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'pencil', label: 'Qalam eskizi', desc: 'Grafit soya va shtrixlar', icon: Pencil },
  { id: 'pen', label: 'Ruchka chizma', desc: 'Ravon siyoh konturlari', icon: Feather },
  { id: 'diagram', label: 'Geometriya / Sxema', desc: 'Aniq chiziq va harf belgilar', icon: Compass },
  { id: 'art', label: 'Badiiy rasm', desc: 'Nafis detal va naqshlar', icon: Sparkles },
];

const QUICK_DRAWING_PROMPTS: { label: string; prompt: string; style: AiDrawingStyle }[] = [
  {
    label: 'Uchburchak + balandlik',
    prompt: 'To‘g‘ri burchakli uchburchak ABC va gipotenuzaga tushirilgan h balandlik',
    style: 'diagram',
  },
  {
    label: 'Olma (qalamda)',
    prompt: 'Bargli olma mevasining qalamda chizilgan soya-yorug‘li eskizi',
    style: 'pencil',
  },
  {
    label: 'Fizika sxemasi',
    prompt: 'Qiya tekislik ustidagi yuk va unga ta’sir qiluvchi kuchlar F, N, mg',
    style: 'diagram',
  },
  {
    label: 'Atirgul guli',
    prompt: 'Poyali va bargli chiroyli atirgul eskizi',
    style: 'art',
  },
  {
    label: 'Koordinata grafigi',
    prompt: 'X va Y koordinata o‘qlari hamda y = x^2 parabola grafigi',
    style: 'diagram',
  },
  {
    label: 'Sharqona naqsh',
    prompt: 'Simmetrik o‘zbekcha gul va bargli naqsh bezagi',
    style: 'pen',
  },
];

export const AiDrawingPopover: React.FC<AiDrawingPopoverProps> = ({
  targetBox,
  activeColor,
  activeWidth,
  onInsertDrawing,
  onAiUsed,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AiDrawingStyle>('pencil');
  const [drawColor, setDrawColor] = useState<string>('#3F3F46');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!targetBox) return null;

  const effectiveColor = style === 'pencil' && drawColor === '#3F3F46' ? '#3F3F46' : drawColor;

  const handleStyleSelect = (nextStyle: AiDrawingStyle) => {
    setStyle(nextStyle);
    if (nextStyle === 'pencil') {
      setDrawColor('#3F3F46');
    } else if (drawColor === '#3F3F46') {
      setDrawColor(activeColor);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = prompt.trim();
    if (!cleaned || isGenerating) return;

    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/ai/generate-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleaned,
          style,
          aspectRatio: targetBox.width / Math.max(80, targetBox.height),
        }),
      });
      const data = (await res.json()) as Partial<AiDrawingResponse> & { error?: string };
      if (!res.ok || !Array.isArray(data.strokes)) {
        throw new Error(data.error || 'Chizma yaratishda xatolik yuz berdi.');
      }

      onAiUsed();

      const groupId = `aidraw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const isMetallic = style !== 'pencil' && Boolean(getMetallicInkConfig(effectiveColor));
      const pad = 10;
      const innerW = Math.max(60, targetBox.width - pad * 2);
      const innerH = Math.max(60, targetBox.height - pad * 2);

      const mapPoint = (pt: { x: number; y: number }) => ({
        x: Number((targetBox.x + pad + (pt.x / 1000) * innerW).toFixed(1)),
        y: Number((targetBox.y + pad + (pt.y / 1000) * innerH).toFixed(1)),
      });

      const baseStrokeW = Math.max(1.5, Math.min(3.5, activeWidth * 0.72));

      const builtStrokes: Stroke[] = data.strokes.map((spec, idx) => {
        const mappedPts = spec.points.map(mapPoint);
        let tool: Stroke['tool'] = style === 'pencil' ? 'pencil' : 'pen';
        if (spec.kind === 'line') tool = 'line';
        else if (spec.kind === 'rect') tool = 'rect';
        else if (spec.kind === 'circle') tool = 'circle';
        else if (spec.kind === 'arrow') tool = 'arrow';

        const weightMult =
          spec.weight === 'bold'
            ? 1.45
            : spec.weight === 'thin'
              ? 0.65
              : spec.weight === 'shade'
                ? 0.85
                : 1;

        return {
          id: `${groupId}_s${idx}`,
          aiGroupId: groupId,
          tool,
          color: effectiveColor,
          width: Number((baseStrokeW * weightMult).toFixed(2)),
          opacity:
            typeof spec.opacity === 'number'
              ? spec.opacity
              : spec.weight === 'shade'
                ? 0.42
                : style === 'pencil'
                  ? 0.86
                  : 0.96,
          isMetallic,
          points: mappedPts,
        };
      });

      const builtLabels: TextBlock[] = (data.labels ?? []).map((lbl, idx) => {
        const pos = mapPoint({ x: lbl.x, y: lbl.y });
        return {
          id: `${groupId}_l${idx}`,
          x: Math.max(24, pos.x - 16),
          y: Math.max(88, pos.y - 12),
          width: 110,
          content: lbl.text,
          font: style === 'diagram' ? 'serif' : 'handwriting',
          fontSize: style === 'diagram' ? 15 : 18,
          color: effectiveColor,
          isMetallic,
        };
      });

      onInsertDrawing(targetBox.pageIndex, builtStrokes, builtLabels);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server bilan bog‘lanishda xatolik.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 backdrop-blur-[1px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-[#F9F8F5] border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                AI Chizma va Qalam Eskizi
              </h3>
              <p className="text-[11px] text-zinc-500">
                Tanlangan joyga ({Math.round(targetBox.width)}×{Math.round(targetBox.height)} px) to‘g‘ridan-to‘g‘ri chizib beradi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          {/* Style selection */}
          <div>
            <div className="text-xs font-semibold text-zinc-800 mb-2">Chizish uslubi</div>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = style === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleStyleSelect(opt.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-blue-700' : 'text-zinc-500'}`} />
                    <div>
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              AIdan nima chizib berishini so‘raysiz?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Masalan: Pifagor teoremasi uchburchagi, olma va bargi qalamda, yurak va gul, elektr zanjir sxemasi..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:border-blue-600 outline-none text-xs text-zinc-900 resize-none"
            />
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DRAWING_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => {
                  setPrompt(qp.prompt);
                  handleStyleSelect(qp.style);
                }}
                className="px-2 py-1 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-blue-50 hover:border-blue-300 text-[11px] text-zinc-700 transition-colors cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Ink / Pencil color */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs font-medium text-zinc-700">Qalam / siyoh rangi:</span>
            <div className="flex items-center gap-1.5">
              {[
                { hex: '#3F3F46', label: 'Grafit qalam' },
                { hex: '#18181B', label: 'Qora' },
                { hex: '#1D4ED8', label: 'Ko‘k' },
                { hex: '#DC2626', label: 'Qizil' },
                { hex: '#15803D', label: 'Yashil' },
                INK_COLORS[12], // Yaltiroq oltin
              ].map((c) => {
                const selected = effectiveColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setDrawColor(c.hex)}
                    className={`w-5 h-5 rounded-full border cursor-pointer ${
                      selected ? 'ring-2 ring-blue-600 ring-offset-1 scale-110' : 'border-zinc-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
              <input
                type="color"
                value={effectiveColor}
                onChange={(e) => setDrawColor(e.target.value)}
                title="Boshqa rang"
                className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI chizmoqda...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>O‘sha joyga chizdirish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
