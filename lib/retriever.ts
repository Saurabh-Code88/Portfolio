import type { CorpusChunk } from "./corpus.ts";

export type RetrievedChunk = CorpusChunk & { score: number };

export interface Retriever {
  retrieve(query: string, limit: number): RetrievedChunk[];
}

const STOP_WORDS = new Set(["a", "an", "and", "are", "about", "at", "be", "by", "can", "do", "for", "from", "how", "i", "in", "is", "it", "me", "of", "on", "or", "the", "to", "what", "when", "where", "who", "with", "you", "your"]);
const tokenize = (text: string) => (text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? []).filter((token) => token.length > 1 && !STOP_WORDS.has(token));

export class BM25Retriever implements Retriever {
  private readonly documents: Array<{ chunk: CorpusChunk; terms: string[]; frequencies: Map<string, number> }>;
  private readonly averageLength: number;
  private readonly documentFrequency: Map<string, number>;

  constructor(chunks: CorpusChunk[]) {
    this.documents = chunks.map((chunk) => {
      const terms = tokenize(`${chunk.title} ${chunk.text}`);
      const frequencies = new Map<string, number>();
      terms.forEach((term) => frequencies.set(term, (frequencies.get(term) ?? 0) + 1));
      return { chunk, terms, frequencies };
    });
    this.averageLength = this.documents.reduce((total, document) => total + document.terms.length, 0) / Math.max(1, this.documents.length);
    this.documentFrequency = new Map();
    this.documents.forEach(({ frequencies }) => frequencies.forEach((_, term) => this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1)));
  }

  retrieve(query: string, limit: number): RetrievedChunk[] {
    const terms = [...new Set(tokenize(query))];
    if (!terms.length) return [];
    const count = this.documents.length;
    return this.documents.map((document) => {
      const length = document.terms.length;
      let score = 0;
      for (const term of terms) {
        const frequency = document.frequencies.get(term) ?? 0;
        if (!frequency) continue;
        const df = this.documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (count - df + 0.5) / (df + 0.5));
        score += idf * ((frequency * 2.2) / (frequency + 1.2 * (0.25 + 0.75 * length / Math.max(1, this.averageLength))));
      }
      return { ...document.chunk, score };
    }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
