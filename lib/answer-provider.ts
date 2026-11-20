export type AnswerMessage = { role: "system" | "user"; content: string };

export interface AnswerProvider {
  stream(messages: AnswerMessage[], maxOutputTokens: number, signal: AbortSignal): AsyncIterable<string>;
}
