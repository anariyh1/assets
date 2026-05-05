import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiResponse = {
  error?: {
    message?: string;
  };
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function toGeminiRole(role: ChatMessage["role"]) {
  return role === "assistant" ? "model" : "user";
}

function getGeminiApiKey() {
  try {
    const { env } = getCloudflareContext();
    const boundKey =
      typeof (env as { GEMINI_API_KEY?: unknown }).GEMINI_API_KEY === "string"
        ? (env as { GEMINI_API_KEY?: string }).GEMINI_API_KEY
        : undefined;

    if (boundKey?.trim()) {
      return boundKey.trim();
    }
  } catch {
    // Local Next.js dev can fall back to .env.local via process.env.
  }

  const processKey = process.env.GEMINI_API_KEY?.trim();
  return processKey || undefined;
}

export async function POST(request: NextRequest) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY oldsongui baina." },
      { status: 500 }
    );
  }

  let payload: { message?: string; history?: ChatMessage[] };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON body buruu baina." },
      { status: 400 }
    );
  }

  const message = payload.message?.trim();

  if (!message) {
    return NextResponse.json(
      { error: "message talbar zaaval baina." },
      { status: 400 }
    );
  }

  const history = Array.isArray(payload.history)
    ? payload.history
        .filter(
          (item): item is ChatMessage =>
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim().length > 0
        )
        .slice(-10)
    : [];

  const contents = [...history, { role: "user" as const, content: message }].map(
    (item) => ({
      role: toGeminiRole(item.role),
      parts: [{ text: item.content }],
    })
  );

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are an AI assistant for an asset management system. Help with assets, procurement, assignments, QR, inventory, reporting, and system usage. Reply in Mongolian by default unless the user writes in another language. When replying in Mongolian, use only Mongolian Cyrillic script. Do not transliterate Mongolian into Latin letters. Do not mix Mongolian and English unless the user explicitly asks for English or a technical term, product name, model name, API name, or code token must stay in English. Keep answers concise and practical.",
            },
          ],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
      cache: "no-store",
    });

    const data: GeminiResponse = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Gemini service aldaa butsaalaa." },
        { status: response.status }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Gemini hariu butsaasanui." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Gemini ruu holbohod aldaa garlaa." },
      { status: 500 }
    );
  }
}
