export interface QAPair {
  q: string;
  a: string;
}

/**
 * Intelligent multi-format parser for Question/Answer text files.
 * Supports:
 * 1. Prefix format (P: pergunta, R: resposta / Q: question, A: answer)
 * 2. Delimited lines (using |, \t, =, ;; or :)
 * 3. Alternating lines (Odd lines = questions, Even lines = answers)
 */
export function parseQATextFile(content: string): QAPair[] {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));

  const pairs: QAPair[] = [];

  // Look for prefix format (e.g. "Q: ...", "A: ...")
  let hasPrefixes = false;
  const qPrefixes = ['q:', 'p:', 'pergunta:', 'question:', 'input:'];
  const aPrefixes = ['a:', 'r:', 'resposta:', 'answer:', 'output:'];

  let prefixMatchCount = 0;
  const sampleSize = Math.min(lines.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const lower = lines[i].toLowerCase();
    if (qPrefixes.some(p => lower.startsWith(p)) || aPrefixes.some(p => lower.startsWith(p))) {
      prefixMatchCount++;
    }
  }

  if (prefixMatchCount >= sampleSize * 0.3 && lines.length >= 2) {
    let currentQ = '';
    for (const line of lines) {
      const lower = line.toLowerCase();
      let isQ = false;
      let isA = false;
      let cleanLine = line;

      for (const p of qPrefixes) {
        if (lower.startsWith(p)) {
          isQ = true;
          cleanLine = line.substring(p.length).trim();
          break;
        }
      }

      if (!isQ) {
        for (const p of aPrefixes) {
          if (lower.startsWith(p)) {
            isA = true;
            cleanLine = line.substring(p.length).trim();
            break;
          }
        }
      }

      if (isQ) {
        currentQ = cleanLine;
      } else if (isA && currentQ) {
        pairs.push({ q: currentQ, a: cleanLine });
        currentQ = '';
      }
    }
    if (pairs.length > 0) return pairs;
  }

  // Look for delimiter formats: |, \t, =, ;;, or :
  const delimiterCounts = {
    pipe: 0,
    tab: 0,
    equal: 0,
    doubleSemicolon: 0,
    colon: 0
  };

  lines.forEach(line => {
    if (line.includes('|')) delimiterCounts.pipe++;
    if (line.includes('\t')) delimiterCounts.tab++;
    if (line.includes('=')) delimiterCounts.equal++;
    if (line.includes(';;')) delimiterCounts.doubleSemicolon++;
    if (line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 2 && parts[0].trim().length > 1 && parts[1].trim().length > 1) {
        delimiterCounts.colon++;
      }
    }
  });

  let selectedDelimiter = '';
  if (delimiterCounts.pipe > lines.length * 0.4) selectedDelimiter = '|';
  else if (delimiterCounts.tab > lines.length * 0.4) selectedDelimiter = '\t';
  else if (delimiterCounts.doubleSemicolon > lines.length * 0.4) selectedDelimiter = ';;';
  else if (delimiterCounts.equal > lines.length * 0.4) selectedDelimiter = '=';
  else if (delimiterCounts.colon > lines.length * 0.4) selectedDelimiter = ':';

  if (selectedDelimiter) {
    for (const line of lines) {
      const idx = line.indexOf(selectedDelimiter);
      if (idx !== -1) {
        const q = line.substring(0, idx).trim();
        const a = line.substring(idx + selectedDelimiter.length).trim();
        if (q && a) {
          pairs.push({ q, a });
        }
      }
    }
    if (pairs.length > 0) return pairs;
  }

  // Alternating lines fallback
  for (let i = 0; i < lines.length - 1; i += 2) {
    const q = lines[i].trim();
    const a = lines[i + 1].trim();
    if (q && a) {
      pairs.push({ q, a });
    }
  }

  return pairs;
}
