export interface ReceiptCategoryOption {
  id: string;
  name: string;
}

export interface ParsedReceipt {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  suggestedCategoryId: string | null;
}

const dateOnly = (year: number, month: number, day: number): string | null => {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const monthNumber = (name: string): number =>
  [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ].findIndex((month) => month.startsWith(name.toLowerCase())) + 1;

const fourDigitYear = (year: string): number =>
  Number(year.length === 2 ? `20${year}` : year);

const numericYear = (year: string): number => {
  const parsed = Number(year);
  return year.length === 2 ? (parsed < 70 ? 2000 + parsed : 1900 + parsed) : parsed;
};

const parseDate = (text: string): string | null => {
  const iso = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return dateOnly(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const named = text.match(/\b(\d{1,2})[\s/-]([A-Za-z]{3,9})[\s,/-]+(\d{2,4})\b/);
  if (named) {
    const month = monthNumber(named[2]);
    const year = fourDigitYear(named[3]);
    return month ? dateOnly(year, month, Number(named[1])) : null;
  }

  const monthFirst = text.match(/\b([A-Za-z]{3,9})[\s/-]+(\d{1,2}),?[\s,/-]+(\d{2,4})\b/);
  if (monthFirst) {
    const month = monthNumber(monthFirst[1]);
    return month
      ? dateOnly(fourDigitYear(monthFirst[3]), month, Number(monthFirst[2]))
      : null;
  }

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!numeric) return null;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  const year = numericYear(numeric[3]);

  if (first <= 12 && second <= 12 && first !== second) return null;
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : first;
  return dateOnly(year, month, day);
};

const parseAmount = (value: string): number | null => {
  let normalized = value.replace(/[^\d.,]/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    normalized = normalized.replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    if (decimals === 1 || decimals === 2) {
      normalized = normalized.replace(',', '.');
    } else if (decimals === 3) {
      normalized = normalized.replace(/,/g, '');
    } else {
      return null;
    }
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    if (decimals > 2) return null;
    const periods = normalized.match(/\./g)?.length ?? 0;
    if (periods > 1) {
      const last = normalized.lastIndexOf('.');
      normalized = `${normalized.slice(0, last).replace(/\./g, '')}${normalized.slice(last)}`;
    }
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= 99_999_999.99
    ? amount
    : null;
};

const extractTotal = (text: string): number | null => {
  const candidates: Array<{ priority: number; amount: number }> = [];
  const amountPattern = /(?:[$£€]\s*)?(\d[\d.,]*\d|\d)(?:\s*(?:USD|LKR|EUR|GBP))?/gi;
  const totalLabel =
    /\b(grand\s+total|total\s+due|amount\s+due|balance\s+due|total)\b/i;
  const excludedLabel = /\b(sub.?total|tax|change|tender|payment|cash back)\b/i;

  for (const line of text.split(/\r?\n/)) {
    if (excludedLabel.test(line)) continue;
    const label = line.match(totalLabel);
    if (!label) continue;

    const amounts = [...line.matchAll(amountPattern)]
      .map((match) => parseAmount(match[1]))
      .filter((amount): amount is number => amount !== null);
    if (amounts.length !== 1) continue;

    const normalizedLabel = label[1].toLowerCase();
    const priority = normalizedLabel === 'grand total'
      ? 3
      : normalizedLabel === 'total'
        ? 1
        : 2;
    candidates.push({ priority, amount: amounts[0] });
  }

  if (!candidates.length) return null;
  const topPriority = Math.max(...candidates.map(({ priority }) => priority));
  const highest = candidates
    .filter(({ priority }) => priority === topPriority)
    .map(({ amount }) => amount);
  return highest.every((amount) => amount === highest[0]) ? highest[0] : null;
};

const extractVendor = (text: string): string | null => {
  const excluded = /\b(receipt|invoice|subtotal|grand total|total|tax|date|cash|change|card|payment)\b/i;
  for (const line of text.split(/\r?\n/)) {
    const candidate = line.replace(/\s+/g, ' ').trim();
    if (
      candidate.length < 2 ||
      candidate.length > 100 ||
      excluded.test(candidate) ||
      !/[A-Za-z]/.test(candidate)
    ) {
      continue;
    }
    return candidate.replace(/[^\p{L}\p{N} &.'’'-]/gu, '').trim() || null;
  }
  return null;
};

const categoryHints: Array<{ pattern: RegExp; names: string[] }> = [
  { pattern: /\b(grocery|groceries|restaurant|cafe|coffee|food|dining|market)\b/i, names: ['food', 'grocery', 'dining'] },
  { pattern: /\b(uber|lyft|transit|fuel|gas station|train|metro|airline)\b/i, names: ['transport', 'travel'] },
  { pattern: /\b(cinema|movie|theatre|spotify|netflix|concert|game)\b/i, names: ['entertainment'] },
  { pattern: /\b(book|course|school|tuition|college|university)\b/i, names: ['education'] },
  { pattern: /\b(electric|water|power|broadband|internet|utility|utilities)\b/i, names: ['utility', 'bill'] },
  { pattern: /\b(pharmacy|clinic|dental|hospital|medicine|doctor)\b/i, names: ['health', 'medical'] },
  { pattern: /\b(apple|macbook|electronics|hardware|software|amazon)\b/i, names: ['shopping', 'technology', 'tech'] },
];

const suggestCategory = (
  text: string,
  categories: ReceiptCategoryOption[]
): string | null => {
  const directMatch = categories.find((category) =>
    category.name.length >= 3 && text.toLowerCase().includes(category.name.toLowerCase())
  );
  if (directMatch) return directMatch.id;

  const hint = categoryHints.find(({ pattern }) => pattern.test(text));
  if (!hint) return null;
  const matched = categories.find((category) => {
    const name = category.name.toLowerCase();
    return hint.names.some((alias) => name.includes(alias));
  });
  return matched?.id ?? null;
};

export const parseReceiptText = (
  text: string,
  categories: ReceiptCategoryOption[]
): ParsedReceipt => ({
  vendor: extractVendor(text),
  date: parseDate(text),
  amount: extractTotal(text),
  suggestedCategoryId: suggestCategory(text, categories),
});
