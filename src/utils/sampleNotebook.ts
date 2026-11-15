import {
  CoverData,
  GridRowSpan,
  NotebookCapacity,
  NotebookDoc,
  NotebookPage,
  PaperStyle,
} from '../types/notebook';

export function createDefaultCover(): CoverData {
  return {
    theme: 'forest',
    layoutStyle: 'classic_standard',
    borderPattern: 'double',
    emblem: 'book',
    labelShape: 'rect',
    coverFont: 'handwriting',
    heading: 'DAFTAR',
    subtitle: '',
    subject: '',
    ownerName: '',
    gradeOrGroup: '',
    institution: '',
    teacherName: '',
    cityOrRegion: '',
    serialNumber: '',
    year: '2026–2027',
    isStateStandard: true,
    showGradeBox: false,
    strokes: [],
  };
}

export function syncPagesToCapacity(
  existingPages: NotebookPage[],
  capacity: NotebookCapacity
): NotebookPage[] {
  const targetCount = capacity;
  if (existingPages.length === targetCount) return existingPages;
  if (existingPages.length < targetCount) {
    const extra: NotebookPage[] = [];
    for (let i = existingPages.length; i < targetCount; i++) {
      extra.push(createBlankPage(''));
    }
    return [...existingPages, ...extra];
  }
  // When downsizing, keep at least any non-empty pages up to their last index, or targetCount
  let lastUsedIdx = targetCount - 1;
  for (let i = existingPages.length - 1; i >= targetCount; i--) {
    const p = existingPages[i];
    if (p.strokes.length > 0 || p.textBlocks.length > 0 || p.images.length > 0 || p.title.trim()) {
      lastUsedIdx = i;
      break;
    }
  }
  return existingPages.slice(0, lastUsedIdx + 1);
}

export function formatTodayLabel(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function createBlankPage(title = ''): NotebookPage {
  return {
    id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    dateLabel: formatTodayLabel(),
    strokes: [],
    textBlocks: [],
    images: [],
  };
}

export function createInitialNotebook(): NotebookDoc {
  const today = formatTodayLabel();

  const page1: NotebookPage = {
    id: 'page_1_initial',
    title: 'Loyiha Rejasi va Qaydlar',
    dateLabel: today,
    strokes: [
      // Yellow highlighter sweep over key line
      {
        id: 'hl_sample_1',
        tool: 'highlighter',
        color: '#FDE047',
        width: 22,
        opacity: 0.42,
        points: [
          { x: 58, y: 136 },
          { x: 374, y: 136 },
        ],
      },
      // Neat hand-drawn underline beneath title text
      {
        id: 'ink_underline_1',
        tool: 'pen',
        color: '#1D4ED8',
        width: 2.2,
        opacity: 1,
        points: [
          { x: 58, y: 152 },
          { x: 186, y: 151 },
          { x: 326, y: 153 },
          { x: 378, y: 151 },
        ],
      },
      // Diagram box on right side (clean sketch)
      {
        id: 'diag_rect_1',
        tool: 'rect',
        color: '#18181B',
        width: 2,
        opacity: 0.9,
        points: [
          { x: 66, y: 492 },
          { x: 236, y: 582 },
        ],
      },
      {
        id: 'diag_arrow_1',
        tool: 'arrow',
        color: '#1D4ED8',
        width: 2.2,
        opacity: 1,
        points: [
          { x: 246, y: 537 },
          { x: 334, y: 537 },
        ],
      },
      {
        id: 'diag_rect_2',
        tool: 'rect',
        color: '#18181B',
        width: 2,
        opacity: 0.9,
        points: [
          { x: 346, y: 492 },
          { x: 522, y: 582 },
        ],
      },
      {
        id: 'diag_arrow_2',
        tool: 'arrow',
        color: '#15803D',
        width: 2.2,
        opacity: 1,
        points: [
          { x: 532, y: 537 },
          { x: 598, y: 537 },
        ],
      },
      // Small hand-drawn circle emphasis
      {
        id: 'diag_circle_1',
        tool: 'circle',
        color: '#DC2626',
        width: 2,
        opacity: 0.85,
        points: [
          { x: 608, y: 504 },
          { x: 676, y: 570 },
        ],
      },
    ],
    textBlocks: [
      {
        id: 'tb_1',
        x: 56,
        y: 116,
        width: 610,
        content: 'Asosiy g‘oya: Realistik daftar va tezkor PDF eksport',
        font: 'handwriting',
        fontSize: 28,
        color: '#18181B',
      },
      {
        id: 'tb_2',
        x: 56,
        y: 178,
        width: 630,
        content:
          '1. Qog‘oz ustida erkin qalam, ruchka va marker bilan chizish hamda yozish.\n2. Chiziqli, katak, nuqtali yoki oq qog‘oz turlarini tanlash.\n3. Sahifani yuqori aniqlikda screenshot qilib, to‘g‘ridan-to‘g‘ri PDF ga o‘tkazish.',
        font: 'handwriting',
        fontSize: 25,
        color: '#1E293B',
      },
      {
        id: 'tb_3',
        x: 82,
        y: 520,
        width: 140,
        content: 'Daftar Canvas',
        font: 'sans',
        fontSize: 16,
        color: '#18181B',
      },
      {
        id: 'tb_4',
        x: 364,
        y: 520,
        width: 148,
        content: 'HD Screenshot',
        font: 'sans',
        fontSize: 16,
        color: '#1D4ED8',
      },
      {
        id: 'tb_5',
        x: 620,
        y: 522,
        width: 56,
        content: 'PDF',
        font: 'mono',
        fontSize: 16,
        color: '#DC2626',
      },
      {
        id: 'tb_6',
        x: 56,
        y: 626,
        width: 630,
        content:
          'Eslatma: Yuqoridagi “PDF ga eksport” tugmasini bosing — tizim daftar sahifasini screenshot qiladi va darhol PDF faylga ko‘chiradi.',
        font: 'serif',
        fontSize: 16,
        color: '#3F3F46',
      },
    ],
    images: [],
  };

  const page2: NotebookPage = {
    id: 'page_2_initial',
    title: 'Yangi sahifa',
    dateLabel: today,
    strokes: [],
    textBlocks: [],
    images: [],
  };

  const pages: NotebookPage[] = [page1, page2];
  for (let i = 2; i < 12; i++) {
    pages.push(createBlankPage(''));
  }

  return {
    id: 'daftar_main_v1',
    title: 'Mening Daftarim',
    subjectTag: 'Ona tili',
    updatedAt: Date.now(),
    paperStyle: 'lined',
    gridRowSpan: 2,
    paperTone: 'ivory',
    bindingStyle: 'stitched',
    deskTheme: 'linen',
    capacity: 12,
    viewLayout: 'single',
    hasCover: false,
    cover: createDefaultCover(),
    pages,
  };
}

export function createNewNotebookDoc(params: {
  title: string;
  subjectTag: string;
  paperStyle: PaperStyle;
  gridRowSpan: GridRowSpan;
  capacity: NotebookCapacity;
  hasCover: boolean;
}): NotebookDoc {
  const pages: NotebookPage[] = [];
  for (let i = 0; i < params.capacity; i++) {
    pages.push(createBlankPage(i === 0 ? '' : ''));
  }
  return {
    id: `daftar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: params.title.trim() || 'Yangi daftar',
    subjectTag: params.subjectTag.trim(),
    updatedAt: Date.now(),
    paperStyle: params.paperStyle,
    gridRowSpan: params.gridRowSpan,
    paperTone: 'ivory',
    bindingStyle: params.capacity === 96 ? 'stitched' : 'stitched',
    deskTheme: 'linen',
    capacity: params.capacity,
    viewLayout: 'single',
    hasCover: params.hasCover,
    cover: {
      ...createDefaultCover(),
      heading: params.capacity === 96 ? 'UMUMIY DAFTAR' : 'DAFTAR',
    },
    pages,
  };
}
