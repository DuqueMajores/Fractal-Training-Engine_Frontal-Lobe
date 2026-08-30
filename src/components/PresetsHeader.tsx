import React, { useRef } from 'react';
import { Download, Upload, Trash2, Database, Save, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface PresetsHeaderProps {
  onClearMemory: () => void;
  onExportMemory: () => void;
  onImportMemory: (fileContent: string) => void;
  
  // New .pkl memory props
  pklStatus: 'loaded' | 'missing' | 'saving' | 'error';
  pklMessage: string;
  onUploadPkl: (file: File) => void;
  onSavePkl: () => void;
  onDeletePkl: () => void;
}

export const PresetsHeader: React.FC<PresetsHeaderProps> = ({
  onClearMemory,
  onExportMemory,
  onImportMemory,
  pklStatus,
  pklMessage,
  onUploadPkl,
  onSavePkl,
  onDeletePkl,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pklInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        onImportMemory(result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePklChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadPkl(file);
    e.target.value = '';
  };

  // Map pklStatus to specific visual styling
  const statusColors = {
    loaded: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-500'
    },
    missing: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-500'
    },
    saving: {
      bg: 'bg-sky-50 dark:bg-sky-950/20',
      border: 'border-sky-200 dark:border-sky-900/30',
      text: 'text-sky-700 dark:text-sky-400',
      badge: 'bg-sky-500 animate-pulse'
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-900/30',
      text: 'text-rose-700 dark:text-rose-400',
      badge: 'bg-rose-500'
    }
  };

  const currentStatus = statusColors[pklStatus] || statusColors.missing;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/90 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-lg p-6 space-y-5 hover:border-sky-300 dark:hover:border-sky-500/40 transition-colors duration-300"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Title and metadata */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-widest text-sky-500 dark:text-sky-400 font-mono uppercase">
              NÚCLEO FRACTAL V3.5
            </span>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-slate-800 dark:text-slate-100 font-sans">
            Lobo Frontal
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xl leading-relaxed font-sans">
            Treinamento autônomo de associação de palavras e pontuações por meio de atratores adaptativos.
          </p>
        </div>

        {/* Global Operations Block */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Fallback JSON input */}
          <input
            type="file"
            ref={jsonInputRef}
            onChange={handleJsonChange}
            accept=".json"
            className="hidden"
          />
          
          {/* Binary .pkl input */}
          <input
            type="file"
            ref={pklInputRef}
            onChange={handlePklChange}
            accept=".pkl"
            className="hidden"
          />

          <button
            onClick={() => pklInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/20 rounded transition-all cursor-pointer hover:border-sky-300 dark:hover:border-sky-500/50"
            title="Importar memória de um arquivo binário memória_fracta.pkl"
          >
            <Download className="h-3 w-3 stroke-[1.5]" /> Importar .pkl
          </button>
          
          <button
            onClick={onSavePkl}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 rounded transition-all cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500/50"
            title="Salvar alterações no arquivo memória_fracta.pkl do servidor"
          >
            <Save className="h-3 w-3 stroke-[1.5]" /> Salvar em .pkl
          </button>

          <a
            href="/api/download-pkl"
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border border-slate-200/60 dark:border-slate-800/80 rounded transition-all cursor-pointer hover:border-sky-300 dark:hover:border-sky-500/40"
            title="Baixar arquivo de memória atualizado no formato LoboFractalMemory-DDMMYY.pkl"
          >
            <Upload className="h-3 w-3 stroke-[1.5] text-sky-500 dark:text-sky-400" /> Exportar .pkl
          </a>

          <button
            onClick={onClearMemory}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-rose-500 hover:text-rose-600 border border-rose-200/40 dark:border-rose-950/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 rounded transition-colors cursor-pointer"
            title="Limpar memória ativa e deletar o arquivo memória_fracta.pkl"
          >
            <Trash2 className="h-3 w-3 stroke-[1.5]" /> Limpar Tudo
          </button>
        </div>
      </div>

      {/* Interactive .pkl Status Bar */}
      <div className={`p-3 rounded-md border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.text} flex items-center justify-between text-xs transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${currentStatus.badge}`} />
          <span className="font-medium font-mono">{pklMessage || 'Verificando memória no servidor...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 stroke-[1.5] opacity-80" />
        </div>
      </div>

    </motion.div>
  );
};
