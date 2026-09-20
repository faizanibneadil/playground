/**
 * Sanitizes user input into a project-name slug:
 * lowercase, English letters/digits only, words separated by hyphens.
 * No spaces are allowed — any whitespace or run of invalid characters
 * collapses into a single "-".
 */
export function slugifyProjectName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Lighter-weight, live version used while the user is typing: keeps the
 * hyphen they just pressed instead of collapsing trailing hyphens away,
 * so they can keep typing after a "-".
 */
export function sanitizeProjectNameInput(raw: string): string {
  return raw
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

export const DEFAULT_PROJECT_NAME = "untitled-playground";
