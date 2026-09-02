import { useState, useRef, useEffect, useCallback } from 'react';
import { DialogueFractalEngine } from './fractalEngine';
import { PresetsHeader } from './components/PresetsHeader';
import { MetricCard } from './components/MetricCard';
import { ChatConsole } from './components/ChatConsole';
import { ChartsPanel } from './components/ChartsPanel';
import { RulesManager, ConsolidatedRule } from './components/RulesManager';
import { Brain, Network, Activity, BarChart2, Sun, Moon } from 'lucide-react';

const compileRules = (engine: DialogueFractalEngine): ConsolidatedRule[] => {
  const list: ConsolidatedRule[] = [];

  Object.entries(engine.direct_pairs).forEach(([input, response]) => {
    const tokens = engine.tokenize(input);
    let avgWeight = 2.0;

    let weightSum = 0;
    let count = 0;
    tokens.forEach((tok) => {
      const candidates = engine.attractor_map[tok];
      if (candidates) {
        const match = candidates.find((c) => c.response === response);
        if (match) {
          weightSum += match.weight;
          count++;
        }
      }
    });

    if (count > 0) {
      avgWeight = weightSum / count;
    }

    list.push({
      id: `${input}-${response}`,
      input,
      response,
      weight: avgWeight,
      tokens,
    });
  });

  return list;
};

export default function App() {
  const engineRef = useRef(new DialogueFractalEngine());
  const [history, setHistory] = useState<any[]>([]);
  const [rulesList, setRulesList] = useState<ConsolidatedRule[]>([]);
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});
  const [transitions, setTransitions] = useState<Record<string, Record<string, number>>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [telemetry, setTelemetry] = useState({
    totalTokens: 0,
    totalAttractors: 0,
    avgWeight: 0,
    likes: 0,
    dislikes: 0,
    tokenFreqs: [] as Array<{ token: string; freq: number }>,
    uniqueTransitions: 0,
  });

  // Server-side .pkl status states
  const [pklStatus, setPklStatus] = useState<'loaded' | 'missing' | 'saving' | 'error'>('missing');
  const [pklMessage, setPklMessage] = useState<string>('Buscando memória no servidor...');

  const refreshState = useCallback(() => {
    const engine = engineRef.current;
    setHistory([...engine.history]);
    setRulesList(compileRules(engine));
    setFrequencies({ ...engine.input_fractal.frequencies });
    setTransitions({ ...engine.input_fractal.transitions });
    setTelemetry(engine.getTelemetryData());

    // Save current active state to localStorage as a lightweight cache
    try {
      localStorage.setItem('fractal_direct_pairs', JSON.stringify(engine.direct_pairs));
      localStorage.setItem('fractal_attractor_map', JSON.stringify(engine.attractor_map));
      localStorage.setItem('fractal_frequencies', JSON.stringify(engine.input_fractal.frequencies));
      localStorage.setItem('fractal_transitions', JSON.stringify(engine.input_fractal.transitions));
      localStorage.setItem('fractal_history', JSON.stringify(engine.history));
      localStorage.setItem('fractal_explanations', JSON.stringify(engine.explanations));
      localStorage.setItem('fractal_unknown_questions_count', String(engine.unknown_questions_count));
    } catch (e) {
      console.error('Failed to save active state to localStorage', e);
    }
  }, []);

  // Save the full current state to the server-side .pkl file
  const saveServerPkl = async () => {
    setPklStatus('saving');
    setPklMessage('Sincronizando com o servidor...');
    try {
      const engine = engineRef.current;
      const payload = {
        direct_pairs: engine.direct_pairs,
        attractor_map: engine.attractor_map,
        frequencies: engine.input_fractal.frequencies,
        transitions: engine.input_fractal.transitions,
        history: engine.history,
        explanations: engine.explanations,
        unknown_questions_count: engine.unknown_questions_count
      };
      
      const res = await fetch('/api/save-pkl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao salvar arquivo de memória no servidor');
      setPklStatus('loaded');
      setPklMessage('Memória salva e sincronizada em memória_fracta.pkl!');
    } catch (e: any) {
      setPklStatus('error');
      setPklMessage(e.message || 'Erro ao sincronizar .pkl');
    }
  };

  // Load state from server-side .pkl file
  const loadServerPkl = async () => {
    setPklStatus('saving');
    setPklMessage('Tentando carregar arquivo .pkl do servidor...');
    try {
      const res = await fetch('/api/load-pkl');
      if (!res.ok) {
        if (res.status === 404) {
          setPklStatus('missing');
          setPklMessage('Arquivo memória_fracta.pkl não encontrado no servidor. Usando dados locais temporários.');
          return false;
        }
        throw new Error('Erro ao conectar com o serviço do servidor');
      }
      
      const data = await res.json();
      const engine = engineRef.current;
      
      // Load standard engine parameters from parsed pickle dictionary
      engine.hydrate(data);
      
      setPklStatus('loaded');
      setPklMessage('Conectado à memória_fracta.pkl (Dados restaurados)');
      refreshState();
      return true;
    } catch (e: any) {
      setPklStatus('error');
      setPklMessage(e.message || 'Falha ao processar arquivo .pkl');
      return false;
    }
  };

  // Upload custom .pkl file and process it
  const handleUploadPkl = async (file: File) => {
    setPklStatus('saving');
    setPklMessage('Analisando e enviando arquivo .pkl...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('/api/upload-pkl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arrayBuffer
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao processar binário .pkl no servidor');
      }
      const result = await res.json();
      const engine = engineRef.current;
      const data = result.data;
      
      if (data) {
        engine.hydrate(data);
      }
      
      setPklStatus('loaded');
      setPklMessage('Memória memória_fracta.pkl importada e sintonizada com sucesso!');
      refreshState();
    } catch (e: any) {
      setPklStatus('error');
      setPklMessage(e.message || 'Falha ao subir arquivo .pkl');
    }
  };

  const handleDeletePkl = async () => {
    try {
      await fetch('/api/delete-pkl', { method: 'POST' });
      setPklStatus('missing');
      setPklMessage('Arquivo de memória .pkl excluído do servidor.');
    } catch (e) {
      console.error('Failed to delete .pkl from server', e);
    }
  };

  // Auto-init and load on mount
  useEffect(() => {
    const init = async () => {
      const loaded = await loadServerPkl();
      if (!loaded) {
        // Check if there is saved local state as fallback
        const savedDirect = localStorage.getItem('fractal_direct_pairs');
        const savedAttractor = localStorage.getItem('fractal_attractor_map');
        const savedFreqs = localStorage.getItem('fractal_frequencies');
        const savedTrans = localStorage.getItem('fractal_transitions');
        const savedHist = localStorage.getItem('fractal_history');
        const savedExplanations = localStorage.getItem('fractal_explanations');
        const savedUnknownQuestionsCount = localStorage.getItem('fractal_unknown_questions_count');

        if (savedDirect && savedAttractor) {
          try {
            const engine = engineRef.current;
            const payload = {
              direct_pairs: JSON.parse(savedDirect),
              attractor_map: JSON.parse(savedAttractor),
              frequencies: savedFreqs ? JSON.parse(savedFreqs) : undefined,
              transitions: savedTrans ? JSON.parse(savedTrans) : undefined,
              history: savedHist ? JSON.parse(savedHist) : undefined,
              explanations: savedExplanations ? JSON.parse(savedExplanations) : undefined,
              unknown_questions_count: savedUnknownQuestionsCount ? Number(savedUnknownQuestionsCount) : undefined
            };
            engine.hydrate(payload);
            
            setHistory([...engine.history]);
            setRulesList(compileRules(engine));
            setTelemetry(engine.getTelemetryData());
            return;
          } catch (e) {
            console.error('Error parsing local storage fallback', e);
          }
        }

        // Starts with completely blank active memory (0 nodes, 0 attractors) by default
        refreshState();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);



  const handleSendMessage = (text: string) => {
    const response = engineRef.current.processInput(text);
    refreshState();
    saveServerPkl();
    return response;
  };

  const handleApplyFeedback = (index: number, liked: boolean) => {
    engineRef.current.applyFeedback(index, liked);
    refreshState();
    saveServerPkl();
  };

  const handleUpdateRuleWeight = (input: string, response: string, weight: number) => {
    engineRef.current.updateRuleWeight(input, response, weight);
    refreshState();
    saveServerPkl();
  };

  const handleAddRule = (input: string, response: string) => {
    engineRef.current.addDialogueRule(input, response);
    refreshState();
    saveServerPkl();
  };

  const handleDeleteRule = (id: string) => {
    // id is `${input}-${response}`
    const engine = engineRef.current;
    const rule = rulesList.find((r) => r.id === id);
    if (!rule) return;

    // Delete from direct mapping
    delete engine.direct_pairs[rule.input];

    // Delete associated attractors
    rule.tokens.forEach((tok) => {
      const list = engine.attractor_map[tok];
      if (list) {
        engine.attractor_map[tok] = list.filter((c) => c.response !== rule.response);
        if (engine.attractor_map[tok].length === 0) {
          delete engine.attractor_map[tok];
        }
      }
    });

    refreshState();
    saveServerPkl();
  };

  const handleDeleteWord = (word: string) => {
    const engine = engineRef.current;
    if (engine.input_fractal.frequencies[word] !== undefined) {
      delete engine.input_fractal.frequencies[word];
    }
    if (engine.input_fractal.transitions[word] !== undefined) {
      delete engine.input_fractal.transitions[word];
    }
    Object.keys(engine.input_fractal.transitions).forEach((src) => {
      if (engine.input_fractal.transitions[src][word] !== undefined) {
        delete engine.input_fractal.transitions[src][word];
        if (Object.keys(engine.input_fractal.transitions[src]).length === 0) {
          delete engine.input_fractal.transitions[src];
        }
      }
    });
    if (engine.attractor_map[word] !== undefined) {
      delete engine.attractor_map[word];
    }
    refreshState();
    saveServerPkl();
  };

  const handleAddWord = (word: string, frequency: number) => {
    const engine = engineRef.current;
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return;
    engine.input_fractal.frequencies[cleanWord] = (engine.input_fractal.frequencies[cleanWord] || 0) + frequency;
    refreshState();
    saveServerPkl();
  };

  const handleClearMemory = () => {
    const engine = engineRef.current;
    engine.direct_pairs = {};
    engine.attractor_map = {};
    engine.input_fractal.frequencies = {};
    engine.input_fractal.transitions = {};
    engine.history = [];
    
    // Explicitly wipe local caches
    try {
      localStorage.removeItem('fractal_direct_pairs');
      localStorage.removeItem('fractal_attractor_map');
      localStorage.removeItem('fractal_frequencies');
      localStorage.removeItem('fractal_transitions');
      localStorage.removeItem('fractal_history');
      localStorage.removeItem('fractal_current_preset');
      localStorage.removeItem('fractal_preset_states');
    } catch (e) {
      console.error('Failed to clear localStorage', e);
    }

    refreshState();
    handleDeletePkl();
  };

  const handleExportMemory = () => {
    const backup = {
      direct_pairs: engineRef.current.direct_pairs,
      attractor_map: engineRef.current.attractor_map,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'memoria_fractal_dialogo.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportMemory = (fileContent: string) => {
    try {
      const parsed = JSON.parse(fileContent);
      if (parsed.direct_pairs && parsed.attractor_map) {
        const engine = engineRef.current;
        engine.direct_pairs = parsed.direct_pairs;
        engine.attractor_map = parsed.attractor_map;
        
        engine.input_fractal.frequencies = {};
        Object.keys(parsed.attractor_map).forEach((tok) => {
          engine.input_fractal.frequencies[tok] = 1;
        });

        refreshState();
        saveServerPkl();
      } else {
        alert('Formato de arquivo inválido. Certifique-se de carregar um JSON exportado do painel.');
      }
    } catch (e) {
      alert('Erro ao carregar o arquivo de backup. Verifique a integridade do JSON.');
    }
  };

  const handleImportBatchQA = (pairs: Array<{ q: string; a: string }>) => {
    const engine = engineRef.current;
    pairs.forEach((pair) => {
      engine.absorbAndPair(pair.q, pair.a);
    });
    refreshState();
    saveServerPkl();
  };

  const tokenExistsInMemory = (token: string): boolean => {
    return !!engineRef.current.attractor_map[token];
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        
        <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
          
          {/* Header Action bar with darkmode toggle */}
          <div className="flex justify-end">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-500/40 rounded-md text-xs font-semibold cursor-pointer transition-all hover:shadow-sm"
            >
              {darkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500 stroke-[1.5]" />
                  <span>Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-500 stroke-[1.5]" />
                  <span>Escuro</span>
                </>
              )}
            </button>
          </div>

          {/* Presets setup header card */}
          <PresetsHeader
            onClearMemory={handleClearMemory}
            onExportMemory={handleExportMemory}
            onImportMemory={handleImportMemory}
            
            pklStatus={pklStatus}
            pklMessage={pklMessage}
            onUploadPkl={handleUploadPkl}
            onSavePkl={saveServerPkl}
            onDeletePkl={handleDeletePkl}
          />

          {/* Metric telemetry bento cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Nós Ativos"
              value={telemetry.totalTokens}
              description="Nós isolados de palavras e pontuações indexados na memória ativa."
              icon={Brain}
            />
            <MetricCard
              title="Atratores"
              value={telemetry.totalAttractors}
              description="Associações de probabilidade conectando palavras a respostas."
              icon={Network}
            />
            <MetricCard
              title="Transições"
              value={telemetry.uniqueTransitions}
              description="Ramificações e sequenciamento de sintaxe gravados na matriz fractal."
              icon={Activity}
            />
            <MetricCard
              title="Peso Médio"
              value={telemetry.avgWeight.toFixed(1)}
              description="Força das associações ajustada por reforço corretivo."
              icon={BarChart2}
            />
          </div>

          {/* Mid section: Chat Terminal & Telemetry charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChatConsole
              history={history}
              onSendMessage={handleSendMessage}
              onApplyFeedback={handleApplyFeedback}
              tokenExistsInMemory={tokenExistsInMemory}
              tokenizeText={(t) => engineRef.current.tokenize(t)}
              onImportBatchQA={handleImportBatchQA}
            />

            <ChartsPanel
              history={history}
              tokenFreqs={telemetry.tokenFreqs}
            />
          </div>

          {/* Bottom section: Interactive rule weights editor */}
          <RulesManager
            rulesList={rulesList}
            onAddRule={handleAddRule}
            onUpdateRuleWeight={handleUpdateRuleWeight}
            onDeleteRule={handleDeleteRule}
            frequencies={frequencies}
            transitions={transitions}
            onDeleteWord={handleDeleteWord}
            onAddWord={handleAddWord}
          />

        </div>
      </div>
    </div>
  );
}
