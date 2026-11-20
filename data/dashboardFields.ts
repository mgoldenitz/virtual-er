// The visit fields the dashboard reads, shared by the dashboard screen (data/dashboardRead.ts) and
// the summary route (data/summaryRead.ts). Nothing here may name access_token or code.

export const DASHBOARD_VISIT_FIELDS =
  "site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo";
