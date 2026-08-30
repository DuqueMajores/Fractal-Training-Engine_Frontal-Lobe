import React, { useState, useMemo } from 'react';
import { Search, Sliders, Trash2, Plus, Info, FileText, Database, GitBranch, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ConsolidatedRule {
  id: string;
  input: string;
  response: string;
  weight: number;
  tokens: string[];
}

interface RulesManagerProps {
  rulesList: ConsolidatedRule[];
  onAddRule: (input: string, response: string) => void;
  onUpdateRuleWeight: (input: string, response: string, newWeight: number) => void;
  onDeleteRule: (input: string) => void;
  frequencies: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
  onDeleteWord: (word: string) => void;
  onAddWord: (word: string, frequency: number) => void;
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rulesList,
  onAddRule,
  onUpdateRuleWeight,
  onDeleteRule,
  frequencies = {},
  transitions = {},
  onDeleteWord,
  onAddWord,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'records'>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [wordSearchQuery, setWordSearchQuery] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for adding new recorded words
  const [showAddWordForm, setShowAddWordForm] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newWordFreq, setNewWordFreq] = useState(1);

  // Filter Rules
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rulesList;
    const query = searchQuery.toLowerCase();
    return rulesList.filter(
      (r) =>
        r.input.toLowerCase().includes(query) ||
        r.response.toLowerCase().includes(query)
    );
  }, [rulesList, searchQuery]);

  // Filter & Format Recorded Word List
  const wordRecords = useMemo(() => {
    return Object.entries(frequencies || {})
      .map(([word, freq]) => {
        const val = typeof freq === 'number' ? freq : 0;
        const transTo = transitions[word] ? Object.entries(transitions[word]) : [];
        return {
          word,
          frequency: val,
          transitions: transTo.map(([nextWord, count]) => ({
            nextWord,
            count: typeof count === 'number' ? count : 0
          })),
        };
      })
      .sort((a, b) => b.frequency - a.frequency);
  }, [frequencies, transitions]);

  const filteredWordRecords = useMemo(() => {
    if (!wordSearchQuery.trim()) return wordRecords;
    const query = wordSearchQuery.toLowerCase();
    return wordRecords.filter(
      (rec) =>
        rec.word.toLowerCase().includes(query) ||
        rec.transitions.some((t) => t.nextWord.toLowerCase().includes(query))
    );
  }, [wordRecords, wordSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInput.trim() || !newResponse.trim()) return;

    onAddRule(newInput, newResponse);
    setNewInput('');
    setNewResponse('');
    setShowAddForm(false);
    setSuccessMsg('Regra consolidada com sucesso.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-xl flex flex-col h-[520px] overflow-hidden font-sans shadow-sm hover:border-sky-300 dark:hover:border-sky-500/40 transition-colors duration-300">
      
      {/* Tab Navigators */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20 px-3 pt-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
            activeTab === 'rules'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold bg-white dark:bg-slate-900/40 rounded-t-lg border-t border-x border-slate-200/40 dark:border-slate-800/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Nós e Pesos ({rulesList.length})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
            activeTab === 'records'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold bg-white dark:bg-slate-900/40 rounded-t-lg border-t border-x border-slate-200/40 dark:border-slate-800/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Database className="h-3.5 w-3.5 text-emerald-500" />
          Palavras Gravadas ({wordRecords.length})
        </button>
      </div>

      {/* TAB CONTENT: RULES & WEIGHTS */}
      {activeTab === 'rules' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-white dark:bg-slate-900/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Gerenciador de Regras Ativas
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-800 rounded transition-all cursor-pointer hover:border-sky-300 dark:hover:border-sky-500/40 hover:bg-sky-50/10"
            >
              <Plus className="h-3 w-3 stroke-[2] text-sky-500" /> Nova Regra
            </button>
          </div>

          {/* Manual Input Rule Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200/40 dark:border-slate-800/60"
              >
                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">
                        Se o usuário disser:
                      </label>
                      <input
                        type="text"
                        required
                        value={newInput}
                        onChange={(e) => setNewInput(e.target.value)}
                        placeholder="Ex: tudo bem ?"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">
                        Responder com:
                      </label>
                      <input
                        type="text"
                        required
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        placeholder="Ex: Sim, tudo ótimo!"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
                    >
                      Salvar Regra
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Notification */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800/60 text-center flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" /> {successMsg}
            </div>
          )}

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/10 flex items-center relative">
            <Search className="absolute left-6 h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar regras por entrada ou resposta..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Data List Container */}
          <div className="flex-1 overflow-y-auto">
            {filteredRules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <FileText className="h-6 w-6 stroke-[1.2] mb-1.5 text-sky-400" />
                <p className="text-xs">Nenhuma regra ativa carregada ou correspondente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Rule textual content */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-sky-500 font-mono tracking-wider">ENTRADA:</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 select-all">
                          {rule.input}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-emerald-500 font-mono tracking-wider">RESPOSTA:</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 select-all">
                          {rule.response}
                        </span>
                      </div>

                      {/* Token elements */}
                      <div className="flex items-center gap-1 flex-wrap pt-1.5">
                        {rule.tokens.map((tok, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/20 px-1.5 py-0.5 rounded"
                          >
                            {tok}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Weights control and Actions */}
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800/60">
                      <div className="space-y-1 w-28 sm:w-32">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-400 font-bold font-mono">PESO ATRAÇÃO</span>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {rule.weight.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={rule.weight}
                          onChange={(e) =>
                            onUpdateRuleWeight(rule.input, rule.response, parseFloat(e.target.value))
                          }
                          className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                        />
                      </div>

                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all cursor-pointer"
                        title="Remover Regra"
                      >
                        <Trash2 className="h-4 w-4 stroke-[1.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RECORDED WORDS & CONTEXTS */}
      {activeTab === 'records' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-white dark:bg-slate-900/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              REGISTRO E FREQUÊNCIAS
            </span>
            <button
              onClick={() => setShowAddWordForm(!showAddWordForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800 rounded transition-all cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/10"
            >
              <Plus className="h-3 w-3 stroke-[2] text-emerald-500" /> Novo Registro
            </button>
          </div>

          {/* Form for Adding New Word Record */}
          <AnimatePresence>
            {showAddWordForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200/40 dark:border-slate-800/60"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newWord.trim()) return;
                    onAddWord(newWord.trim(), newWordFreq);
                    setNewWord('');
                    setNewWordFreq(1);
                    setShowAddWordForm(false);
                    setSuccessMsg('Palavra gravada registrada com sucesso.');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  className="p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">
                        Palavra / Token:
                      </label>
                      <input
                        type="text"
                        required
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="Ex: inteligencia"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">
                        Frequência Inicial:
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newWordFreq}
                        onChange={(e) => setNewWordFreq(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="1"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWordForm(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
                    >
                      Gravar Palavra
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Word Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/10 flex items-center relative">
            <Search className="absolute left-6 h-3.5 w-3.5 text-emerald-500" />
            <input
              type="text"
              value={wordSearchQuery}
              onChange={(e) => setWordSearchQuery(e.target.value)}
              placeholder="Pesquisar nó gravado ou palavra de conexão..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Recorded word records */}
          <div className="flex-1 overflow-y-auto">
            {filteredWordRecords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <Database className="h-6 w-6 stroke-[1.2] mb-1.5 text-emerald-400" />
                <p className="text-xs">Nenhuma palavra gravada encontrada no arquivo atual.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
                {filteredWordRecords.map((rec) => (
                  <div
                    key={rec.word}
                    className="p-4 hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Word Node Information */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono border border-slate-200/40 dark:border-slate-700/40">
                          {rec.word}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          Frequência: <span className="text-emerald-500 dark:text-emerald-400 font-bold">{rec.frequency}</span>
                        </span>
                      </div>

                      {/* Transition paths */}
                      {rec.transitions.length > 0 ? (
                        <div className="flex items-start gap-1.5 pt-1">
                          <GitBranch className="h-3 w-3 text-sky-500 shrink-0 mt-0.5" />
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] text-slate-400 font-bold font-mono">SE CONECTA COM:</span>
                            {rec.transitions.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] bg-sky-50/50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100/40 dark:border-sky-900/15 px-1.5 py-0.5 rounded font-mono"
                              >
                                {t.nextWord} ({t.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic font-mono">
                          Nenhum nó de transição subsequente gravado.
                        </div>
                      )}
                    </div>

                    {/* Word actions */}
                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        onClick={() => onDeleteWord(rec.word)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all cursor-pointer"
                        title="Prunar Palavra"
                      >
                        <Trash2 className="h-4 w-4 stroke-[1.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper Footer */}
      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5 stroke-[1.5]" />
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-sans">
          {activeTab === 'rules'
            ? 'Aba de arquivo para ajustar pesos atratores. Valores maiores aumentam a chance de ativação da resposta para os tokens correspondentes.'
            : 'Frequências e transições do Lobo Frontal representadas pelos tokens isolados de entrada gravados no arquivo de memória atual.'}
        </p>
      </div>
    </div>
  );
};
