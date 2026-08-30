import React, { useState, useMemo } from 'react';
import { Search, Sliders, Trash2, Plus, Info, FileText } from 'lucide-react';
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
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rulesList,
  onAddRule,
  onUpdateRuleWeight,
  onDeleteRule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rulesList;
    const query = searchQuery.toLowerCase();
    return rulesList.filter(
      (r) =>
        r.input.toLowerCase().includes(query) ||
        r.response.toLowerCase().includes(query)
    );
  }, [rulesList, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInput.trim() || !newResponse.trim()) return;

    onAddRule(newInput, newResponse);
    setNewInput('');
    setNewResponse('');
    setShowAddForm(false);
    setSuccessMsg('Regra consolidada.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="bg-white/90 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-lg flex flex-col h-[500px] overflow-hidden font-sans hover:border-sky-300 dark:hover:border-sky-500/40 transition-colors duration-300">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nós e Pesos ({rulesList.length})
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-800 rounded transition-all cursor-pointer hover:border-sky-300 dark:hover:border-sky-500/40 hover:bg-sky-50/10"
        >
          <Plus className="h-3 w-3 stroke-[1.5] text-sky-500" /> Regra
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
                    Usuário diz:
                  </label>
                  <input
                    type="text"
                    required
                    value={newInput}
                    onChange={(e) => setNewInput(e.target.value)}
                    placeholder="Ex: olá"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Resposta:
                  </label>
                  <input
                    type="text"
                    required
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder="Ex: Olá, como vai?"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700 text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-4 py-1.5 text-[10px] font-mono border-b border-slate-200/40 dark:border-slate-800/60 text-center">
          {successMsg}
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/20 flex items-center relative">
        <Search className="absolute left-6 h-3 w-3 text-sky-500 dark:text-sky-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtrar regras..."
          className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-md pl-8 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:focus:ring-sky-500 focus:border-sky-300 dark:focus:border-sky-500"
        />
      </div>

      {/* Data List Container */}
      <div className="flex-1 overflow-y-auto">
        {filteredRules.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <FileText className="h-5 w-5 stroke-[1.2] mb-1.5 text-sky-500 dark:text-sky-400" />
            <p className="text-xs">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 hover:bg-sky-50/15 dark:hover:bg-sky-950/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Rule textual content */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                      IF:
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {rule.input}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                      THEN:
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {rule.response}
                    </span>
                  </div>

                  {/* Token elements */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {rule.tokens.map((tok, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-mono bg-sky-50/40 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200/20 dark:border-sky-900/20 px-1 rounded"
                      >
                        {tok}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Weights control and Actions */}
                <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-1 w-24 sm:w-28">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-400 font-mono">PESO</span>
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
                      className="w-full accent-sky-500 dark:accent-sky-500 cursor-pointer h-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={() => onDeleteRule(rule.input)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helper Footer */}
      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5 stroke-[1.5]" />
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-sans">
          Valores atratores definem o peso associativo de cada token correspondente. Quanto maior o peso, maior a força de atração e chance de ativação da resposta.
        </p>
      </div>
    </div>
  );
};

