export type LLMProvider = "none" | "groq" | "openai" | "custom";

export interface LLMConfig {
  provider: "groq" | "openai" | "custom";
  apiKey: string;
  apiUrl: string;
  model: string;
  systemPrompt: string;
}

export const LLM_DEFAULT_MODELS: Record<"groq" | "openai", string> = {
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4.1-mini",
};

export const LLM_DEFAULT_CUSTOM_URL = "http://localhost:11434/v1/chat/completions";

export const SPLIT_POINT_MARKER = " <split_point> ";

export const LLM_DEFAULT_SYSTEM_PROMPT =
  'You are a transcript editor. Clean up the following speech-to-text transcript: fix punctuation, capitalization, and grammar; remove filler words such as "um", "uh", and "you know". Do not add new content or change the meaning. The transcript may contain <split_point> markers indicating boundaries between separately transcribed audio segments — use these as context for continuity and fixing mistranscriptions at the boundary, but remove them from your output. Return only the corrected transcript, with no additional commentary.';

export function getLLMConfig(): LLMConfig | null {
  const provider = (localStorage.getItem("wisper_llm_provider") || "none") as LLMProvider;
  if (provider === "none") return null;

  const getApiKey = () => {
    if (provider === "groq") return localStorage.getItem("wisper_groq_key") || "";
    if (provider === "openai") return localStorage.getItem("wisper_openai_key") || "";
    return localStorage.getItem("wisper_llm_custom_key") || "";
  };

  const getApiUrl = () => {
    if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
    if (provider === "openai") return "https://api.openai.com/v1/chat/completions";
    return localStorage.getItem("wisper_llm_custom_url") || LLM_DEFAULT_CUSTOM_URL;
  };

  const getModel = () => {
    const stored = localStorage.getItem(`wisper_llm_model_${provider}`);
    if (stored) return stored;
    if (provider === "groq" || provider === "openai") return LLM_DEFAULT_MODELS[provider];
    return "";
  };

  const systemPrompt =
    localStorage.getItem("wisper_llm_system_prompt") || LLM_DEFAULT_SYSTEM_PROMPT;

  return {
    provider,
    apiKey: getApiKey(),
    apiUrl: getApiUrl(),
    model: getModel(),
    systemPrompt,
  };
}

export async function postProcessTranscript(
  transcript: string,
  config: LLMConfig,
): Promise<string> {
  if (!config.model) {
    throw new Error(`LLM model is not set (URL: ${config.apiUrl})`);
  }
  if (!config.apiUrl) {
    throw new Error(`LLM API URL is not set (model: ${config.model})`);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`) +
        ` [POST ${config.apiUrl}, model: ${config.model}]`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? transcript;
}
