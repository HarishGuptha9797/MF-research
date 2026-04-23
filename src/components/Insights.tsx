import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import { AnalysisResults } from '../types';

interface InsightsProps {
  results: AnalysisResults;
}

export const Insights: React.FC<InsightsProps> = ({ results }) => {
  const { pros, cons, riskLevel, conclusion } = results.insights;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h4 className="text-xl font-bold text-slate-800">Fund Insights</h4>
          <p className="text-slate-500 text-sm mt-1">Rule-based qualitative analysis</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
          riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-700' :
          riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700' :
          'bg-rose-50 text-rose-700'
        }`}>
          {riskLevel === 'High' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {riskLevel} Risk
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Pros
          </h5>
          <ul className="space-y-3">
            {pros.map((pro, i) => (
              <li key={i} className="text-slate-700 text-sm flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {pro}
              </li>
            ))}
            {pros.length === 0 && <li className="text-slate-400 text-sm">No significant highlights found.</li>}
          </ul>
        </div>

        <div className="space-y-4">
          <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" /> Concerns
          </h5>
          <ul className="space-y-3">
            {cons.map((con, i) => (
              <li key={i} className="text-slate-700 text-sm flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                {con}
              </li>
            ))}
            {cons.length === 0 && <li className="text-slate-400 text-sm">No major red flags detected.</li>}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl flex gap-4">
        <Info className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
        <div>
          <p className="text-sm font-bold text-slate-800">Conclusion</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{conclusion}</p>
        </div>
      </div>
    </div>
  );
};
