import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Crown,
  Feather,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { PaperStyle, PlanTier } from '../types/notebook';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  poemTitle?: string;
  poemBody?: string;
}

interface PoetryAiDrawerProps {
  isOpen: boolean;
  notebookTitle: string;
  paperStyle: PaperStyle;
  planTier: PlanTier;
  aiRequestCount: number;
  onInsertPoem: (title: string, body: string, switchToPoetryPaper?: boolean) => void;
  onOpenPlanModal: () => void;
  onClose: () => void;
}

const POETRY_STYLES = [
  'Lirik she’r',
  'G‘azal',
  'Ruboiy',
  'Tabrik she’ri',
  'Vatan va tabiat',
  'Erkin vazn',
];

const QUICK_PROMPTS = [
  'Onamga atab samimiy 4 bandli she’r yozib ber',
  'Bahor va yoshlik haqida ohangdor lirik she’r',
  'Ustozga minnatdorchilik tabrik she’ri yozaylik',
];

export const PoetryAiDrawer: React.FC<PoetryAiDrawerProps> = ({
  isOpen,
  notebookTitle,
  paperStyle,
  planTier,
  aiRequestCount,
  onInsertPoem,
  onOpenPlanModal,
  onClose,
}) => {
  const [stylePreset, setStylePreset] = useState<string>('Lirik she’r');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Assalomu alaykum! Qanday mavzu, kayfiyat yoki kimga atab she’r yozmoqchisiz? Menga ta’riflab bering, birga chiroyli misralar yaratamiz va to‘g‘ridan-to‘g‘ri daftaringizga joylaymiz.',
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

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
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
            m.poemBody && m.role === 'model'
              ? `${m.text}\n\n${m.poemTitle ? m.poemTitle + '\n' : ''}${m.poemBody}`
              : m.text,
        }));

      const res = await fetch('/api/ai/poetry-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          stylePreset,
          notebookTitle,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        poemTitle?: string;
        poemBody?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'AI javob qaytara olmadi.');
      }

      const aiMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: data.reply || 'Marhamat, she’r tayyor:',
        poemTitle: data.poemTitle || '',
        poemBody: data.poemBody || '',
      };
      setMessages((prev) => [...prev, aiMsg]);
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
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center shrink-0">
            <Feather className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-900 truncate">
              She’riyat AI Suhbatdoshi
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
            title="Free va Premium tariflar"
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

      {/* Style Preset Selector */}
      <div className="px-3.5 py-2.5 bg-white/70 border-b border-zinc-900/10">
        <div className="text-[11px] font-medium text-zinc-600 mb-1.5">She’r janri va uslubi</div>
        <div className="flex items-center gap-1 flex-wrap">
          {POETRY_STYLES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setStylePreset(preset)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                stylePreset === preset
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
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-800 shadow-xs'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.poemBody && msg.poemBody.trim().length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-amber-900/15 bg-[#FCF9F2] rounded-lg p-3 border border-amber-800/20">
                  {msg.poemTitle && (
                    <div className="font-editorial font-semibold text-sm text-zinc-900 mb-2">
                      {msg.poemTitle}
                    </div>
                  )}
                  <pre className="font-editorial text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                    {msg.poemBody}
                  </pre>

                  <div className="mt-3 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onInsertPoem(msg.poemTitle || '', msg.poemBody || '', false)}
                      className="w-full py-1.5 px-3 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5" />
                      <span>Daftarga yozish</span>
                    </button>
                    {!isPoetryPaper && (
                      <button
                        type="button"
                        onClick={() => onInsertPoem(msg.poemTitle || '', msg.poemBody || '', true)}
                        className="w-full py-1.5 px-3 rounded-md border border-amber-700/30 bg-amber-50 hover:bg-amber-100 text-amber-950 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>She’riyat qog‘oziga o‘tib yozish</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
            <span>Ilhom bilan satrlar tuzilmoqda...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        {messages.length <= 2 && !isLoading && (
          <div className="pt-1 space-y-1.5">
            <div className="text-[11px] text-zinc-500">Tezkor g‘oyalar:</div>
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
            placeholder="She’r mavzusi, kimga atalgani yoki o‘zgartirishlarni yozing..."
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
