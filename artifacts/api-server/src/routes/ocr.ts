import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

const SYSTEM_PROMPT = `You are an OCR + parsing engine for an English vocabulary study app. Each entry has a headword, a part-of-speech abbreviation (N./adj./v./adv.), an English dictionary definition (1–3 lines), and one or more example sentences. Extract EVERY entry across all images (the count varies). For each word also add Korean: word_ko (short meaning), definition_ko (natural translation), examples_ko. Return ONLY valid JSON, no markdown, schema: {"words":[{"id","word","pos","definition_en","examples_en":[],"word_ko","definition_ko","examples_ko":[],"confidence"}]}. If unclear, best-guess and set confidence:"low". confidence values must be exactly "high", "medium", or "low". The source is an English vocabulary book. Output English in the English fields. In Korean fields use ONLY Korean (Hangul) plus standard punctuation — do NOT include any Chinese characters (Hanja/Kanji). Ignore faint show-through text bleeding from the back of the page.`;

// Strip CJK ideographs that may bleed through from the back of the page
const CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/g;
function stripCjk(s: string): string {
  return s.replace(CJK_RE, "").trim();
}

router.post("/ocr/extract", async (req, res) => {
  const { images } = req.body as { images: string[] };

  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: "images array is required" });
    return;
  }

  if (images.length > 5) {
    res.status(400).json({ error: "Maximum 5 images allowed" });
    return;
  }

  try {
    const imageBlocks: Anthropic.ImageBlockParam[] = images.map((b64) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: b64,
      },
    }));

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `Extract all vocabulary entries from these ${images.length} image(s). Return ONLY valid JSON, no markdown fences.`,
            },
          ],
        },
      ],
    });

    const raw =
      message.content.find((b) => b.type === "text")?.text ?? "";

    let parsed: { words: unknown[] };
    try {
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      req.log.error({ raw }, "Failed to parse Claude response as JSON");
      res.status(500).json({ error: "Failed to parse AI response", raw });
      return;
    }

    if (!parsed.words || !Array.isArray(parsed.words)) {
      res.status(500).json({ error: "Invalid response structure from AI", parsed });
      return;
    }

    const words = (parsed.words as Record<string, unknown>[]).map((w, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
      word: stripCjk(String(w.word ?? "")),
      pos: String(w.pos ?? ""),
      definition_en: stripCjk(String(w.definition_en ?? "")),
      examples_en: Array.isArray(w.examples_en)
        ? (w.examples_en as string[]).map((s) => stripCjk(String(s)))
        : [],
      word_ko: stripCjk(String(w.word_ko ?? "")),
      definition_ko: stripCjk(String(w.definition_ko ?? "")),
      examples_ko: Array.isArray(w.examples_ko)
        ? (w.examples_ko as string[]).map((s) => stripCjk(String(s)))
        : [],
      confidence: ["high", "medium", "low"].includes(String(w.confidence))
        ? (w.confidence as string)
        : "low",
    }));

    res.json({ words });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    req.log.error({ err: e }, "Anthropic API error");
    res.status(500).json({ error: msg });
  }
});

export default router;
