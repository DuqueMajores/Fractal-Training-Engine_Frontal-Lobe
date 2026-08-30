import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { HistoryEntry } from '../fractalEngine';

interface ChartsPanelProps {
  history: HistoryEntry[];
  tokenFreqs: Array<{ token: string; freq: number }>;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  history,
  tokenFreqs,
}) => {
  const confidenceData = history
    .slice()
    .reverse()
    .map((item, index) => ({
      turn: `T-${history.length - 1 - index}`,
      confiança: Math.round(item.confidence * 100),
      label: item.input.length > 15 ? `${item.input.substring(0, 15)}...` : item.input,
    }))
    .slice(-12);

  const emptyConfidenceData = Array.from({ length: 6 }).map((_, i) => ({
    turn: `T-${i}`,
    confiança: 0,
    label: 'Aguardando dados',
  }));

  const barData = tokenFreqs.map((item) => ({
    name: item.token === ' ' ? '[espaço]' : item.token,
    frequência: item.freq,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Chart 1: Real-Time Confidence Wave */}
      <div className="bg-white/90 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 flex flex-col h-[300px] hover:border-sky-300 dark:hover:border-sky-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400 font-mono">
            Ativação de Atratores
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Tempo Real
          </span>
        </div>

        <div className="flex-1 w-full min-h-0 text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={confidenceData.length > 0 ? confidenceData : emptyConfidenceData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
              <XAxis dataKey="turn" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 dark:bg-slate-950 text-white p-2.5 rounded border border-slate-800 shadow-lg text-[10px] font-mono">
                        <p className="opacity-75">"{data.label}"</p>
                        <p className="font-semibold mt-1">
                          Confiança: {payload[0].value}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="confiança"
                stroke="#0ea5e9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConfidence)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Memory Nodes Frequency (Tokens) */}
      <div className="bg-white/90 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 flex flex-col h-[300px] hover:border-sky-300 dark:hover:border-sky-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400 font-mono">
            Nós de Memória (Frequência)
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Densidade
          </span>
        </div>

        <div className="flex-1 w-full min-h-0 text-xs">
          {barData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-mono text-[10px]">
              Aguardando novas mensagens...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.04)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 dark:bg-slate-950 text-white px-2.5 py-1.5 rounded border border-slate-800 shadow-md font-mono text-[10px]">
                          <span>Token:</span> "{payload[0].name}"
                          <br />
                          <span>Frequência: {payload[0].value}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="frequência" fill="#38bdf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

