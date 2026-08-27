// Form draft utility - saves partially filled form data to localStorage
// Allows users to resume incomplete entries later

const DRAFT_PREFIX = 'pharmachain_draft_';

export interface FormDraft<T = any> {
  key: string;
  data: T;
  savedAt: string;
  label?: string;
}

export function getDraftKey(userId: string, formType: string): string {
  return `${DRAFT_PREFIX}${userId}_${formType}`;
}

export function saveDraft<T>(userId: string, formType: string, data: T, label?: string): void {
  try {
    const key = getDraftKey(userId, formType);
    const draft: FormDraft<T> = {
      key: formType,
      data,
      savedAt: new Date().toISOString(),
      label,
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (e) {
    console.error('Failed to save draft:', e);
  }
}

export function loadDraft<T>(userId: string, formType: string): FormDraft<T> | null {
  try {
    const key = getDraftKey(userId, formType);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as FormDraft<T>;
  } catch (e) {
    console.error('Failed to load draft:', e);
    return null;
  }
}

export function clearDraft(userId: string, formType: string): void {
  try {
    const key = getDraftKey(userId, formType);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear draft:', e);
  }
}

export function getAllDrafts(userId: string): FormDraft[] {
  const drafts: FormDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX) && key.includes(`_${userId}_`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            drafts.push(JSON.parse(raw));
          } catch {}
        }
      }
    }
  } catch (e) {
    console.error('Failed to get drafts:', e);
  }
  return drafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}
