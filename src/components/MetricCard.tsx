import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-lg border border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-5 transition-all duration-200 hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-md hover:shadow-sky-100/10 dark:hover:shadow-none"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
            {title}
          </span>
          <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            {value}
          </h3>
        </div>
        <div className="text-sky-500 dark:text-sky-400 p-1">
          <Icon className="h-4.5 w-4.5 stroke-[1.5]" />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-sans">
        {description}
      </p>
    </motion.div>
  );
};

