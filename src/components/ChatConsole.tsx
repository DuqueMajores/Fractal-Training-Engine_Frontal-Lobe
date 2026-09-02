import React, { useState, useEffect, useRef } from 'react';
import { Send, ThumbsUp, ThumbsDown, AlertCircle, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HistoryEntry } from '../fractalEngine';
import { parseQATextFile } from '../utils/qaParser';

interface ChatConsoleProps {
  history: HistoryEntry[];
  onSendMessage: (text: string) => void;
  onApplyFeedback: (index: number, liked: boolean) => void;
  tokenExistsInMemory: (token: string) => boolean;
  tokenizeText: (text: string) => string[];
  onImportBatchQA?: (pairs: Array<{ q: string; a: string }>) => void;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  history,
  onSendMessage,
  onApplyFeedback,
  tokenExistsInMemory,
  tokenizeText,
  onImportBatchQA,
}) => {
  const [inputText, setInputText] = useState('');
  const [liveTokens, setLiveTokens] = useState<string[]>([]);
  const [showTeachTip, setShowTeachTip] = useState(false);
  const [learningFeedback, setLearningFeedback] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const pairs = parseQATextFile(content);
        if (pairs.length === 0) {
          alert("Não foi possível encontrar perguntas e respostas válidas no arquivo de texto. Certifique-se de que cada linha siga um padrão (ex: Pergunta | Resposta, ou alternando perguntas e respostas).");
          return;
        }
        if (onImportBatchQA) {
          onImportBatchQA(pairs);
          setLearningFeedback(`Processados ${pairs.length} novos registros do arquivo de texto!`);
          setTimeout(() => setLearningFeedback(null), 4000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (inputText.trim()) {
      setLiveTokens(tokenizeText(inputText));
    } else {
      setLiveTokens([]);
    }
  }, [inputText, tokenizeText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const isTeachPattern = /quando\s+eu\s+disser\s*:?\s*(.+?)\s*,\s*voc[eê]\s*(?:me\s*)?responde\s*:?\s*(.+)/i.test(inputText);
    
    onSendMessage(inputText);
    setInputText('');

    if (isTeachPattern) {
      setLearningFeedback("Atrator assimilado na rede.");
      setTimeout(() => setLearningFeedback(null), 3000);
    }
  };

  const handleFeedbackForEntry = (entryId: string, liked: boolean) => {
    const originalIndex = history.findIndex((h) => h.id === entryId);
    if (originalIndex !== -1) {
      onApplyFeedback(originalIndex, liked);
      setLearningFeedback(liked ? "Atração positiva reforçada." : "Pesos de atração deletados/reduzidos.");
      setTimeout(() => setLearningFeedback(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white/90 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden font-sans hover:border-sky-300 dark:hover:border-sky-500/40 transition-colors duration-300">
      {/* Console Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-300">
            Terminal de Conversa
          </span>
        </div>
        <button 
          onClick={() => setShowTeachTip(!showTeachTip)}
          className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 font-mono tracking-wider uppercase font-semibold transition-colors"
        >
          {showTeachTip ? '[Fechar Guia]' : '[Como Ensinar?]'}
        </button>
      </div>

      {/* Teaching tips panel */}
      <AnimatePresence>
        {showTeachTip && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/40"
          >
            <div className="p-4 text-xs text-slate-500 dark:text-slate-400 space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Fórmula de Associação Livre:</p>
                <p className="leading-relaxed">
                  Ensine novos termos digitando e enviando uma mensagem no padrão:
                </p>
                <code className="block p-2 rounded bg-slate-100/60 dark:bg-slate-900 font-mono text-[10px] text-sky-600 dark:text-sky-400">
                  quando eu disser: [Oi], você me responde: [Olá!]
                </code>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Definições e Explicações:</p>
                <p className="leading-relaxed">
                  Ensine o significado de conceitos usando a fórmula:
                </p>
                <code className="block p-2 rounded bg-slate-100/60 dark:bg-slate-900 font-mono text-[10px] text-sky-600 dark:text-sky-400">
                  [texto] = [Explicação] &nbsp;(Ex: Lobo Frontal = Córtex associativo funcional)
                </code>
                <p className="text-[9px] text-slate-400 leading-relaxed mt-1">
                  Ao consultar ("O que é [texto]?", "Me fale sobre [texto]", "Me explique o que é [texto]" ou apenas "[texto]"), o sistema responderá: <span className="font-medium text-slate-600 dark:text-slate-300 select-all">[Texto] significa [Explicação]</span>.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <AlertCircle className="h-5 w-5 stroke-[1.2] mb-1.5 text-sky-500 dark:text-sky-400" />
            <p className="text-xs">Nenhum diálogo ativo neste ciclo.</p>
            <p className="text-[10px] mt-0.5 opacity-70">Envie uma mensagem para iniciar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.slice().reverse().map((entry) => (
              <div key={entry.id} className="space-y-1">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 text-slate-800 dark:text-slate-200 text-xs border border-slate-200/30 dark:border-slate-700/20">
                    <p className="leading-relaxed">{entry.input}</p>
                  </div>
                </div>

                {/* Fractal Response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-800 dark:text-slate-200 text-xs border border-slate-200/60 dark:border-slate-800/80">
                    <p className="leading-relaxed">
                      {entry.response === 'up' || entry.response === 'Salvo' ? (
                        <span className="text-slate-400 italic text-xs font-mono">
                          Salvo
                        </span>
                      ) : (
                        entry.response
                      )}
                    </p>
                    
                    {/* Telemetry info */}
                    {entry.matchedTokens.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1 items-center">
                        {entry.matchedTokens.map((tok, i) => (
                          <span key={i} className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-1 py-0.2 rounded border border-slate-200/30 dark:border-slate-800/30">
                             {tok}
                          </span>
                        ))}
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-auto font-mono">
                          {Math.round(entry.confidence * 100)}% conf.
                        </span>
                      </div>
                    )}

                    {/* Inline Feedback buttons accompanied with response */}
                    {entry.response !== 'up' && entry.response !== 'Salvo' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100/60 dark:border-slate-800/40 flex items-center justify-between gap-3">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-medium">Avaliar resposta:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFeedbackForEntry(entry.id, true)}
                            className={`px-2 py-0.5 text-[9px] font-semibold rounded border transition-all cursor-pointer ${
                              entry.feedback === 'like'
                                ? 'bg-emerald-500 border-emerald-400 text-white font-bold'
                                : 'bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/85 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-500'
                            }`}
                          >
                            Correto
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedbackForEntry(entry.id, false)}
                            className={`px-2 py-0.5 text-[9px] font-semibold rounded border transition-all cursor-pointer ${
                              entry.feedback === 'dislike'
                                ? 'bg-rose-500 border-rose-400 text-white font-bold'
                                : 'bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/85 hover:border-rose-400 dark:hover:border-rose-500 hover:text-rose-500'
                            }`}
                          >
                            Incorreto
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Scroll anchor removed for direct container scrolling */}
          </div>
        )}
      </div>

      {/* Learning Status alert */}
      <AnimatePresence>
        {learningFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-5 my-2 p-1.5 rounded bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/40 text-center font-mono"
          >
            {learningFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input section with live token visualizer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 space-y-2">
        {liveTokens.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {liveTokens.map((tok, i) => {
              const active = tokenExistsInMemory(tok);
              return (
                <span
                  key={i}
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium border transition-colors ${
                    active
                      ? 'bg-sky-500 text-white border-sky-400 dark:bg-sky-600 dark:border-sky-500'
                      : 'bg-slate-100 text-slate-400 border-slate-200/40 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-800/20'
                  }`}
                >
                  {tok}
                </span>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Importar perguntas e respostas de arquivo de texto (.txt)"
            className="border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400 rounded-md px-3 flex items-center justify-center transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem ou ensine o robô..."
            className="flex-1 bg-slate-50/85 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/80 rounded-md px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500 focus:border-sky-300 dark:focus:border-sky-500"
          />
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700 rounded-md px-3.5 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

