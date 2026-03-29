import crypto from 'crypto';

/**
 * Generate a SHA-256 fingerprint for deduplication.
 * Normalizes the title by lowercasing, stripping extra whitespace,
 * and removing common punctuation before hashing.
 */
export function generateFingerprint(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[।,.\-:;!?'"()[\]{}]/g, '')
    .trim();

  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Calculate simple Jaccard similarity between two strings.
 * Used as a secondary dedup check.
 */
export function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}
