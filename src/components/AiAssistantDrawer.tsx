import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Bot,
  Code2,
  Crown,
  Feather,
  Loader2,
  Pencil,
  Send,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { AiDrawingStyle, FrameStyle, PaperStyle, PlanTier, TextFont } from '../types/notebook';

export interface AiNotebookActionPayload {
  action: 'none' | 'write_text' | 'write_frame' | 'draw_sketch' | 'update_notebook';
  pageTitle?: string;
  content?: string;
  preferredFont?: TextFont;
  frameStyle?: FrameStyle;
  frameTitle?: string;
  drawingPrompt?: string;
  drawingStyle?: AiDrawingStyle;
  paperStyleChange?: PaperStyle | '';
  enableCover?: boolean;
  coverHeading?: string;
  coverSubject?: string;
}

interface ChatMessage extends AiNotebookActionPayload {
  id: string;
  role: 'user' | 'model';
  text: string;
  applied?: boolean;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  notebookTitle: string;
  subjectTag: string;
  paperStyle: PaperStyle;
  activePageNumber: number;
  activePageTitle: string;
  hasCover: boolean;
  currentPageTextPreview: string;
  planTier: PlanTier;
  aiRequestCount: number;
  isStreamingToPage: boolean;
  onExecuteAction: (payload: AiNotebookActionPayload, forcePoetryPaper?: boolean) => Promise<void> | void;
  onIncrementAiCount: () => void;
  onOpenPlanModal: () => void;
  onClose: () => void;
}

const MODE_PRESETS = [
  'Umumiy yordamchi',
  'Konspekt / Insho',
  'Kod / Formula',
  'She’riyat',
  'Qalam chizma',
];

const QUICK_PROMPTS = [
  'Menga "Alisher Navoiy ijodi" haqida chiroyli konspekt yozib ber',
  'Python da sonning faktorialini hisoblovchi kodni ramkali qilib yoz',
  'Pifagor teoremasi formulasini ramkaga olib, yoniga uchburchak chiz',
  'Onajonimga atab samimiy 4 bandli she’r yozib daftarga tushir',
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  notebookTitle,
  subjectTag,
  paperStyle,
  activePageNumber,
  activePageTitle,
  hasCover,
  currentPageTextPreview,
  planTier,
  aiRequestCount,
  isStreamingToPage,
  onExecuteAction,
  onIncrementAiCount,
  onOpenPlanModal,
  onClose,
}) => {
  const [modePreset, setModePreset] = useState<string>('Umumiy yordamchi');
  const [autoWrite, setAutoWrite] = useState<boolean>(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      action: 'none',
      text: 'Assalomu alaykum! Men Daftar Canvas AI yordamchisiman. Menga istalgan topshiriq bering — konspekt, insho, she’r, kod/formula ramkasi yoki qalamda rasmni ketma-ket chiroyli tarzda daftaringizga tushirib beraman.',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const isPoetryPaper = paperStyle === 'poetry' || paperStyle === 'poetry_ornate';

  const handleApplyMessageAction = async (msgId: string, payload: AiNotebookActionPayload, forcePoetryPaper = false) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)));
    await onExecuteAction(payload, forcePoetryPaper);
  };

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      action: 'none',
      text: content,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setIsLoading(true);

    try {
      const apiMessages = nextHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          text:
            m.role === 'model' && m.content
              ? `${m.text}\n\n${m.content}`
              : m.text,
        }));

      const res = await fetch('/api/ai/notebook-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          modePreset,
          notebookContext: {
            title: notebookTitle,
            subjectTag,
            paperStyle,
            activePageNumber,
            activePageTitle,
            hasCover,
            currentPageTextPreview,
          },
        }),
      });

      const data = (await res.json()) as AiNotebookActionPayload & {
        reply?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'AI javob qaytara olmadi.');
      }

      onIncrementAiCount();

      const hasActionablePayload =
        data.action &&
        data.action !== 'none' &&
        Boolean(
          data.content?.trim() ||
            data.drawingPrompt?.trim() ||
            data.paperStyleChange ||
            data.enableCover ||
            data.coverHeading ||
            data.coverSubject ||
            data.pageTitle
        );

      const aiMsgId = `m_${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        text: data.reply || 'Marhamat, tayyor!',
        action: data.action || 'none',
        pageTitle: data.pageTitle || '',
        content: data.content || '',
        preferredFont: (data.preferredFont as TextFont) || 'handwriting',
        frameStyle: (data.frameStyle as FrameStyle) || 'none',
        frameTitle: data.frameTitle || '',
        drawingPrompt: data.drawingPrompt || '',
        drawingStyle: (data.drawingStyle as AiDrawingStyle) || 'pencil',
        paperStyleChange: data.paperStyleChange || '',
        enableCover: Boolean(data.enableCover),
        coverHeading: data.coverHeading || '',
        coverSubject: data.coverSubject || '',
        applied: Boolean(autoWrite && hasActionablePayload),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (autoWrite && hasActionablePayload) {
        await onExecuteAction(aiMsg, false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Tarmoq xatoligi yuz berdi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-80 sm:w-96 shrink-0 bg-[#F9F8F5] border-l border-zinc-900/10 flex flex-col h-full z-20">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-zinc-900/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-900 truncate">
              AI Daftar Yordamchisi
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <span>{planTier === 'free' ? 'Free rejim' : 'Premium'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-code tabular-nums">{aiRequestCount} so‘rov</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenPlanModal}
            title="Free va Premium tarif rejasi"
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300/80 bg-amber-50 text-amber-900 text-[11px] font-medium hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Crown className="w-3 h-3" />
            <span>Tarif</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Preset & Auto-Typewriter Toggle */}
      <div className="px-3.5 py-2.5 bg-white/80 border-b border-zinc-900/10 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-600">Yordam yo‘nalishi</span>
          <button
            type="button"
            onClick={() => setAutoWrite((v) => !v)}
            title="AI javob berishi bilanoq daftarga ketma-ket yozib tushirsinmi?"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
              autoWrite
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>{autoWrite ? 'Avto-yozish: Yoqilgan' : 'Avto-yozish: Qo‘lda'}</span>
          </button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {MODE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setModePreset(preset)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                modePreset === preset
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto studio-scroll p-3.5 space-y-3">
        {messages.map((msg) => {
          const hasTextPayload =
            (msg.action === 'write_text' || msg.action === 'write_frame') &&
            Boolean(msg.content?.trim());
          const hasDrawPayload = msg.action === 'draw_sketch' && Boolean(msg.drawingPrompt?.trim());
          const hasConfigPayload =
            msg.action === 'update_notebook' &&
            Boolean(
              msg.paperStyleChange ||
                msg.enableCover ||
                msg.coverHeading ||
                msg.coverSubject ||
                msg.pageTitle
            );

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[94%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Text or Frame Preview Card */}
                {hasTextPayload && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-200/80 bg-[#FCF9F2] rounded-lg p-2.5 border border-zinc-200">
                    {(msg.frameTitle || msg.pageTitle) && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-900 mb-1.5">
                        {msg.action === 'write_frame' ? (
                          <Code2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        ) : (
                          <Feather className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        )}
                        <span className="truncate">{msg.frameTitle || msg.pageTitle}</span>
                      </div>
                    )}
                    <pre
                      className={`text-[11px] text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto studio-scroll ${
                        msg.frameStyle === 'code' ? 'font-code' : 'font-editorial'
                      }`}
                    >
                      {msg.content}
                    </pre>

                    <div className="mt-2.5 flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={isStreamingToPage}
                        onClick={() => handleApplyMessageAction(msg.id, msg, false)}
                        className="w-full py-1.5 px-2.5 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookOpenCheck className="w-3.5 h-3.5" />
                        <span>
                          {msg.applied
                            ? 'Qayta ketma-ket yozdirish'
                            : 'Daftarga ketma-ket yozdirish'}
                        </span>
                      </button>

                      {modePreset === 'She’riyat' && !isPoetryPaper && (
                        <button
                          type="button"
                          disabled={isStreamingToPage}
                          onClick={() => handleApplyMessageAction(msg.id, msg, true)}
                          className="w-full py-1.5 px-2.5 rounded-md border border-amber-700/30 bg-amber-50 hover:bg-amber-100 text-amber-950 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>She’riyat qog‘oziga o‘tib yozdirish</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Drawing Action Card */}
                {hasDrawPayload && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-900">
                      <Pencil className="w-3.5 h-3.5 text-blue-700" />
                      <span>Chizma: {msg.drawingPrompt}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isStreamingToPage}
                      onClick={() => handleApplyMessageAction(msg.id, msg)}
                      className="w-full py-1.5 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{msg.applied ? 'Yana sahifaga chizdirish' : 'Sahifaga ketma-ket chizdirish'}</span>
                    </button>
                  </div>
                )}

                {/* Notebook Config Card */}
                {hasConfigPayload && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-950">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
                      <span>Daftar sozlamalarini yangilash</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyMessageAction(msg.id, msg)}
                      className="w-full py-1.5 px-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {msg.applied ? 'Sozlamalar qo‘llandi (Qayta qo‘llash)' : 'Daftarga qo‘llash'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
            <span>AI o‘ylab, daftarga tayyorlamoqda...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        {messages.length <= 2 && !isLoading && (
          <div className="pt-1 space-y-1.5">
            <div className="text-[11px] text-zinc-500">Tezkor buyruqlar:</div>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="w-full text-left px-2.5 py-2 rounded-lg bg-white border border-zinc-200 hover:border-blue-400 text-[11px] text-zinc-700 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 bg-white border-t border-zinc-900/10"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={2}
            placeholder="Masalan: 'Konspekt yoz', 'Python kodni ramkaga ol', 'Olma chizib ber'..."
            className="flex-1 resize-none px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            title="Yuborish"
            className="p-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
