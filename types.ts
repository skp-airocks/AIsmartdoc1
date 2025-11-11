
export interface CostAndRiskAnalysis {
  costs: string[];
  risks: string[];
}

export interface Analysis {
  summary: string;
  criticalFindings: string[];
  costAndRiskAnalysis: CostAndRiskAnalysis;
}
