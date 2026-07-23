export type DocumentPage = {
  page_number: number;
  page_text: string;
};

type Citation = {
  page_number: number;
  quote: string;
};

const MAX_CONTEXT_CHARACTERS = 120_000;
const MAX_RETRIEVED_PAGES = 24;
const MIN_TERM_LENGTH = 3;

const broadQuestionPatterns = [
  /\bsummarize\b/i,
  /\boverview\b/i,
  /\bentire document\b/i,
  /\bwhole document\b/i,
  /\bkey (terms|points|requirements|risks)\b/i,
  /\bwhat is missing\b/i,
  /\bwhat risks\b/i,
];

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "can",
  "could",
  "document",
  "does",
  "for",
  "from",
  "have",
  "how",
  "into",
  "its",
  "page",
  "pages",
  "please",
  "should",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getQuestionTerms(question: string) {
  const terms = question
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9'-]*/g);

  return Array.from(
    new Set(
      (terms ?? []).filter(
        (term) =>
          term.length >= MIN_TERM_LENGTH && !stopWords.has(term),
      ),
    ),
  );
}

function countOccurrences(text: string, term: string) {
  let count = 0;
  let startIndex = 0;

  while (startIndex < text.length) {
    const matchIndex = text.indexOf(term, startIndex);

    if (matchIndex === -1) {
      break;
    }

    count += 1;
    startIndex = matchIndex + term.length;
  }

  return count;
}

function scorePage(page: DocumentPage, terms: string[]) {
  const lowercaseText = page.page_text.toLowerCase();

  return terms.reduce((score, term) => {
    const occurrences = countOccurrences(lowercaseText, term);
    return score + Math.min(occurrences, 8);
  }, 0);
}

function selectEvenlySpacedPages(
  pages: DocumentPage[],
  desiredCount: number,
) {
  if (pages.length <= desiredCount) {
    return pages;
  }

  const selectedIndexes = new Set<number>();
  const lastIndex = pages.length - 1;

  for (let index = 0; index < desiredCount; index += 1) {
    selectedIndexes.add(
      Math.round((index * lastIndex) / (desiredCount - 1)),
    );
  }

  return Array.from(selectedIndexes)
    .sort((a, b) => a - b)
    .map((index) => pages[index]);
}

function selectRelevantPages(
  pages: DocumentPage[],
  question: string,
) {
  const isBroadQuestion = broadQuestionPatterns.some((pattern) =>
    pattern.test(question),
  );

  if (isBroadQuestion) {
    return selectEvenlySpacedPages(pages, MAX_RETRIEVED_PAGES);
  }

  const terms = getQuestionTerms(question);

  if (terms.length === 0) {
    return selectEvenlySpacedPages(pages, MAX_RETRIEVED_PAGES);
  }

  const scoredPages = pages
    .map((page) => ({
      page,
      score: scorePage(page, terms),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.page.page_number - b.page.page_number,
    );

  const selected = scoredPages
    .filter(({ score }) => score > 0)
    .slice(0, MAX_RETRIEVED_PAGES)
    .map(({ page }) => page);

  if (selected.length === 0) {
    return selectEvenlySpacedPages(pages, MAX_RETRIEVED_PAGES);
  }

  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];

  const withBoundaryPages = new Map<number, DocumentPage>();

  for (const page of [firstPage, ...selected, lastPage]) {
    withBoundaryPages.set(page.page_number, page);
  }

  return Array.from(withBoundaryPages.values())
    .sort((a, b) => a.page_number - b.page_number)
    .slice(0, MAX_RETRIEVED_PAGES);
}

function limitPagesByCharacterCount(pages: DocumentPage[]) {
  const selected: DocumentPage[] = [];
  let characterCount = 0;

  for (const page of pages) {
    const formattedLength =
      page.page_text.length +
      `\n\n--- PAGE ${page.page_number} ---\n`.length;

    if (
      selected.length > 0 &&
      characterCount + formattedLength > MAX_CONTEXT_CHARACTERS
    ) {
      break;
    }

    selected.push(page);
    characterCount += formattedLength;
  }

  return selected;
}

export function buildDocumentContext(
  pages: DocumentPage[],
  question: string,
) {
  const orderedPages = [...pages].sort(
    (a, b) => a.page_number - b.page_number,
  );

  const totalCharacterCount = orderedPages.reduce(
    (total, page) => total + page.page_text.length,
    0,
  );

  const candidatePages =
    totalCharacterCount <= MAX_CONTEXT_CHARACTERS
      ? orderedPages
      : selectRelevantPages(orderedPages, question);

  const selectedPages = limitPagesByCharacterCount(candidatePages);

  const context = selectedPages
    .map(
      (page) =>
        `--- PAGE ${page.page_number} ---\n${page.page_text.trim()}`,
    )
    .join("\n\n");

  return {
    pages: selectedPages,
    context,
  };
}

export function validateAnswerCitations(
  citations: Citation[],
  suppliedPages: DocumentPage[],
) {
  const pageMap = new Map(
    suppliedPages.map((page) => [
      page.page_number,
      normalizeWhitespace(page.page_text).toLowerCase(),
    ]),
  );

  const uniqueCitations = new Map<
    string,
    {
      page_number: number;
      quote: string;
    }
  >();

  for (const citation of citations) {
    const normalizedPageText = pageMap.get(citation.page_number);
    const normalizedQuote = normalizeWhitespace(
      citation.quote,
    ).toLowerCase();

    if (
      !normalizedPageText ||
      normalizedQuote.length < 8 ||
      !normalizedPageText.includes(normalizedQuote)
    ) {
      continue;
    }

    const key = `${citation.page_number}:${normalizedQuote}`;

    uniqueCitations.set(key, {
      page_number: citation.page_number,
      quote: citation.quote.trim(),
    });
  }

  return Array.from(uniqueCitations.values()).sort(
    (a, b) => a.page_number - b.page_number,
  );
}
