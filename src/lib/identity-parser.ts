export const BRANCH_MAP: Record<number, string> = {
  100: 'CSE',
  101: 'ECE',
  102: 'DSAI',
};

export interface ParsedIdentity {
  handle: string;
  batch_year: number;
  branch_code: number;
  branch_name: string;
}

/**
 * Parses an IIITNR email like `name25102@iiitnr.edu.in`
 * and extracts handle, batch_year, branch_code.
 */
export function parseIIITNREmail(email: string): ParsedIdentity | null {
  if (!email.endsWith('@iiitnr.edu.in')) return null;

  const prefix = email.split('@')[0];
  const match = prefix.match(/^([a-zA-Z.]+)(\d{2})(\d{3})$/);
  if (!match) return null;

  const [, handle, yearStr, branchStr] = match;
  const admissionYear = 2000 + parseInt(yearStr, 10);
  const batch_year = admissionYear + 4;
  const branch_code = parseInt(branchStr, 10);

  if (!BRANCH_MAP[branch_code]) return null;

  return {
    handle,
    batch_year,
    branch_code,
    branch_name: BRANCH_MAP[branch_code],
  };
}
