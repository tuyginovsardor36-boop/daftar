import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PanelRight,
  ShieldCheck,
  Stamp,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { AlphabetStudioModal } from './components/AlphabetStudioModal';
import { AiAssistantDrawer, AiNotebookActionPayload } from './components/AiAssistantDrawer';
import { AiDrawingPopover, AiTargetBox } from './components/AiDrawingPopover';
import { CoverSheet } from './components/CoverSheet';
import { NotebooksModal } from './components/NotebooksModal';
import { NotebookSheet } from './components/NotebookSheet';
import { NotebookSpreadView } from './components/NotebookSpreadView';
import { OnScreenKeyboard } from './components/OnScreenKeyboard';
import { PagesDrawer } from './components/PagesDrawer';
import { PlanTierModal } from './components/PlanTierModal';
import { ScreenshotPdfModal } from './components/ScreenshotPdfModal';
import { StudioToolbar } from './components/StudioToolbar';
import {
  AiDrawingResponse,
  BindingStyle,
  CoverData,
  CustomAlphabetMap,
  CustomGlyph,
  DeskTheme,
  FRAME_STYLE_PRESETS,
  FrameStyle,
  GridRowSpan,
  HEADER_HEIGHT,
  HIGHLIGHTER_COLORS,
  INK_COLORS,
  NotebookCapacity,
  NotebookDoc,
  NotebookPage,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAPER_TONE_COLORS,
  PaperStyle,
  PaperTone,
  PasteInspectionMeta,
  PlanTier,
  StickerImage,
  Stroke,
  TextBlock,
  TextFont,
  ToolType,
  ViewLayout,
  getMetallicInkConfig,
} from './types/notebook';
import { buildStrokesAndLabelsFromAiResponse } from './utils/aiDrawingMapper';
import { snapToGridY, snapToLinedY } from './utils/notebookRenderer';
import {
  createBlankPage,
  createDefaultCover,
  createInitialNotebook,
  createNewNotebookDoc,
  syncPagesToCapacity,
} from './utils/sampleNotebook';
import {
  analyzePasteHeuristics,
  getPaperTextGeometry,
  normalizePastedText,
  splitTextAcrossPages,
} from './utils/textFlow';

const LEGACY_STORAGE_KEY = 'daftar_canvas_doc_v1';
const LIBRARY_STORAGE_KEY = 'daftar_canvas_library_v1';
const ACTIVE_ID_STORAGE_KEY = 'daftar_canvas_active_id_v1';
const ALPHABET_STORAGE_KEY = 'daftar_custom_alphabet_v1';

function loadSavedAlphabet(): CustomAlphabetMap {
  try {
    const raw = localStorage.getItem(ALPHABET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CustomAlphabetMap;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // Fallback empty map
  }
  return {};
}

const PAPER_STYLE_LABELS: Record<PaperStyle, string> = {
  lined: 'Chiziqli',
  grid: 'Katak',
  poetry: 'She’riyat',
  poetry_ornate: 'She’riyat (Devon)',
  dot: 'Nuqtali',
  blank: 'Oq qog‘oz',
};

function normalizeNotebookDoc(parsed: Partial<NotebookDoc>): NotebookDoc | null {
  if (!parsed || !Array.isArray(parsed.pages) || parsed.pages.length === 0) return null;
  return {
    id: parsed.id ?? `daftar_${Date.now()}`,
    title: parsed.title ?? 'Mening Daftarim',
    subjectTag: parsed.subjectTag ?? 'Ona tili',
    updatedAt: parsed.updatedAt ?? Date.now(),
    paperStyle: parsed.paperStyle ?? 'lined',
    gridRowSpan: parsed.gridRowSpan ?? 2,
    paperTone: parsed.paperTone ?? 'ivory',
    bindingStyle: parsed.bindingStyle ?? 'stitched',
    deskTheme: parsed.deskTheme ?? 'linen',
    capacity: parsed.capacity ?? 12,
    viewLayout: parsed.viewLayout ?? 'single',
    hasCover: parsed.hasCover ?? false,
    cover: parsed.cover
      ? { ...createDefaultCover(), ...parsed.cover, strokes: parsed.cover.strokes ?? [] }
      : createDefaultCover(),
    pages: parsed.pages,
    antiAiStampEnabled: parsed.antiAiStampEnabled ?? false,
  };
}

function loadInitialLibrary(): { notebooks: NotebookDoc[]; activeId: string } {
  try {
    const rawLib = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (rawLib) {
      const parsedList = JSON.parse(rawLib) as Partial<NotebookDoc>[];
      if (Array.isArray(parsedList)) {
        const valid = parsedList
          .map(normalizeNotebookDoc)
          .filter((d): d is NotebookDoc => Boolean(d));
        if (valid.length > 0) {
          const savedActive = localStorage.getItem(ACTIVE_ID_STORAGE_KEY);
          const activeId =
            savedActive && valid.some((d) => d.id === savedActive) ? savedActive : valid[0].id;
          return { notebooks: valid, activeId };
        }
      }
    }

    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const legacy = normalizeNotebookDoc(JSON.parse(rawLegacy) as Partial<NotebookDoc>);
      if (legacy) {
        return { notebooks: [legacy], activeId: legacy.id };
      }
    }
  } catch {
    // Fallback
  }
  const initial = createInitialNotebook();
  return { notebooks: [initial], activeId: initial.id };
}

export default function App() {
  const [initialLib] = useState(loadInitialLibrary);
  const [notebooks, setNotebooks] = useState<NotebookDoc[]>(initialLib.notebooks);
  const [activeNotebookId, setActiveNotebookId] = useState<string>(initialLib.activeId);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isViewingCover, setIsViewingCover] = useState(false);

  const doc = notebooks.find((n) => n.id === activeNotebookId) ?? notebooks[0];

  const setDoc = useCallback(
    (updater: NotebookDoc | ((prev: NotebookDoc) => NotebookDoc)) => {
      setNotebooks((prevList) =>
        prevList.map((nb) => {
          if (nb.id !== activeNotebookId) return nb;
          const next = typeof updater === 'function' ? updater(nb) : updater;
          return { ...next, updatedAt: Date.now() };
        })
      );
    },
    [activeNotebookId]
  );

  // Undo/Redo history snapshots of pages array
  const [past, setPast] = useState<NotebookPage[][]>([]);
  const [future, setFuture] = useState<NotebookPage[][]>([]);

  // Tool states
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [inkColor, setInkColor] = useState<string>(INK_COLORS[0].hex);
  const [highlighterColor, setHighlighterColor] = useState<string>(HIGHLIGHTER_COLORS[0].hex);
  const [activeWidth, setActiveWidth] = useState<number>(3.2);
  const [activeFont, setActiveFont] = useState<TextFont>('handwriting');
  const [activeFramePreset, setActiveFramePreset] = useState<Exclude<FrameStyle, 'none'>>('code');
  const [aiDrawTarget, setAiDrawTarget] = useState<AiTargetBox | null>(null);

  // Custom drawn alphabet, Keyboard, AI & Anti-AI states
  const [customAlphabet, setCustomAlphabet] = useState<CustomAlphabetMap>(loadSavedAlphabet);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [isAlphabetModalOpen, setIsAlphabetModalOpen] = useState<boolean>(false);
  const [isNotebooksModalOpen, setIsNotebooksModalOpen] = useState<boolean>(false);
  const [isPoetryAiOpen, setIsPoetryAiOpen] = useState<boolean>(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [planTier] = useState<PlanTier>('free');
  const [aiRequestCount, setAiRequestCount] = useState<number>(0);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [pasteStampPrompt, setPasteStampPrompt] = useState<PasteInspectionMeta | null>(null);
  const [pastedCodeTargets, setPastedCodeTargets] = useState<{ pageIdx: number; blockId: string }[] | null>(null);
  const [deletedUndoBanner, setDeletedUndoBanner] = useState<string | null>(null);

  // Viewport & UI states
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 0.52;
      if (window.innerWidth < 1200) return 0.72;
    }
    return 0.85;
  });
  const [showPagesDrawer, setShowPagesDrawer] = useState<boolean>(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isStreamingToPage, setIsStreamingToPage] = useState<boolean>(false);
  const [streamingLabel, setStreamingLabel] = useState<string>('AI daftarga yozmoqda...');
  const [pageTurnAnim, setPageTurnAnim] = useState<{
    dir: 'forward' | 'backward';
    key: number;
  } | null>(null);
  const pageTurnTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const finishStreamNowRef = useRef<(() => void) | null>(null);
  const deskScrollRef = useRef<HTMLDivElement | null>(null);

  const safeIndex = Math.min(activePageIndex, Math.max(0, doc.pages.length - 1));
  const currentPage = doc.pages[safeIndex];

  // Persist library & active notebook ID & custom alphabet to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(notebooks));
      localStorage.setItem(ACTIVE_ID_STORAGE_KEY, activeNotebookId);
    } catch {
      // Ignore storage quota errors silently
    }
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    try {
      localStorage.setItem(ALPHABET_STORAGE_KEY, JSON.stringify(customAlphabet));
    } catch {
      // Ignore storage quota errors silently
    }
  }, [customAlphabet]);

  const commitPagesChange = useCallback(
    (updater: (pages: NotebookPage[]) => NotebookPage[]) => {
      setDoc((prev) => {
        setPast((h) => [...h.slice(-29), prev.pages]);
        setFuture([]);
        return {
          ...prev,
          pages: updater(prev.pages),
        };
      });
    },
    [setDoc]
  );

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previousPages = past[past.length - 1];
    setPast((h) => h.slice(0, -1));
    setFuture((f) => [doc.pages, ...f.slice(0, 29)]);
    setDoc((prev) => ({ ...prev, pages: previousPages }));
  }, [past, doc.pages]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextPages = future[0];
    setFuture((f) => f.slice(1));
    setPast((h) => [...h.slice(-29), doc.pages]);
    setDoc((prev) => ({ ...prev, pages: nextPages }));
  }, [future, doc.pages]);

  const navigateToPage = useCallback(
    (nextIndex: number, nextViewingCover = false) => {
      const clampedIndex = Math.max(0, Math.min(doc.pages.length - 1, nextIndex));
      let dir: 'forward' | 'backward' | null = null;
      if (isViewingCover && !nextViewingCover) {
        dir = 'forward';
      } else if (!isViewingCover && nextViewingCover) {
        dir = 'backward';
      } else if (!nextViewingCover && clampedIndex !== safeIndex) {
        dir = clampedIndex > safeIndex ? 'forward' : 'backward';
      }

      setIsViewingCover(nextViewingCover);
      if (!nextViewingCover) {
        setActivePageIndex(clampedIndex);
      }
      setSelectedTextId(null);

      if (dir) {
        if (pageTurnTimerRef.current) {
          window.clearTimeout(pageTurnTimerRef.current);
        }
        setPageTurnAnim({ dir, key: Date.now() });
        pageTurnTimerRef.current = window.setTimeout(() => {
          setPageTurnAnim(null);
        }, 560);
      }
    },
    [doc.pages.length, isViewingCover, safeIndex]
  );

  // Clean up animation/stream timers on unmount
  useEffect(() => {
    return () => {
      if (pageTurnTimerRef.current) window.clearTimeout(pageTurnTimerRef.current);
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  // Keyboard shortcuts for Undo/Redo, Escape & Arrow Page Turns
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aiDrawTarget) {
        setAiDrawTarget(null);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (
        !isPdfModalOpen &&
        !isAlphabetModalOpen &&
        !isNotebooksModalOpen &&
        !aiDrawTarget
      ) {
        if (e.key === 'ArrowRight') {
          if (isViewingCover) {
            navigateToPage(0, false);
          } else if (doc.viewLayout === 'spread') {
            const baseIdx = Math.floor(safeIndex / 2) * 2;
            if (baseIdx + 2 < doc.pages.length) {
              navigateToPage(Math.min(doc.pages.length - 1, baseIdx + 2), false);
            }
          } else if (safeIndex < doc.pages.length - 1) {
            navigateToPage(safeIndex + 1, false);
          }
        } else if (e.key === 'ArrowLeft') {
          if (!isViewingCover) {
            if (doc.viewLayout === 'spread') {
              const baseIdx = Math.floor(safeIndex / 2) * 2;
              if (baseIdx === 0 && doc.hasCover) {
                navigateToPage(0, true);
              } else if (baseIdx > 0) {
                navigateToPage(Math.max(0, baseIdx - 2), false);
              }
            } else if (safeIndex === 0 && doc.hasCover) {
              navigateToPage(0, true);
            } else if (safeIndex > 0) {
              navigateToPage(safeIndex - 1, false);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    aiDrawTarget,
    isPdfModalOpen,
    isAlphabetModalOpen,
    isNotebooksModalOpen,
    isViewingCover,
    doc.viewLayout,
    doc.pages.length,
    doc.hasCover,
    safeIndex,
    navigateToPage,
  ]);

  const activeColor = activeTool === 'highlighter' ? highlighterColor : inkColor;

  const handleSelectColor = (color: string) => {
    if (activeTool === 'highlighter') {
      setHighlighterColor(color);
    } else {
      setInkColor(color);
    }
  };

  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    if ((tool === 'frame_box' || tool === 'ai_draw') && isViewingCover) {
      setIsViewingCover(false);
    }
  };

  const updatePageAt = useCallback(
    (targetIdx: number, updater: (page: NotebookPage) => NotebookPage, recordHistory = true) => {
      if (recordHistory) {
        commitPagesChange((pages) =>
          pages.map((p, idx) => (idx === targetIdx ? updater(p) : p))
        );
      } else {
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) => (idx === targetIdx ? updater(p) : p)),
        }));
      }
    },
    [commitPagesChange]
  );

  const updateCurrentPage = useCallback(
    (updater: (page: NotebookPage) => NotebookPage, recordHistory = true) => {
      updatePageAt(safeIndex, updater, recordHistory);
    },
    [updatePageAt, safeIndex]
  );

  const handleAddStrokeAt = (idx: number, stroke: Stroke) => {
    updatePageAt(idx, (p) => ({ ...p, strokes: [...p.strokes, stroke] }), true);
  };

  const handleAddTextBlockAt = (idx: number, block: TextBlock) => {
    updatePageAt(idx, (p) => ({ ...p, textBlocks: [...p.textBlocks, block] }), true);
  };

  const handleUpdateTextBlockAt = useCallback(
    (idx: number, id: string, patch: Partial<TextBlock>) => {
      updatePageAt(
        idx,
        (p) => ({
          ...p,
          textBlocks: p.textBlocks.map((tb) => (tb.id === id ? { ...tb, ...patch } : tb)),
        }),
        false
      );
    },
    [updatePageAt]
  );

  const handleDeleteTextBlockAt = (idx: number, id: string) => {
    updatePageAt(
      idx,
      (p) => ({
        ...p,
        textBlocks: p.textBlocks.filter((tb) => tb.id !== id),
      }),
      true
    );
  };

  const handleUpdateImageAt = useCallback(
    (idx: number, id: string, patch: Partial<StickerImage>) => {
      updatePageAt(
        idx,
        (p) => ({
          ...p,
          images: p.images.map((im) => (im.id === id ? { ...im, ...patch } : im)),
        }),
        false
      );
    },
    [updatePageAt]
  );

  const handleDeleteImageAt = (idx: number, id: string) => {
    updatePageAt(
      idx,
      (p) => ({
        ...p,
        images: p.images.filter((im) => im.id !== id),
      }),
      true
    );
  };

  const handleUpdatePageMetaAt = (idx: number, patch: { title?: string; dateLabel?: string }) => {
    updatePageAt(idx, (p) => ({ ...p, ...patch }), false);
  };

  const handleAddStroke = (stroke: Stroke) => handleAddStrokeAt(safeIndex, stroke);
  const handleAddTextBlock = (block: TextBlock) => handleAddTextBlockAt(safeIndex, block);
  const handleUpdateTextBlock = useCallback(
    (id: string, patch: Partial<TextBlock>) => handleUpdateTextBlockAt(safeIndex, id, patch),
    [handleUpdateTextBlockAt, safeIndex]
  );
  const handleDeleteTextBlock = (id: string) => handleDeleteTextBlockAt(safeIndex, id);

  const handleUploadImage = (dataUrl: string, width: number, height: number) => {
    const newImg: StickerImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: 160,
      y: 220,
      width,
      height,
      dataUrl,
      rotation: -1.5,
      hasTape: true,
    };
    updateCurrentPage((p) => ({ ...p, images: [...p.images, newImg] }), true);
    setActiveTool('select');
  };

  const handleUpdateImage = useCallback(
    (id: string, patch: Partial<StickerImage>) => handleUpdateImageAt(safeIndex, id, patch),
    [handleUpdateImageAt, safeIndex]
  );

  const handleDeleteImage = (id: string) => handleDeleteImageAt(safeIndex, id);

  const handleUpdatePageMeta = (patch: { title?: string; dateLabel?: string }) => {
    handleUpdatePageMetaAt(safeIndex, patch);
  };

  const handleClearPage = () => {
    if (isViewingCover) {
      setDoc((prev) => ({
        ...prev,
        cover: { ...prev.cover, strokes: [] },
      }));
      return;
    }
    updateCurrentPage(
      (p) => ({
        ...p,
        strokes: [],
        textBlocks: [],
        images: [],
      }),
      true
    );
  };

  const handleChangeCapacity = (cap: NotebookCapacity) => {
    setDoc((prev) => {
      const nextPages = syncPagesToCapacity(prev.pages, cap);
      const nextHeading =
        cap === 96 && prev.cover.heading === 'DAFTAR'
          ? 'UMUMIY DAFTAR'
          : cap !== 96 && prev.cover.heading === 'UMUMIY DAFTAR'
            ? 'DAFTAR'
            : prev.cover.heading;
      return {
        ...prev,
        capacity: cap,
        pages: nextPages,
        cover: {
          ...prev.cover,
          heading: nextHeading,
        },
      };
    });
    setActivePageIndex((idx) => Math.min(idx, cap - 1));
  };

  const handleChangeViewLayout = (layout: ViewLayout) => {
    setDoc((prev) => ({ ...prev, viewLayout: layout }));
    if (layout === 'spread' && zoom > 0.65) {
      setZoom(typeof window !== 'undefined' && window.innerWidth < 1280 ? 0.45 : 0.56);
    } else if (layout === 'single' && zoom < 0.7) {
      setZoom(typeof window !== 'undefined' && window.innerWidth < 1200 ? 0.72 : 0.85);
    }
  };

  const handleToggleHasCover = () => {
    setDoc((prev) => {
      const nextHas = !prev.hasCover;
      if (nextHas) {
        setIsViewingCover(true);
      } else {
        setIsViewingCover(false);
      }
      return {
        ...prev,
        hasCover: nextHas,
      };
    });
  };

  const handleUpdateCover = (patch: Partial<CoverData>) => {
    setDoc((prev) => ({
      ...prev,
      cover: { ...prev.cover, ...patch },
    }));
  };

  const handleAddCoverStroke = (stroke: Stroke) => {
    setDoc((prev) => ({
      ...prev,
      cover: { ...prev.cover, strokes: [...prev.cover.strokes, stroke] },
    }));
  };

  const handleChangeGridRowSpan = (span: GridRowSpan) => {
    setDoc((prev) => {
      if (prev.gridRowSpan === span) return prev;
      const adjustPageBlocks = (p: NotebookPage): NotebookPage => ({
        ...p,
        textBlocks: p.textBlocks.map((tb) => {
          const isHand = tb.font === 'handwriting' || tb.font === 'custom';
          if (span === 1) {
            if (isHand && tb.fontSize > 21) return { ...tb, fontSize: 20 };
            if (!isHand && tb.fontSize > 15) return { ...tb, fontSize: 14 };
          } else {
            if (isHand && tb.fontSize <= 21) return { ...tb, fontSize: 26 };
            if (!isHand && tb.fontSize <= 15) return { ...tb, fontSize: 18 };
          }
          return tb;
        }),
      });
      return {
        ...prev,
        gridRowSpan: span,
        pages: prev.pages.map(adjustPageBlocks),
      };
    });
  };

  const handleAddPage = () => {
    const newPage = createBlankPage(`${doc.pages.length + 1}-sahifa`);
    commitPagesChange((pages) => [...pages, newPage]);
    setActivePageIndex(doc.pages.length);
  };

  const handleDuplicatePage = (index: number) => {
    const source = doc.pages[index];
    if (!source) return;
    const copy: NotebookPage = {
      ...source,
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: source.title ? `${source.title} (nusxa)` : `${index + 1}-sahifa (nusxa)`,
      strokes: source.strokes.map((s) => ({ ...s, points: [...s.points] })),
      textBlocks: source.textBlocks.map((tb) => ({ ...tb })),
      images: source.images.map((im) => ({ ...im })),
    };
    commitPagesChange((pages) => [
      ...pages.slice(0, index + 1),
      copy,
      ...pages.slice(index + 1),
    ]);
    setActivePageIndex(index + 1);
  };

  const handleDeletePage = (index: number) => {
    if (doc.pages.length <= 1) return;
    commitPagesChange((pages) => pages.filter((_, i) => i !== index));
    if (activePageIndex >= index && activePageIndex > 0) {
      setActivePageIndex(activePageIndex - 1);
    } else if (activePageIndex >= doc.pages.length - 1) {
      setActivePageIndex(Math.max(0, doc.pages.length - 2));
    }
    const label = `${index + 1}-sahifa o‘chirildi`;
    setDeletedUndoBanner(label);
    setTimeout(() => {
      setDeletedUndoBanner((cur) => (cur === label ? null : cur));
    }, 3500);
  };

  const handleAddOppositePage = () => {
    const baseIdx = Math.floor(safeIndex / 2) * 2;
    const newPage = createBlankPage(`${baseIdx + 2}-sahifa`);
    commitPagesChange((pages) => [...pages, newPage]);
    setActivePageIndex(doc.pages.length);
  };

  const triggerShutterFlash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 380);
  };

  const handleOpenScreenshotExport = () => {
    triggerShutterFlash();
    setTimeout(() => {
      setIsPdfModalOpen(true);
    }, 180);
  };

  const handleSaveGlyph = (char: string, glyph: CustomGlyph | null) => {
    setCustomAlphabet((prev) => {
      const next = { ...prev };
      if (!glyph || glyph.strokes.length === 0) {
        delete next[char];
      } else {
        next[char] = glyph;
      }
      return next;
    });
  };

  const handleSelectFontWithActiveBlock = (font: TextFont) => {
    setActiveFont(font);
    if (selectedTextId) {
      handleUpdateTextBlock(selectedTextId, { font });
    }
  };

  const handleSelectNotebook = (id: string) => {
    setActiveNotebookId(id);
    setPast([]);
    setFuture([]);
    setActivePageIndex(0);
    setIsViewingCover(false);
    setSelectedTextId(null);
  };

  const handleCreateNotebook = (params: {
    title: string;
    subjectTag: string;
    paperStyle: PaperStyle;
    gridRowSpan: GridRowSpan;
    capacity: NotebookCapacity;
    hasCover: boolean;
  }) => {
    const newNb = createNewNotebookDoc(params);
    setNotebooks((prev) => [newNb, ...prev]);
    setActiveNotebookId(newNb.id);
    setPast([]);
    setFuture([]);
    setActivePageIndex(0);
    setIsViewingCover(false);
    setSelectedTextId(null);
  };

  const handleDeleteNotebook = (id: string) => {
    setNotebooks((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((n) => n.id !== id);
      if (activeNotebookId === id && remaining.length > 0) {
        setActiveNotebookId(remaining[0].id);
        setActivePageIndex(0);
        setIsViewingCover(false);
        setPast([]);
        setFuture([]);
      }
      return remaining;
    });
  };

  const showNotice = useCallback((msg: string) => {
    setPasteNotice(msg);
    setTimeout(() => {
      setPasteNotice((cur) => (cur === msg ? null : cur));
    }, 3000);
  }, []);

  /**
   * Automatically flows pasted or inserted text cleanly onto ruled/grid/poetry lines across 1 or multiple pages.
   */
  const flowTextIntoPages = useCallback(
    (
      startPageIdx: number,
      targetBlockId: string | null,
      fullText: string,
      customFont?: TextFont,
      customSize?: number,
      pasteMeta?: PasteInspectionMeta,
      overridePaperStyle?: PaperStyle
    ) => {
      const styleToUse = overridePaperStyle ?? doc.paperStyle;
      const font = customFont ?? activeFont;
      const geom = getPaperTextGeometry(styleToUse, doc.gridRowSpan, font);
      const fontSize = customSize ?? geom.defaultFontSize;

      const targetPage = doc.pages[startPageIdx];
      const existingBlock = targetBlockId
        ? targetPage?.textBlocks.find((tb) => tb.id === targetBlockId)
        : undefined;

      const startX = existingBlock ? existingBlock.x : geom.leftX;
      const blockWidth = existingBlock ? existingBlock.width : geom.fullWidth;
      const startY = existingBlock
        ? existingBlock.y
        : styleToUse === 'grid'
          ? snapToGridY(geom.firstRowY)
          : styleToUse === 'lined' || styleToUse === 'poetry' || styleToUse === 'poetry_ornate'
            ? snapToLinedY(geom.firstRowY)
            : geom.firstRowY;

      const chunks = splitTextAcrossPages({
        text: fullText,
        firstPageStartY: startY,
        subsequentPageStartY: geom.firstRowY,
        rowHeight: geom.rowHeight,
        width: blockWidth,
        font,
        fontSize,
        customAlphabet,
      });

      const createdIds: { pageIdx: number; blockId: string }[] = [];
      const createdFirstBlockId =
        targetBlockId ?? `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      commitPagesChange((pages) => {
        const nextPages = [...pages];
        while (nextPages.length < startPageIdx + chunks.length) {
          nextPages.push(createBlankPage(''));
        }

        chunks.forEach((chunk, offset) => {
          const pIdx = startPageIdx + offset;
          const page = nextPages[pIdx];
          if (offset === 0 && existingBlock) {
            createdIds.push({ pageIdx: pIdx, blockId: existingBlock.id });
            nextPages[pIdx] = {
              ...page,
              textBlocks: page.textBlocks.map((tb) =>
                tb.id === existingBlock.id
                  ? { ...tb, content: chunk, pasteMeta: pasteMeta ?? tb.pasteMeta }
                  : tb
              ),
            };
          } else {
            const newId =
              offset === 0
                ? createdFirstBlockId
                : `tb_${Date.now()}_${offset}_${Math.random().toString(36).slice(2, 5)}`;
            createdIds.push({ pageIdx: pIdx, blockId: newId });
            const newBlock: TextBlock = {
              id: newId,
              x: offset === 0 ? startX : geom.leftX,
              y: offset === 0 ? startY : geom.firstRowY,
              width: offset === 0 ? blockWidth : geom.fullWidth,
              content: chunk,
              font,
              fontSize,
              color: existingBlock?.color ?? inkColor,
              isMetallic: existingBlock?.isMetallic ?? Boolean(getMetallicInkConfig(inkColor)),
              pasteMeta,
            };
            nextPages[pIdx] = {
              ...page,
              textBlocks: [...page.textBlocks, newBlock],
            };
          }
        });
        return nextPages;
      });

      setSelectedTextId(createdFirstBlockId);
      setActiveTool('text');
      if (chunks.length > 1) {
        showNotice(`Matn ${chunks.length} ta sahifaga chiroyli joylashtirildi`);
      }

      return createdIds;
    },
    [doc.paperStyle, doc.gridRowSpan, doc.pages, activeFont, customAlphabet, inkColor, commitPagesChange, showNotice]
  );

  const inspectAndAnnotatePaste = useCallback(
    async (pastedRaw: string, createdIds: { pageIdx: number; blockId: string }[]) => {
      const looksLikeCode =
        /(?:^|\n)\s*(?:def |class |function |const |let |var |import |export |from |#include|public |SELECT |CREATE |for\s*\(|while\s*\(|if\s*\(|print\(|console\.log|<\/?[a-z]+[\s>])/m.test(
          pastedRaw
        ) || (pastedRaw.includes('{') && pastedRaw.includes('}') && pastedRaw.includes('\n'));
      setPastedCodeTargets(looksLikeCode ? createdIds : null);

      const localMeta = analyzePasteHeuristics(pastedRaw, true);
      setPasteStampPrompt(localMeta);

      try {
        const res = await fetch('/api/ai/anti-ai-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedRaw, isPasted: true }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<PasteInspectionMeta>;
        setAiRequestCount((c) => c + 1);
        const enriched: PasteInspectionMeta = {
          ...localMeta,
          status: data.status ?? localMeta.status,
          aiProbability:
            typeof data.aiProbability === 'number' ? data.aiProbability : localMeta.aiProbability,
          verdictLabel: data.verdictLabel || localMeta.verdictLabel,
          summary: data.summary || localMeta.summary,
          stampText: data.stampText || localMeta.stampText,
        };
        setPasteStampPrompt(enriched);

        // Update block metadata silently without recording extra undo step
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) => {
            const match = createdIds.find((c) => c.pageIdx === idx);
            if (!match) return p;
            return {
              ...p,
              textBlocks: p.textBlocks.map((tb) =>
                tb.id === match.blockId ? { ...tb, pasteMeta: enriched } : tb
              ),
            };
          }),
        }));
      } catch {
        // Keep local heuristic inspection
      }
    },
    [setDoc]
  );

  const handleSmartPasteAt = useCallback(
    (
      pageIdx: number,
      blockId: string,
      pastedText: string,
      selectionStart: number,
      selectionEnd: number
    ): boolean => {
      const page = doc.pages[pageIdx];
      const block = page?.textBlocks.find((tb) => tb.id === blockId);
      if (!block) return false;

      const combined =
        block.content.slice(0, selectionStart) + pastedText + block.content.slice(selectionEnd);
      const localMeta = analyzePasteHeuristics(pastedText, true);

      if (block.frameStyle && block.frameStyle !== 'none') {
        updatePageAt(
          pageIdx,
          (p) => ({
            ...p,
            textBlocks: p.textBlocks.map((tb) =>
              tb.id === blockId ? { ...tb, content: combined, pasteMeta: localMeta } : tb
            ),
          }),
          true
        );
        void inspectAndAnnotatePaste(pastedText, [{ pageIdx, blockId }]);
        return true;
      }

      const created = flowTextIntoPages(pageIdx, blockId, combined, block.font, block.fontSize, localMeta);
      void inspectAndAnnotatePaste(pastedText, created);
      return true;
    },
    [doc.pages, flowTextIntoPages, inspectAndAnnotatePaste, updatePageAt]
  );

  // Global Ctrl+V / Cmd+V paste anywhere on the notebook page
  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      if (isPdfModalOpen || isAlphabetModalOpen || isNotebooksModalOpen || isViewingCover) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const raw = e.clipboardData?.getData('text/plain');
      if (!raw || !raw.trim()) return;
      e.preventDefault();

      const cleaned = normalizePastedText(raw);
      const localMeta = analyzePasteHeuristics(cleaned, true);
      const geom = getPaperTextGeometry(doc.paperStyle, doc.gridRowSpan, activeFont);
      const existingBlocks = currentPage?.textBlocks ?? [];
      const nonEmptyBlocks = existingBlocks.filter((tb) => tb.content.trim().length > 0);
      const lastBlock = nonEmptyBlocks[nonEmptyBlocks.length - 1];
      const isLinedLike =
        doc.paperStyle === 'lined' ||
        doc.paperStyle === 'poetry' ||
        doc.paperStyle === 'poetry_ornate';

      if (!lastBlock) {
        const emptyBlock = existingBlocks[0];
        const created = flowTextIntoPages(
          safeIndex,
          emptyBlock?.id ?? null,
          cleaned,
          undefined,
          undefined,
          localMeta
        );
        void inspectAndAnnotatePaste(cleaned, created);
      } else {
        // Place cleanly below last non-empty block on the next ruled/grid line
        const lineEstimate = Math.max(1, lastBlock.content.split('\n').length + 1);
        const rawNextY = lastBlock.y + lineEstimate * geom.rowHeight;
        if (rawNextY > 980) {
          const created = flowTextIntoPages(safeIndex + 1, null, cleaned, undefined, undefined, localMeta);
          setActivePageIndex(safeIndex + 1);
          void inspectAndAnnotatePaste(cleaned, created);
        } else {
          const snappedY =
            doc.paperStyle === 'grid'
              ? snapToGridY(rawNextY)
              : isLinedLike
                ? snapToLinedY(rawNextY)
                : rawNextY;
          const newId = `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const newBlock: TextBlock = {
            id: newId,
            x: geom.leftX,
            y: snappedY,
            width: geom.fullWidth,
            content: '',
            font: activeFont,
            fontSize: geom.defaultFontSize,
            color: inkColor,
            isMetallic: Boolean(getMetallicInkConfig(inkColor)),
            pasteMeta: localMeta,
          };
          updatePageAt(safeIndex, (p) => ({ ...p, textBlocks: [...p.textBlocks, newBlock] }), true);
          const created = flowTextIntoPages(safeIndex, newId, cleaned, undefined, undefined, localMeta);
          void inspectAndAnnotatePaste(cleaned, created);
        }
      }
    };
    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [
    isPdfModalOpen,
    isAlphabetModalOpen,
    isNotebooksModalOpen,
    isViewingCover,
    doc.paperStyle,
    doc.gridRowSpan,
    activeFont,
    currentPage,
    safeIndex,
    inkColor,
    flowTextIntoPages,
    updatePageAt,
    inspectAndAnnotatePaste,
  ]);

  /**
   * Streams AI text or framed code/formula sequentially character-by-character onto notebook pages.
   */
  const streamTextIntoNotebook = useCallback(
    (opts: {
      startPageIdx: number;
      fullText: string;
      preferredFont?: TextFont;
      frameStyle?: FrameStyle;
      frameTitle?: string;
      pageTitle?: string;
      switchToPoetryPaper?: boolean;
    }) => {
      if (finishStreamNowRef.current) {
        finishStreamNowRef.current();
      }
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      setIsViewingCover(false);
      const nextPaperStyle: PaperStyle = opts.switchToPoetryPaper ? 'poetry_ornate' : doc.paperStyle;
      if (opts.switchToPoetryPaper) {
        setDoc((prev) => ({ ...prev, paperStyle: 'poetry_ornate' }));
      }

      const cleanedText = normalizePastedText(opts.fullText);
      if (!cleanedText.trim()) return;

      const requestedFrame = opts.frameStyle && opts.frameStyle !== 'none' ? opts.frameStyle : 'none';
      const baseFont: TextFont =
        requestedFrame === 'code'
          ? 'mono'
          : opts.preferredFont && opts.preferredFont !== 'custom'
            ? opts.preferredFont
            : activeFont === 'custom'
              ? 'handwriting'
              : activeFont;

      if (requestedFrame !== 'none') {
        const preset = FRAME_STYLE_PRESETS[requestedFrame];
        const page = doc.pages[opts.startPageIdx];
        const nonEmpty = (page?.textBlocks ?? []).filter((tb) => tb.content.trim().length > 0);
        const lastBlock = nonEmpty[nonEmpty.length - 1];
        let targetIdx = opts.startPageIdx;
        let nextY = 148;
        if (lastBlock) {
          const lineCount = Math.max(2, lastBlock.content.split('\n').length + 1);
          const estHeight = lineCount * Math.round(lastBlock.fontSize * 1.45) + (lastBlock.frameStyle && lastBlock.frameStyle !== 'none' ? 56 : 20);
          nextY = lastBlock.y + estHeight + 16;
          if (nextY > 780) {
            targetIdx = opts.startPageIdx + 1;
            nextY = 148;
          }
        }

        const blockId = `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newBlock: TextBlock = {
          id: blockId,
          x: 92,
          y: nextY,
          width: 616,
          content: '',
          font: baseFont,
          fontSize: requestedFrame === 'code' ? 14 : 18,
          color: inkColor,
          isMetallic: Boolean(getMetallicInkConfig(inkColor)),
          frameStyle: requestedFrame,
          frameTitle: opts.frameTitle?.trim() || preset.defaultTitle,
          frameAccentColor: preset.defaultAccent,
          showLineNumbers: requestedFrame === 'code',
        };

        commitPagesChange((pages) => {
          const nextPages = [...pages];
          while (nextPages.length <= targetIdx) {
            nextPages.push(createBlankPage(''));
          }
          const targetPage = nextPages[targetIdx];
          nextPages[targetIdx] = {
            ...targetPage,
            title:
              opts.pageTitle?.trim() && !targetPage.title.trim()
                ? opts.pageTitle.trim()
                : targetPage.title,
            textBlocks: [...targetPage.textBlocks, newBlock],
          };
          return nextPages;
        });

        if (targetIdx !== safeIndex) {
          navigateToPage(targetIdx, false);
        }
        setSelectedTextId(blockId);
        setActiveTool('frame_box');

        let cursor = 0;
        const totalLen = cleanedText.length;
        const step = Math.max(2, Math.ceil(totalLen / 95));

        const finishNow = () => {
          if (streamTimerRef.current) {
            window.clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
          setDoc((prev) => ({
            ...prev,
            pages: prev.pages.map((p, idx) =>
              idx === targetIdx
                ? {
                    ...p,
                    textBlocks: p.textBlocks.map((tb) =>
                      tb.id === blockId ? { ...tb, content: cleanedText } : tb
                    ),
                  }
                : p
            ),
          }));
          finishStreamNowRef.current = null;
          setIsStreamingToPage(false);
          showNotice('Ramkali blok daftarga yozildi');
        };

        finishStreamNowRef.current = finishNow;
        setStreamingLabel('AI ramka ichiga yozmoqda...');
        setIsStreamingToPage(true);

        streamTimerRef.current = window.setInterval(() => {
          cursor = Math.min(totalLen, cursor + step);
          const slice = cleanedText.slice(0, cursor);
          setDoc((prev) => ({
            ...prev,
            pages: prev.pages.map((p, idx) =>
              idx === targetIdx
                ? {
                    ...p,
                    textBlocks: p.textBlocks.map((tb) =>
                      tb.id === blockId ? { ...tb, content: slice } : tb
                    ),
                  }
                : p
            ),
          }));
          if (cursor >= totalLen) {
            finishNow();
          }
        }, 22);
        return;
      }

      // Unframed ruled/grid/poetry sequential multi-page writing
      const geom = getPaperTextGeometry(nextPaperStyle, doc.gridRowSpan, baseFont);
      const fontSize = geom.defaultFontSize;
      const startPage = doc.pages[opts.startPageIdx];
      const existingBlocks = startPage?.textBlocks ?? [];
      const nonEmpty = existingBlocks.filter((tb) => tb.content.trim().length > 0);
      const lastBlock = nonEmpty[nonEmpty.length - 1];
      const emptyPlaceholder = nonEmpty.length === 0 ? existingBlocks[0] : undefined;

      let actualStartPageIdx = opts.startPageIdx;
      let startY = geom.firstRowY;
      let reuseBlockId: string | null = null;

      if (emptyPlaceholder) {
        reuseBlockId = emptyPlaceholder.id;
        startY = emptyPlaceholder.y;
      } else if (lastBlock) {
        const lineEstimate = Math.max(1, lastBlock.content.split('\n').length + 1);
        const rawNextY = lastBlock.y + lineEstimate * geom.rowHeight;
        if (rawNextY > 940) {
          actualStartPageIdx = opts.startPageIdx + 1;
          startY = geom.firstRowY;
        } else {
          startY =
            nextPaperStyle === 'grid'
              ? snapToGridY(rawNextY)
              : nextPaperStyle === 'lined' ||
                  nextPaperStyle === 'poetry' ||
                  nextPaperStyle === 'poetry_ornate'
                ? snapToLinedY(rawNextY)
                : rawNextY;
        }
      }

      const chunks = splitTextAcrossPages({
        text: cleanedText,
        firstPageStartY: startY,
        subsequentPageStartY: geom.firstRowY,
        rowHeight: geom.rowHeight,
        width: geom.fullWidth,
        font: baseFont,
        fontSize,
        customAlphabet,
      });

      const streamTargets: { pageIdx: number; blockId: string; fullChunk: string }[] = [];

      commitPagesChange((pages) => {
        const nextPages = [...pages];
        while (nextPages.length < actualStartPageIdx + chunks.length) {
          nextPages.push(createBlankPage(''));
        }

        chunks.forEach((chunk, offset) => {
          const pIdx = actualStartPageIdx + offset;
          const page = nextPages[pIdx];
          const isReuse = offset === 0 && Boolean(reuseBlockId);
          const targetBlockId = isReuse
            ? (reuseBlockId as string)
            : `tb_${Date.now()}_${offset}_${Math.random().toString(36).slice(2, 5)}`;

          streamTargets.push({ pageIdx: pIdx, blockId: targetBlockId, fullChunk: chunk });

          const updatedTitle =
            offset === 0 && opts.pageTitle?.trim() && !page.title.trim()
              ? opts.pageTitle.trim()
              : page.title;

          if (isReuse) {
            nextPages[pIdx] = {
              ...page,
              title: updatedTitle,
              textBlocks: page.textBlocks.map((tb) =>
                tb.id === targetBlockId
                  ? { ...tb, content: '', font: baseFont, fontSize, color: inkColor }
                  : tb
              ),
            };
          } else {
            const newBlock: TextBlock = {
              id: targetBlockId,
              x: geom.leftX,
              y: offset === 0 ? startY : geom.firstRowY,
              width: geom.fullWidth,
              content: '',
              font: baseFont,
              fontSize,
              color: inkColor,
              isMetallic: Boolean(getMetallicInkConfig(inkColor)),
            };
            nextPages[pIdx] = {
              ...page,
              title: updatedTitle,
              textBlocks: [...page.textBlocks, newBlock],
            };
          }
        });

        return nextPages;
      });

      if (actualStartPageIdx !== safeIndex) {
        navigateToPage(actualStartPageIdx, false);
      }
      if (streamTargets[0]) {
        setSelectedTextId(streamTargets[0].blockId);
      }
      setActiveFont(baseFont);
      setActiveTool('text');

      let activeChunkIdx = 0;
      let charCursor = 0;
      let lastFlippedPageIdx = actualStartPageIdx;
      const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
      const step = Math.max(1, Math.ceil(totalChars / 130));

      const finishNow = () => {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) => {
            const match = streamTargets.find((t) => t.pageIdx === idx);
            if (!match) return p;
            return {
              ...p,
              textBlocks: p.textBlocks.map((tb) =>
                tb.id === match.blockId ? { ...tb, content: match.fullChunk } : tb
              ),
            };
          }),
        }));
        finishStreamNowRef.current = null;
        setIsStreamingToPage(false);
        showNotice(
          chunks.length > 1
            ? `Matn ${chunks.length} ta sahifaga ketma-ket yozildi`
            : 'Matn daftarga chiroyli yozildi'
        );
      };

      finishStreamNowRef.current = finishNow;
      setStreamingLabel('AI daftarga ketma-ket yozmoqda...');
      setIsStreamingToPage(true);

      streamTimerRef.current = window.setInterval(() => {
        if (activeChunkIdx >= streamTargets.length) {
          finishNow();
          return;
        }

        const currentTarget = streamTargets[activeChunkIdx];
        if (currentTarget.pageIdx !== lastFlippedPageIdx) {
          lastFlippedPageIdx = currentTarget.pageIdx;
          navigateToPage(currentTarget.pageIdx, false);
        }

        charCursor = Math.min(currentTarget.fullChunk.length, charCursor + step);
        const partial = currentTarget.fullChunk.slice(0, charCursor);

        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === currentTarget.pageIdx
              ? {
                  ...p,
                  textBlocks: p.textBlocks.map((tb) =>
                    tb.id === currentTarget.blockId ? { ...tb, content: partial } : tb
                  ),
                }
              : p
          ),
        }));

        if (charCursor >= currentTarget.fullChunk.length) {
          activeChunkIdx += 1;
          charCursor = 0;
          if (activeChunkIdx >= streamTargets.length) {
            finishNow();
          }
        }
      }, 24);
    },
    [
      doc.paperStyle,
      doc.gridRowSpan,
      doc.pages,
      activeFont,
      inkColor,
      customAlphabet,
      safeIndex,
      setDoc,
      commitPagesChange,
      navigateToPage,
      showNotice,
    ]
  );

  const handleInsertAiDrawing = useCallback(
    (pageIndex: number, newStrokes: Stroke[], newLabels: TextBlock[]) => {
      if (finishStreamNowRef.current) {
        finishStreamNowRef.current();
      }
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      if (newStrokes.length === 0) return;

      // Record single Undo snapshot right before sequential stroke animation starts
      setPast((h) => [...h.slice(-29), doc.pages]);
      setFuture([]);

      if (pageIndex !== safeIndex || isViewingCover) {
        navigateToPage(pageIndex, false);
      }

      let strokeCursor = 0;

      const finishDrawingNow = () => {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        const alreadyAddedIds = new Set(newStrokes.slice(0, strokeCursor).map((s) => s.id));
        const remainingStrokes = newStrokes.filter((s) => !alreadyAddedIds.has(s.id));
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === pageIndex
              ? {
                  ...p,
                  strokes: [...p.strokes, ...remainingStrokes],
                  textBlocks: [...p.textBlocks, ...newLabels],
                }
              : p
          ),
        }));
        finishStreamNowRef.current = null;
        setIsStreamingToPage(false);
        showNotice('AI chizma sahifaga chizildi');
      };

      finishStreamNowRef.current = finishDrawingNow;
      setStreamingLabel('AI chizma shtrixlarini chizmoqda...');
      setIsStreamingToPage(true);

      streamTimerRef.current = window.setInterval(() => {
        if (strokeCursor >= newStrokes.length) {
          finishDrawingNow();
          return;
        }
        const strokeToAdd = newStrokes[strokeCursor];
        strokeCursor += 1;
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, idx) =>
            idx === pageIndex
              ? { ...p, strokes: [...p.strokes, strokeToAdd] }
              : p
          ),
        }));
        if (strokeCursor >= newStrokes.length) {
          finishDrawingNow();
        }
      }, 65);
    },
    [doc.pages, safeIndex, isViewingCover, navigateToPage, setDoc, showNotice]
  );

  const handleExecuteAiChatAction = useCallback(
    async (payload: AiNotebookActionPayload, forcePoetryPaper = false) => {
      if (forcePoetryPaper || payload.paperStyleChange || payload.enableCover || payload.coverHeading || payload.coverSubject) {
        setDoc((prev) => ({
          ...prev,
          paperStyle: forcePoetryPaper
            ? 'poetry_ornate'
            : ((payload.paperStyleChange || prev.paperStyle) as PaperStyle),
          hasCover: payload.enableCover ? true : prev.hasCover,
          cover: {
            ...prev.cover,
            heading: payload.coverHeading?.trim() || prev.cover.heading,
            subject: payload.coverSubject?.trim() || prev.cover.subject,
          },
        }));
      }

      if (payload.pageTitle?.trim() && payload.action === 'update_notebook') {
        handleUpdatePageMeta({ title: payload.pageTitle.trim() });
      }

      if ((payload.action === 'write_text' || payload.action === 'write_frame') && payload.content?.trim()) {
        streamTextIntoNotebook({
          startPageIdx: safeIndex,
          fullText: payload.content,
          preferredFont: payload.preferredFont,
          frameStyle: payload.action === 'write_frame' ? payload.frameStyle || 'note' : 'none',
          frameTitle: payload.frameTitle,
          pageTitle: payload.pageTitle,
          switchToPoetryPaper: forcePoetryPaper,
        });
        return;
      }

      if (payload.action === 'draw_sketch' && payload.drawingPrompt?.trim()) {
        try {
          const style = payload.drawingStyle || 'pencil';
          const box = { x: 200, y: 270, width: 360, height: 260 };
          const res = await fetch('/api/ai/generate-drawing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: payload.drawingPrompt,
              style,
              aspectRatio: box.width / box.height,
            }),
          });
          const data = (await res.json()) as Partial<AiDrawingResponse> & { error?: string };
          if (!res.ok || !Array.isArray(data.strokes)) {
            showNotice(data.error || 'Chizma yaratib bo‘lmadi');
            return;
          }
          const colorToUse = style === 'pencil' ? '#3F3F46' : inkColor;
          const { strokes, labels } = buildStrokesAndLabelsFromAiResponse({
            data,
            box,
            style,
            color: colorToUse,
            baseWidth: activeWidth,
          });
          handleInsertAiDrawing(safeIndex, strokes, labels);
        } catch {
          showNotice('Chizma chizishda xatolik yuz berdi');
        }
        return;
      }

      if (payload.action === 'update_notebook') {
        showNotice('Daftar sozlamalari AI orqali yangilandi');
      }
    },
    [
      safeIndex,
      inkColor,
      activeWidth,
      setDoc,
      streamTextIntoNotebook,
      handleInsertAiDrawing,
      showNotice,
    ]
  );

  const handleConvertTargetsToCodeFrame = () => {
    if (!pastedCodeTargets || pastedCodeTargets.length === 0) return;
    const preset = FRAME_STYLE_PRESETS.code;
    commitPagesChange((pages) =>
      pages.map((p, idx) => {
        const matchIds = new Set(
          pastedCodeTargets.filter((t) => t.pageIdx === idx).map((t) => t.blockId)
        );
        if (matchIds.size === 0) return p;
        return {
          ...p,
          textBlocks: p.textBlocks.map((tb) =>
            matchIds.has(tb.id)
              ? {
                  ...tb,
                  frameStyle: 'code',
                  frameTitle: preset.defaultTitle,
                  frameAccentColor: preset.defaultAccent,
                  font: 'mono',
                  fontSize: Math.min(tb.fontSize, 14),
                  showLineNumbers: true,
                }
              : tb
          ),
        };
      })
    );
    setPastedCodeTargets(null);
    showNotice('Kod ramkali blokga o‘tkazildi');
  };

  const handleRunDeepAntiAiCheck = async () => {
    const updates: { pageIdx: number; blockId: string; meta: PasteInspectionMeta }[] = [];
    for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
      const page = doc.pages[pIdx];
      for (const tb of page.textBlocks) {
        if (!tb.pasteMeta?.isPasted || !tb.content.trim()) continue;
        try {
          const res = await fetch('/api/ai/anti-ai-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: tb.content, isPasted: true }),
          });
          if (res.ok) {
            const data = (await res.json()) as Partial<PasteInspectionMeta>;
            setAiRequestCount((c) => c + 1);
            updates.push({
              pageIdx: pIdx,
              blockId: tb.id,
              meta: {
                ...tb.pasteMeta,
                status: data.status ?? tb.pasteMeta.status,
                aiProbability:
                  typeof data.aiProbability === 'number'
                    ? data.aiProbability
                    : tb.pasteMeta.aiProbability,
                verdictLabel: data.verdictLabel || tb.pasteMeta.verdictLabel,
                summary: data.summary || tb.pasteMeta.summary,
                stampText: data.stampText || tb.pasteMeta.stampText,
              },
            });
          }
        } catch {
          // Skip individual failure
        }
      }
    }
    if (updates.length > 0) {
      setDoc((prev) => ({
        ...prev,
        pages: prev.pages.map((p, idx) => ({
          ...p,
          textBlocks: p.textBlocks.map((tb) => {
            const u = updates.find((item) => item.pageIdx === idx && item.blockId === tb.id);
            return u ? { ...tb, pasteMeta: u.meta } : tb;
          }),
        })),
      }));
    }
  };

  const ensureActiveTextBlock = (): string => {
    if (selectedTextId && currentPage?.textBlocks.some((tb) => tb.id === selectedTextId)) {
      return selectedTextId;
    }
    const existingBlocks = currentPage?.textBlocks ?? [];
    const lastBlock = existingBlocks[existingBlocks.length - 1];
    const geom = getPaperTextGeometry(doc.paperStyle, doc.gridRowSpan, activeFont);
    const nextY = lastBlock
      ? doc.paperStyle === 'grid'
        ? snapToGridY(Math.min(960, lastBlock.y + geom.rowHeight * 2))
        : doc.paperStyle === 'lined'
          ? snapToLinedY(Math.min(960, lastBlock.y + geom.rowHeight * 2))
          : Math.min(960, lastBlock.y + 92)
      : geom.firstRowY;
    const newBlock: TextBlock = {
      id: `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: geom.leftX,
      y: nextY,
      width: geom.fullWidth,
      content: '',
      font: activeFont,
      fontSize: geom.defaultFontSize,
      color: inkColor,
    };
    handleAddTextBlock(newBlock);
    setSelectedTextId(newBlock.id);
    setActiveTool('text');
    return newBlock.id;
  };

  const handleKeyboardInput = (text: string) => {
    const targetId = ensureActiveTextBlock();
    updateCurrentPage(
      (p) => ({
        ...p,
        textBlocks: p.textBlocks.map((tb) =>
          tb.id === targetId ? { ...tb, content: tb.content + text } : tb
        ),
      }),
      false
    );
  };

  const handleKeyboardBackspace = () => {
    if (!selectedTextId) return;
    updateCurrentPage(
      (p) => ({
        ...p,
        textBlocks: p.textBlocks.map((tb) =>
          tb.id === selectedTextId
            ? { ...tb, content: tb.content.slice(0, Math.max(0, tb.content.length - 1)) }
            : tb
        ),
      }),
      false
    );
  };

  const handleKeyboardEnter = () => {
    handleKeyboardInput('\n');
  };

  const deskClass =
    doc.deskTheme === 'linen'
      ? 'desk-linen'
      : doc.deskTheme === 'slate'
        ? 'desk-slate'
        : 'desk-walnut';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F9F8F5] text-zinc-900">
      {/* Top Bar: Clean 3-Zone Header */}
      <header className="h-14 px-5 bg-[#F9F8F5] border-b border-zinc-900/10 flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Brand Wordmark */}
        <span className="text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0">
          Daftar Canvas
        </span>

        {/* Zone 2: Notebook Library Button, Editable Title & Subject Finder Tag (not exported to PDF) */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setIsNotebooksModalOpen(true)}
            title="Daftarlar ro‘yxati va yangi daftar yaratish"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-200/70 hover:bg-zinc-200 text-xs font-medium text-zinc-800 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-700" />
            <span>Daftarlar ({notebooks.length})</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={doc.title}
              onChange={(e) => setDoc((prev) => ({ ...prev, title: e.target.value }))}
              aria-label="Daftar nomi"
              placeholder="Daftar nomi..."
              className="text-sm font-medium text-zinc-800 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-600 outline-none px-1 py-0.5 w-32 sm:w-44 truncate transition-colors"
            />
            <span className="hidden lg:inline text-zinc-300" aria-hidden="true">
              /
            </span>
            <input
              type="text"
              value={doc.subjectTag}
              onChange={(e) => setDoc((prev) => ({ ...prev, subjectTag: e.target.value }))}
              aria-label="Fan nomi (faqat topish uchun)"
              placeholder="Fan nomi..."
              title="Fan nomi — faqat daftarni topish uchun (PDF ga qo‘shilmaydi)"
              className="hidden lg:inline-block text-xs font-medium text-blue-800 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-600 outline-none px-1 py-0.5 w-28 truncate transition-colors"
            />
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500 whitespace-nowrap shrink-0">
            <span className="font-code tabular-nums text-zinc-700 font-medium">
              {isViewingCover
                ? 'Titul muqova'
                : `${String(safeIndex + 1).padStart(2, '0')} / ${String(doc.pages.length).padStart(2, '0')} bet`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{doc.capacity} varaq</span>
            <span aria-hidden="true">·</span>
            <span>
              {PAPER_STYLE_LABELS[doc.paperStyle]}
              {doc.paperStyle === 'grid' ? ` (${doc.gridRowSpan} katak)` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPagesDrawer((s) => !s)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span>Sahifalar</span>
          </button>
        </div>

        {/* Zone 3: 1 Primary CTA — Screenshot & PDF Export */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenScreenshotExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>PDF ga eksport (Screenshot)</span>
          </button>
        </div>
      </header>

      {/* Studio Writing & Customization Toolbar */}
      <StudioToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        activeWidth={activeWidth}
        activeFont={activeFont}
        activeFramePreset={activeFramePreset}
        paperStyle={doc.paperStyle}
        gridRowSpan={doc.gridRowSpan}
        paperTone={doc.paperTone}
        bindingStyle={doc.bindingStyle}
        deskTheme={doc.deskTheme}
        capacity={doc.capacity}
        viewLayout={doc.viewLayout}
        hasCover={doc.hasCover}
        zoom={zoom}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        isKeyboardOpen={isKeyboardOpen}
        isPoetryAiOpen={isPoetryAiOpen}
        planTier={planTier}
        onSelectTool={handleSelectTool}
        onSelectColor={handleSelectColor}
        onSelectWidth={setActiveWidth}
        onSelectFont={handleSelectFontWithActiveBlock}
        onSelectFramePreset={(preset) => {
          setActiveFramePreset(preset);
          setActiveTool('frame_box');
          setIsViewingCover(false);
        }}
        onQuickAiDrawCenter={() => {
          setIsViewingCover(false);
          setAiDrawTarget({
            pageIndex: safeIndex,
            x: 220,
            y: 260,
            width: 340,
            height: 250,
          });
        }}
        onChangePaperStyle={(paperStyle: PaperStyle) =>
          setDoc((prev) => ({ ...prev, paperStyle }))
        }
        onChangeGridRowSpan={handleChangeGridRowSpan}
        onChangePaperTone={(paperTone: PaperTone) =>
          setDoc((prev) => ({ ...prev, paperTone }))
        }
        onChangeBinding={(bindingStyle: BindingStyle) =>
          setDoc((prev) => ({ ...prev, bindingStyle }))
        }
        onChangeDeskTheme={(deskTheme: DeskTheme) =>
          setDoc((prev) => ({ ...prev, deskTheme }))
        }
        onChangeCapacity={handleChangeCapacity}
        onChangeViewLayout={handleChangeViewLayout}
        onToggleHasCover={handleToggleHasCover}
        onChangeZoom={setZoom}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearPage}
        onUploadImage={handleUploadImage}
        onToggleKeyboard={() => {
          setIsKeyboardOpen((open) => {
            const next = !open;
            if (next) {
              setIsViewingCover(false);
              setActiveTool('text');
              if (Object.keys(customAlphabet).length > 0) {
                setActiveFont('custom');
              }
            }
            return next;
          });
        }}
        onOpenAlphabetStudio={() => setIsAlphabetModalOpen(true)}
        onTogglePoetryAi={() => setIsPoetryAiOpen((s) => !s)}
        onInsertPoetrySnippet={(snippet) => {
          streamTextIntoNotebook({
            startPageIdx: safeIndex,
            fullText: snippet,
            preferredFont: 'handwriting',
          });
        }}
        onOpenPlanModal={() => setIsPlanModalOpen(true)}
      />

      {/* Main Workspace: Desk Canvas + Pages Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desk Surface Stage */}
        <main
          ref={deskScrollRef}
          className={`flex-1 overflow-auto studio-scroll relative transition-colors duration-200 ${deskClass}`}
        >
          <div className="min-h-full w-full flex flex-col items-center justify-start py-10 px-6 sm:px-10">
            <div
              key={pageTurnAnim ? `turn_${pageTurnAnim.key}` : 'steady_page'}
              className={`relative book-stage-3d ${
                pageTurnAnim?.dir === 'forward'
                  ? 'animate-page-rtl'
                  : pageTurnAnim?.dir === 'backward'
                    ? 'animate-page-ltr'
                    : ''
              }`}
            >
            {isViewingCover && doc.hasCover ? (
              <CoverSheet
                cover={doc.cover}
                capacity={doc.capacity}
                bindingStyle={doc.bindingStyle}
                paperTone={doc.paperTone}
                deskTheme={doc.deskTheme}
                activeTool={activeTool}
                activeColor={activeColor}
                activeWidth={activeWidth}
                zoom={zoom}
                isFlashing={isFlashing}
                onUpdateCover={handleUpdateCover}
                onAddCoverStroke={handleAddCoverStroke}
              />
            ) : doc.viewLayout === 'spread' ? (
              (() => {
                const baseIdx = Math.floor(safeIndex / 2) * 2;
                const leftPage = doc.pages[baseIdx];
                const rightPage = doc.pages[baseIdx + 1] ?? null;
                if (!leftPage) return null;
                return (
                  <NotebookSpreadView
                    leftPage={leftPage}
                    leftIndex={baseIdx}
                    rightPage={rightPage}
                    rightIndex={baseIdx + 1}
                    totalPages={doc.pages.length}
                    activePageIndex={safeIndex}
                    paperStyle={doc.paperStyle}
                    gridRowSpan={doc.gridRowSpan}
                    paperTone={doc.paperTone}
                    bindingStyle={doc.bindingStyle}
                    deskTheme={doc.deskTheme}
                    capacity={doc.capacity}
                    activeTool={activeTool}
                    activeColor={activeColor}
                    activeWidth={activeWidth}
                    activeFont={activeFont}
                    activeFramePreset={activeFramePreset}
                    customAlphabet={customAlphabet}
                    selectedTextId={selectedTextId}
                    zoom={zoom}
                    isFlashing={isFlashing}
                    onActivatePage={(idx) => setActivePageIndex(idx)}
                    onAddOppositePage={handleAddOppositePage}
                    onChangeGridRowSpan={handleChangeGridRowSpan}
                    onSmartPasteText={handleSmartPasteAt}
                    onRequestAiDraw={(rect) => setAiDrawTarget(rect)}
                    onSelectTextId={setSelectedTextId}
                    onAddStroke={handleAddStrokeAt}
                    onAddTextBlock={handleAddTextBlockAt}
                    onUpdateTextBlock={handleUpdateTextBlockAt}
                    onDeleteTextBlock={handleDeleteTextBlockAt}
                    onUpdateImage={handleUpdateImageAt}
                    onDeleteImage={handleDeleteImageAt}
                    onUpdatePageMeta={handleUpdatePageMetaAt}
                  />
                );
              })()
            ) : (
              currentPage && (
                <NotebookSheet
                  page={currentPage}
                  pageIndex={safeIndex}
                  totalPages={doc.pages.length}
                  paperStyle={doc.paperStyle}
                  gridRowSpan={doc.gridRowSpan}
                  paperTone={doc.paperTone}
                  bindingStyle={doc.bindingStyle}
                  deskTheme={doc.deskTheme}
                  capacity={doc.capacity}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  activeWidth={activeWidth}
                  activeFont={activeFont}
                  activeFramePreset={activeFramePreset}
                  customAlphabet={customAlphabet}
                  selectedTextId={selectedTextId}
                  zoom={zoom}
                  isFlashing={isFlashing}
                  onChangeGridRowSpan={handleChangeGridRowSpan}
                  onSmartPasteText={(blockId, text, s, e) =>
                    handleSmartPasteAt(safeIndex, blockId, text, s, e)
                  }
                  onRequestAiDraw={(rect) => setAiDrawTarget(rect)}
                  onSelectTextId={setSelectedTextId}
                  onAddStroke={handleAddStroke}
                  onAddTextBlock={handleAddTextBlock}
                  onUpdateTextBlock={handleUpdateTextBlock}
                  onDeleteTextBlock={handleDeleteTextBlock}
                  onUpdateImage={handleUpdateImage}
                  onDeleteImage={handleDeleteImage}
                  onUpdatePageMeta={handleUpdatePageMeta}
                />
              )
            )}

            {/* Animated 3D Flipping Paper Leaf Overlay (Right -> Left on Forward, Left -> Right on Backward) */}
            {pageTurnAnim && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-40 overflow-visible"
                style={{ perspective: '2200px' }}
              >
                {doc.viewLayout === 'spread' && !isViewingCover ? (
                  <div
                    className={`absolute top-0 bottom-0 ${
                      pageTurnAnim.dir === 'forward' ? 'animate-leaf-rtl' : 'animate-leaf-ltr'
                    }`}
                    style={{
                      left: pageTurnAnim.dir === 'forward' ? '50%' : '0',
                      width: '50%',
                      backgroundColor: PAPER_TONE_COLORS[doc.paperTone].bg,
                      border: '1px solid rgba(24,24,27,0.16)',
                      backgroundImage:
                        pageTurnAnim.dir === 'forward'
                          ? 'linear-gradient(to right, rgba(24,24,27,0.12) 0%, rgba(255,255,255,0.22) 22%, rgba(24,24,27,0.03) 100%)'
                          : 'linear-gradient(to left, rgba(24,24,27,0.12) 0%, rgba(255,255,255,0.22) 22%, rgba(24,24,27,0.03) 100%)',
                    }}
                  />
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 ${
                        pageTurnAnim.dir === 'forward' ? 'animate-leaf-rtl' : 'animate-leaf-ltr'
                      }`}
                      style={{
                        width: Math.round(PAGE_WIDTH * zoom),
                        height: Math.round(PAGE_HEIGHT * zoom),
                        backgroundColor: PAPER_TONE_COLORS[doc.paperTone].bg,
                        border: '1px solid rgba(24,24,27,0.15)',
                        backgroundImage:
                          'linear-gradient(to right, rgba(24,24,27,0.10) 0%, rgba(255,255,255,0.25) 18%, rgba(24,24,27,0.04) 100%)',
                      }}
                    />
                    <div
                      className={`absolute inset-y-0 w-24 ${
                        pageTurnAnim.dir === 'forward'
                          ? 'right-0 animate-fold-sweep-rtl'
                          : 'left-0 animate-fold-sweep-ltr'
                      }`}
                      style={{
                        background:
                          'linear-gradient(to right, transparent, rgba(24,24,27,0.22), transparent)',
                      }}
                    />
                  </>
                )}
              </div>
            )}
            </div>

            {/* Bottom Page Pagination */}
            <div className="mt-8 flex items-center gap-4 text-xs">
              <button
                type="button"
                disabled={isViewingCover || (!doc.hasCover && safeIndex === 0)}
                onClick={() => {
                  if (doc.viewLayout === 'spread') {
                    const baseIdx = Math.floor(safeIndex / 2) * 2;
                    if (baseIdx === 0 && doc.hasCover) {
                      navigateToPage(0, true);
                    } else {
                      navigateToPage(Math.max(0, baseIdx - 2), false);
                    }
                  } else {
                    if (safeIndex === 0 && doc.hasCover) {
                      navigateToPage(0, true);
                    } else {
                      navigateToPage(Math.max(0, safeIndex - 1), false);
                    }
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer ${
                  doc.deskTheme === 'walnut'
                    ? 'bg-white/10 text-stone-200 hover:bg-white/20'
                    : 'bg-white/80 text-zinc-700 hover:bg-white shadow-sm'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Oldingi</span>
              </button>

              <span
                className={`font-code tabular-nums ${
                  doc.deskTheme === 'walnut' ? 'text-stone-300' : 'text-zinc-600'
                }`}
              >
                {isViewingCover
                  ? 'Titul muqova'
                  : doc.viewLayout === 'spread'
                    ? `${Math.floor(safeIndex / 2) * 2 + 1}–${Math.min(
                        doc.pages.length,
                        Math.floor(safeIndex / 2) * 2 + 2
                      )} / ${doc.pages.length}`
                    : `${safeIndex + 1} / ${doc.pages.length}`}
              </span>

              <button
                type="button"
                disabled={
                  !isViewingCover &&
                  (doc.viewLayout === 'spread'
                    ? Math.floor(safeIndex / 2) * 2 + 2 >= doc.pages.length
                    : safeIndex >= doc.pages.length - 1)
                }
                onClick={() => {
                  if (isViewingCover) {
                    navigateToPage(0, false);
                    return;
                  }
                  if (doc.viewLayout === 'spread') {
                    const baseIdx = Math.floor(safeIndex / 2) * 2;
                    navigateToPage(Math.min(doc.pages.length - 1, baseIdx + 2), false);
                  } else {
                    navigateToPage(Math.min(doc.pages.length - 1, safeIndex + 1), false);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer ${
                  doc.deskTheme === 'walnut'
                    ? 'bg-white/10 text-stone-200 hover:bg-white/20'
                    : 'bg-white/80 text-zinc-700 hover:bg-white shadow-sm'
                }`}
              >
                <span>Keyingi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {!isViewingCover && doc.pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeletePage(safeIndex)}
                  title={`${safeIndex + 1}-sahifani o‘chirish`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium bg-red-50/90 text-red-700 hover:bg-red-100 border border-red-200/70 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">O‘chirish</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Universal AI Notebook Chat Assistant Drawer */}
        <AiAssistantDrawer
          isOpen={isPoetryAiOpen}
          notebookTitle={doc.title}
          subjectTag={doc.subjectTag}
          paperStyle={doc.paperStyle}
          activePageNumber={safeIndex + 1}
          activePageTitle={currentPage?.title ?? ''}
          hasCover={doc.hasCover}
          currentPageTextPreview={(currentPage?.textBlocks ?? [])
            .map((tb) => tb.content)
            .filter(Boolean)
            .join('\n')}
          planTier={planTier}
          aiRequestCount={aiRequestCount}
          isStreamingToPage={isStreamingToPage}
          onExecuteAction={handleExecuteAiChatAction}
          onIncrementAiCount={() => setAiRequestCount((c) => c + 1)}
          onOpenPlanModal={() => setIsPlanModalOpen(true)}
          onClose={() => setIsPoetryAiOpen(false)}
        />

        {/* Collapsible Right Pages Drawer */}
        {showPagesDrawer && (
          <PagesDrawer
            pages={doc.pages}
            activePageIndex={safeIndex}
            paperTone={doc.paperTone}
            hasCover={doc.hasCover}
            isViewingCover={isViewingCover}
            cover={doc.cover}
            capacity={doc.capacity}
            viewLayout={doc.viewLayout}
            onSelectCover={() => navigateToPage(0, true)}
            onToggleHasCover={handleToggleHasCover}
            onSelectPage={(idx) => navigateToPage(idx, false)}
            onAddPage={() => {
              setIsViewingCover(false);
              handleAddPage();
            }}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
          />
        )}
      </div>

      {/* On-Screen Interactive Keyboard */}
      <OnScreenKeyboard
        isOpen={isKeyboardOpen}
        activeFont={activeFont}
        customAlphabet={customAlphabet}
        onSelectFont={handleSelectFontWithActiveBlock}
        onOpenAlphabetStudio={() => setIsAlphabetModalOpen(true)}
        onKeyInput={handleKeyboardInput}
        onBackspace={handleKeyboardBackspace}
        onEnter={handleKeyboardEnter}
        onClose={() => setIsKeyboardOpen(false)}
      />

      {/* Alphabet Drawing Studio Modal */}
      <AlphabetStudioModal
        isOpen={isAlphabetModalOpen}
        alphabet={customAlphabet}
        onSaveGlyph={handleSaveGlyph}
        onResetAll={() => setCustomAlphabet({})}
        onClose={() => setIsAlphabetModalOpen(false)}
      />

      {/* Notebooks Library & Create Modal */}
      <NotebooksModal
        isOpen={isNotebooksModalOpen}
        notebooks={notebooks}
        activeNotebookId={doc.id}
        onSelectNotebook={handleSelectNotebook}
        onCreateNotebook={handleCreateNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        onClose={() => setIsNotebooksModalOpen(false)}
      />

      {/* Free / Premium Plan Tier Modal */}
      <PlanTierModal
        isOpen={isPlanModalOpen}
        planTier={planTier}
        aiRequestCount={aiRequestCount}
        onClose={() => setIsPlanModalOpen(false)}
      />

      {/* Screenshot Preview & PDF Export Modal */}
      <ScreenshotPdfModal
        isOpen={isPdfModalOpen}
        doc={doc}
        activePageIndex={safeIndex}
        isViewingCover={isViewingCover}
        customAlphabet={customAlphabet}
        onToggleAntiAiStamp={(enabled) =>
          setDoc((prev) => ({ ...prev, antiAiStampEnabled: enabled }))
        }
        onRunDeepAntiAiCheck={handleRunDeepAntiAiCheck}
        onClose={() => setIsPdfModalOpen(false)}
        onRetakeFlash={triggerShutterFlash}
      />

      {/* AI Target Drawing & Pencil Sketch Modal */}
      <AiDrawingPopover
        targetBox={aiDrawTarget}
        activeColor={activeColor}
        activeWidth={activeWidth}
        onInsertDrawing={handleInsertAiDrawing}
        onAiUsed={() => setAiRequestCount((c) => c + 1)}
        onClose={() => setAiDrawTarget(null)}
      />

      {/* Anti-AI Paste Verification & Seal Prompt */}
      {pasteStampPrompt && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm bg-white border border-zinc-200 rounded-xl shadow-xl p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{pasteStampPrompt.verdictLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasteStampPrompt(null);
                setPastedCodeTargets(null);
              }}
              aria-label="Yopish"
              className="p-0.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            {pasteStampPrompt.summary} PDF eksportda Anti-AI / Anti-Spam pechati qo‘yilsinmi?
          </p>
          {pastedCodeTargets && pastedCodeTargets.length > 0 && (
            <button
              type="button"
              onClick={handleConvertTargetsToCodeFrame}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Kod aniqlandi — Ramkali kod blokiga olish
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDoc((prev) => ({ ...prev, antiAiStampEnabled: true }));
                setPasteStampPrompt(null);
                setPastedCodeTargets(null);
                showNotice('Anti-AI pechati PDF eksport uchun yoqildi');
              }}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Stamp className="w-3 h-3" />
              <span>Ha, pechat qo‘yilsin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDoc((prev) => ({ ...prev, antiAiStampEnabled: false }));
                setPasteStampPrompt(null);
                setPastedCodeTargets(null);
              }}
              className="py-1.5 px-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Pechatsiz
            </button>
          </div>
        </div>
      )}

      {/* Quick Undo Banner after 1-by-1 Page Deletion */}
      {deletedUndoBanner && (
        <div className="fixed bottom-5 left-5 z-40 flex items-center gap-3 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs shadow-lg">
          <span>{deletedUndoBanner}</span>
          {past.length > 0 && (
            <button
              type="button"
              onClick={() => {
                handleUndo();
                setDeletedUndoBanner(null);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-medium cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              <span>Qaytarish</span>
            </button>
          )}
        </div>
      )}

      {/* Active Sequential Writing / Drawing Progress Pill */}
      {isStreamingToPage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/95 text-white text-xs shadow-xl border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{streamingLabel}</span>
          <button
            type="button"
            onClick={() => finishStreamNowRef.current?.()}
            className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Tez yakunlash
          </button>
        </div>
      )}

      {/* Subtle Paste Overflow Toast */}
      {pasteNotice && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium shadow-lg pointer-events-none">
          {pasteNotice}
        </div>
      )}
    </div>
  );
}
