import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  X,
} from 'lucide-react';
import { CustomAlphabetMap, NotebookDoc, PAGE_HEIGHT, PAGE_WIDTH, PasteInspectionMeta } from '../types/notebook';
import {
  AntiAiStampOptions,
  captureCoverScreenshot,
  captureNotebookPageScreenshot,
  captureSpreadScreenshot,
  exportScreenshotsToPdf,
} from '../utils/notebookRenderer';
import { formatTodayLabel } from '../utils/sampleNotebook';

interface ScreenshotPdfModalProps {
  isOpen: boolean;
  doc: NotebookDoc;
  activePageIndex: number;
  isViewingCover: boolean;
  customAlphabet: CustomAlphabetMap;
  onToggleAntiAiStamp: (enabled: boolean) => void;
  onRunDeepAntiAiCheck: () => Promise<void>;
  onClose: () => void;
  onRetakeFlash: () => void;
}

interface CapturedShot {
  id: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const ScreenshotPdfModal: React.FC<ScreenshotPdfModalProps> = ({
  isOpen,
  doc,
  activePageIndex,
  isViewingCover,
  customAlphabet,
  onToggleAntiAiStamp,
  onRunDeepAntiAiCheck,
  onClose,
  onRetakeFlash,
}) => {
  const [includeDeskFrame, setIncludeDeskFrame] = useState(true);
  const [scope, setScope] = useState<'current' | 'filled' | 'all'>('current');
  const [includeCover, setIncludeCover] = useState(true);
  const [scale, setScale] = useState<number>(2);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCheckingAntiAi, setIsCheckingAntiAi] = useState(false);
  const [captureProgress, setCaptureProgress] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);

  const pastedBlocksSummary = useMemo(() => {
    const pasted: PasteInspectionMeta[] = [];
    for (const p of doc.pages) {
      for (const tb of p.textBlocks) {
        if (tb.pasteMeta?.isPasted) {
          pasted.push(tb.pasteMeta);
        }
      }
    }
    const maxAi = pasted.reduce((acc, m) => Math.max(acc, m.aiProbability), 0);
    const hasFlagged = pasted.some(
      (m) => m.status === 'spam_flagged' || m.status === 'pasted_ai_detected'
    );
    const stampStatus: AntiAiStampOptions['status'] = pasted.some((m) => m.status === 'spam_flagged')
      ? 'spam_flagged'
      : hasFlagged
        ? 'pasted_ai_detected'
        : 'human_verified';

    return {
      count: pasted.length,
      maxAi,
      stampStatus,
      stampText:
        pasted.length === 0
          ? 'ANTI-AI TASDIQLANDI'
          : hasFlagged
            ? 'ANTI-AI: PASTE NAZORATI'
            : 'ANTI-SPAM TEKSHIRILDI',
    };
  }, [doc.pages]);

  const antiAiEnabled = Boolean(doc.antiAiStampEnabled);

  const filledIndices = doc.pages
    .map((p, idx) =>
      p.strokes.length > 0 || p.textBlocks.length > 0 || p.images.length > 0 || p.title.trim()
        ? idx
        : -1
    )
    .filter((idx) => idx !== -1);

  const runCapture = async () => {
    setIsCapturing(true);
    setExportSuccess(false);
    setCaptureProgress('');

    try {
      const padX = includeDeskFrame ? 72 : 0;
      const padY = includeDeskFrame ? 64 : 0;
      const singleW = Math.round((PAGE_WIDTH + padX * 2) * scale);
      const singleH = Math.round((PAGE_HEIGHT + padY * 2) * scale);
      const spreadW = Math.round((PAGE_WIDTH * 2 + padX * 2) * scale);

      const antiAiStamp: AntiAiStampOptions | undefined = antiAiEnabled
        ? {
            enabled: true,
            status: pastedBlocksSummary.stampStatus,
            stampText: pastedBlocksSummary.stampText,
            checkedDate: formatTodayLabel(),
            pastedCount: pastedBlocksSummary.count,
            aiProbability: pastedBlocksSummary.maxAi,
          }
        : undefined;

      const docOptions = {
        paperStyle: doc.paperStyle,
        gridRowSpan: doc.gridRowSpan,
        paperTone: doc.paperTone,
        bindingStyle: doc.bindingStyle,
        deskTheme: doc.deskTheme,
        capacity: doc.capacity,
        customAlphabet,
        antiAiStamp,
      };

      const results: CapturedShot[] = [];

      if (scope === 'current') {
        if (isViewingCover && doc.hasCover) {
          setCaptureProgress('Titul muqova...');
          const dataUrl = await captureCoverScreenshot(doc.cover, docOptions, {
            includeDeskFrame,
            scale,
          });
          results.push({
            id: 'cover',
            label: 'Titul muqova',
            dataUrl,
            width: singleW,
            height: singleH,
          });
        } else if (doc.viewLayout === 'spread') {
          const baseIdx = Math.floor(activePageIndex / 2) * 2;
          const leftPage = doc.pages[baseIdx];
          const rightPage = doc.pages[baseIdx + 1] ?? null;
          if (leftPage) {
            setCaptureProgress(`${baseIdx + 1}–${rightPage ? baseIdx + 2 : baseIdx + 1}-betlar...`);
            const dataUrl = await captureSpreadScreenshot(
              leftPage,
              baseIdx,
              rightPage,
              baseIdx + 1,
              doc.pages.length,
              docOptions,
              { includeDeskFrame, scale }
            );
            results.push({
              id: `spread_${baseIdx}`,
              label: rightPage ? `${baseIdx + 1}–${baseIdx + 2}-bet` : `${baseIdx + 1}-bet`,
              dataUrl,
              width: spreadW,
              height: singleH,
            });
          }
        } else {
          const page = doc.pages[activePageIndex];
          if (page) {
            setCaptureProgress(`${activePageIndex + 1}-bet...`);
            const dataUrl = await captureNotebookPageScreenshot(
              page,
              activePageIndex,
              doc.pages.length,
              docOptions,
              { includeDeskFrame, scale }
            );
            results.push({
              id: `page_${activePageIndex}`,
              label: `${activePageIndex + 1}-bet`,
              dataUrl,
              width: singleW,
              height: singleH,
            });
          }
        }
      } else {
        if (doc.hasCover && includeCover) {
          setCaptureProgress('Titul muqova...');
          const coverUrl = await captureCoverScreenshot(doc.cover, docOptions, {
            includeDeskFrame,
            scale,
          });
          results.push({
            id: 'cover',
            label: 'Titul muqova',
            dataUrl: coverUrl,
            width: singleW,
            height: singleH,
          });
        }

        const targetIndices =
          scope === 'filled'
            ? filledIndices.length > 0
              ? filledIndices
              : [0]
            : doc.pages.map((_, idx) => idx);

        if (doc.viewLayout === 'spread' && scope === 'all') {
          for (let i = 0; i < doc.pages.length; i += 2) {
            const leftPage = doc.pages[i];
            const rightPage = doc.pages[i + 1] ?? null;
            setCaptureProgress(`${i + 1} / ${doc.pages.length}`);
            const dataUrl = await captureSpreadScreenshot(
              leftPage,
              i,
              rightPage,
              i + 1,
              doc.pages.length,
              docOptions,
              { includeDeskFrame, scale }
            );
            results.push({
              id: `spread_${i}`,
              label: rightPage ? `${i + 1}–${i + 2}-bet` : `${i + 1}-bet`,
              dataUrl,
              width: spreadW,
              height: singleH,
            });
          }
        } else {
          for (let i = 0; i < targetIndices.length; i++) {
            const idx = targetIndices[i];
            const page = doc.pages[idx];
            if (!page) continue;
            setCaptureProgress(`${i + 1} / ${targetIndices.length}`);
            const dataUrl = await captureNotebookPageScreenshot(
              page,
              idx,
              doc.pages.length,
              docOptions,
              { includeDeskFrame, scale }
            );
            results.push({
              id: `page_${idx}`,
              label: `${idx + 1}-bet`,
              dataUrl,
              width: singleW,
              height: singleH,
            });
          }
        }
      }

      setShots(results);
      setSelectedShotIdx(0);
    } finally {
      setIsCapturing(false);
      setCaptureProgress('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    runCapture();
  }, [
    isOpen,
    includeDeskFrame,
    scope,
    includeCover,
    scale,
    activePageIndex,
    isViewingCover,
    antiAiEnabled,
    pastedBlocksSummary.count,
    pastedBlocksSummary.stampStatus,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeShot = shots[selectedShotIdx] ?? shots[0];

  const handleDownloadPng = () => {
    if (!activeShot) return;
    const link = document.createElement('a');
    link.href = activeShot.dataUrl;
    link.download = `${doc.title || 'Daftar'}_${activeShot.label.replace(/\s+/g, '_')}_screenshot.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = async () => {
    if (shots.length === 0) return;
    setIsExportingPdf(true);
    try {
      await exportScreenshotsToPdf(
        shots.map((s) => ({ dataUrl: s.dataUrl, width: s.width, height: s.height })),
        doc.title || 'Daftar'
      );
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2400);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeepCheck = async () => {
    setIsCheckingAntiAi(true);
    try {
      await onRunDeepAntiAiCheck();
    } finally {
      setIsCheckingAntiAi(false);
    }
  };

  const currentScopeLabel = isViewingCover
    ? 'Titul muqova'
    : doc.viewLayout === 'spread'
      ? `Yoyilma (${Math.floor(activePageIndex / 2) * 2 + 1}–${Math.min(
          doc.pages.length,
          Math.floor(activePageIndex / 2) * 2 + 2
        )})`
      : `Joriy (${activePageIndex + 1}-bet)`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#F9F8F5] border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Screenshot va PDF ga ko‘chirish
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Daftar sahifasi aniq rasm (screenshot) sifatida suratga olinadi va PDF hujjatga joylanadi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Screenshot Preview Area */}
          <div className="md:col-span-8 bg-zinc-200/70 p-6 flex flex-col items-center justify-center overflow-auto studio-scroll min-h-[360px]">
            {isCapturing ? (
              <div className="flex flex-col items-center gap-3 text-zinc-600">
                <Loader2 className="w-6 h-6 animate-spin text-blue-700" />
                <span className="text-xs font-medium">
                  Screenshot olinmoqda... {captureProgress}
                </span>
              </div>
            ) : activeShot ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative max-h-[54vh] flex items-center justify-center">
                  <img
                    src={activeShot.dataUrl}
                    alt={`${activeShot.label} screenshot`}
                    className="max-h-[54vh] w-auto object-contain rounded-lg shadow-lg border border-zinc-300/70"
                  />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-600 font-code tabular-nums">
                  <span>{activeShot.label}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeShot.width} × {activeShot.height} px
                  </span>
                </div>

                {shots.length > 1 && (
                  <div className="flex items-center gap-2 mt-1 overflow-x-auto max-w-full py-1 px-2">
                    {shots.map((shot, idx) => (
                      <button
                        key={shot.id}
                        type="button"
                        onClick={() => setSelectedShotIdx(idx)}
                        className={`px-2.5 py-1 rounded text-xs font-code tabular-nums transition-colors whitespace-nowrap cursor-pointer ${
                          selectedShotIdx === idx
                            ? 'bg-zinc-900 text-white'
                            : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {shot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Export Controls Sidebar */}
          <div className="md:col-span-4 bg-white border-t md:border-t-0 md:border-l border-zinc-200 p-5 flex flex-col justify-between gap-4 overflow-y-auto studio-scroll">
            <div className="space-y-4">
              {/* Capture Mode */}
              <div>
                <div className="text-xs font-semibold text-zinc-900 mb-2">
                  Screenshot ko‘rinishi
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeDeskFrame(true)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      includeDeskFrame
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">To‘liq daftar (3D soyali)</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Stol foni, muqova qalinligi va soyalar bilan
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeDeskFrame(false)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      !includeDeskFrame
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">Toza sahifa (A4 format)</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Faqat daftar varag‘i — chop etish uchun qulay
                    </div>
                  </button>
                </div>
              </div>

              {/* Anti-AI / Anti-Spam Pechat Choice */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                    {pastedBlocksSummary.count > 0 ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                    )}
                    <span>Anti-AI / Anti-Spam pechat</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  {pastedBlocksSummary.count > 0
                    ? `${pastedBlocksSummary.count} ta nusxalangan (paste) matn bloki tekshirildi. PDF sahifasiga pechat qo‘yilsinmi?`
                    : 'Nusxalangan (paste) matn aniqlanmadi. Istasangiz Anti-AI tasdiq pechatini qo‘shishingiz mumkin.'}
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleAntiAiStamp(true)}
                    className={`px-2 py-1.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      antiAiEnabled
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Stamp className="w-3 h-3" />
                    <span>Pechat qo‘yilsin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleAntiAiStamp(false)}
                    className={`px-2 py-1.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                      !antiAiEnabled
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Pechatsiz
                  </button>
                </div>

                {pastedBlocksSummary.count > 0 && (
                  <button
                    type="button"
                    onClick={handleDeepCheck}
                    disabled={isCheckingAntiAi}
                    className="w-full py-1.5 px-2.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCheckingAntiAi ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-blue-700" />
                    )}
                    <span>Paste matnlarni AI bilan qayta tekshirish</span>
                  </button>
                )}
              </div>

              {/* Page Scope */}
              <div>
                <div className="text-xs font-semibold text-zinc-900 mb-2">
                  Qaysi sahifalar
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScope('current')}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors cursor-pointer ${
                      scope === 'current'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {currentScopeLabel}
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScope('filled')}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        scope === 'filled'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-800'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      Yozilgan ({Math.max(1, filledIndices.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        scope === 'all'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-800'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      Hammasi ({doc.pages.length})
                    </button>
                  </div>
                </div>

                {doc.hasCover && scope !== 'current' && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCover}
                      onChange={(e) => setIncludeCover(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>Titul muqovani 1-betga qo‘shish</span>
                  </label>
                )}
              </div>

              {/* Quality / Scale */}
              <div>
                <div className="text-xs font-semibold text-zinc-900 mb-2">
                  Rasm aniqligi (DPI)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScale(1.5)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      scale === 1.5
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Standart (1.5x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(2.5)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      scale === 2.5
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Yuqori HD (2.5x)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onRetakeFlash();
                  runCapture();
                }}
                disabled={isCapturing}
                className="w-full py-2 px-3 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Qayta screenshot olish</span>
              </button>
            </div>

            {/* Primary Download Actions */}
            <div className="space-y-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isCapturing || isExportingPdf || shots.length === 0}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : exportSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>
                  {exportSuccess
                    ? 'PDF yuklab olindi'
                    : `Screenshotni PDF ga ko‘chirish (${shots.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isCapturing || !activeShot}
                className="w-full py-2 px-4 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Faqat Screenshot yuklash (.png)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
