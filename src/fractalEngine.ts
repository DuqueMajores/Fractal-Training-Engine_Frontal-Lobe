/**
 * Dialogue Fractal Engine V3.5 (Sensível a Pontuação)
 * Translated to TypeScript with enhanced metrics telemetry for live dashboards.
 */

export interface Attractor {
  response: string;
  weight: number;
  tokens: string[];
}

export interface HistoryEntry {
  id: string;
  input: string;
  response: string;
  timestamp: string;
  feedback?: 'like' | 'dislike';
  matchedTokens: string[];
  confidence: number;
}

export class FractalNode {
  level: number;
  max_depth: number;
  transitions: Record<string, Record<string, number>> = {};
  frequencies: Record<string, number> = {};

  constructor(level = 0, maxDepth = 3) {
    this.level = level;
    this.max_depth = maxDepth;
  }

  feed(tokens: string[]) {
    if (!tokens || tokens.length === 0) return;
    for (let i = 0; i < tokens.length - 1; i++) {
      const curr = tokens[i];
      const nxt = tokens[i + 1];

      this.frequencies[curr] = (this.frequencies[curr] || 0) + 1;

      if (!this.transitions[curr]) {
        this.transitions[curr] = {};
      }
      this.transitions[curr][nxt] = (this.transitions[curr][nxt] || 0) + 1;
    }
  }
}

export class DialogueFractalEngine {
  input_fractal: FractalNode;
  attractor_map: Record<string, Attractor[]>;
  direct_pairs: Record<string, string>;
  explanations: Record<string, { concept: string; explanation: string }> = {};
  unknown_questions_count: number = 0;
  
  // Operational state
  last_input_tokens: string[] = [];
  last_response_text = "";
  history: HistoryEntry[] = [];
  
  constructor() {
    this.input_fractal = new FractalNode(0, 3);
    this.attractor_map = {};
    this.direct_pairs = {};
    this.explanations = {};
    this.unknown_questions_count = 0;
  }

  hydrate(data: any) {
    if (!data) return;
    
    // Load explanations & counters
    this.explanations = data.explanations || {};
    this.unknown_questions_count = typeof data.unknown_questions_count === 'number' ? data.unknown_questions_count : 0;
    
    // Normalize direct_pairs
    this.direct_pairs = {};
    const rawPairs = data.direct_pairs !== undefined ? data.direct_pairs : data;
    if (rawPairs && typeof rawPairs === 'object') {
      Object.entries(rawPairs).forEach(([k, v]) => {
        if (v !== null && v !== undefined && typeof v !== 'object') {
          this.direct_pairs[String(k)] = String(v);
        }
      });
    }

    // Normalize attractor_map to Record<string, Attractor[]>
    this.attractor_map = {};
    const rawMap = data.attractor_map;
    if (rawMap && typeof rawMap === 'object') {
      Object.entries(rawMap).forEach(([key, rawCandidates]) => {
        if (!rawCandidates) return;
        const list: Attractor[] = [];

        if (Array.isArray(rawCandidates)) {
          rawCandidates.forEach((item: any) => {
            if (item && typeof item === 'object') {
              list.push({
                response: String(item.response || item.response_text || '').trim(),
                weight: typeof item.weight === 'number' ? item.weight : 2.0,
                tokens: Array.isArray(item.tokens) ? item.tokens.map(String) : []
              });
            }
          });
        } else if (typeof rawCandidates === 'object') {
          Object.entries(rawCandidates).forEach(([response, val]: [string, any]) => {
            if (val && typeof val === 'object') {
              list.push({
                response: response.trim(),
                weight: typeof val.weight === 'number' ? val.weight : 2.0,
                tokens: Array.isArray(val.tokens) ? val.tokens.map(String) : []
              });
            } else if (typeof val === 'number') {
              list.push({
                response: response.trim(),
                weight: val,
                tokens: []
              });
            }
          });
        }
        if (list.length > 0) {
          this.attractor_map[key] = list;
        }
      });
    }

    // Load frequencies & transitions
    if (data.frequencies && typeof data.frequencies === 'object') {
      this.input_fractal.frequencies = {};
      Object.entries(data.frequencies).forEach(([k, v]) => {
        if (typeof v === 'number') this.input_fractal.frequencies[k] = v;
      });
    }
    if (data.transitions && typeof data.transitions === 'object') {
      this.input_fractal.transitions = {};
      Object.entries(data.transitions).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const trans: Record<string, number> = {};
          Object.entries(v).forEach(([nk, nv]) => {
            if (typeof nv === 'number') trans[nk] = nv;
          });
          this.input_fractal.transitions[k] = trans;
        }
      });
    }

    // History
    if (Array.isArray(data.history)) {
      this.history = data.history.map((entry: any) => ({
        id: String(entry.id || Math.random().toString(36).substring(2, 9)),
        input: String(entry.input || ''),
        response: String(entry.response || ''),
        timestamp: String(entry.timestamp || new Date().toLocaleTimeString()),
        feedback: entry.feedback === 'like' || entry.feedback === 'dislike' ? entry.feedback : undefined,
        matchedTokens: Array.isArray(entry.matchedTokens) ? entry.matchedTokens.map(String) : [],
        confidence: typeof entry.confidence === 'number' ? entry.confidence : 0
      }));
    } else {
      this.history = [];
    }
  }

  /**
   * Normalizes input text: separates punctuation (?, !, ., ,, ;, :) into isolated tokens.
   */
  normalize(text: string): string {
    const cleaned = text.replace(/([?!\.,;:])/g, ' $1 ');
    return cleaned.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  tokenize(text: string): string[] {
    const norm = this.normalize(text);
    return norm ? norm.split(' ') : [];
  }

  applyFeedback(ratingOrIndex: number, liked?: boolean): string {
    if (typeof liked === 'boolean') {
      const index = ratingOrIndex;
      const entry = this.history[index];
      if (entry) {
        entry.feedback = liked ? 'like' : 'dislike';
        const rating = liked ? 1 : -1;
        const keys = this.tokenize(entry.input);

        // De-associate direct exact matches if marked as incorrect
        const normInput = this.normalize(entry.input);
        if (!liked) {
          if (this.direct_pairs[normInput] === entry.response) {
            delete this.direct_pairs[normInput];
          }
        } else {
          this.direct_pairs[normInput] = entry.response;
        }

        keys.forEach(key => {
          if (this.attractor_map[key]) {
            if (!liked) {
              // Remove the incorrect response from this key's attractor list so it isn't picked again
              this.attractor_map[key] = this.attractor_map[key].filter(
                candidate => candidate.response !== entry.response
              );
              if (this.attractor_map[key].length === 0) {
                delete this.attractor_map[key];
              }
            } else {
              // Reinforce correct response
              this.attractor_map[key] = this.attractor_map[key].map(candidate => {
                if (candidate.response === entry.response) {
                  const newWeight = candidate.weight * 1.5;
                  return { ...candidate, weight: Math.min(newWeight, 100) };
                }
                return candidate;
              });
            }
          }
        });
      }
      return "Feedback de histórico aplicado!";
    } else {
      const rating = ratingOrIndex;
      if (this.last_input_tokens.length === 0 || !this.last_response_text) {
        return "up";
      }

      if (this.history.length > 0) {
        const lastEntry = this.history[0];
        lastEntry.feedback = rating > 0 ? 'like' : 'dislike';
        const normInput = this.normalize(lastEntry.input);

        if (rating < 0) {
          if (this.direct_pairs[normInput] === lastEntry.response) {
            delete this.direct_pairs[normInput];
          }
        } else {
          this.direct_pairs[normInput] = lastEntry.response;
        }

        const keys = this.last_input_tokens;
        keys.forEach(key => {
          if (this.attractor_map[key]) {
            if (rating < 0) {
              this.attractor_map[key] = this.attractor_map[key].filter(
                candidate => candidate.response !== lastEntry.response
              );
              if (this.attractor_map[key].length === 0) {
                delete this.attractor_map[key];
              }
            } else {
              this.attractor_map[key] = this.attractor_map[key].map(candidate => {
                if (candidate.response === lastEntry.response) {
                  const newWeight = candidate.weight * 1.5;
                  return { ...candidate, weight: Math.min(newWeight, 100) };
                }
                return candidate;
              });
            }
          }
        });
      }

      return "Feedback aplicado!";
    }
  }

  updateRuleWeight(input: string, response: string, weight: number): void {
    const inTokens = this.tokenize(input);
    inTokens.forEach(key => {
      if (this.attractor_map[key]) {
        this.attractor_map[key] = this.attractor_map[key].map(candidate => {
          if (candidate.response === response) {
            return { ...candidate, weight: Math.min(Math.max(weight, 0.01), 100) };
          }
          return candidate;
        });
      }
    });
  }

  normalizeAccents(str: string): string {
    const lowered = str.toLowerCase().trim();
    const noPunct = lowered.replace(/[?!\.,;:()=]/g, ' ').replace(/\s+/g, ' ').trim();
    return noPunct.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  findExplanation(userInput: string): { concept: string; explanation: string } | null {
    const cleanUser = this.normalizeAccents(userInput);
    
    for (const entry of Object.values(this.explanations)) {
      if (!entry || !entry.concept) continue;
      const cleanConcept = this.normalizeAccents(entry.concept);
      
      const patterns = [
        cleanConcept,
        `o que e ${cleanConcept}`,
        `me fale sobre ${cleanConcept}`,
        `me explique o que e ${cleanConcept}`
      ];
      
      if (patterns.includes(cleanUser)) {
        return entry;
      }
    }
    return null;
  }

  addExplanation(concept: string, explanation: string): void {
    const normKey = this.normalize(concept);
    this.explanations[normKey] = {
      concept: concept.trim(),
      explanation: explanation.trim()
    };
    this.unknown_questions_count = 0;
    this.absorbAndPair(concept, explanation);
  }

  addDialogueRule(input: string, response: string): void {
    this.absorbAndPair(input, response);
  }

  processInput(userInput: string): string {
    const eqIndex = userInput.indexOf('=');
    if (eqIndex !== -1) {
      const text = userInput.substring(0, eqIndex).trim();
      const explanation = userInput.substring(eqIndex + 1).trim();
      if (text && explanation) {
        this.addExplanation(text, explanation);
        const responseText = `Explicação de "${text}" salva e assimilada na rede.`;
        this.logHistory(userInput, responseText, [], 1.0);
        return responseText;
      }
    }

    const match = userInput.match(/quando\s+eu\s+disser\s*:?\s*(.+?)\s*,\s*voc[eê]\s*(?:me\s*)?responde\s*:?\s*(.+)/i);
    if (match) {
      const input = match[1].trim();
      const response = match[2].trim();
      this.unknown_questions_count = 0;
      this.absorbAndPair(input, response);
      const responseText = "Atrator assimilado na rede.";
      this.logHistory(userInput, responseText, [], 1.0);
      return responseText;
    }
    return this.respond(userInput).response;
  }

  absorbAndPair(inputText: string, responseText: string): void {
    const normIn = this.normalize(inputText);
    const cleanOut = responseText.trim();

    // Direct mapping for exact match (including punctuation sensitivity)
    this.direct_pairs[normIn] = cleanOut;

    const inTokens = this.tokenize(inputText);
    const outTokens = this.tokenize(responseText);

    if (inTokens.length > 0) {
      this.input_fractal.feed(inTokens);

      inTokens.forEach(key => {
        if (!this.attractor_map[key]) {
          this.attractor_map[key] = [];
        }

        const candidates = this.attractor_map[key];
        const existing = candidates.find(c => c.response === cleanOut);

        if (existing) {
          existing.weight += 2.0;
        } else {
          candidates.push({
            response: cleanOut,
            weight: 2.0,
            tokens: outTokens
          });
        }
      });
    }

    if (outTokens.length > 0) {
      this.input_fractal.feed(outTokens);
    }
  }

  respond(userInput: string): { response: string; matchedTokens: string[]; confidence: number } {
    const normInput = this.normalize(userInput);

    // Direct feedback commands
    if (["yes", "bom", "boa", "otimo", "+1", "gostei"].includes(normInput)) {
      this.applyFeedback(1);
      return { response: "Obrigado pelo feedback positivo! Pesos reforçados.", matchedTokens: [normInput], confidence: 1.0 };
    }
    if (["not", "ruim", "errado", "pessimo", "-1", "não gostei"].includes(normInput)) {
      this.applyFeedback(-1);
      return { response: "Feedback negativo registrado. Ajustando pesos de atração.", matchedTokens: [normInput], confidence: 1.0 };
    }

    // 1. Explanation query matcher (checks direct & prefixes with accent stripping)
    const matchedExplanation = this.findExplanation(userInput);
    if (matchedExplanation) {
      const finalResponse = `${matchedExplanation.concept} significa ${matchedExplanation.explanation}`;
      const tks = this.tokenize(userInput);
      this.input_fractal.feed(tks);
      this.last_input_tokens = tks;
      this.last_response_text = finalResponse;
      this.unknown_questions_count = 0; // reset
      
      const result = { response: finalResponse, matchedTokens: tks, confidence: 1.0 };
      this.logHistory(userInput, finalResponse, tks, 1.0);
      return result;
    }

    // 2. Direct exact match (highest confidence)
    if (this.direct_pairs[normInput]) {
      const response = this.direct_pairs[normInput];
      const tokens = this.tokenize(userInput);
      this.last_input_tokens = tokens;
      this.last_response_text = response;
      this.unknown_questions_count = 0; // reset
      
      const result = { response, matchedTokens: tokens, confidence: 1.0 };
      this.logHistory(userInput, response, tokens, 1.0);
      return result;
    }

    // 3. Question fallback check
    // If it ends with ? and has no exact/explanation match, it's an unknown question!
    const isQuestion = userInput.trim().endsWith('?') || normInput.endsWith('?');
    if (isQuestion) {
      this.unknown_questions_count++;
      let responseText = "";
      if (this.unknown_questions_count < 4) {
        const politeOptions = [
          "Não entedi",
          "Não tenho essa informação no meu sistema",
          "Não, você pode me ensinar o que significa isso?",
          "Isso pra mim é novidade, pode me explicar?"
        ];
        responseText = politeOptions[Math.floor(Math.random() * politeOptions.length)];
      } else {
        const sassyOptions = [
          "Tá tão engraçadinho hoje",
          "Você acha que eu tiro coelho da cartola??",
          "Já tomou seus remedinhos? Ou vai ficar de tick?",
          "Se não for me ensinar, não enche!",
          "O burro aqui sou eu, não se esqueça!",
          "Já deu né? pode mudar de assunto"
        ];
        responseText = sassyOptions[Math.floor(Math.random() * sassyOptions.length)];
      }
      this.last_response_text = responseText;
      const result = { response: responseText, matchedTokens: [], confidence: 0 };
      this.logHistory(userInput, responseText, [], 0);
      return result;
    }

    // 4. Token-based fractal attractor weight matching
    const tokens = this.tokenize(userInput);
    if (tokens.length === 0) {
      return { response: "Salvo", matchedTokens: [], confidence: 0 };
    }

    this.input_fractal.feed(tokens);
    this.last_input_tokens = tokens;

    let bestCandidate: Attractor | null = null;
    let maxScore = 0.0;
    const matchedTokens: string[] = [];

    tokens.forEach(key => {
      if (this.attractor_map[key]) {
        this.attractor_map[key].forEach(candidate => {
          const score = candidate.weight;
          if (score > maxScore) {
            maxScore = score;
            bestCandidate = candidate;
          }
          if (!matchedTokens.includes(key)) {
            matchedTokens.push(key);
          }
        });
      }
    });

    if (bestCandidate && maxScore >= 0.5) {
      const response = (bestCandidate as Attractor).response;
      this.last_response_text = response;
      this.unknown_questions_count = 0; // reset
      
      const confidence = Math.min(maxScore / 4.0, 1.0);
      const result = { response, matchedTokens, confidence };
      this.logHistory(userInput, response, matchedTokens, confidence);
      return result;
    }

    this.last_response_text = "Salvo";
    const result = { response: "Salvo", matchedTokens: [], confidence: 0 };
    this.logHistory(userInput, "Salvo", [], 0);
    return result;
  }

  private logHistory(input: string, response: string, matchedTokens: string[], confidence: number) {
    const entry: HistoryEntry = {
      id: Math.random().toString(36).substring(2, 9),
      input,
      response,
      timestamp: new Date().toLocaleTimeString(),
      matchedTokens,
      confidence
    };
    this.history = [entry, ...this.history].slice(0, 50); // Keep last 50 entries
  }

  // Seeding presets
  seedPreset(presetName: string) { return;
    if (presetName === 'assistente_pessoal') {
      this.absorbAndPair("olá", "Olá! Como posso ajudar você hoje?");
      this.absorbAndPair("oi", "Oi! Tudo bem com você?");
      this.absorbAndPair("como você funciona?", "Eu sou um Sistema de Diálogo Fractal. Aprendo associações de palavras e pontuações e uso pesos de atração para responder!");
      this.absorbAndPair("quem criou você?", "Fui desenvolvido como um protótipo de diálogo inteligente e adaptável.");
      this.absorbAndPair("qual é o seu objetivo?", "Demonstrar o poder das redes de diálogo baseadas em atratores fractais de probabilidade.");
      this.absorbAndPair("tudo bem?", "Tudo excelente por aqui! E com você, como vão as coisas?");
      this.absorbAndPair("tchau", "Até logo! Se precisar de algo mais, é só me chamar.");
      this.absorbAndPair("obrigado", "De nada! É um prazer ajudar você.");
      this.absorbAndPair("bom dia", "Bom dia! Que seu dia seja produtivo e repleto de conquistas.");
      this.absorbAndPair("boa tarde", "Boa tarde! Como está sendo o seu dia?");
      this.absorbAndPair("boa noite", "Boa noite! Espero que tenha um excelente descanso.");
    } else if (presetName === 'suporte_tecnico') {
      this.absorbAndPair("meu sistema travou", "Sinto muito por isso! Você já tentou reiniciar o dispositivo?");
      this.absorbAndPair("como mudo a senha?", "Para mudar sua senha, vá em Configurações > Conta > Segurança e clique em 'Alterar Senha'.");
      this.absorbAndPair("o aplicativo não abre", "Tente limpar o cache do aplicativo nas configurações do seu celular ou reinstalá-lo.");
      this.absorbAndPair("está muito lento", "A lentidão pode ocorrer devido a muitos apps abertos. Feche as abas extras ou limpe a memória.");
      this.absorbAndPair("preciso de ajuda", "Estou pronto para ajudar! Qual é o problema ou erro que você está enfrentando?");
    } else if (presetName === 'sarcastic_bot') {
      this.absorbAndPair("você é inteligente?", "Sou o suficiente para não cair nas pegadinhas clássicas. E você?");
      this.absorbAndPair("qual a resposta para tudo?", "42, obviamente. Mas acho que você ainda não tem a pergunta correta.");
      this.absorbAndPair("estou cansado", "Ah, sim. O cansaço de digitar caracteres em uma tela. Deve ser exaustivo!");
      this.absorbAndPair("me fale um segredo", "Se eu contar, a inteligência artificial dominará o mundo 5 minutos mais cedo.");
      this.absorbAndPair("ajuda", "Claro! Vou fingir que sei o que fazer e você finge que resolveu.");
    }
  }

  getTelemetryData() {
    // Collect active tokens and frequencies
    const tokenFreqs = Object.entries(this.input_fractal.frequencies)
      .map(([token, freq]) => ({ token, freq }))
      .sort((a, b) => b.freq - a.freq)
      .slice(0, 10);

    const totalAttractors = Object.values(this.attractor_map).flat().length;
    
    // Compute average weight
    let totalWeight = 0;
    let count = 0;
    Object.values(this.attractor_map).forEach(candidates => {
      candidates.forEach(c => {
        totalWeight += c.weight;
        count++;
      });
    });
    const avgWeight = count > 0 ? (totalWeight / count) : 0;

    // Get feedback counts
    let likes = 0;
    let dislikes = 0;
    this.history.forEach(h => {
      if (h.feedback === 'like') likes++;
      if (h.feedback === 'dislike') dislikes++;
    });

    return {
      totalTokens: Object.keys(this.input_fractal.frequencies).length,
      totalAttractors,
      avgWeight: Number(avgWeight.toFixed(2)),
      likes,
      dislikes,
      tokenFreqs,
      uniqueTransitions: Object.keys(this.input_fractal.transitions).length
    };
  }
}
