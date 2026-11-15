import React from 'react';
import { BookMarked, CopyPlus, FilePlus2, Trash2 } from 'lucide-react';
import {
  COVER_THEMES,
  CoverData,
  NotebookCapacity,
  NotebookPage,
  PAPER_TONE_COLORS,
  PaperTone,
  ViewLayout,
} from '../types/notebook';

interface PagesDrawerProps {
  pages: NotebookPage[];
  activePageIndex: number;
  paperTone: PaperTone;
  hasCover: boolean;
  isViewingCover: boolean;
  cover: CoverData;
  capacity: NotebookCapacity;
  viewLayout: ViewLayout;
  readOnly?: boolean;
  onSelectCover: () => void;
  onToggleHasCover: () => void;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const PagesDrawer: React.FC<PagesDrawerProps> = ({
  pages,
  activePageIndex,
  paperTone,
  hasCover,
  isViewingCover,
  cover,
  capacity,
  viewLayout,
  readOnly = false,
  onSelectCover,
  onToggleHasCover,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  const tone = PAPER_TONE_COLORS[paperTone];
  const coverPalette = COVER_THEMES[cover.theme] ?? COVER_THEMES.forest;
  const spreadBaseIdx = Math.floor(activePageIndex / 2) * 2;

  return (
    <aside className="w-56 shrink-0 bg-[#F9F8F5] border-l border-zinc-900/10 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-900/10 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-900">Sahifalar ({pages.length})</span>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddPage}
            className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Yangi</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-2.5">
        {/* Titul Yuza Varoq Card */}
        {hasCover ? (
          <div
            onClick={onSelectCover}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectCover();
              }
            }}
            className={`group relative rounded-lg p-2.5 border transition-colors cursor-pointer ${
              isViewingCover
                ? 'border-blue-600 bg-blue-50/40'
                : 'border-zinc-200/90 bg-white hover:border-zinc-300'
            }`}
          >
            <div
              className="w-full h-24 rounded border border-zinc-900/15 p-2 overflow-hidden mb-2 flex flex-col items-center justify-center relative"
              style={{ backgroundColor: coverPalette.bg }}
            >
              <div className="w-full h-14 bg-[#FCF9F2] border border-zinc-800/30 rounded-sm px-1.5 py-1 flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold text-zinc-900 truncate w-full">
                  {cover.heading || 'DAFTAR'}
                </span>
                <span className="text-[8px] text-zinc-600 truncate w-full mt-0.5">
                  {cover.subject || cover.ownerName || 'Titul varog‘i'}
                </span>
              </div>
              <span className="text-[8px] font-code mt-1 opacity-80" style={{ color: coverPalette.textOnBg }}>
                {capacity} VARAQ
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-700">
              <span className="font-medium flex items-center gap-1">
                <BookMarked className="w-3 h-3 text-blue-700" />
                <span>Titul muqova</span>
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHasCover();
                  }}
                  title="Titul varoqni olib tashlash"
                  className="p-1 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : !readOnly ? (
          <button
            type="button"
            onClick={onToggleHasCover}
            className="w-full py-2 px-2.5 rounded-lg border border-dashed border-zinc-300 text-[11px] font-medium text-zinc-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>+ Titul yuza varoq qo‘shish</span>
          </button>
        ) : null}

        {pages.map((page, index) => {
          const isActive =
            !isViewingCover &&
            (viewLayout === 'spread'
              ? index === spreadBaseIdx || index === spreadBaseIdx + 1
              : index === activePageIndex);
          const previewText = page.textBlocks[0]?.content?.trim();

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPage(index);
                }
              }}
              className={`group relative rounded-lg p-2.5 border transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-50/40'
                  : 'border-zinc-200/90 bg-white hover:border-zinc-300'
              }`}
            >
              {/* Mini Paper Preview Card */}
              <div
                className="w-full h-24 rounded border border-zinc-900/10 p-2 overflow-hidden mb-2 relative"
                style={{ backgroundColor: tone.bg }}
              >
                <div className="text-[10px] font-semibold text-zinc-800 truncate">
                  {page.title || `${index + 1}-sahifa`}
                </div>
                <div className="mt-1 space-y-1">
                  <div className="h-px w-full bg-slate-400/20" />
                  <div className="h-px w-full bg-slate-400/20" />
                  <div className="h-px w-full bg-slate-400/20" />
                </div>
                {previewText ? (
                  <p className="mt-1 text-[9px] text-zinc-600 line-clamp-2 leading-tight">
                    {previewText}
                  </p>
                ) : (
                  <div className="mt-2 text-[9px] text-zinc-400">
                    {page.strokes.length > 0
                      ? `${page.strokes.length} ta chiziq`
                      : 'Bo‘sh sahifa'}
                  </div>
                )}
              </div>

              {/* Clean unboxed metadata row with always-accessible 1-by-1 delete */}
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                <span className="font-code tabular-nums font-medium text-zinc-800">
                  {String(index + 1).padStart(2, '0')}-bet
                </span>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(index);
                      }}
                      title="Nusxalash"
                      className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                    </button>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(index);
                        }}
                        title={`${index + 1}-betni o‘chirish`}
                        className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="p-3 border-t border-zinc-900/10 space-y-2">
          <button
            type="button"
            onClick={onAddPage}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-zinc-300 text-xs font-medium text-zinc-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/30 transition-colors cursor-pointer"
          >
            + Yangi sahifa qo‘shish
          </button>
          {pages.length > 1 && !isViewingCover && (
            <button
              type="button"
              onClick={() => onDeletePage(activePageIndex)}
              className="w-full py-1.5 px-3 rounded-lg border border-red-200/80 bg-red-50/60 hover:bg-red-100/80 text-xs font-medium text-red-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{activePageIndex + 1}-betni o‘chirish</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
