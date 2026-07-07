/**
 * The verdict shape — output of the alignment engine (see src/engine).
 * A verdict with no reasons is a bug: every verdict must explain itself.
 */

export type Severity = 'block' | 'caution' | 'ok';

export type Verdict = 'green' | 'amber' | 'red';

export interface Reason {
  severity: Severity;
  /** e.g. 'added_sugar', 'ingredient:soybean oil', 'protein_budget'. */
  metric: string;
  /** Human-readable, e.g. "Added sugar 18g exceeds your 10g/serving limit". */
  message: string;
  value?: number;
  limit?: number;
}

/** Remaining daily macro budget after logging the evaluated item. */
export interface BudgetFit {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface AlignmentResult {
  verdict: Verdict;
  /** Sorted worst-first (block → caution → ok). */
  reasons: Reason[];
  budgetFit: BudgetFit;
}
