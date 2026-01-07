/**
 * Tracks the last seen event ID to avoid duplicate processing
 */

export class WatermarkTracker {
  private lastSeenId: string | null = null;
  private seenIds: Set<string> = new Set();
  private readonly maxSeenSize = 1000;

  /**
   * Get the last seen event ID
   */
  getLastSeen(): string | null {
    return this.lastSeenId;
  }

  /**
   * Check if event ID has been seen
   */
  hasSeen(eventId: string): boolean {
    return this.seenIds.has(eventId);
  }

  /**
   * Mark event as seen
   */
  markSeen(eventId: string): void {
    this.lastSeenId = eventId;
    this.seenIds.add(eventId);

    // Prevent memory leak by limiting set size
    if (this.seenIds.size > this.maxSeenSize) {
      // Remove oldest entries (first half of set)
      const toRemove = Array.from(this.seenIds).slice(0, this.maxSeenSize / 2);
      toRemove.forEach(id => this.seenIds.delete(id));
    }
  }

  /**
   * Reset tracker (useful for testing)
   */
  reset(): void {
    this.lastSeenId = null;
    this.seenIds.clear();
  }
}
