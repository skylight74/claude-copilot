/**
 * Embedding generation using Transformers.js
 * Uses all-MiniLM-L6-v2 for 384-dimension embeddings
 */

import { pipeline } from '@xenova/transformers';
import type { EmbeddingVector } from '../types.js';

// Use any for pipeline since Transformers.js types are complex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let initPromise: Promise<any> | null = null;

/**
 * Initialize the embedding pipeline (lazy loaded)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initEmbeddings(): Promise<any> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.error('Loading embedding model (first time may take a moment)...');

    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    console.error('Embedding model loaded.');
    return embeddingPipeline;
  })();

  return initPromise;
}

/**
 * Generate embedding for text content
 */
export async function generateEmbedding(text: string): Promise<EmbeddingVector> {
  const pipe = await initEmbeddings();

  // Truncate long text to avoid model limits (512 tokens)
  const truncatedText = text.slice(0, 2000);

  const output = await pipe(truncatedText, {
    pooling: 'mean',
    normalize: true
  });

  // Convert to Float32Array
  return new Float32Array(output.data);
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
  const pipe = await initEmbeddings();

  const results: EmbeddingVector[] = [];

  // Process in batches to avoid memory issues
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    for (const text of batch) {
      const truncatedText = text.slice(0, 2000);
      const output = await pipe(truncatedText, {
        pooling: 'mean',
        normalize: true
      });
      results.push(new Float32Array(output.data));
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
