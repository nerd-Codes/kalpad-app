"use client";

// remarkMath only treats $$...$$ as DISPLAY (block) math when blank lines exist
// before and after the block. The LLM frequently omits them, so the parser
// falls back to inline mode and renders equations in a garbled, run-on line.
//
// This normaliser runs on the raw markdown string BEFORE ReactMarkdown sees it.
// It works line-by-line so it never accidentally mutates inline $...$ expressions.
export function preprocessMathBlocks(markdown) {
    if (!markdown) return markdown;

    const lines = markdown.split('\n');
    const out = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();
        const isDelimiter = trimmed === '$$';

        const singleLine = (
            !isDelimiter &&
            trimmed.startsWith('$$') &&
            trimmed.endsWith('$$') &&
            trimmed.length > 4
        );

        if (singleLine) {
            if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push('$$');
            out.push(trimmed.slice(2, -2).trim());
            out.push('$$');
            if (i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            continue;
        }

        if (isDelimiter) {
            if (!inBlock && out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
            out.push(line);
            if (inBlock && i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
            inBlock = !inBlock;
            continue;
        }

        out.push(line);
    }

    return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON + TARGETED CHUNK EXTRACTOR FOR AI TUTOR DOUBT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its',
  'itself', 'just', 'll', 'm', 'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no',
  'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 're', 's', 'same', 'she', 'should', 'so', 'some', 'such', 't', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 've', 'very', 'was', 'wasn',
  'we', 'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
  'with', 'won', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'please', 'explain',
  'tell', 'question', 'answer', 'student', 'tutor', 'context', 'previous', 'latest'
]);

/**
 * Tokenizes text into search terms, stripping punctuation and common stop words.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeText(text = '') {
  if (typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s$]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/**
 * Extracts all section headings (###, ##, #) to produce a global chapter roadmap (~100 tokens).
 * @param {string} noteContent
 * @returns {string}
 */
export function extractOutlineSkeleton(noteContent = '') {
  if (typeof noteContent !== 'string' || !noteContent.trim()) {
    return 'No outline available.';
  }
  const headings = [];
  const lines = noteContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,3}\s+/.test(trimmed)) {
      headings.push(trimmed.replace(/^#{1,3}\s+/, '').trim());
    }
  }
  if (headings.length === 0) return 'No outline available.';
  return headings.map((h, i) => `${i + 1}. ${h}`).join('\n');
}

/**
 * Pulls high-yield blocks: formal definition blockquotes and display math $$...$$ blocks.
 * Capped at ~200 tokens (approx 900 chars).
 * @param {string} noteContent
 * @param {number} [maxChars=900]
 * @returns {string}
 */
export function extractCoreDefinitionsAndEquations(noteContent = '', maxChars = 900) {
  if (typeof noteContent !== 'string' || !noteContent.trim()) {
    return 'None.';
  }
  const items = [];
  const lines = noteContent.split('\n');

  let inMath = false;
  let currentMath = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Single-line display math: $$...$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      items.push(trimmed);
      continue;
    }

    // Multi-line display math
    if (trimmed === '$$') {
      if (inMath) {
        currentMath.push('$$');
        items.push(currentMath.join('\n'));
        currentMath = [];
        inMath = false;
      } else {
        inMath = true;
        currentMath = ['$$'];
      }
      continue;
    }

    if (inMath) {
      currentMath.push(line);
      continue;
    }

    // Formal definitions: > **Definition:** ... or > Definition:
    if (/^>\s*\*{0,2}Definition:?\*{0,2}/i.test(trimmed)) {
      const quote = [trimmed];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        quote.push(lines[i].trim());
      }
      items.push(quote.join('\n'));
    }
  }

  if (items.length === 0) return 'None.';

  let accumulated = '';
  for (const item of items) {
    if (accumulated && (accumulated + '\n\n' + item).length > maxChars) break;
    accumulated += (accumulated ? '\n\n' : '') + item;
  }
  return accumulated || items[0].slice(0, maxChars);
}

/**
 * Splits a markdown note into structural sections by heading.
 * @param {string} markdown
 * @returns {Array<{ heading: string, body: string, fullText: string }>}
 */
export function splitNoteIntoSections(markdown = '') {
  if (typeof markdown !== 'string') return [];
  const lines = markdown.split('\n');
  const sections = [];
  let currentHeading = '';
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,3}\s+/.test(line.trim());

    if (isHeading) {
      const bodyText = currentLines.join('\n').trim();
      if (currentHeading || bodyText) {
        sections.push({
          heading: currentHeading || 'Introduction',
          body: bodyText,
          fullText: (currentHeading ? `${currentHeading}\n` : '') + bodyText,
        });
      }
      currentHeading = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  const finalBody = currentLines.join('\n').trim();
  if (currentHeading || finalBody) {
    sections.push({
      heading: currentHeading || 'Introduction',
      body: finalBody,
      fullText: (currentHeading ? `${currentHeading}\n` : '') + finalBody,
    });
  }

  return sections;
}

/**
 * Scores each section against question tokens using BM25 with heading term boosting.
 * @param {Array<{ heading: string, body: string, fullText: string }>} sections
 * @param {string[]} questionTokens
 * @returns {Array<{ section: Object, score: number }>}
 */
export function scoreSectionsBM25(sections, questionTokens) {
  if (!Array.isArray(sections) || sections.length === 0) return [];
  if (!questionTokens || questionTokens.length === 0) {
    return sections.map((s, index) => ({ section: s, score: index === 0 ? 1 : 0 }));
  }

  const N = sections.length;
  const sectionTokens = sections.map((s) => ({
    headingTokens: tokenizeText(s.heading),
    bodyTokens: tokenizeText(s.body),
    len: tokenizeText(s.fullText).length,
  }));

  const avgLen = sectionTokens.reduce((sum, item) => sum + item.len, 0) / Math.max(1, N);

  const df = {};
  for (const token of questionTokens) {
    df[token] = 0;
    for (const item of sectionTokens) {
      if (item.headingTokens.includes(token) || item.bodyTokens.includes(token)) {
        df[token]++;
      }
    }
  }

  const k1 = 1.2;
  const b = 0.75;

  return sections.map((section, idx) => {
    const { headingTokens, bodyTokens, len } = sectionTokens[idx];
    let score = 0;

    for (const token of questionTokens) {
      const n_q = df[token] || 0;
      const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));

      const countBody = bodyTokens.filter((t) => t === token).length;
      const countHeading = headingTokens.filter((t) => t === token).length;

      // Heavy 3.5x boost for heading matches
      const tfHeading = countHeading * 3.5;
      const tfBody = (countBody * (k1 + 1)) / (countBody + k1 * (1 - b + b * (len / (avgLen || 1))));

      score += idf * (tfHeading + tfBody);
    }

    return { section, score };
  });
}

/**
 * Selects the top 1–2 most relevant sections matching the user's question (~350–500 tokens).
 * @param {Array<{ heading: string, body: string, fullText: string }>} sections
 * @param {string} question
 * @param {number} [maxTotalWords=650]
 * @returns {string}
 */
export function selectTargetedSections(sections, question, maxTotalWords = 450) {
  if (!Array.isArray(sections) || sections.length === 0) return '';
  if (sections.length === 1) return sections[0].fullText;

  let searchTarget = question || '';
  if (question && question.includes('Latest question:')) {
    const parts = question.split('Latest question:');
    searchTarget = parts[parts.length - 1] + ' ' + searchTarget;
  }

  const qTokens = tokenizeText(searchTarget);
  const scored = scoreSectionsBM25(sections, qTokens);

  scored.sort((a, b) => b.score - a.score);

  const top1 = scored[0];
  const selected = [top1.section];

  let currentWords = top1.section.fullText.split(/\s+/).filter(Boolean).length;

  if (scored.length > 1 && scored[1].score > 0) {
    const top2 = scored[1];
    const top2Words = top2.section.fullText.split(/\s+/).filter(Boolean).length;
    // Include 2nd section only if strongly relevant (>= 50% of top1 score) and fits under ~350-500 token budget (~450 words)
    if (top2.score >= top1.score * 0.5 && currentWords + top2Words <= maxTotalWords) {
      const idx1 = sections.indexOf(top1.section);
      const idx2 = sections.indexOf(top2.section);
      if (idx1 < idx2) {
        selected.push(top2.section);
      } else {
        selected.unshift(top2.section);
      }
    }
  }

  return selected.map((s) => s.fullText).join('\n\n');
}

/**
 * Extracts a lightweight Skeleton + Targeted Chunk context for Ask Doubt AI Tutor.
 * Reduces token consumption by ~80% on long notes while passing short notes (<600 words) directly.
 *
 * @param {string} [fullNoteContent='']
 * @param {string} [question='']
 * @returns {{
 *   isShort: boolean,
 *   wordCount: number,
 *   roadmap: string,
 *   coreBlocks: string,
 *   relevantSections: string,
 *   formattedContext: string
 * }}
 */
export function extractTargetedDoubtContext(fullNoteContent = '', question = '') {
  const content = typeof fullNoteContent === 'string' ? fullNoteContent.trim() : '';
  const words = content.split(/\s+/).filter(Boolean);

  // If the note is already short (< 600 words), bypass extraction and pass full note directly
  if (words.length < 600) {
    return {
      isShort: true,
      wordCount: words.length,
      roadmap: '',
      coreBlocks: '',
      relevantSections: content,
      formattedContext: `Full note content (your primary source of truth):\n---\n${content}\n---`,
    };
  }

  const sections = splitNoteIntoSections(content);
  if (sections.length <= 1) {
    return {
      isShort: true,
      wordCount: words.length,
      roadmap: '',
      coreBlocks: '',
      relevantSections: content,
      formattedContext: `Full note content (your primary source of truth):\n---\n${content}\n---`,
    };
  }

  const roadmap = extractOutlineSkeleton(content);
  const coreBlocks = extractCoreDefinitionsAndEquations(content);
  const relevantSections = selectTargetedSections(sections, question);

  const formattedContext =
    `Chapter Roadmap:\n${roadmap}\n\n` +
    `Core Definitions & Equations:\n${coreBlocks}\n\n` +
    `Relevant Section Content:\n${relevantSections}`;

  return {
    isShort: false,
    wordCount: words.length,
    roadmap,
    coreBlocks,
    relevantSections,
    formattedContext,
  };
}
