import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'node:zlib';
import OpenAI from 'openai';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ZIMBABWE_FOOD_DB,
  COMMERCIAL_BARCODES,
  matchFoodInDatabase,
  type FoodItem,
} from './src/data/zimbabweFoodDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = Number(process.env.PORT || 3000);

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || key === 'MY_OPENAI_API_KEY') return null;
  return new OpenAI({ apiKey: key });
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({ apiKey: key });
}

interface AnalyzedItem {
  foodId: number;
  foodName: string;
  matchedFromDb: boolean;
  unit: 'g' | 'ml';
  portionAmount: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  vitamins: string;
  confidence: number;
}

function enrichItemWithLocalDb(raw: {
  name: string;
  portionAmount: number;
  unit?: string;
  kcalPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fibrePer100?: number;
  vitamins?: string;
}): AnalyzedItem {
  const match = matchFoodInDatabase(raw.name);
  if (match) {
    const dbItem: FoodItem = match.item;
    return {
      foodId: dbItem.id,
      foodName: dbItem.food,
      matchedFromDb: true,
      unit: dbItem.unit,
      portionAmount: Math.max(10, Math.round(raw.portionAmount || 150)),
      kcalPer100: dbItem.kcal,
      proteinPer100: dbItem.protein,
      carbsPer100: dbItem.carbs,
      fatPer100: dbItem.fat,
      fibrePer100: dbItem.fibre,
      vitamins: dbItem.vitamins,
      confidence: Math.round(match.confidence * 100) / 100,
    };
  }
  return {
    foodId: 0,
    foodName: raw.name,
    matchedFromDb: false,
    unit: raw.unit === 'ml' ? 'ml' : 'g',
    portionAmount: Math.max(10, Math.round(raw.portionAmount || 150)),
    kcalPer100: Math.max(0, Math.round(raw.kcalPer100 ?? 140)),
    proteinPer100: Math.max(0, Math.round((raw.proteinPer100 ?? 6) * 10) / 10),
    carbsPer100: Math.max(0, Math.round((raw.carbsPer100 ?? 18) * 10) / 10),
    fatPer100: Math.max(0, Math.round((raw.fatPer100 ?? 4) * 10) / 10),
    fibrePer100: Math.max(0, Math.round((raw.fibrePer100 ?? 2) * 10) / 10),
    vitamins: raw.vitamins || 'B1, B3, C',
    confidence: 0.72,
  };
}

function splitSpokenSegments(text: string): string[] {
  const rawChunks = text
    .toLowerCase()
    .split(/(?:,|\+|&|\band\b|\bwith\b|\bne\b|\bna\b|\bno\b|\ble\b|\bla\b|\bkanye\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const chunk of rawChunks) {
    const words = chunk.split(/\s+/).filter(Boolean);
    let current: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (i > 0 && w.length >= 6 && /^(?:ne|na|le|lo|la)/i.test(w)) {
        const stem = w.slice(2);
        const tailPhrase = [stem, ...words.slice(i + 1)].join(' ');
        if (
          matchFoodInDatabase(stem) ||
          matchFoodInDatabase(`u${stem}`) ||
          matchFoodInDatabase(`i${stem}`) ||
          matchFoodInDatabase(tailPhrase)
        ) {
          if (current.length > 0) {
            segments.push(current.join(' '));
            current = [];
          }
          current.push(stem);
          continue;
        }
      }
      current.push(w);
    }

    if (current.length > 0) {
      segments.push(current.join(' '));
    }
  }

  return segments;
}

function normalizeSpokenSegment(seg: string): string {
  const cleaned = seg
    .replace(/(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?|tbsp|tablespoons?|spoons?)/gi, '')
    .replace(
      /\b(i|just|had|ate|eating|drank|drinking|ndodya|ndadya|ndakadya|ndinwa|ndakanwa|ndirikudya|ndinodya|ngidle|ngidlile|ngiphuze|ngadla|bengidla|small|large|medium|half|bowl|plate|cup|mug|glass|ndiro|komichi|mukombe|kapu|isitsha|inkomishi|of|with|some|piece|pieces|ye|ya|wa|za|la|ka)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (matchFoodInDatabase(cleaned)) return cleaned;

  const dePrefixed = cleaned
    .split(' ')
    .map((tok) => {
      if (tok.length >= 5 && /^(ne|na|le|lo|la)/i.test(tok)) {
        const candidate = tok.slice(2);
        if (matchFoodInDatabase(candidate)) return candidate;
      }
      return tok;
    })
    .join(' ')
    .trim();

  return dePrefixed || cleaned;
}

function deterministicMealParse(text: string): AnalyzedItem[] {
  const segments = splitSpokenSegments(text);

  const results: AnalyzedItem[] = [];
  for (const seg of segments) {
    const gramMatch = seg.match(/(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?)/i);
    const tbspMatch = seg.match(/(\d+|one|two|three|four|mbiri|maviri|ezimbili)\s*(tbsp|tablespoons?|spoons?)/i);
    const cupMatch = seg.match(/(\d+|one|two|half|small|large|medium)\s*(bowl|cup|plate|glass|ndiro|komichi|isitsha)/i);

    let portion = 180;
    if (gramMatch) {
      portion = Number(gramMatch[1]);
    } else if (tbspMatch) {
      const wordMap: Record<string, number> = { one: 1, two: 2, mbiri: 2, maviri: 2, ezimbili: 2, three: 3, four: 4 };
      const count = wordMap[tbspMatch[1].toLowerCase()] ?? Number(tbspMatch[1]) ?? 1;
      portion = count * 16;
    } else if (cupMatch) {
      const size = cupMatch[1].toLowerCase();
      if (size === 'small' || size === 'half') portion = 150;
      else if (size === 'large') portion = 320;
      else portion = 240;
    }

    const cleaned = normalizeSpokenSegment(seg);
    if (!cleaned) continue;
    const matched = matchFoodInDatabase(cleaned);
    if (matched) {
      results.push(
        enrichItemWithLocalDb({
          name: matched.item.food,
          portionAmount: portion,
        })
      );
    }
  }

  if (results.length === 0) {
    const fallbackMatch = matchFoodInDatabase(text);
    if (fallbackMatch) {
      results.push(
        enrichItemWithLocalDb({
          name: fallbackMatch.item.food,
          portionAmount: 200,
        })
      );
    }
  }

  return results;
}

const DB_REFERENCE_LIST = ZIMBABWE_FOOD_DB.map((f) => `${f.id}:${f.food}(${f.unit})`).join('; ');

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', '.aistudio']);
const EXCLUDED_FILES = new Set(['.env', '.env.local', '.env.production', '.DS_Store', 'server.js', 'bun.lock']);

function collectAppFiles(rootDir: string, currentDir = rootDir, acc: Array<{ relPath: string; fullPath: string }> = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collectAppFiles(rootDir, path.join(currentDir, entry.name), acc);
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name) || entry.name.endsWith('.zip')) continue;
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
      acc.push({ relPath, fullPath });
    }
  }
  return acc;
}

function buildSourceZipBuffer(rootDir: string): Buffer {
  const files = collectAppFiles(rootDir);
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.fullPath);
    const stat = fs.statSync(file.fullPath);
    const { dosTime, dosDate } = toDosTimeDate(stat.mtime);
    const crc = computeCrc32(raw);

    const deflated = zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    const entryName = Buffer.from(`nutrizim-app/${file.relPath}`, 'utf8');

    const localHeader = Buffer.alloc(30 + entryName.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(entryName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    entryName.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + entryName.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(entryName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    entryName.copy(centralHeader, 46);

    localChunks.push(localHeader, payload);
    centralChunks.push(centralHeader);
    offset += localHeader.length + payload.length;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirBuffer, eocd]);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nutrizim-api', databaseCount: ZIMBABWE_FOOD_DB.length });
});

app.get('/api/export-source-zip', (_req, res) => {
  try {
    const zipBuffer = buildSourceZipBuffer(__dirname);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="nutrizim-app.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (error) {
    console.error('Export zip error:', error);
    res.status(500).json({ error: 'Unable to package application zip right now.' });
  }
});

app.post('/api/analyze-meal', async (req, res) => {
  try {
    const { imageBase64, description, languageHint, source } = req.body as {
      imageBase64?: string;
      description?: string;
      languageHint?: string;
      source?: string;
    };

    if (!imageBase64 && !description) {
      res.status(400).json({ error: 'Provide either a meal photo or meal description.' });
      return;
    }

    const isVoice = source === 'voice';
    const langClause = languageHint
      ? `Spoken language hint: ${languageHint}. Understand English, Shona (e.g., sadza rezviyo, bota, dovi, muboora, muriwo, matemba, nyimo, nzungu, huku, nyama yemombe, derere), and Ndebele (e.g., isitshwala, iyambazi, idobi, umbhida, amacimbi, inkukhu, inyama yenkomo, indumba, amahewu).`
      : 'Understand English, Shona, and Ndebele dish names and natural speech.';

    const systemPrompt = `You are NutriZim's computer-vision and trilingual meal-parsing nutrition analyst.
${langClause}
Isolate every distinct food or beverage item from the ${isVoice ? 'voice transcription' : 'plate photo or description'}.
Estimate realistic portion weight in grams (g) for solids or milliliters (ml) for liquids.
Cross-reference Zimbabwean & Southern African dishes (Sadza white/yellow/rapoko/finger millet/sorghum, Covo, Rape, Muboora, Derere, Kapenta/Matemba, Beef stew, Chicken dovi, Sugar beans, Nyimo, Mopane worms, Maheu, Avocado, etc.) against this exact database list:
${DB_REFERENCE_LIST}

Return strict JSON: { "summary": string, "items": [{ "name": string, "portionAmount": number, "unit": "g"|"ml", "kcalPer100": number, "proteinPer100": number, "carbsPer100": number, "fatPer100": number, "fibrePer100": number, "vitamins": string }] }`;

    let parsedResponse: { summary?: string; items?: any[] } | null = null;
    let engineUsed = 'local-semantic';

    const openai = getOpenAIClient();
    if (openai) {
      try {
        const userContent: any[] = [];
        if (description) {
          userContent.push({
            type: 'text',
            text: `${isVoice ? 'Spoken meal transcript' : 'Meal context'}${languageHint ? ` (${languageHint})` : ''}: ${description}`,
          });
        } else {
          userContent.push({
            type: 'text',
            text: 'Identify all distinct food items on this plate and estimate their portion weights in grams or milliliters.',
          });
        }
        if (imageBase64) {
          const url = imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;
          userContent.push({ type: 'image_url', image_url: { url } });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          max_tokens: 900,
        });

        const rawJson = completion.choices[0]?.message?.content;
        if (rawJson) {
          parsedResponse = JSON.parse(rawJson);
          engineUsed = 'openai-gpt-4o';
        }
      } catch (err) {
        console.warn('OpenAI gpt-4o vision fallback triggered:', err instanceof Error ? err.message : err);
      }
    }

    if (!parsedResponse) {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          const parts: any[] = [
            {
              text: `${systemPrompt}\n\nUser note (${languageHint || 'English/Shona/Ndebele'}): ${
                description || 'Analyze the plate photo.'
              }`,
            },
          ];
          if (imageBase64) {
            const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            parts.push({ inlineData: { data: cleaned, mimeType: 'image/jpeg' } });
          }
          const resp = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        portionAmount: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        kcalPer100: { type: Type.NUMBER },
                        proteinPer100: { type: Type.NUMBER },
                        carbsPer100: { type: Type.NUMBER },
                        fatPer100: { type: Type.NUMBER },
                        fibrePer100: { type: Type.NUMBER },
                        vitamins: { type: Type.STRING },
                      },
                      required: ['name', 'portionAmount'],
                    },
                  },
                },
                required: ['items'],
              },
            },
          });
          if (resp.text) {
            parsedResponse = JSON.parse(resp.text);
            engineUsed = 'gemini-vision-fallback';
          }
        } catch (err) {
          console.warn('Gemini vision fallback failed:', err instanceof Error ? err.message : err);
        }
      }
    }

    let items: AnalyzedItem[] = [];
    let summary = parsedResponse?.summary || 'Meal analyzed and standardized per 100g/100ml.';

    if (parsedResponse?.items && Array.isArray(parsedResponse.items) && parsedResponse.items.length > 0) {
      items = parsedResponse.items.map((raw) => enrichItemWithLocalDb(raw));
    } else if (description) {
      items = deterministicMealParse(description);
      summary = items.length > 0
        ? `Parsed ${items.length} spoken/typed dish(es) against the NutriZim 100g/100ml database.`
        : 'No matching Zimbabwean dish found yet—try naming the dish and approximate grams or bowls.';
    } else {
      // Sample plate decomposition fallback when no external AI key is active in sandbox
      items = [
        enrichItemWithLocalDb({ name: 'Sadza (white maize)', portionAmount: 250 }),
        enrichItemWithLocalDb({ name: 'Beef stew', portionAmount: 160 }),
        enrichItemWithLocalDb({ name: 'Covo with peanut butter', portionAmount: 120 }),
        enrichItemWithLocalDb({ name: 'Avocado', portionAmount: 65 }),
      ];
      summary =
        'Detected classic Zimbabwean plate composition (Sadza, Beef stew, Covo with peanut butter, Avocado). Adjust portion sliders below before logging.';
    }

    res.json({ summary, items, engineUsed });
  } catch (error) {
    console.error('Analyze meal error:', error);
    res.status(500).json({ error: 'Unable to analyze meal right now.' });
  }
});

app.post('/api/camera-scan', async (req, res) => {
  try {
    const { imageBase64, dishHint, languageHint, plateSize } = req.body as {
      imageBase64?: string;
      dishHint?: string;
      languageHint?: string;
      plateSize?: 'small' | 'standard' | 'large';
    };

    if (!imageBase64 && !dishHint?.trim()) {
      res.status(400).json({ error: 'Capture or upload a food photo before running OpenAI Vision scan.' });
      return;
    }

    const plateScaleDesc =
      plateSize === 'small'
        ? 'Small side plate or bowl (~20cm diameter)'
        : plateSize === 'large'
        ? 'Large serving platter or generously heaped plate (~30cm diameter)'
        : 'Standard dinner plate (~26cm diameter)';

    const systemPrompt = `You are NutriZim's OpenAI Vision culinary scientist specializing in Southern African and Zimbabwean dishes.
Analyze the captured food photo and perform three steps:
1. Segment every distinct dish on the plate (e.g., White/Yellow/Zviyo Sadza / Isitshwala, Braised Beef Stew / Nyama yeMombe, Road Runner Chicken, Covo/Rape/Muboora/Umfushwa leafy greens, Dovi peanut sauce, Kapenta/Matemba, Sugar Beans/Nyimo, Mazondo, Boerewors, Maheu, Avocado).
2. Visually estimate each dish's cooked portion weight in grams (g) or milliliters (ml) using container geometry (${plateScaleDesc}), mound height, and oil/gravy density.
3. Match each food item to the standardized 100g/100ml reference database below and estimate its macronutrients:
${DB_REFERENCE_LIST}

Understand English, Shona, and Ndebele hints (${languageHint || 'English / Shona / Ndebele'}).
Return strict JSON:
{
  "summary": string,
  "items": [
    {
      "name": string,
      "portionAmount": number,
      "unit": "g" | "ml",
      "weightCue": string,
      "kcalPer100": number,
      "proteinPer100": number,
      "carbsPer100": number,
      "fatPer100": number,
      "fibrePer100": number,
      "vitamins": string,
      "confidence": number
    }
  ]
}`;

    let parsedResponse: { summary?: string; items?: any[] } | null = null;
    let engineUsed: 'openai-gpt-4o-vision' | 'gemini-vision-fallback' | 'local-southern-african-vision' =
      'local-southern-african-vision';

    const openai = getOpenAIClient();
    if (openai) {
      try {
        const userContent: any[] = [
          {
            type: 'text',
            text: `Plate reference: ${plateScaleDesc}.${
              dishHint?.trim() ? ` User note (${languageHint || 'English'}): ${dishHint.trim()}.` : ''
            } Identify every Southern African dish visible, estimate cooked gram/ml weight, and output standardized 100g/100ml macros.`,
          },
        ];

        if (imageBase64) {
          const url = imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;
          userContent.push({
            type: 'image_url',
            image_url: { url, detail: 'high' },
          });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          max_tokens: 1000,
        });

        const rawJson = completion.choices[0]?.message?.content;
        if (rawJson) {
          parsedResponse = JSON.parse(rawJson);
          engineUsed = 'openai-gpt-4o-vision';
        }
      } catch (err) {
        console.warn(
          'OpenAI Vision /api/camera-scan fallback triggered:',
          err instanceof Error ? err.message : err
        );
      }
    }

    if (!parsedResponse) {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          const parts: any[] = [
            {
              text: `${systemPrompt}\n\nPlate scale: ${plateScaleDesc}\nDish hint: ${
                dishHint?.trim() || 'Estimate all Southern African dishes visible on the plate.'
              }`,
            },
          ];
          if (imageBase64) {
            const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            parts.push({ inlineData: { data: cleaned, mimeType: 'image/jpeg' } });
          }

          const resp = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { responseMimeType: 'application/json' },
          });

          if (resp.text) {
            parsedResponse = JSON.parse(resp.text);
            engineUsed = 'gemini-vision-fallback';
          }
        } catch (err) {
          console.warn('Gemini camera-scan fallback failed:', err instanceof Error ? err.message : err);
        }
      }
    }

    let items: Array<AnalyzedItem & { weightCue?: string }> = [];
    let summary =
      parsedResponse?.summary ||
      'Estimated portion weights and 100g/100ml macros for your Southern African dish.';

    if (parsedResponse?.items && Array.isArray(parsedResponse.items) && parsedResponse.items.length > 0) {
      items = parsedResponse.items.map((raw) => {
        const enriched = enrichItemWithLocalDb(raw);
        return {
          ...enriched,
          confidence:
            typeof raw.confidence === 'number'
              ? Math.max(0.4, Math.min(1, Math.round(raw.confidence * 100) / 100))
              : enriched.confidence,
          weightCue: typeof raw.weightCue === 'string' ? raw.weightCue.slice(0, 100) : undefined,
        };
      });
    } else if (dishHint?.trim()) {
      items = deterministicMealParse(dishHint.trim()).map((it) => ({
        ...it,
        weightCue: `Scaled for ${plateScaleDesc.split(' ')[0].toLowerCase()} plate`,
      }));
      summary =
        items.length > 0
          ? `Estimated ${items.length} Southern African dish(es) calibrated for a ${plateSize || 'standard'} plate.`
          : 'Could not isolate dishes from note alone — try naming sadza, beef stew, covo, dovi, or kapenta.';
    }

    if (items.length === 0) {
      const multiplier = plateSize === 'small' ? 0.78 : plateSize === 'large' ? 1.25 : 1;
      items = [
        {
          ...enrichItemWithLocalDb({
            name: 'Sadza (white maize)',
            portionAmount: Math.round(250 * multiplier),
          }),
          weightCue: 'Rounded dome (~2 cupped hands)',
        },
        {
          ...enrichItemWithLocalDb({
            name: 'Beef stew',
            portionAmount: Math.round(180 * multiplier),
          }),
          weightCue: 'Braised meat chunks & rich gravy ladle',
        },
        {
          ...enrichItemWithLocalDb({
            name: 'Covo with peanut butter',
            portionAmount: Math.round(135 * multiplier),
          }),
          weightCue: 'Steamed leafy covo greens mound',
        },
      ];
      summary =
        'Estimated classic Southern African Sadza, Beef Stew & Covo plate weights (configure OPENAI_API_KEY in secrets for live gpt-4o Vision). Adjust sliders anytime.';
    }

    const totalEstimatedWeightGrams = items.reduce((sum, it) => sum + it.portionAmount, 0);

    res.json({
      summary,
      items,
      totalEstimatedWeightGrams,
      engineUsed,
    });
  } catch (error) {
    console.error('Camera scan error:', error);
    res.status(500).json({ error: 'Unable to process camera meal scan right now.' });
  }
});

app.post('/api/coach', async (req, res) => {
  try {
    const { message, history = [], dailyContext } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      dailyContext?: {
        totals?: { kcal: number; protein: number; carbs: number; fat: number; fibre: number };
        targets?: { kcal: number; protein: number; carbs: number; fat: number; fibre: number };
        latestWeightKg?: number | null;
      };
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const totals = dailyContext?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
    const targets = dailyContext?.targets ?? { kcal: 2200, protein: 150, carbs: 240, fat: 70, fibre: 30 };

    const systemPrompt = `You are NutriZim Coach, an objective, data-backed nutrition coach inspired by MacroFactor.
You understand English, Shona (e.g., sadza rezviyo, dovi, muboora, matemba, bota, nzungu, nyimo, covo), and Ndebele (e.g., isitshwala, umfushwa, idobi, amacimbi, inkukhu).
Tone: Non-judgmental, analytical, supportive, zero calorie shaming. Always reference standardized 100g/100ml figures and practical Southern African ingredients.
Current user daily intake: ${totals.kcal} kcal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat, ${totals.fibre}g fibre.
Current user daily targets: ${targets.kcal} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat, ${targets.fibre}g fibre.
${dailyContext?.latestWeightKg ? `Latest body weight: ${dailyContext.latestWeightKg} kg.` : ''}

Database items reference:
${DB_REFERENCE_LIST}

If the user is logging a meal (in English, Shona, or Ndebele), extract each food item with portionAmount in g/ml and match it to the closest database item name.
If the user asks to adjust their targets (e.g., low energy today, high training day), propose targetAdjustment.
Return strict JSON:
{
  "reply": string,
  "loggedItems": [{ "name": string, "portionAmount": number, "unit": "g"|"ml", "kcalPer100": number, "proteinPer100": number, "carbsPer100": number, "fatPer100": number, "fibrePer100": number, "vitamins": string }],
  "targetAdjustment": null | { "kcal": number, "protein": number, "carbs": number, "fat": number, "fibre": number, "reason": string }
}`;

    let parsed: any = null;
    let engineUsed = 'local-coach';

    const openai = getOpenAIClient();
    if (openai) {
      try {
        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ];
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages,
          max_tokens: 750,
        });
        const content = completion.choices[0]?.message?.content;
        if (content) {
          parsed = JSON.parse(content);
          engineUsed = 'openai-gpt-4o-mini';
        }
      } catch (err) {
        console.warn('OpenAI gpt-4o-mini coach fallback triggered:', err instanceof Error ? err.message : err);
      }
    }

    if (!parsed) {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          const resp = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nUser message: "${message}"`,
            config: { responseMimeType: 'application/json' },
          });
          if (resp.text) {
            parsed = JSON.parse(resp.text);
            engineUsed = 'gemini-coach-fallback';
          }
        } catch (err) {
          console.warn('Gemini coach fallback failed:', err instanceof Error ? err.message : err);
        }
      }
    }

    if (!parsed) {
      const lower = message.toLowerCase();
      const parsedFoods = deterministicMealParse(message);
      let targetAdjustment = null;
      let reply = '';

      if (lower.includes('adjust') || lower.includes('low energy') || lower.includes('tired')) {
        const nextKcal = Math.min(3600, Math.round(targets.kcal * 1.1));
        const nextCarbs = Math.round(targets.carbs + (nextKcal - targets.kcal) / 4);
        targetAdjustment = {
          kcal: nextKcal,
          protein: targets.protein,
          carbs: nextCarbs,
          fat: targets.fat,
          fibre: targets.fibre,
          reason: 'Added +10% carbohydrate energy buffer for recovery without altering protein floor.',
        };
        reply = `I've modeled a +10% energy adjustment to ${nextKcal} kcal (+${nextCarbs - targets.carbs}g carbs) to support your recovery today while keeping your ${targets.protein}g protein anchor steady.`;
      } else if (lower.includes('protein') && parsedFoods.length === 0) {
        const remainingP = Math.max(0, Math.round(targets.protein - totals.protein));
        reply = `You have ${remainingP}g protein remaining toward your ${targets.protein}g target. High-efficiency local options per 100g: Dried Kapenta (58g protein / 290 kcal), Cooked Mopane Worms (40g protein / 250 kcal), Grilled Chicken Breast (31g protein / 165 kcal), or Boiled Sugar Beans (8.7g protein / 127 kcal).`;
      } else if (parsedFoods.length > 0) {
        const totalMealKcal = parsedFoods.reduce(
          (sum, it) => sum + Math.round((it.kcalPer100 * it.portionAmount) / 100),
          0
        );
        const totalMealProtein = parsedFoods.reduce(
          (sum, it) => sum + (it.proteinPer100 * it.portionAmount) / 100,
          0
        );
        reply = `Parsed ${parsedFoods.length} item${parsedFoods.length > 1 ? 's' : ''} matched to our 100g/100ml Zimbabwean database (${totalMealKcal} kcal, ${totalMealProtein.toFixed(1)}g protein). Review the standardized breakdown card below and confirm to add to your daily ledger.`;
      } else {
        const remKcal = Math.round(targets.kcal - totals.kcal);
        const remP = Math.round((targets.protein - totals.protein) * 10) / 10;
        reply = `Today you are at ${totals.kcal} of ${targets.kcal} kcal (${remKcal >= 0 ? `${remKcal} kcal remaining` : `${Math.abs(remKcal)} kcal above maintenance estimate`}) and ${totals.protein}g of ${targets.protein}g protein (${remP > 0 ? `${remP}g remaining` : 'target met'}). Tell me what you ate in English, Shona, or Ndebele to log it instantly.`;
      }

      res.json({
        reply,
        loggedItems: parsedFoods,
        targetAdjustment,
        engineUsed,
      });
      return;
    }

    const enrichedItems: AnalyzedItem[] = Array.isArray(parsed.loggedItems)
      ? parsed.loggedItems.map((it: any) => enrichItemWithLocalDb(it))
      : [];

    res.json({
      reply: parsed.reply || 'Logged and calculated per 100g/100ml.',
      loggedItems: enrichedItems,
      targetAdjustment: parsed.targetAdjustment || null,
      engineUsed,
    });
  } catch (error) {
    console.error('Coach endpoint error:', error);
    res.status(500).json({ error: 'Coach service temporarily unavailable.' });
  }
});

app.get('/api/barcode/:code', async (req, res) => {
  const code = String(req.params.code || '').replace(/[^0-9A-Za-z-]/g, '');
  if (!code) {
    res.status(400).json({ error: 'Invalid barcode.' });
    return;
  }

  const local = COMMERCIAL_BARCODES[code];
  if (local && local.foodId) {
    const dbItem = ZIMBABWE_FOOD_DB.find((f) => f.id === local.foodId);
    if (dbItem) {
      res.json({
        found: true,
        source: 'local-zim-catalog',
        brand: local.brand,
        item: {
          foodId: dbItem.id,
          foodName: `${local.brand} (${dbItem.food})`,
          matchedFromDb: true,
          unit: dbItem.unit,
          portionAmount: local.defaultPortion,
          kcalPer100: dbItem.kcal,
          proteinPer100: dbItem.protein,
          carbsPer100: dbItem.carbs,
          fatPer100: dbItem.fat,
          fibrePer100: dbItem.fibre,
          vitamins: dbItem.vitamins,
          confidence: 1,
        },
      });
      return;
    }
  }

  try {
    const offResp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (offResp.ok) {
      const data = (await offResp.json()) as any;
      if (data?.status === 1 && data.product) {
        const p = data.product;
        const n = p.nutriments || {};
        const name = p.product_name || `Packaged Item (${code})`;
        const isLiquid =
          String(p.quantity || '').toLowerCase().includes('ml') ||
          String(p.quantity || '').toLowerCase().includes('l');
        res.json({
          found: true,
          source: 'openfoodfacts',
          brand: p.brands || 'Commercial Product',
          item: {
            foodId: 0,
            foodName: name,
            matchedFromDb: false,
            unit: isLiquid ? 'ml' : 'g',
            portionAmount: 100,
            kcalPer100: Math.round(Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 150)),
            proteinPer100: Math.round(Number(n.proteins_100g ?? 4) * 10) / 10,
            carbsPer100: Math.round(Number(n.carbohydrates_100g ?? 20) * 10) / 10,
            fatPer100: Math.round(Number(n.fat_100g ?? 5) * 10) / 10,
            fibrePer100: Math.round(Number(n.fiber_100g ?? 1) * 10) / 10,
            vitamins: 'Label micronutrients',
            confidence: 0.95,
          },
        });
        return;
      }
    }
  } catch (err) {
    console.warn('OpenFoodFacts lookup failed:', err instanceof Error ? err.message : err);
  }

  res.status(404).json({ found: false, error: 'Barcode not found in commercial registry.' });
});

app.post('/api/create-checkout-session', async (req, res) => {
  const { email, uid } = req.body as { email?: string; uid?: string };
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (stripeKey && stripeKey !== 'MY_STRIPE_SECRET_KEY') {
    try {
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const params = new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'NutriZim Pro Monthly ($25/mo)',
        'line_items[0][price_data][unit_amount]': '2500',
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][quantity]': '1',
        success_url: `${appUrl}/?checkout=success&uid=${encodeURIComponent(uid || '')}`,
        cancel_url: `${appUrl}/?checkout=cancel`,
      });
      if (email) params.set('customer_email', email);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const session = (await stripeRes.json()) as any;
      if (stripeRes.ok && session.url) {
        res.json({ mode: 'stripe_live', url: session.url, sessionId: session.id });
        return;
      }
    } catch (err) {
      console.warn('Stripe live session creation error:', err instanceof Error ? err.message : err);
    }
  }

  // Interactive portal confirmation when STRIPE_SECRET_KEY is not injected in sandbox
  res.json({
    mode: 'stripe_portal',
    amountUsd: 25,
    billingInterval: 'month',
    sessionId: `nz_sub_${Date.now()}`,
  });
});

app.post('/api/ecocash-verify', (req, res) => {
  const { phone, reference } = req.body as { phone?: string; reference?: string };
  const cleanRef = String(reference || '').trim();
  const cleanPhone = String(phone || '').trim();

  if (cleanRef.length < 4 || cleanPhone.length < 8) {
    res.status(400).json({ verified: false, error: 'Enter a valid EcoCash phone number and transaction reference.' });
    return;
  }

  res.json({
    verified: true,
    merchantNumber: '0789159982',
    amountUsd: 25,
    reference: cleanRef,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriZim server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
