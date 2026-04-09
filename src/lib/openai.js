const API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "YOUR_KEY_HERE";

function assertApiKey() {
  if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
    throw new Error("Add your OpenAI API key in VITE_OPENAI_API_KEY before generating content.");
  }
}

async function parseResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || "OpenAI request failed";
    throw new Error(message);
  }

  return data.choices?.[0]?.message?.content || "";
}

function extractJsonCandidate(rawText) {
  const trimmed = String(rawText || "").trim();

  if (!trimmed) {
    throw new SyntaxError("Empty model response");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");

  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");

  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1);
  }

  return trimmed;
}

export function parseModelJson(rawText) {
  const candidate = extractJsonCandidate(rawText)
    .replace(/^[\uFEFF\x00-\x1F]+/, "")
    .trim();

  return JSON.parse(candidate);
}

export async function callGPT(systemPrompt, userMessage) {
  assertApiKey();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  return parseResponse(res);
}

export async function callGPTMultiTurn(systemPrompt, messages) {
  assertApiKey();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  return parseResponse(res);
}
