const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .trim();
}

export function sanitizeTextInput(value: FormDataEntryValue | null | undefined) {
  return normalizeText(String(value ?? ""));
}

export function sanitizeTagList(value: FormDataEntryValue | null | undefined) {
  return sanitizeTextInput(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
