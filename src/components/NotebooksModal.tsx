import React, { useMemo, useState } from 'react';
import { BookPlus, Check, FolderOpen, Search, Trash2, X } from 'lucide-react';
import {
  GridRowSpan,
  NotebookCapacity,
  NotebookDoc,
  PaperStyle,
  SUBJECT_PRESETS,
} from '../types/notebook';

interface NotebooksModalProps {
  isOpen: boolean;
  notebooks: NotebookDoc[];
  activeNotebookId: string;
  onSelectNotebook: (id: string) => void;
  onCreateNotebook: (params: {
    title: string;
    subjectTag: string;
    paperStyle: PaperStyle;
    gridRowSpan: GridRowSpan;
    capacity: NotebookCapacity;
    hasCover: boolean;
  }) => void;
  onDeleteNotebook: (id: string) => void;
  onClose: () => void;
}

const PAPER_LABELS: Record<PaperStyle, string> = {
  lined: 'Chiziqli (Ona tili)',
  grid: 'Katak (Matematika)',
  poetry: 'She’riyat (Klassik)',
  poetry_ornate: 'She’riyat (Naqshli devon)',
  dot: 'Nuqtali',
  blank: 'Oq qog‘oz',
};

const GRID_SUBJECTS = new Set(['Matematika', 'Fizika', 'Kimyo', 'Informatika']);
const POETRY_SUBJECTS = new Set(['She’riyat', 'Adabiyot']);

export const NotebooksModal: React.FC<NotebooksModalProps> = ({
  isOpen,
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onClose,
}) => {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Ona tili');
  const [newPaperStyle, setNewPaperStyle] = useState<PaperStyle>('lined');
  const [newGridRowSpan, setNewGridRowSpan] = useState<GridRowSpan>(2);
  const [newCapacity, setNewCapacity] = useState<NotebookCapacity>(12);
  const [newHasCover, setNewHasCover] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const nb of notebooks) {
      if (nb.subjectTag?.trim()) set.add(nb.subjectTag.trim());
    }
    return Array.from(set);
  }, [notebooks]);

  const filteredNotebooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notebooks.filter((nb) => {
      if (subjectFilter !== 'all' && nb.subjectTag.trim() !== subjectFilter) {
        return false;
      }
      if (!q) return true;
      return (
        nb.title.toLowerCase().includes(q) ||
        (nb.subjectTag && nb.subjectTag.toLowerCase().includes(q))
      );
    });
  }, [notebooks, searchQuery, subjectFilter]);

  if (!isOpen) return null;

  const handleSelectSubjectPreset = (subj: string) => {
    setNewSubject(subj);
    if (GRID_SUBJECTS.has(subj)) {
      setNewPaperStyle('grid');
      setNewGridRowSpan(2);
    } else if (POETRY_SUBJECTS.has(subj)) {
      setNewPaperStyle('poetry_ornate');
    } else {
      setNewPaperStyle('lined');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setTitleError(true);
      return;
    }
    onCreateNotebook({
      title: newTitle.trim(),
      subjectTag: newSubject.trim(),
      paperStyle: newPaperStyle,
      gridRowSpan: newGridRowSpan,
      capacity: newCapacity,
      hasCover: newHasCover,
    });
    setNewTitle('');
    setTitleError(false);
    setMode('list');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#F9F8F5] border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FolderOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                {mode === 'list' ? 'Daftarlarim va fanlar' : 'Yangi daftar yaratish'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Nom va fan nomi daftarni tez topish uchun — PDF sahifalariga qo‘shilmaydi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'list' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setTitleError(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <BookPlus className="w-3.5 h-3.5" />
                <span>Yangi daftar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('list')}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
              >
                Ro‘yxatga qaytish
              </button>
            )}
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

        {/* Body */}
        {mode === 'list' ? (
          <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-4">
            {/* Search & Subject Filter */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Daftar nomi yoki fan nomi bo‘yicha qidirish..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {uniqueSubjects.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      subjectFilter === 'all'
                        ? 'bg-zinc-900 text-white font-medium'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Hammasi ({notebooks.length})
                  </button>
                  {uniqueSubjects.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSubjectFilter(subj)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        subjectFilter === subj
                          ? 'bg-blue-700 text-white font-medium'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notebook Cards */}
            {filteredNotebooks.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 bg-white rounded-xl border border-zinc-200">
                Mos daftar topilmadi. Yangi daftar yaratib ko‘ring.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotebooks.map((nb) => {
                  const isActive = nb.id === activeNotebookId;
                  const filledCount = nb.pages.filter(
                    (p) =>
                      p.strokes.length > 0 ||
                      p.textBlocks.length > 0 ||
                      p.images.length > 0 ||
                      p.title.trim()
                  ).length;

                  return (
                    <div
                      key={nb.id}
                      onClick={() => {
                        onSelectNotebook(nb.id);
                        onClose();
                      }}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900 truncate">
                            {nb.title}
                          </span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                          {nb.subjectTag ? (
                            <span className="font-medium text-blue-800">{nb.subjectTag}</span>
                          ) : (
                            <span>Fan ko‘rsatilmagan</span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{PAPER_LABELS[nb.paperStyle]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{nb.capacity} varaq</span>
                          <span aria-hidden="true">·</span>
                          <span>{filledCount} ta yozilgan bet</span>
                        </div>
                      </div>

                      {notebooks.length > 1 && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 flex items-center"
                        >
                          {confirmDeleteId === nb.id ? (
                            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-md text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteNotebook(nb.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="font-medium text-red-700 hover:underline cursor-pointer"
                              >
                                O‘chirish
                              </button>
                              <span className="text-zinc-300">/</span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-zinc-600 cursor-pointer"
                              >
                                Bekor
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(nb.id)}
                              title="Daftarni o‘chirish"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto studio-scroll p-6 space-y-5">
            {/* Notebook Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Daftar nomi <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                autoFocus
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (titleError) setTitleError(false);
                }}
                placeholder="Masalan: 1-chorak uy ishlari yoki Algebra konspekti"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg outline-none transition-colors ${
                  titleError
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-zinc-300 focus:border-blue-600'
                }`}
              />
              {titleError && (
                <p className="text-[11px] text-red-600 mt-1">
                  Iltimos, daftarni oson topish uchun nom kiriting.
                </p>
              )}
            </div>

            {/* Subject Tag */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Fan nomi
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Masalan: Ona tili, Matematika, Fizika..."
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg outline-none focus:border-blue-600 transition-colors mb-2"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {SUBJECT_PRESETS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleSelectSubjectPreset(subj)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      newSubject === subj
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Type */}
            <div>
              <div className="text-xs font-semibold text-zinc-900 mb-2">
                Qog‘oz turi
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewPaperStyle('lined')}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'lined'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>Chiziqli (Ona tili)</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Chiziqqa tekislangan</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewPaperStyle('grid');
                    setNewGridRowSpan(2);
                  }}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'grid' && newGridRowSpan === 2
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>Katak (2 katak)</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Matematika standart</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewPaperStyle('grid');
                    setNewGridRowSpan(1);
                  }}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'grid' && newGridRowSpan === 1
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>Katak (1 katak)</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Zich yozuv</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPaperStyle('poetry')}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'poetry'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>She’riyat (Klassik)</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Hoshiyali she’r daftari</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPaperStyle('poetry_ornate')}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'poetry_ornate'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>She’riyat (Naqshli)</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Devon uslubidagi hoshiya</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPaperStyle('dot')}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'dot'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>Nuqtali</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPaperStyle('blank')}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    newPaperStyle === 'blank'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div>Toza oq</div>
                </button>
              </div>
            </div>

            {/* Capacity */}
            <div>
              <div className="text-xs font-semibold text-zinc-900 mb-2">Varaq hajmi</div>
              <div className="grid grid-cols-4 gap-2">
                {([12, 24, 36, 96] as NotebookCapacity[]).map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setNewCapacity(cap)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                      newCapacity === cap
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {cap} varaq
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newHasCover}
                onChange={(e) => setNewHasCover(e.target.checked)}
                className="rounded border-zinc-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Titul yuza muqova qo‘shish</span>
            </label>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-zinc-200">
              <span className="text-[11px] text-zinc-500">
                Eslatma: Kiritilgan daftar va fan nomi PDF hujjat ichiga yozilmaydi.
              </span>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Daftarni yaratish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
