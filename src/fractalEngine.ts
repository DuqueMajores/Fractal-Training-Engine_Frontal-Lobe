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
  
  // Operational state
  last_input_tokens: string[] = [];
  last_response_text = "";
  history: HistoryEntry[] = [];
  
  constructor() {
    this.input_fractal = new FractalNode(0, 3);
    this.attractor_map = {};
    this.direct_pairs = {};
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

  applyFeedback(rating: number): string {
    if (this.last_input_tokens.length === 0 || !this.last_response_text) {
      return "up";
    }

    const keys = this.last_input_tokens;
    keys.forEach(key => {
      if (this.attractor_map[key]) {
        this.attractor_map[key] = this.attractor_map[key].map(candidate => {
          if (candidate.response === this.last_response_text) {
            const newWeight = rating > 0 ? candidate.weight * 1.5 : candidate.weight * 0.2;
            // Cap weights to reasonable bounds for stability
            return { ...candidate, weight: Math.min(Math.max(newWeight, 0.01), 100) };
          }
          return candidate;
        });
      }
    });

    // Update feedback in history for the last entry
    if (this.history.length > 0) {
      const lastEntry = this.history[0]; // history is unshifted (descending)
      if (lastEntry.response === this.last_response_text) {
        lastEntry.feedback = rating > 0 ? 'like' : 'dislike';
      }
    }

    return "Feedback aplicado!";
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

    // 1. Direct exact match (highest confidence)
    if (this.direct_pairs[normInput]) {
      const response = this.direct_pairs[normInput];
      const tokens = this.tokenize(userInput);
      this.last_input_tokens = tokens;
      this.last_response_text = response;
      
      const result = { response, matchedTokens: tokens, confidence: 1.0 };
      this.logHistory(userInput, response, tokens, 1.0);
      return result;
    }

    // 2. Token-based fractal attractor weight matching
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
      
      // Calculate a pseudo confidence percentage
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
  seedPreset(presetName: string) {
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
