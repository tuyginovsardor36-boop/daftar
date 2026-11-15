import React from 'react';
import { Check, Crown, Sparkles, X } from 'lucide-react';
import { PlanTier } from '../types/notebook';

interface PlanTierModalProps {
  isOpen: boolean;
  planTier: PlanTier;
  aiRequestCount: number;
  onClose: () => void;
}

export const PlanTierModal: React.FC<PlanTierModalProps> = ({
  isOpen,
  planTier,
  aiRequestCount,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#F9F8F5] border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <Crown className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Sun’iy intellekt tarif rejasi
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hozircha barcha AI imkoniyatlari bepul (Free) rejimida ishlaydi
              </p>
            </div>
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

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Free Plan */}
            <div className="rounded-xl border-2 border-blue-600 bg-white p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900">Free tarif</span>
                  <span className="text-xs font-semibold text-blue-700">
                    {planTier === 'free' ? 'Faol' : 'Asosiy'}
                  </span>
                </div>
                <div className="mt-1 text-lg font-bold text-zinc-900">0 so‘m</div>
                <p className="text-xs text-zinc-500 mt-1">
                  Hozircha ochiq davr — barcha AI funksiyalar cheklovsiz yoqilgan.
                </p>

                <ul className="mt-3 space-y-1.5 text-xs text-zinc-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>She’riyat AI suhbatdoshi (Gemini)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Paste Anti-AI / Anti-Spam tekshiruvi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>PDF pechat va cheksiz daftarlar</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 font-code tabular-nums">
                Joriy sessiyada AI so‘rovlari: {aiRequestCount} ta
              </div>
            </div>

            {/* Premium Plan (Upcoming) */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Premium tarif</span>
                  </span>
                  <span className="text-[11px] font-medium text-amber-800">Tez kunda</span>
                </div>
                <div className="mt-1 text-lg font-bold text-zinc-900">Pullik obuna</div>
                <p className="text-xs text-zinc-500 mt-1">
                  Keyingi bosqichda kengaytirilgan AI kvota va maxsus imkoniyatlar uchun yoqiladi.
                </p>

                <ul className="mt-3 space-y-1.5 text-xs text-zinc-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Cheksiz she’riy tahrir va aruz tahlili</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Kengaytirilgan Anti-AI hisobotlari</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Maxsus muqova va devon shablonlari</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                disabled
                className="w-full py-2 px-3 rounded-lg bg-zinc-100 text-zinc-500 text-xs font-medium cursor-not-allowed"
              >
                Hozircha Free rejimda ochiq
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tushunarli
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
