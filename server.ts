import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface PoetryChatBody {
  messages?: ChatTurn[];
  stylePreset?: string;
  notebookTitle?: string;
}

interface NotebookChatBody {
  messages?: ChatTurn[];
  modePreset?: string;
  notebookContext?: {
    title?: string;
    subjectTag?: string;
    paperStyle?: string;
    activePageNumber?: number;
    activePageTitle?: string;
    hasCover?: boolean;
    currentPageTextPreview?: string;
  };
}

interface AntiAiBody {
  text?: string;
  isPasted?: boolean;
}

interface AiDrawingBody {
  prompt?: string;
  style?: 'pencil' | 'pen' | 'diagram' | 'art';
  aspectRatio?: number;
}

function buildHeuristicAntiAiResult(text: string, isPasted: boolean) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = trimmed ? trimmed.split('\n').length : 0;
  const hasUrlOrPromo = /(https?:\/\/|t\.me\/|@\w+|www\.|click here|promo|subscribe)/i.test(trimmed);
  const repeatedChars = /(.)\1{6,}/.test(trimmed);
  const aiFormalMarkers =
    /(xulosa qilib aytganda|shuningdek|birinchidan.*ikkinchidan|albatta, men sizga|ushbu maqolada|in conclusion|furthermore)/i.test(
      trimmed
    );

  let aiProbability = isPasted ? 32 : 8;
  if (words > 45 && isPasted) aiProbability += 18;
  if (aiFormalMarkers) aiProbability += 28;
  if (hasUrlOrPromo || repeatedChars) aiProbability += 24;
  aiProbability = Math.min(96, Math.max(4, aiProbability));

  let status: 'human_verified' | 'pasted_ai_detected' | 'spam_flagged' = 'human_verified';
  let verdictLabel = 'Anti-AI: Toza / Tasdiqlandi';
  let stampText = 'ANTI-AI TASDIQLANDI';
  let summary = isPasted
    ? `Nusxalangan matn (${words} so‘z, ${lines} qator) tekshirildi — spam belgilari topilmadi.`
    : 'Qo‘lda kiritilgan tabiiy matn.';

  if (hasUrlOrPromo || repeatedChars) {
    status = 'spam_flagged';
    verdictLabel = 'Anti-Spam: Shubhali nusxa aniqlandi';
    stampText = 'ANTI-SPAM NAZORATI';
    summary = 'Matnda reklama havolasi yoki takroriy spam belgilari aniqlandi.';
  } else if (aiProbability >= 55) {
    status = 'pasted_ai_detected';
    verdictLabel = 'Anti-AI: Nusxa / AI ehtimoli yuqori';
    stampText = 'ANTI-AI: PASTE NAZORATI';
    summary = `Nusxalangan matnda shablon yoki AI uslubiga xos tuzilma (${aiProbability}%) kuzatildi.`;
  }

  return {
    status,
    aiProbability,
    verdictLabel,
    summary,
    stampText,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Plan / Subscription status endpoint (currently Free with full access; Premium ready)
  app.get('/api/plan', (_req, res) => {
    res.json({
      activePlan: 'free',
      billingEnabled: false,
      message: 'Hozircha barcha AI imkoniyatlari Free rejimida bepul ochiq. Premium tarif keyinroq ishga tushadi.',
      plans: {
        free: {
          name: 'Free',
          priceLabel: 'Bepul (Hozircha cheklovsiz)',
          poetryAi: true,
          antiAiCheck: true,
        },
        premium: {
          name: 'Premium',
          priceLabel: 'Tez kunda pullik',
          poetryAi: true,
          antiAiCheck: true,
        },
      },
    });
  });

  // Universal Conversational Notebook AI Assistant (Gemini 4 Hydrogen)
  app.post('/api/ai/notebook-chat', async (req, res) => {
    const body = req.body as NotebookChatBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const modePreset = body?.modePreset || 'Umumiy yordamchi';
    const ctx = body?.notebookContext || {};

    if (messages.length === 0) {
      res.status(400).json({ error: 'Suhbat xabari bo‘sh bo‘lishi mumkin emas.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Serverda GEMINI_API_KEY sozlanmagan. Iltimos, sozlamalardan kalitni tekshiring.',
      });
      return;
    }

    try {
      const contents = messages.slice(-14).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      const contextSummary = `Joriy daftar: "${ctx.title || 'Mening Daftarim'}", Fan: "${ctx.subjectTag || 'Umumiy'}", Qog‘oz turi: "${ctx.paperStyle || 'lined'}", Joriy sahifa: ${ctx.activePageNumber || 1}-bet ("${ctx.activePageTitle || ''}"), Titul muqova: ${ctx.hasCover ? 'yoqilgan' : 'o‘chirilgan'}.
Sahifadagi mavjud matn qismi: ${(ctx.currentPageTextPreview || '').slice(0, 500) || '(hozircha bo‘sh)'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: `Siz "Daftar Canvas" raqamli daftarining aqlli, ko‘p qirrali AI suhbatdoshi va yordamchisisiz.
Foydalanuvchi bilan do‘stona o‘zbek tilida suhbatlashing va daftarda xohlagan ishini bajarishga yordam bering:
- Konspekt, insho, referat, ma’ruza, reja, tarjima, tahlil yoki she’r/g‘azal yozish;
- Matematika/fizika/kimyo masalasi yechimi, formula yoki qoidani ramkali karta qilib yozish;
- Dasturlash kodi (Python, JS, HTML, C++ va h.k.)ni chiroyli kod ramkasiga yozish;
- Sahifaga qalam eskizi, geometrik shakl yoki rasm chizdirish;
- Daftar qog‘oz turini, sahifa sarlavhasini yoki titul muqovani yangilash.

${contextSummary}
Tanlangan rejim: ${modePreset}.

Amal ("action") tanlash qoidalari:
1. "write_text": Agar foydalanuvchi daftarga oddiy matn, konspekt, insho, reja, masala yechimi, xulosa yoki she’r yozib berishni so‘rasa. "content" maydoniga daftarga tushadigan to‘liq, chiroyli formatlangan matnni yozing (she’r bo‘lsa misralar alohida qatordan, bandlar orasida bo‘sh qator bilan). Zarur bo‘lsa "pageTitle" bering. "preferredFont" sifatida she’r/konspekt uchun "handwriting" yoki "serif" tanlang.
2. "write_frame": Agar foydalanuvchi kod, muhim qoida, formula/teorema yoki eslatmani alohida ramkali blok qilib kiritishni so‘rasa.
   - "frameStyle": 'code' (kodlar uchun), 'rule' (qoidalar uchun), 'formula' (formulalar uchun), 'note' (eslatma), 'double_border' (asosiy fikr).
   - "frameTitle": ramka tepasidagi qisqa sarlavha (masalan "Python kod", "Pifagor teoremasi", "Muhim qoida").
   - "content": ramka ichiga yoziladigan matn/kod.
3. "draw_sketch": Agar foydalanuvchi rasm, eskiz, sxema, grafik yoki geometrik shakl chizib berishni so‘rasa.
   - "drawingPrompt": chizma tavsifi (aniq va batafsil).
   - "drawingStyle": 'pencil' | 'pen' | 'diagram' | 'art'.
4. "update_notebook": Agar foydalanuvchi daftar ko‘rinishini o‘zgartirishni so‘rasa (masalan: "katak qog‘ozga o‘t", "she’riyat shablonini yoq", "titul muqovani yoqib fan nomini Fizika qil").
5. "none": Agar foydalanuvchi shunchaki savol berayotgan yoki fikr almashayotgan bo‘lsa (hali daftarga yozish shart bo‘lmasa).

Har doim "reply" maydonida foydalanuvchiga qisqa, tushunarli va samimiy javob yozing.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Foydalanuvchiga o‘zbek tilidagi javob.',
              },
              action: {
                type: Type.STRING,
                description: 'none | write_text | write_frame | draw_sketch | update_notebook',
              },
              pageTitle: {
                type: Type.STRING,
                description: 'Agar sahifa sarlavhasini o‘zgartirish kerak bo‘lsa, sarlavha; aks holda bo‘sh.',
              },
              content: {
                type: Type.STRING,
                description: 'Daftarga ketma-ket yoziladigan matn, she’r, konspekt yoki kod.',
              },
              preferredFont: {
                type: Type.STRING,
                description: 'handwriting | serif | sans | mono',
              },
              frameStyle: {
                type: Type.STRING,
                description: 'none | code | rule | formula | note | double_border | dashed',
              },
              frameTitle: {
                type: Type.STRING,
                description: 'Ramka sarlavhasi (agar write_frame bo‘lsa).',
              },
              drawingPrompt: {
                type: Type.STRING,
                description: 'Agar draw_sketch bo‘lsa, chizma tavsifi.',
              },
              drawingStyle: {
                type: Type.STRING,
                description: 'pencil | pen | diagram | art',
              },
              paperStyleChange: {
                type: Type.STRING,
                description: 'Agar qog‘oz turi o‘zgarsa: lined | grid | poetry | poetry_ornate | dot | blank; aks holda bo‘sh.',
              },
              enableCover: {
                type: Type.BOOLEAN,
                description: 'Titul muqovani yoqish kerak bo‘lsa true.',
              },
              coverHeading: {
                type: Type.STRING,
                description: 'Muqova sarlavhasini o‘zgartirish kerak bo‘lsa.',
              },
              coverSubject: {
                type: Type.STRING,
                description: 'Muqova fan nomini o‘zgartirish kerak bo‘lsa.',
              },
            },
            required: ['reply', 'action'],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as {
        reply?: string;
        action?: string;
        pageTitle?: string;
        content?: string;
        preferredFont?: string;
        frameStyle?: string;
        frameTitle?: string;
        drawingPrompt?: string;
        drawingStyle?: string;
        paperStyleChange?: string;
        enableCover?: boolean;
        coverHeading?: string;
        coverSubject?: string;
      };

      const validActions = new Set(['none', 'write_text', 'write_frame', 'draw_sketch', 'update_notebook']);
      const validFonts = new Set(['handwriting', 'serif', 'sans', 'mono']);
      const validFrames = new Set(['none', 'code', 'rule', 'formula', 'note', 'double_border', 'dashed']);
      const validDrawStyles = new Set(['pencil', 'pen', 'diagram', 'art']);
      const validPapers = new Set(['lined', 'grid', 'poetry', 'poetry_ornate', 'dot', 'blank']);

      res.json({
        reply: parsed.reply || 'Marhamat, tayyorladim!',
        action: validActions.has(String(parsed.action)) ? String(parsed.action) : 'none',
        pageTitle: parsed.pageTitle || '',
        content: parsed.content || '',
        preferredFont: validFonts.has(String(parsed.preferredFont)) ? String(parsed.preferredFont) : 'handwriting',
        frameStyle: validFrames.has(String(parsed.frameStyle)) ? String(parsed.frameStyle) : 'none',
        frameTitle: parsed.frameTitle || '',
        drawingPrompt: parsed.drawingPrompt || '',
        drawingStyle: validDrawStyles.has(String(parsed.drawingStyle)) ? String(parsed.drawingStyle) : 'pencil',
        paperStyleChange: validPapers.has(String(parsed.paperStyleChange)) ? String(parsed.paperStyleChange) : '',
        enableCover: Boolean(parsed.enableCover),
        coverHeading: parsed.coverHeading || '',
        coverSubject: parsed.coverSubject || '',
        planTier: 'free',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI bilan bog‘lanishda xatolik yuz berdi.';
      res.status(500).json({ error: message });
    }
  });

  // Poetry Conversational AI Assistant (Gemini 4 Hydrogen)
  app.post('/api/ai/poetry-chat', async (req, res) => {
    const body = req.body as PoetryChatBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const stylePreset = body?.stylePreset || 'Lirik she’r';
    const notebookTitle = body?.notebookTitle || 'She’riyat daftari';

    if (messages.length === 0) {
      res.status(400).json({ error: 'Suhbat xabari bo‘sh bo‘lishi mumkin emas.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Serverda GEMINI_API_KEY sozlanmagan. Iltimos, sozlamalardan kalitni tekshiring.',
      });
      return;
    }

    try {
      const contents = messages.slice(-14).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: `Siz o‘zbek adabiyoti va she’riyatini chuqur biladigan, nozik didli shoir hamda adabiy suhbatdoshsiz.
Foydalanuvchi "${notebookTitle}" nomli she’riyat daftarida yozish uchun siz bilan suhbatlashadi, mavzu, kayfiyat, kimga atalgani, vazn (${stylePreset}) va qofiya haqida fikr almashadi.
Qoidalar:
1. Foydalanuvchi bilan iliq, tabiiy o‘zbek tilida suhbatlashing. Agar hali mavzu yoki tafsilot yetarli bo‘lmasa, qisqa aniqlashtiruvchi savol bering yoki taklif ayting.
2. Agar foydalanuvchi she’r yozishni, davom ettirishni yoki tahrirlashni so‘rasa, chiroyli qofiya va ohangdor vaznga ega she’r yozing va uni poemTitle hamda poemBody maydonlariga aniq joylang.
3. She’r misralari daftar qatorlariga chiroyli tushishi uchun har bir misrani alohida qatordan yozing, bandlar orasiga bitta bo‘sh qator qo‘ying.
4. Agar suhbatda hali she’r yozilmagan bo‘lsa (faqat muhokama bo‘lsa), poemTitle va poemBody ni bo‘sh qoldiring.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Foydalanuvchiga o‘zbek tilidagi samimiy javob yoki tushuntirish.',
              },
              poemTitle: {
                type: Type.STRING,
                description: 'Agar she’r yozilgan bo‘lsa, she’r sarlavhasi; aks holda bo‘sh satr.',
              },
              poemBody: {
                type: Type.STRING,
                description:
                  'Agar she’r yozilgan bo‘lsa, misralar va bandlardan iborat to‘liq she’r matni; aks holda bo‘sh satr.',
              },
            },
            required: ['reply', 'poemTitle', 'poemBody'],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as {
        reply?: string;
        poemTitle?: string;
        poemBody?: string;
      };

      res.json({
        reply: parsed.reply || 'Marhamat, fikringizni davom ettiring.',
        poemTitle: parsed.poemTitle || '',
        poemBody: parsed.poemBody || '',
        planTier: 'free',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI bilan bog‘lanishda xatolik yuz berdi.';
      res.status(500).json({ error: message });
    }
  });

  // Anti-AI & Anti-Spam Paste Verification Endpoint
  app.post('/api/ai/anti-ai-check', async (req, res) => {
    const body = req.body as AntiAiBody;
    const text = typeof body?.text === 'string' ? body.text : '';
    const isPasted = Boolean(body?.isPasted);

    if (!text.trim()) {
      res.status(400).json({ error: 'Tekshirish uchun matn kiritilmadi.' });
      return;
    }

    const fallback = buildHeuristicAntiAiResult(text, isPasted);
    const ai = getGeminiClient();
    if (!ai) {
      res.json({ ...fallback, checkedBy: 'heuristic' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Quyidagi daftar matnini Anti-AI va Anti-Spam nuqtai nazaridan tekshiring.
Matn paste qilinganmi: ${isPasted ? 'HA (Ctrl+V orqali nusxalab qo‘yilgan)' : 'YO‘Q (qo‘lda yozilgan)'}.

Matn:
"""
${text.slice(0, 3500)}
"""`,
        config: {
          systemInstruction: `Siz o‘quv va ijodiy daftar matnlari uchun Anti-AI va Anti-Spam tekshiruvchisiz.
Matnda reklama/spam havolalar, nusxalangan tayyor AI shablonlar yoki tabiiy inson yozuvi alomatlarini baholang.
Javobni qat’iy JSON formatida o‘zbek tilida qaytaring.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                description:
                  'Faqat quyidagi uch qiymatdan biri: human_verified, pasted_ai_detected, spam_flagged',
              },
              aiProbability: {
                type: Type.INTEGER,
                description: '0 dan 100 gacha AI/shablon ehtimoli foizi',
              },
              verdictLabel: {
                type: Type.STRING,
                description: 'Qisqa 3-5 so‘zli o‘zbekcha xulosa sarlavhasi',
              },
              summary: {
                type: Type.STRING,
                description: '1 jumlali qisqa o‘zbekcha izoh',
              },
              stampText: {
                type: Type.STRING,
                description: 'Pechat ichiga yoziladigan qisqa katta harfli matn (masalan: ANTI-AI TASDIQLANDI)',
              },
            },
            required: ['status', 'aiProbability', 'verdictLabel', 'summary', 'stampText'],
          },
        },
      });

      const raw = response.text?.trim() || '{}';
      const parsed = JSON.parse(raw) as Partial<typeof fallback>;
      const validStatus =
        parsed.status === 'human_verified' ||
        parsed.status === 'pasted_ai_detected' ||
        parsed.status === 'spam_flagged'
          ? parsed.status
          : fallback.status;

      res.json({
        status: validStatus,
        aiProbability:
          typeof parsed.aiProbability === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.aiProbability)))
            : fallback.aiProbability,
        verdictLabel: parsed.verdictLabel || fallback.verdictLabel,
        summary: parsed.summary || fallback.summary,
        stampText: parsed.stampText || fallback.stampText,
        checkedBy: 'gemini',
      });
    } catch {
      res.json({ ...fallback, checkedBy: 'heuristic' });
    }
  });

  // AI Pencil / Ink Sketch & Diagram Vector Path Generator
  app.post('/api/ai/generate-drawing', async (req, res) => {
    const body = req.body as AiDrawingBody;
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const style = body?.style || 'pencil';
    const aspectRatio =
      typeof body?.aspectRatio === 'number' && Number.isFinite(body.aspectRatio)
        ? Math.max(0.4, Math.min(2.4, body.aspectRatio))
        : 1.2;

    if (!prompt) {
      res.status(400).json({ error: 'Chizma tavsifini kiriting.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Serverda GEMINI_API_KEY sozlanmagan. Iltimos, sozlamalardan kalitni tekshiring.',
      });
      return;
    }

    const styleNotes: Record<string, string> = {
      pencil:
        'Oddiy grafit qalamda chizilgan daftar eskizi: kontur chiziqlari (normal) bilan birga yengil shtrixli soya chiziqlari (weight: "shade", opacity: 0.45) ham qo‘shing.',
      pen:
        'Ruchka yoki pero siyohida chizilgan toza va ravon chizma: silliq freehand egri chiziqlar va aniq konturlar.',
      diagram:
        'Matematika, fizika yoki fan daftari uchun aniq sxema/chizma: line, arrow, rect, circle va kerakli qisqa harf/belgi yorliqlari (labels: A, B, C, F, h kabi).',
      art:
        'Badiiy daftar illyustratsiyasi: boy detallar, barg/gul/naqsh egri chiziqlari, kontrast qalin va ingichka chiziqlar.',
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Quyidagi so‘rov bo‘yicha daftar sahifasining tanlangan joyiga chiziladigan vektor chizmani yarating.
So‘rov: "${prompt}"
Uslub: ${styleNotes[style] || styleNotes.pencil}
Ramka nisbati (kenglik/balandlik): ${aspectRatio.toFixed(2)}.`,
        config: {
          systemInstruction: `Siz daftar sahifasiga qo‘lda qalam yoki ruchkada chiza oladigan mohir rassom va chizmakashsiz.
Vazifa: berilgan mavzu bo‘yicha 0..1000 koordinata maydonida (x: 60..940, y: 60..940 oralig‘ida) aniq tanib olinadigan, mutanosib va chiroyli vektor chizma (strokes) tuzing.
Texnik qoidalar:
1. Barcha koordinatalar 0 dan 1000 gacha butun son bo‘lsin va chizma markazlashtirilgan, mutanosib bo‘lsin.
2. "kind":
   - "freehand": egri chiziqlar uchun 6–20 ta ketma-ket nuqta bering (masalan: barg, olma, gul, yuz, tog‘, to‘lqin, bulut, naqsh).
   - "line": to‘g‘ri chiziq (2 ta nuqta: boshlanish va tugash).
   - "arrow": strelka (2 ta nuqta: boshlanish va uch nuqta).
   - "rect": to‘rtburchak (2 ta nuqta: yuqori-chap va pastki-o‘ng burchak).
   - "circle": aylana yoki ellips (2 ta nuqta: qamrovchi to‘rtburchakning yuqori-chap va pastki-o‘ng burchagi).
3. Chizma boy va tushunarli chiqishi uchun odatda 8 tadan 32 tagacha chiziq (strokes) ishlating.
4. "weight": "thin" | "normal" | "bold" | "shade". Soya shtrixlari uchun "shade" va opacity 0.35–0.55 ishlating.
5. Agar geometriya yoki o‘quv sxemasi bo‘lsa, kerakli nuqta/qismlarga qisqa "labels" qo‘shing (masalan A, B, C, O, h, F); aks holda labels bo‘sh massiv bo‘lsin.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Chizma nomi o‘zbek tilida (qisqa 2-4 so‘z)',
              },
              strokes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kind: {
                      type: Type.STRING,
                      description: 'freehand | line | circle | rect | arrow',
                    },
                    points: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.INTEGER },
                          y: { type: Type.INTEGER },
                        },
                        required: ['x', 'y'],
                      },
                    },
                    weight: {
                      type: Type.STRING,
                      description: 'thin | normal | bold | shade',
                    },
                    opacity: {
                      type: Type.NUMBER,
                    },
                  },
                  required: ['kind', 'points'],
                },
              },
              labels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER },
                  },
                  required: ['text', 'x', 'y'],
                },
              },
            },
            required: ['title', 'strokes', 'labels'],
          },
        },
      });

      const raw = response.text?.trim() || '{}';
      const parsed = JSON.parse(raw) as {
        title?: string;
        strokes?: Array<{
          kind?: string;
          points?: Array<{ x?: number; y?: number }>;
          weight?: string;
          opacity?: number;
        }>;
        labels?: Array<{ text?: string; x?: number; y?: number }>;
      };

      const clamp = (n: number) => Math.max(20, Math.min(980, Math.round(n)));
      const validKinds = new Set(['freehand', 'line', 'circle', 'rect', 'arrow']);
      const validWeights = new Set(['thin', 'normal', 'bold', 'shade']);

      const cleanStrokes = (Array.isArray(parsed.strokes) ? parsed.strokes : [])
        .map((st) => {
          const pts = (Array.isArray(st.points) ? st.points : [])
            .filter((p) => typeof p?.x === 'number' && typeof p?.y === 'number')
            .map((p) => ({ x: clamp(p.x as number), y: clamp(p.y as number) }));
          if (pts.length < 2) return null;
          return {
            kind: validKinds.has(String(st.kind)) ? String(st.kind) : 'freehand',
            points: pts,
            weight: validWeights.has(String(st.weight)) ? String(st.weight) : 'normal',
            opacity:
              typeof st.opacity === 'number'
                ? Math.max(0.2, Math.min(1, st.opacity))
                : st.weight === 'shade'
                  ? 0.45
                  : 0.92,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const cleanLabels = (Array.isArray(parsed.labels) ? parsed.labels : [])
        .filter((l) => typeof l?.text === 'string' && l.text.trim() && typeof l.x === 'number' && typeof l.y === 'number')
        .slice(0, 10)
        .map((l) => ({
          text: String(l.text).trim().slice(0, 28),
          x: clamp(l.x as number),
          y: clamp(l.y as number),
        }));

      if (cleanStrokes.length === 0) {
        res.status(422).json({ error: 'AI chizma chiziqlarini tuza olmadi. Boshqacha tasvirlab ko‘ring.' });
        return;
      }

      res.json({
        title: parsed.title || prompt.slice(0, 32),
        strokes: cleanStrokes,
        labels: cleanLabels,
        planTier: 'free',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chizma yaratishda xatolik yuz berdi.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Daftar Canvas server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
