/**
 * Scope change request tool implementations (P3.3)
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseClient } from '../database.js';
import type {
  ScopeChangeRequestInput,
  ScopeChangeReviewInput,
  ScopeChangeListInput,
  ScopeChangeRequest
} from '../types.js';

/**
 * Create a scope change request for a locked PRD
 */
export function scopeChangeRequest(
  db: DatabaseClient,
  input: ScopeChangeRequestInput
): { id: string; status: string; createdAt: string } {
  const now = new Date().toISOString();
  const id = `SCR-${uuidv4()}`;

  // Verify PRD exists
  const prd = db.getPrd(input.prdId);
  if (!prd) {
    throw new Error(`PRD not found: ${input.prdId}`);
  }

  // Check if PRD is scope-locked
  const metadata = JSON.parse(prd.metadata);
  if (!metadata.scopeLocked) {
    throw new Error(`PRD ${input.prdId} is not scope-locked. Scope change requests are only needed for locked PRDs.`);
  }

  // Insert scope change request
  db.insertScopeChangeRequest({
    id,
    prd_id: input.prdId,
    request_type: input.requestType,
    description: input.description,
    rationale: input.rationale,
    requested_by: input.requestedBy,
    status: 'pending',
    created_at: now
  });

  // Log activity
  db.insertActivity({
    id: uuidv4(),
    initiative_id: prd.initiative_id,
    type: 'scope_change_requested',
    entity_id: id,
    entity_type: 'scope_change_request',
    summary: `Scope change requested for PRD ${prd.title}: ${input.requestType}`,
    metadata: JSON.stringify({
      scopeChangeRequestId: id,
      prdId: input.prdId,
      requestType: input.requestType,
      requestedBy: input.requestedBy,
      description: input.description.substring(0, 100)
    }),
    created_at: now
  });

  return {
    id,
    status: 'pending',
    createdAt: now
  };
}

/**
 * Review and approve/reject a scope change request
 */
export function scopeChangeReview(
  db: DatabaseClient,
  input: ScopeChangeReviewInput
): ScopeChangeRequest {
  const now = new Date().toISOString();

  // Get request
  const request = db.getScopeChangeRequest(input.id);
  if (!request) {
    throw new Error(`Scope change request not found: ${input.id}`);
  }

  // Check if already reviewed
  if (request.status !== 'pending') {
    throw new Error(`Scope change request ${input.id} has already been ${request.status}`);
  }

  // Update request
  db.updateScopeChangeRequest(input.id, {
    status: input.status,
    reviewed_at: now,
    reviewed_by: input.reviewedBy,
    review_notes: input.reviewNotes
  });

  // Get PRD for activity log
  const prd = db.getPrd(request.prd_id);
  if (prd) {
    db.insertActivity({
      id: uuidv4(),
      initiative_id: prd.initiative_id,
      type: `scope_change_${input.status}`,
      entity_id: input.id,
      entity_type: 'scope_change_request',
      summary: `Scope change request ${input.status}: ${request.request_type} for PRD ${prd.title}`,
      metadata: JSON.stringify({
        scopeChangeRequestId: input.id,
        prdId: request.prd_id,
        requestType: request.request_type,
        reviewedBy: input.reviewedBy,
        reviewNotes: input.reviewNotes
      }),
      created_at: now
    });
  }

  // Return updated request
  const updated = db.getScopeChangeRequest(input.id);
  if (!updated) {
    throw new Error('Failed to retrieve updated scope change request');
  }

  return {
    id: updated.id,
    prdId: updated.prd_id,
    requestType: updated.request_type as 'add_task' | 'modify_task' | 'remove_task',
    description: updated.description,
    rationale: updated.rationale,
    requestedBy: updated.requested_by,
    status: updated.status as 'pending' | 'approved' | 'rejected',
    createdAt: updated.created_at,
    reviewedAt: updated.reviewed_at || undefined,
    reviewedBy: updated.reviewed_by || undefined,
    reviewNotes: updated.review_notes || undefined
  };
}

/**
 * List scope change requests
 */
export function scopeChangeList(
  db: DatabaseClient,
  input: ScopeChangeListInput
): ScopeChangeRequest[] {
  const requests = db.listScopeChangeRequests({
    prdId: input.prdId,
    status: input.status
  });

  return requests.map(r => ({
    id: r.id,
    prdId: r.prd_id,
    requestType: r.request_type as 'add_task' | 'modify_task' | 'remove_task',
    description: r.description,
    rationale: r.rationale,
    requestedBy: r.requested_by,
    status: r.status as 'pending' | 'approved' | 'rejected',
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at || undefined,
    reviewedBy: r.reviewed_by || undefined,
    reviewNotes: r.review_notes || undefined
  }));
}
