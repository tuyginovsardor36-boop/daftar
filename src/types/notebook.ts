export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const LINE_SPACING = 32;
export const HEADER_HEIGHT = 88;
export const MARGIN_X = 92;
export const GRID_SIZE = 24;
export const GRID_START_X = 48;
export const GRID_START_Y = HEADER_HEIGHT;

export type ToolType =
  | 'pen'
  | 'pencil'
  | 'ballpoint'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'frame_box'
  | 'ai_draw'
  | 'line'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'select';

export type PaperStyle = 'lined' | 'grid' | 'dot' | 'blank' | 'poetry' | 'poetry_ornate';
export type GridRowSpan = 1 | 2;
export type PaperTone = 'ivory' | 'white' | 'cream';
export type BindingStyle = 'spiral' | 'stitched' | 'clean';
export type DeskTheme = 'linen' | 'slate' | 'walnut';
export type TextFont = 'custom' | 'handwriting' | 'serif' | 'sans' | 'mono';
export type NotebookCapacity = 12 | 24 | 36 | 96;
export type ViewLayout = 'single' | 'spread';
export type CoverTheme =
  | 'forest'
  | 'cobalt'
  | 'burgundy'
  | 'kraft'
  | 'charcoal'
  | 'royal_gold'
  | 'emerald_teal'
  | 'plum'
  | 'ivory_classic';
export type CoverLayoutStyle =
  | 'classic_standard'
  | 'academic_crest'
  | 'poetry_edition'
  | 'minimal_modern'
  | 'kraft_vintage';
export type CoverBorderPattern = 'double' | 'ornate' | 'minimal' | 'dashed' | 'none';
export type CoverEmblem = 'none' | 'book' | 'atom' | 'feather' | 'math' | 'star' | 'compass';
export type CoverLabelShape = 'rect' | 'rounded' | 'card';
export type CoverFontStyle = 'serif' | 'handwriting' | 'sans' | 'mono';
export type FrameStyle = 'none' | 'code' | 'rule' | 'formula' | 'note' | 'double_border' | 'dashed';
export type AiDrawingStyle = 'pencil' | 'pen' | 'diagram' | 'art';
export type PlanTier = 'free' | 'premium';

export interface CoverData {
  theme: CoverTheme;
  layoutStyle?: CoverLayoutStyle;
  borderPattern?: CoverBorderPattern;
  emblem?: CoverEmblem;
  labelShape?: CoverLabelShape;
  coverFont?: CoverFontStyle;
  customBgColor?: string;
  customAccentColor?: string;
  heading: string;
  subtitle?: string;
  subject: string;
  ownerName: string;
  gradeOrGroup: string;
  institution: string;
  teacherName?: string;
  cityOrRegion?: string;
  serialNumber?: string;
  year: string;
  isStateStandard: boolean;
  showGradeBox?: boolean;
  strokes: Stroke[];
}

export const COVER_THEMES: Record<
  CoverTheme,
  { bg: string; spine: string; border: string; accent: string; textOnBg: string; label: string; isLight?: boolean }
> = {
  forest: {
    bg: '#1F6E43',
    spine: '#144D2E',
    border: '#124227',
    accent: '#D1FAE5',
    textOnBg: '#ECFDF5',
    label: 'Maktab yashili',
  },
  cobalt: {
    bg: '#1E40AF',
    spine: '#172E7D',
    border: '#1E3A8A',
    accent: '#DBEAFE',
    textOnBg: '#EFF6FF',
    label: 'Ko‘k muqova',
  },
  burgundy: {
    bg: '#881337',
    spine: '#5C0B24',
    border: '#4C0519',
    accent: '#FFE4E6',
    textOnBg: '#FFF1F2',
    label: 'Bordo',
  },
  kraft: {
    bg: '#D5C2A5',
    spine: '#B59E7B',
    border: '#9A825F',
    accent: '#44403C',
    textOnBg: '#292524',
    label: 'Kraft qog‘oz',
    isLight: true,
  },
  charcoal: {
    bg: '#27272A',
    spine: '#18181B',
    border: '#09090B',
    accent: '#E4E4E7',
    textOnBg: '#F4F4F5',
    label: 'To‘q kulrang',
  },
  royal_gold: {
    bg: '#172554',
    spine: '#0F172A',
    border: '#B45309',
    accent: '#FCD34D',
    textOnBg: '#FEF3C7',
    label: 'Tilla va ko‘k',
  },
  emerald_teal: {
    bg: '#0F766E',
    spine: '#115E59',
    border: '#134E4A',
    accent: '#CCFBF1',
    textOnBg: '#F0FDFA',
    label: 'Zumrad feruza',
  },
  plum: {
    bg: '#581C87',
    spine: '#3B0764',
    border: '#4C1D95',
    accent: '#F3E8FF',
    textOnBg: '#FAF5FF',
    label: 'Shohona binafsha',
  },
  ivory_classic: {
    bg: '#EFE7D6',
    spine: '#C7B89E',
    border: '#78350F',
    accent: '#78350F',
    textOnBg: '#292524',
    label: 'Klassik fil suyagi',
    isLight: true,
  },
};

export const COVER_LAYOUT_PRESETS: Record<
  CoverLayoutStyle,
  { id: CoverLayoutStyle; label: string; desc: string }
> = {
  classic_standard: {
    id: 'classic_standard',
    label: 'Davlat standarti',
    desc: 'An’anaviy o‘quv va maktab muqovasi',
  },
  academic_crest: {
    id: 'academic_crest',
    label: 'Akademik nishon',
    desc: 'Emblema, rahbar va baho katakchasi bilan',
  },
  poetry_edition: {
    id: 'poetry_edition',
    label: 'She’riyat devoni',
    desc: 'Naqshli burchaklar va markaziy medalyon',
  },
  minimal_modern: {
    id: 'minimal_modern',
    label: 'Zamonaviy minimal',
    desc: 'Katta tipografiya va toza chiziqlar',
  },
  kraft_vintage: {
    id: 'kraft_vintage',
    label: 'Arxiv / Vintage',
    desc: 'Shtamp va kartochka uslubidagi titul',
  },
};

export const COVER_EMBLEMS: { id: CoverEmblem; label: string }[] = [
  { id: 'none', label: 'Nishonsiz' },
  { id: 'book', label: 'Kitob' },
  { id: 'atom', label: 'Fan / Atom' },
  { id: 'math', label: 'Matematika' },
  { id: 'feather', label: 'Pero / Adabiyot' },
  { id: 'compass', label: 'Geometriya' },
  { id: 'star', label: 'Sharq yulduzi' },
];

export const FRAME_STYLE_PRESETS: Record<
  Exclude<FrameStyle, 'none'>,
  { id: Exclude<FrameStyle, 'none'>; label: string; defaultTitle: string; defaultAccent: string; defaultFont: TextFont }
> = {
  code: {
    id: 'code',
    label: 'Kod bloki',
    defaultTitle: 'Python / Kod',
    defaultAccent: '#1E293B',
    defaultFont: 'mono',
  },
  rule: {
    id: 'rule',
    label: 'Muhim qoida',
    defaultTitle: 'Muhim qoida',
    defaultAccent: '#1D4ED8',
    defaultFont: 'serif',
  },
  formula: {
    id: 'formula',
    label: 'Formula / Teorema',
    defaultTitle: 'Formula',
    defaultAccent: '#0F766E',
    defaultFont: 'serif',
  },
  note: {
    id: 'note',
    label: 'Eslatma kartasi',
    defaultTitle: 'Eslatma',
    defaultAccent: '#B45309',
    defaultFont: 'handwriting',
  },
  double_border: {
    id: 'double_border',
    label: 'Qo‘sh ramka',
    defaultTitle: 'Asosiy fikr',
    defaultAccent: '#7C3AED',
    defaultFont: 'serif',
  },
  dashed: {
    id: 'dashed',
    label: 'Uzuk ramka',
    defaultTitle: 'Izoh / Misol',
    defaultAccent: '#DC2626',
    defaultFont: 'sans',
  },
};

export const CAPACITY_PRESETS: Record<
  NotebookCapacity,
  { sheets: NotebookCapacity; label: string; standardTag: string; stackLayers: number }
> = {
  12: {
    sheets: 12,
    label: '12 varaq',
    standardTag: 'Davlat standarti · O‘zDSt maktab daftari',
    stackLayers: 2,
  },
  24: {
    sheets: 24,
    label: '24 varaq',
    standardTag: 'Davlat standarti · Standart daftar',
    stackLayers: 3,
  },
  36: {
    sheets: 36,
    label: '36 varaq',
    standardTag: 'Standart o‘quv daftari',
    stackLayers: 4,
  },
  96: {
    sheets: 96,
    label: '96 varaq',
    standardTag: 'Umumiy daftar · Qattiq muqovali',
    stackLayers: 6,
  },
};

export interface GlyphStrokePoint {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface GlyphStroke {
  points: GlyphStrokePoint[];
  width: number; // normalized relative to glyph box (e.g. 0.032)
}

export interface CustomGlyph {
  char: string;
  strokes: GlyphStroke[];
  minX: number; // 0..1 left ink bound
  maxX: number; // 0..1 right ink bound
}

export type CustomAlphabetMap = Record<string, CustomGlyph>;

export const ALPHABET_GROUPS: { id: string; label: string; chars: string[] }[] = [
  {
    id: 'lower',
    label: 'Kichik harflar',
    chars: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  },
  {
    id: 'upper',
    label: 'Bosh harflar',
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  },
  {
    id: 'digits',
    label: 'Raqam va belgilar',
    chars: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ',', '!', '?', '-', ':', "'", '(', ')'],
  },
];

export interface StrokePoint {
  x: number;
  y: number;
  t?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'pencil' | 'ballpoint' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow';
  color: string;
  width: number;
  opacity: number;
  isMetallic?: boolean;
  aiGroupId?: string;
  points: StrokePoint[];
}

export interface PasteInspectionMeta {
  isPasted: boolean;
  pastedAt: number;
  charCount: number;
  status: 'human_verified' | 'pasted_ai_detected' | 'spam_flagged' | 'unchecked';
  aiProbability: number;
  verdictLabel: string;
  summary: string;
  stampText?: string;
}

export interface TextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  content: string;
  font: TextFont;
  fontSize: number;
  color: string;
  isMetallic?: boolean;
  frameStyle?: FrameStyle;
  frameTitle?: string;
  frameAccentColor?: string;
  showLineNumbers?: boolean;
  pasteMeta?: PasteInspectionMeta;
}

export interface StickerImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  rotation: number;
  hasTape: boolean;
}

export interface NotebookPage {
  id: string;
  title: string;
  dateLabel: string;
  strokes: Stroke[];
  textBlocks: TextBlock[];
  images: StickerImage[];
}

export interface AiDrawingStrokeSpec {
  kind: 'freehand' | 'line' | 'circle' | 'rect' | 'arrow';
  points: { x: number; y: number }[];
  weight?: 'thin' | 'normal' | 'bold' | 'shade';
  opacity?: number;
}

export interface AiDrawingLabelSpec {
  text: string;
  x: number; // 0..1000
  y: number; // 0..1000
}

export interface AiDrawingResponse {
  title: string;
  strokes: AiDrawingStrokeSpec[];
  labels: AiDrawingLabelSpec[];
}

export const SUBJECT_PRESETS = [
  'Ona tili',
  'Matematika',
  'She’riyat',
  'Adabiyot',
  'Fizika',
  'Kimyo',
  'Biologiya',
  'Tarix',
  'Ingliz tili',
  'Informatika',
];

export const POETRY_SNIPPETS: { id: string; label: string; text: string }[] = [
  {
    id: 'quatrain',
    label: '4 misrali band',
    text: 'Tonggi shabada esar mayin, sokin bog‘larda,\nYaproqlar pichirlar go‘yo sirli ohangda.\nQalbda uyg‘onadi bir pok, beg‘ubor ilhom,\nSo‘zlar tiziladi oppoq daftar varoqda.',
  },
  {
    id: 'ghazal',
    label: 'G‘azal bayti (2 misra)',
    text: 'Ko‘ngil bog‘ida ochilgan har gul — bir umid,\nHar bir satr ichra yashar bir porloq niyat.',
  },
  {
    id: 'ruboiy',
    label: 'Ruboiy qolipi',
    text: '1-misra (a) ...\n2-misra (a) ...\n3-misra (b) ...\n4-misra (a) ...',
  },
];

export interface NotebookDoc {
  id: string;
  title: string;
  subjectTag: string;
  updatedAt: number;
  paperStyle: PaperStyle;
  gridRowSpan: GridRowSpan;
  paperTone: PaperTone;
  bindingStyle: BindingStyle;
  deskTheme: DeskTheme;
  capacity: NotebookCapacity;
  viewLayout: ViewLayout;
  hasCover: boolean;
  cover: CoverData;
  pages: NotebookPage[];
  antiAiStampEnabled?: boolean;
}

export const PAPER_TONE_COLORS: Record<
  PaperTone,
  { bg: string; line: string; margin: string; dot: string; stackEdge: string; label: string }
> = {
  ivory: {
    bg: '#FCF9F2',
    line: 'rgba(100, 116, 139, 0.22)',
    margin: 'rgba(225, 29, 72, 0.34)',
    dot: 'rgba(100, 116, 139, 0.32)',
    stackEdge: '#EFE9DC',
    label: 'Fil suyagi',
  },
  white: {
    bg: '#FFFFFF',
    line: 'rgba(59, 130, 246, 0.18)',
    margin: 'rgba(225, 29, 72, 0.32)',
    dot: 'rgba(71, 85, 105, 0.28)',
    stackEdge: '#F1F3F5',
    label: 'Oq qog‘oz',
  },
  cream: {
    bg: '#F4ECD8',
    line: 'rgba(120, 93, 60, 0.22)',
    margin: 'rgba(190, 24, 93, 0.28)',
    dot: 'rgba(120, 93, 60, 0.34)',
    stackEdge: '#E5D9BF',
    label: 'Qaymoq rang',
  },
};

export interface InkColorOption {
  id: string;
  hex: string;
  label: string;
  isMetallic?: boolean;
  shimmerStops?: [string, string, string];
}

export const INK_COLORS: InkColorOption[] = [
  { id: 'black', hex: '#18181B', label: 'Qora siyoh' },
  { id: 'cobalt', hex: '#1D4ED8', label: 'Ko‘k ruchka' },
  { id: 'navy', hex: '#1E3A8A', label: 'To‘q ko‘k' },
  { id: 'sky', hex: '#0284C7', label: 'Moviy siyoh' },
  { id: 'crimson', hex: '#DC2626', label: 'Qizil siyoh' },
  { id: 'rose', hex: '#DB2777', label: 'Pushti siyoh' },
  { id: 'violet', hex: '#7C3AED', label: 'Binafsha siyoh' },
  { id: 'emerald', hex: '#15803D', label: 'Yashil siyoh' },
  { id: 'teal', hex: '#0D9488', label: 'Feruza siyoh' },
  { id: 'orange', hex: '#EA580C', label: 'To‘q sariq' },
  { id: 'sepia', hex: '#78350F', label: 'Jigarrang' },
  { id: 'slate', hex: '#52525B', label: 'Kulrang siyoh' },
  // Yaltiroq / Metallik siyohlar
  {
    id: 'glitter_gold',
    hex: '#C89B2B',
    label: 'Yaltiroq oltin',
    isMetallic: true,
    shimmerStops: ['#8A6208', '#FCE36D', '#B7791F'],
  },
  {
    id: 'glitter_silver',
    hex: '#7E8B9B',
    label: 'Yaltiroq kumush',
    isMetallic: true,
    shimmerStops: ['#475569', '#F1F5F9', '#64748B'],
  },
  {
    id: 'glitter_sapphire',
    hex: '#2563EB',
    label: 'Yaltiroq safir ko‘k',
    isMetallic: true,
    shimmerStops: ['#1E3A8A', '#93C5FD', '#1D4ED8'],
  },
  {
    id: 'glitter_emerald',
    hex: '#059669',
    label: 'Yaltiroq zumrad',
    isMetallic: true,
    shimmerStops: ['#065F46', '#6EE7B7', '#047857'],
  },
  {
    id: 'glitter_ruby',
    hex: '#E11D48',
    label: 'Yaltiroq yoqut',
    isMetallic: true,
    shimmerStops: ['#881337', '#FDA4AF', '#BE123C'],
  },
  {
    id: 'glitter_amethyst',
    hex: '#9333EA',
    label: 'Yaltiroq ametist',
    isMetallic: true,
    shimmerStops: ['#581C87', '#E9D5FF', '#7E22CE'],
  },
];

export function getMetallicInkConfig(hex: string): InkColorOption | undefined {
  const lower = hex.toLowerCase();
  return INK_COLORS.find((c) => c.isMetallic && c.hex.toLowerCase() === lower);
}

export const HIGHLIGHTER_COLORS = [
  { id: 'yellow', hex: '#FDE047', label: 'Sariq marker' },
  { id: 'mint', hex: '#86EFAC', label: 'Yashil marker' },
  { id: 'sky', hex: '#7DD3FC', label: 'Moviy marker' },
  { id: 'rose', hex: '#FDA4AF', label: 'Pushti marker' },
  { id: 'lavender', hex: '#D8B4FE', label: 'Binafsha marker' },
  { id: 'peach', hex: '#FDBA74', label: 'Apelsin marker' },
  { id: 'aqua', hex: '#5EEAD4', label: 'Feruza marker' },
];

export const FONT_MAP: Record<TextFont, { css: string; label: string }> = {
  custom: { css: "'Caveat', cursive", label: 'Mening yozuvim' },
  handwriting: { css: "'Caveat', cursive", label: 'Qo‘lyozma' },
  serif: { css: "'Lora', Georgia, serif", label: 'Kitobiy' },
  sans: { css: "'Plus Jakarta Sans', sans-serif", label: 'Zamonaviy' },
  mono: { css: "'JetBrains Mono', monospace", label: 'Monospace' },
};

// Ink circle size percentage (5% - 100%) <-> Stroke width (1px - 16px)
export const MIN_INK_WIDTH = 1.0;
export const MAX_INK_WIDTH = 16.0;

export function percentToWidth(percent: number): number {
  const clamped = Math.max(5, Math.min(100, percent));
  return Number((MIN_INK_WIDTH + ((clamped - 5) / 95) * (MAX_INK_WIDTH - MIN_INK_WIDTH)).toFixed(2));
}

export function widthToPercent(width: number): number {
  const clamped = Math.max(MIN_INK_WIDTH, Math.min(MAX_INK_WIDTH, width));
  const raw = 5 + ((clamped - MIN_INK_WIDTH) / (MAX_INK_WIDTH - MIN_INK_WIDTH)) * 95;
  return Math.round(raw / 5) * 5;
}

