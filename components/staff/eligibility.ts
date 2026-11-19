// The eligibility checklist for off-site waiting. Staff tick all three at check-in
// (CheckInPanel.tsx), and again when a declined patient switches to off-site (WaitingOnSite.tsx).

export const CHECKLIST = [
  { id: "phone", label: "Has a phone with them" },
  { id: "return", label: "Can return within 20 minutes" },
  { id: "agrees", label: "Agrees to wait off-site" },
] as const;
