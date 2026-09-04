export interface PolicyRuleResult {
  rule: string;
  passed: boolean;
  message: string;
}

export interface PolicyDecision {
  proposalId: string;
  approved: boolean;
  reason: string;
  rulesChecked: PolicyRuleResult[];
  requiresHumanApproval: boolean;
  evaluatedAt: string;
}
