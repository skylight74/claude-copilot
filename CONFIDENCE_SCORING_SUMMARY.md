# Confidence Scoring Implementation Summary

## Overview
Added confidence scoring to work products to filter noise in multi-agent results. Agents can now attach a 0-1 confidence score to indicate certainty of their findings or recommendations.

## Changes Made

### 1. Database Schema
- **File:** `mcp-servers/task-copilot/src/database.ts`
- Added migration V9: `confidence REAL DEFAULT NULL` column to `work_products` table
- Added index on confidence for efficient filtering
- Updated `CURRENT_VERSION` to 9
- Updated `insertWorkProduct` method to include confidence

### 2. TypeScript Types
- **File:** `mcp-servers/task-copilot/src/types.ts`
- Added `confidence?: number` to `WorkProductStoreInput`
- Added `confidence: number | null` to `WorkProductRow`
- Added `minConfidence?: number` to `ProgressSummaryInput`
- Added `confidenceStats` to `ProgressSummaryOutput`:
  - `averageConfidence`
  - `highConfidence` (>= 0.8)
  - `mediumConfidence` (0.5-0.79)
  - `lowConfidence` (< 0.5)
  - `noConfidence` (null values)

### 3. Work Product Storage
- **File:** `mcp-servers/task-copilot/src/tools/work-product.ts`
- Updated `workProductStore` to:
  - Accept optional `confidence` parameter (0-1)
  - Validate confidence range
  - Store confidence in database
- Updated `workProductGet` to return confidence
- Updated `workProductList` to include confidence in results

### 4. Progress Summary
- **File:** `mcp-servers/task-copilot/src/tools/initiative.ts`
- Updated `progressSummary` to:
  - Accept optional `minConfidence` filter parameter
  - Filter work products by minimum confidence threshold
  - Calculate and return confidence statistics
  - Show average confidence and distribution

### 5. Tool Schemas
- **File:** `mcp-servers/task-copilot/src/index.ts`
- Updated `work_product_store` tool schema:
  - Added `confidence` parameter (type: number, min: 0, max: 1)
  - Updated description with confidence guidance
- Updated `progress_summary` tool schema:
  - Added `minConfidence` parameter for filtering

### 6. Agent Prompts
Updated three key agents with confidence scoring guidance:

#### **Tech Architect** (`.claude/agents/ta.md`)
- Added confidence parameter to work_product_store example
- Added "Confidence Scoring" section with table:
  - 0.9-1.0: High certainty architectural decisions
  - 0.7-0.89: Strong recommendations with minor unknowns
  - 0.5-0.69: Medium confidence, needs validation
  - 0.3-0.49: Low confidence, exploratory analysis
  - 0.0-0.29: Very uncertain, requires human review
  - null: Confidence not applicable (informational)

#### **QA Engineer** (`.claude/agents/qa.md`)
- Added confidence parameter to work_product_store example
- Added "Confidence Scoring" section with table:
  - 0.9-1.0: Reproducible bug with clear root cause
  - 0.7-0.89: Consistent test failure, likely cause identified
  - 0.5-0.69: Intermittent issue or partial reproduction
  - 0.3-0.49: Suspected issue, hard to reproduce
  - 0.0-0.29: Unclear if issue or test environment problem
  - null: Test plans, coverage reports (not findings)

#### **Security Engineer** (`.claude/agents/sec.md`)
- Added confidence parameter to work_product_store example
- Added "Confidence Scoring" section with table:
  - 0.9-1.0: Confirmed vulnerability with exploit proof
  - 0.7-0.89: High likelihood vulnerability with clear evidence
  - 0.5-0.69: Potential vulnerability, needs confirmation
  - 0.3-0.49: Security concern, unclear if exploitable
  - 0.0-0.29: Possible issue, likely false positive
  - null: Best practices recommendations, informational

## Usage Examples

### Storing Work Product with Confidence
```typescript
work_product_store({
  taskId: "TASK-123",
  type: "architecture",
  title: "Database Design Decision",
  content: "Full analysis and recommendation...",
  confidence: 0.85  // High confidence in this decision
})
```

### Filtering by Confidence
```typescript
// Get only high-confidence work products
progress_summary({
  initiativeId: "INIT-456",
  minConfidence: 0.8  // Filter out low/medium confidence items
})
```

### Progress Summary with Confidence Stats
```json
{
  "workProducts": {
    "total": 12,
    "byType": { "architecture": 5, "test_plan": 4, "implementation": 3 },
    "confidenceStats": {
      "averageConfidence": 0.72,
      "highConfidence": 5,      // >= 0.8
      "mediumConfidence": 4,    // 0.5-0.79
      "lowConfidence": 2,       // < 0.5
      "noConfidence": 1         // null
    }
  }
}
```

## Benefits

1. **Noise Filtering**: Filter out low-confidence results in multi-agent scenarios
2. **Quality Signals**: Surface high-confidence findings for immediate action
3. **Transparency**: Agents explicitly communicate certainty levels
4. **Analytics**: Track confidence trends across agents and task types
5. **Backward Compatible**: Existing work products without confidence still work (null)

## Testing

Run the test script:
```bash
cd mcp-servers/task-copilot
npm run build
ts-node test-confidence.ts
```

## Migration

The migration is automatic on database initialization. Existing work products will have `confidence = NULL`, which is treated as "no confidence score" rather than low confidence.

## Future Enhancements

1. Agent performance tracking by confidence accuracy
2. Automatic confidence degradation over time
3. Confidence-weighted voting for multi-agent consensus
4. Confidence thresholds for task completion gates
