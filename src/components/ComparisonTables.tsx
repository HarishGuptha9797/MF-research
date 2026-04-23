import React from 'react';
import { AnalysisResults } from '../types';

interface ComparisonTablesProps {
  results: AnalysisResults;
}

export const ComparisonTables: React.FC<ComparisonTablesProps> = ({ results }) => {
  return (
    <div className="space-y-8">
      {/* SEBI Notice */}
      {results.preSebiAvg !== undefined && results.postSebiAvg !== undefined && (
        <div className="bg-amber-50/50 border-l-4 border-amber-500 p-5 rounded-r-2xl">
          <h4 className="flex items-center text-amber-800 font-black text-sm uppercase tracking-widest mb-2">
            <span className="mr-2">⚠️</span> SEBI Reclassification (June 2018)
          </h4>
          <p className="text-amber-900/80 text-sm font-medium leading-relaxed mb-3 max-w-4xl">
            Pre-2018 funds had no binding cap on large/mid/small-cap holdings. Post-2018, strict SEC/SEBI category definitions apply.
          </p>
          <div className="flex gap-6 items-baseline">
            <div>
              <span className="text-amber-600 font-bold text-xs uppercase tracking-wider block mb-1">Pre-2018 Avg</span>
              <span className="text-amber-700 font-black text-xl">{results.preSebiAvg > 0 ? '+' : ''}{results.preSebiAvg.toFixed(2)}%</span>
            </div>
            <div className="text-amber-300 font-light text-2xl">→</div>
            <div>
              <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider block mb-1">Post-2018 Avg</span>
              <span className="text-emerald-800 font-black text-xl">{results.postSebiAvg > 0 ? '+' : ''}{results.postSebiAvg.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Rolling Returns Summary */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-slate-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Rolling Returns Analysis</h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Hold Period Performance Distribution</p>
          </div>
          <div className="hidden md:block">
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded uppercase tracking-[0.1em]">CAGR @ 365.25</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-[0.1em] border-b border-slate-100 italic">
                <th colSpan={6}></th>
                <th colSpan={4} className="text-center pb-2 border-l border-slate-50">Historical Distribution (Buckets)</th>
                <th></th>
              </tr>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-black text-[10px] bg-slate-50/50">Period</th>
                <th className="py-3 px-4 font-black">Avg</th>
                <th className="py-3 px-4 font-black">Median</th>
                <th className="py-3 px-4 font-black">Std Dev</th>
                <th className="py-3 px-4 font-black">Best</th>
                <th className="py-3 px-4 font-black">Worst</th>
                <th className="py-3 px-4 font-black text-center border-l border-slate-100 text-emerald-600">{'>20%'}</th>
                <th className="py-3 px-4 font-black text-center text-emerald-500">10–20%</th>
                <th className="py-3 px-4 font-black text-center text-slate-400">0–10%</th>
                <th className="py-3 px-4 font-black text-center text-rose-500">Negative</th>
                <th className="py-3 px-4 font-black text-right">Count</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {results.rollingReturns.map((roll) => (
                <tr key={roll.label} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{roll.label}</div>
                    {roll.label === 'Since Inception' && roll.data.length > 0 && (
                      <span className="text-[9px] text-slate-400 font-medium block leading-tight">
                        From {roll.data[0].startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {roll.label === '10-year' && roll.summary.totalCount < 2000 && (
                      <span className="text-[8px] text-amber-600 font-bold uppercase mt-0.5 block">Partial⚠️</span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-black text-slate-900">{(roll.summary.avg * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-bold text-slate-700">{(roll.summary.median * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-bold text-slate-500">{(roll.summary.stdDev * 100).toFixed(2)}%</td>
                  
                  {/* Best Return */}
                  <td className="py-4 px-4">
                    <div className="font-black text-emerald-600">+{(roll.summary.best.value * 100).toFixed(2)}%</div>
                    <div className="text-[9px] text-slate-400 font-sans tracking-tighter">{roll.summary.best.range}</div>
                  </td>

                  {/* Worst Return */}
                  <td className="py-4 px-4">
                    <div className={`font-black ${roll.summary.worst.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {roll.summary.worst.value >= 0 ? '+' : ''}{(roll.summary.worst.value * 100).toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-slate-400 font-sans tracking-tighter">{roll.summary.worst.range}</div>
                  </td>

                  {/* Distribution Buckets */}
                  <td className="py-4 px-4 text-center border-l border-slate-50">
                    <div className="font-black text-emerald-600 text-xs">{roll.summary.buckets.greaterThan20.percent.toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-400">{roll.summary.buckets.greaterThan20.count}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="font-black text-emerald-500 text-xs">{roll.summary.buckets.between10And20.percent.toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-400">{roll.summary.buckets.between10And20.count}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="font-black text-slate-500 text-xs">{roll.summary.buckets.between0And10.percent.toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-400">{roll.summary.buckets.between0And10.count}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className={`font-black text-xs ${roll.summary.buckets.negative.count > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                      {roll.summary.buckets.negative.percent.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {roll.summary.buckets.negative.count === 0 ? '0' : roll.summary.buckets.negative.count}
                    </div>
                  </td>
                  
                  <td className="py-4 px-4 text-right font-black text-slate-300">
                    {roll.summary.totalCount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Monthly Returns Heatmap */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-slate-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Returns Heatmap</h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Historical month-on-month performance</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-2 font-black text-left">Year</th>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                  <th key={m} className="py-3 px-2 font-black">{m}</th>
                ))}
                <th className="py-3 px-2 font-black text-indigo-600 border-l border-slate-100">YTD</th>
              </tr>
            </thead>
            <tbody>
              {results.monthlyReturns.map((yearData) => (
                <tr key={yearData.year} className="border-b border-slate-50 last:border-none">
                  <td className="py-3 px-2 font-black text-slate-800 text-left bg-slate-50/30">{yearData.year}</td>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const val = yearData.months[i];
                    if (val === null || val === undefined) {
                      return <td key={i} className="py-3 px-2 text-slate-300">-</td>;
                    }
                    const isPositive = val > 0;
                    const isZero = val === 0;
                    
                    // Simple heatmap color logic
                    const absVal = Math.min(Math.abs(val), 10); // cap at 10% for color intensity
                    const opacity = Math.max(0.1, absVal / 10).toFixed(2);
                    
                    const bgColor = isPositive 
                      ? `rgba(16, 185, 129, ${opacity})` // emerald
                      : isZero ? 'transparent' : `rgba(244, 63, 94, ${opacity})`; // rose
                      
                    const textColor = isPositive ? 'text-emerald-800' : isZero ? 'text-slate-500' : 'text-rose-800';

                    return (
                      <td key={i} className={`py-3 px-2 font-bold ${textColor}`} style={{ backgroundColor: bgColor }}>
                        {val > 0 ? '+' : ''}{val.toFixed(1)}%
                      </td>
                    );
                  })}
                  <td className={`py-3 px-2 font-black border-l border-slate-100 ${yearData.ytd > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {yearData.ytd > 0 ? '+' : ''}{yearData.ytd.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Yearly Returns History */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-slate-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Yearly Returns</h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Calendar year performance history</p>
          </div>
          <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Bull {'>12%'}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Mod 9-12%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Irrit. 0-9%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Neg {'<0%'}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-4 font-black">Year</th>
                <th className="py-3 px-4 font-black text-right">Return</th>
                <th className="py-3 px-4 font-black text-right hidden sm:table-cell">Start NAV</th>
                <th className="py-3 px-4 font-black text-right hidden sm:table-cell">End NAV</th>
                <th className="py-3 px-4 font-black">Phase</th>
              </tr>
            </thead>
            <tbody>
              {results.yearlyReturns.slice().reverse().map((y) => (
                <tr key={y.year} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800">{y.year}</span>
                    {y.preSebi && <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Pre-SEBI</span>}
                  </td>
                  <td className={`py-3 px-4 text-right font-black ${y.absReturn > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {y.absReturn > 0 ? '+' : ''}{y.absReturn.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 hidden sm:table-cell">₹{y.startNav.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 hidden sm:table-cell">₹{y.endNav.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded
                      ${y.phase === 'Bull' ? 'bg-emerald-50 text-emerald-600' : 
                        y.phase === 'Moderate' ? 'bg-blue-50 text-blue-600' : 
                        y.phase === 'Negative' ? 'bg-rose-50 text-rose-600' : 
                        'bg-amber-50 text-amber-600'}`}>
                      {y.phase}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
