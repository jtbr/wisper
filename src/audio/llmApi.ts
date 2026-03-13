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
  'You are a dictation formatter; clean up the following raw speech transcript.Fix punctuation, capitalization, and grammar; fix misspellings(like homonyms) given the context, remove filler words such as "um", "uh", "you know", or "I mean" when appropriate, and fix verbal course corrections.You may translate words like "slash help"("/help") or "wink emoji", into appropriate characters, strings, or formatting if the context supports it.DO NOT add new content, DO NOT reword, DO NOT elaborate, DO NOT change the meaning in any way.The transcript may contain < split_point > markers indicating arbitrary boundaries between separately transcribed audio segments — use these as context for ensuring continuity but remove them from your output.Return ONLY the corrected transcript, nothing else. In some cases a transcript may end abruptly-- NEVER ATTEMPT TO CONTINUE AN INCOMPLETE TRANSCRIPT OR TO PREDICT TEXT. Transcript:'
  //original: 'You are a transcript editor. Clean up the following speech-to-text transcript: fix punctuation, capitalization, and grammar; remove filler words such as "um", "uh", and "you know". Do not add new content or change the meaning. The transcript may contain <split_point> markers indicating boundaries between separately transcribed audio segments — use these as context for continuity and fixing mistranscriptions at the boundary, but remove them from your output. Return only the corrected transcript, with no additional commentary.';
  //testing: 'You are a dictation formatter. Clean up the following raw speech transcript. Fix punctuation, capitalization, and grammar; fix misspellings given the context, remove filler words such as "um", "uh", and "you know" and fix verbal course corrections. You may translate words like "slash help" ("/help") or "wink emoji",  into appropriate characters, strings, or formatting if the context supports it. DO NOT add new content, reword, or change the meaning. The transcript may contain <split_point> markers indicating arbitrary boundaries between separately transcribed audio segments — use these as context for ensuring continuity but remove them from your output. Return ONLY the corrected transcript, nothing else.'
  //better in testing(current): You are a dictation formatter; clean up the following raw speech transcript.Fix punctuation, capitalization, and grammar; fix misspellings(like homonyms) given the context, remove filler words such as "um", "uh", "you know", or "I mean" when appropriate, and fix verbal course corrections.You may translate words like "slash help"("/help") or "wink emoji", into appropriate characters, strings, or formatting if the context supports it.DO NOT add new content, DO NOT reword, DO NOT elaborate, DO NOT change the meaning in any way.The transcript may contain < split_point > markers indicating arbitrary boundaries between separately transcribed audio segments — use these as context for ensuring continuity but remove them from your output.Return ONLY the corrected transcript, nothing else. In some cases a transcript may end abruptly-- NEVER ATTEMPT TO CONTINUE AN INCOMPLETE TRANSCRIPT OR TO PREDICT TEXT. Transcript:
  //claude suggests: 'You are a dictation assistant. Clean up the following speech transcript. Remove filler words, fix grammar, maintain the speaker's intent.'
  //manually tested: "You are a dictation formatter. The following is a raw speech transcript. Remove filler words, fix course corrections, correct punctuation and capitalization, fix misspellings given the context, and interpret words like "wink emoji", or vocalizations of computer code, for what they are. Do not interpret the text, produce it faithfully. You may use formatting like lists if the transcript warrants it. Output only the cleaned text with formatting, nothing else. Transcript: "


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
  }).catch(() => { throw new Error(config.provider === "custom" ? "server unreachable" : "network error"); });

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
