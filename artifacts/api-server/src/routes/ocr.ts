import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const SYSTEM_PROMPT = `You are an OCR + parsing engine for an English vocabulary study app. Each entry has a headword, a part-of-speech abbreviation (N./adj./v./adv.), an English dictionary definition (1–3 lines), and one or more example sentences. Extract EVERY entry across all images (the count varies). For each word also add Korean: word_ko (short meaning), definition_ko (natural translation), examples_ko. Return ONLY valid JSON, no markdown, schema: {"words":[{"id","word","pos","definition_en","examples_en":[],"word_ko","definition_ko","examples_ko":[],"confidence"}]}. If unclear, best-guess and set confidence:"low". confidence values must be exactly "high", "medium", or "low".`;

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

  const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = images.map(
    (b64) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${b64}`,
        detail: "high" as const,
      },
    })
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract all vocabulary entries from these ${images.length} image(s). Return ONLY valid JSON.`,
          },
          ...imageContent,
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: { words: unknown[] };
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    req.log.error({ raw }, "Failed to parse OpenAI response as JSON");
    res.status(500).json({ error: "Failed to parse AI response", raw });
    return;
  }

  if (!parsed.words || !Array.isArray(parsed.words)) {
    res.status(500).json({ error: "Invalid response structure from AI", parsed });
    return;
  }

  const words = (parsed.words as Record<string, unknown>[]).map((w, i) => ({
    id: `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
    word: String(w.word ?? ""),
    pos: String(w.pos ?? ""),
    definition_en: String(w.definition_en ?? ""),
    examples_en: Array.isArray(w.examples_en) ? (w.examples_en as string[]).map(String) : [],
    word_ko: String(w.word_ko ?? ""),
    definition_ko: String(w.definition_ko ?? ""),
    examples_ko: Array.isArray(w.examples_ko) ? (w.examples_ko as string[]).map(String) : [],
    confidence: ["high", "medium", "low"].includes(String(w.confidence))
      ? (w.confidence as string)
      : "low",
  }));

  res.json({ words });
});

export default router;
