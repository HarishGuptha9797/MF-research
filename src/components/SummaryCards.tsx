import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Calendar, BarChart3, Info, X } from 'lucide-react';
import { AnalysisResults } from '../types';

interface SummaryCardsProps {
  results: AnalysisResults;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ results }) => {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const stats = [
    {
      label: 'CAGR',
      value: `${(results.cagr * 100).toFixed(2)}%`,
      icon: TrendingUp,
      color: results.cagr > 0 ? 'text-emerald-600' : 'text-rose-600',
      bgColor: results.cagr > 0 ? 'bg-emerald-50' : 'bg-rose-50',
      description: 'Compounded Annual Growth Rate',
      details: 'CAGR measures the mean annual growth rate of an investment over a specified period of time longer than one year, assuming reinvestment of profits at the end of each year.'
    },
    {
      label: 'Volatility',
      value: `${(results.stdDev * 100).toFixed(2)}%`,
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Annualized price stability',
      details: 'Volatility represents the annualized standard deviation of daily returns. Higher volatility means the investment price fluctuates wildly in a short period.'
    },
    {
      label: 'Max Drawdown',
      value: `-${(results.maxDrawdown * 100).toFixed(2)}%`,
      icon: TrendingDown,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      description: 'Peak to trough decline',
      details: 'Max Drawdown is the maximum observed loss from a historical peak to a subsequent trough. It indicates downside risk over the specified time period.'
    },
    {
      label: 'Sharpe Ratio',
      value: results.sharpeRatio.toFixed(2),
      icon: BarChart3,
      color: results.sharpeRatio >= 1 ? 'text-emerald-600' : 'text-amber-600',
      bgColor: results.sharpeRatio >= 1 ? 'bg-emerald-50' : 'bg-amber-50',
      description: 'Risk-adj returns (Rf=6.5%)',
      details: 'Sharpe ratio measures risk-adjusted return (using a 6.5% risk-free rate). A higher ratio indicates that the investment generated more return for every unit of risk taken.'
    },
    {
      label: 'Sortino Ratio',
      value: results.sortinoRatio.toFixed(2),
      icon: Activity,
      color: results.sortinoRatio >= 1 ? 'text-emerald-600' : 'text-amber-600',
      bgColor: results.sortinoRatio >= 1 ? 'bg-emerald-50' : 'bg-amber-50',
      description: 'Downside risk-adjusted',
      details: 'Sortino ratio is similar to Sharpe, but only penalizes downside volatility. It is useful for investors who are only concerned with downside risk rather than overall volatility.'
    },
    {
      label: 'Calmar / RoMD',
      value: results.romd.toFixed(2),
      icon: Calendar,
      color: results.romd >= 1 ? 'text-blue-600' : 'text-slate-600',
      bgColor: 'bg-blue-50',
      description: 'Return over Max Drawdown',
      details: 'Calmar Ratio (Return over Max Drawdown) compares the annualized return to the maximum drawdown. Higher values indicate better return relative to downside risk.'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className="relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-1.5 justify-end mb-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(activeTooltip === i ? null : i);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title={`What is ${stat.label}?`}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
              <h4 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h4>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 border-t border-slate-50 pt-2">{stat.description}</p>
          
          {activeTooltip === i && (
            <div 
              ref={tooltipRef}
              className="absolute z-10 bottom-full left-0 mb-2 w-full bg-slate-800 text-white p-4 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h6 className="font-bold text-sm text-emerald-400">{stat.label}</h6>
                <button 
                  onClick={() => setActiveTooltip(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {stat.details}
              </p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-b border-r border-slate-700 transform rotate-45"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
