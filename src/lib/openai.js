const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/api/openai/chat`;

async function parseResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    const message = data?.error || data?.message || "OpenAI request failed";
    throw new Error(message);
  }

  return data.content || "";
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
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
    }),
  });

  return parseResponse(res);
}

export async function callGPTMultiTurn(systemPrompt, messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemPrompt,
      messages,
    }),
  });

  return parseResponse(res);
}
