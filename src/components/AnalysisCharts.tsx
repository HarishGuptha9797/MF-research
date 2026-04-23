import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import { AnalysisResults, SipScenario } from '../types';
import { calculateSIP, SipSimulationResult, analyzeRollingInvestment } from '../utils/calcUtils';
import { Settings2, Calculator, Play, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalysisChartsProps {
  results: AnalysisResults;
  sipScenario: SipScenario;
  setSipScenario: (s: SipScenario) => void;
  sipPeriod: string;
  setSipPeriod: (p: string) => void;
  stepUpPercent: number;
  setStepUpPercent: (v: number) => void;
  monthlySip: number;
  setMonthlySip: (v: number) => void;
  investmentType: 'SIP' | 'Lumpsum';
  setInvestmentType: (v: 'SIP' | 'Lumpsum') => void;
  lumpsumAmount: number;
  setLumpsumAmount: (v: number) => void;
  dynamicInvestment: SipSimulationResult | null;
}

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ 
  results,
  sipScenario,
  setSipScenario,
  sipPeriod,
  setSipPeriod,
  stepUpPercent,
  setStepUpPercent,
  monthlySip,
  setMonthlySip,
  investmentType,
  setInvestmentType,
  lumpsumAmount,
  setLumpsumAmount,
  dynamicInvestment
}) => {
  // Staging state for filters to prevent live-updating on every small change
  const [localScenario, setLocalScenario] = useState<SipScenario>(sipScenario);
  const [localPeriod, setLocalPeriod] = useState(sipPeriod);
  const [localStepUp, setLocalStepUp] = useState(stepUpPercent);
  const [localMonthly, setLocalMonthly] = useState(monthlySip);
  const [localLumpsum, setLocalLumpsum] = useState(lumpsumAmount);
  const [localType, setLocalType] = useState(investmentType);
  const [kpiPeriod, setKpiPeriod] = useState(sipPeriod);
  const [kpiType, setKpiType] = useState<'SIP' | 'Lumpsum'>(investmentType);

  const [isGenerating, setIsGenerating] = useState(false);
  const [useStepUpKPI, setUseStepUpKPI] = useState(true);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate complex calculation delay for visual feedback
    setTimeout(() => {
      setSipScenario(localScenario);
      setSipPeriod(localPeriod);
      setStepUpPercent(localStepUp);
      setMonthlySip(localMonthly);
      setLumpsumAmount(localLumpsum);
      setInvestmentType(localType);
      setIsGenerating(false);
    }, 600);
  };

  const isDirty = 
    localScenario !== sipScenario || 
    localPeriod !== sipPeriod || 
    localStepUp !== stepUpPercent || 
    localMonthly !== monthlySip ||
    localLumpsum !== lumpsumAmount ||
    localType !== investmentType;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  const kpiAnalysis = useMemo(() => {
    const r = results.rollingReturns.find(r => r.label === kpiPeriod);
    if (!r) return null;
    return analyzeRollingInvestment(r, results.data, kpiType === 'SIP' ? monthlySip : lumpsumAmount, stepUpPercent, kpiType);
  }, [kpiPeriod, results, kpiType, monthlySip, lumpsumAmount, stepUpPercent]);

  const chartData = useMemo(() => {
    if (!dynamicInvestment) return [];
    
    return dynamicInvestment.standard.map((s, i) => {
      const stepItem = dynamicInvestment.stepUp[i];
      const dateStr = formatDate(s.date);
      const year = s.date.getFullYear();
      
      const yearsElapsed = year - dynamicInvestment.standard[0].date.getFullYear();
      const currentYearlySip = monthlySip * Math.pow(1 + stepUpPercent / 100, yearsElapsed);

      return {
        date: dateStr,
        invested: s.invested,
        value: s.value,
        stepUpInvested: stepItem.invested,
        stepUpValue: stepItem.value,
        yearlySip: currentYearlySip.toFixed(0)
      };
    });
  }, [dynamicInvestment, monthlySip, stepUpPercent]);

  const navTrendData = results.data.map(d => ({
    date: formatDate(d.date),
    nav: d.nav, // Keep raw precision for calculations and charts
    rawDate: d.date.getTime()
  }));

  const drawdownData = results.drawdownData.map(d => ({
    date: formatDate(d.date),
    drawdown: d.drawdown.toFixed(2)
  }));

  const scenarios: SipScenario[] = ['Historical', 'Best', 'Average', 'Median', 'Worst'];

  return (
    <div className="space-y-8">
      {/* NAV Growth Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
          NAV Growth
          <span className="text-xs font-normal text-slate-400">Total growth from inception</span>
        </h4>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={navTrendData}>
              <defs>
                <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`, "NAV"]}
              />
              <Area type="monotone" dataKey="nav" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorNav)" name="NAV (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SIP/Lumpsum Performance with interactive filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h4 className="text-lg font-bold text-slate-800">{localType} Growth Comparison</h4>
            <p className="text-xs text-slate-500 mt-1">Simulate holding periods vs actual history</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['SIP', 'Lumpsum'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLocalType(t)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    localType === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['1-year', '3-year', '5-year', '7-year', '10-year', 'Since Inception'].map((p) => (
                <button
                  key={p}
                  onClick={() => setLocalPeriod(p)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    localPeriod === p ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  {p.includes('year') ? p.replace('-year', 'Y') : 'SI'}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {scenarios.map((s) => (
                <button
                  key={s}
                  onClick={() => setLocalScenario(s)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    localScenario === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calculator className="w-3 h-3" /> {localType === 'SIP' ? 'Monthly Amount (₹)' : 'Lumpsum Amount (₹)'}
            </label>
            <input 
              type="number" 
              value={localType === 'SIP' ? localMonthly : localLumpsum} 
              onChange={(e) => localType === 'SIP' ? setLocalMonthly(Number(e.target.value)) : setLocalLumpsum(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div className={`space-y-2 transition-opacity ${localType === 'Lumpsum' ? 'opacity-20 pointer-events-none' : ''}`}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Settings2 className="w-3 h-3" /> Step-up per Year (%)
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="50" 
                step="5"
                value={localStepUp} 
                onChange={(e) => setLocalStepUp(Number(e.target.value))}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-indigo-600 w-8">{localStepUp}%</span>
            </div>
          </div>
          <div className="flex items-center justify-center border-l border-slate-200 px-4">
             <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Simulated Mode</p>
                <p className="text-sm font-black text-indigo-600 italic">
                  {localScenario === 'Historical' ? 'Based on actual NAV' : 'Synthetic compounding'}
                </p>
             </div>
          </div>
          <div className="flex items-center justify-end">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !isDirty}
              className={`w-full h-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                isGenerating 
                  ? 'bg-slate-100 text-slate-400 cursor-wait' 
                  : isDirty 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 cursor-pointer' 
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className={`w-4 h-4 ${isDirty && !isGenerating ? 'fill-current' : ''} ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Processing...' : 'Generate Result'}
            </button>
          </div>
        </div>

        <div className="h-[400px] relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl transition-all">
               <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-black text-indigo-900 tracking-tighter uppercase">Computing Simulation</p>
               </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', padding: '12px' }}
                formatter={(val: any, name: string) => {
                  return [<span className="font-bold text-slate-700">₹{Number(val).toLocaleString('en-IN')}</span>, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                     return (
                       <span className="mb-2 border-b border-slate-100 pb-2 block">
                         <span className="font-black text-slate-800 block">{label}</span>
                         {investmentType === 'SIP' && (
                           <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter block">Installment: ₹{Number(payload[0].payload.yearlySip).toLocaleString('en-IN')}</span>
                         )}
                       </span>
                     );
                  }
                  return label;
                }}
              />
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
              
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={false} name={investmentType === 'SIP' ? "Regular SIP Value" : "Lumpsum Value"} />
              {investmentType === 'SIP' && (
                <Line type="monotone" dataKey="stepUpValue" stroke="#6366f1" strokeWidth={3} dot={false} name="Step-up SIP Value" />
              )}
              
              <Line type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" name={investmentType === 'SIP' ? "Invested (Reg)" : "Invested"} dot={false} />
              {investmentType === 'SIP' && (
                <Line type="monotone" dataKey="stepUpInvested" stroke="#4f46e5" strokeWidth={1} strokeDasharray="3 3" name="Invested (Step-up)" dot={false} />
              )}
              
              {/* Reference line for the yearly step-up value could be added as a custom label but might clutter the graph */}
              {/* So we add it into the tooltip payload via the data object */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Section */}
      {kpiAnalysis && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${(useStepUpKPI && kpiType === 'SIP') ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                   <Calculator className="w-4 h-4 text-white" />
                </div>
                <div>
                   <h5 className="text-sm font-bold text-slate-900">Historical Scenarios</h5>
                   <p className="text-[10px] text-slate-500 uppercase font-black">
                     {kpiType === 'SIP' 
                       ? `Mode: ${useStepUpKPI ? 'Step-up Investment' : 'Regular Investment'}` 
                       : `Mode: Lumpsum Investment`}
                   </p>
                </div>
             </div>
             
             <div className="flex flex-wrap items-center gap-4 md:gap-6">
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 {['SIP', 'Lumpsum'].map((t) => (
                   <button
                     key={t}
                     onClick={() => setKpiType(t as 'SIP' | 'Lumpsum')}
                     className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                       kpiType === t ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                     }`}
                   >
                     {t}
                   </button>
                 ))}
               </div>

               <div className="flex bg-slate-100 p-1 rounded-lg">
                 {['1-year', '3-year', '5-year', '7-year', '10-year', 'Since Inception'].map((p) => (
                   <button
                     key={p}
                     onClick={() => setKpiPeriod(p)}
                     className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                       kpiPeriod === p ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                     }`}
                   >
                     {p.includes('year') ? p.replace('-year', 'Y') : 'SI'}
                   </button>
                 ))}
               </div>

               {kpiType === 'SIP' && (
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Show Step-up</span>
                    <div className="relative">
                       <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={useStepUpKPI}
                          onChange={(e) => setUseStepUpKPI(e.target.checked)}
                       />
                       <div className={`block w-8 h-4 rounded-full transition-colors ${useStepUpKPI ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                       <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useStepUpKPI ? 'translate-x-4' : ''}`}></div>
                    </div>
                 </label>
               )}
             </div>
          </div>

          {(() => {
            const currentData = (useStepUpKPI && kpiType === 'SIP') ? kpiAnalysis.step : kpiAnalysis.reg;
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-6 rounded-2xl text-white">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average {kpiType === 'SIP' ? 'XIRR' : 'CAGR'}</p>
                      <h3 className="text-3xl font-black text-emerald-400">
                        {(currentData.scenarios.average.xirr >= 0 ? '+' : '')}{(currentData.scenarios.average.xirr * 100).toFixed(2)}%
                      </h3>
                      <p className={`text-md font-bold mt-1 ${currentData.scenarios.average.profit >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                        {currentData.scenarios.average.profit >= 0 ? '+' : ''}{((currentData.scenarios.average.profit / currentData.scenarios.average.invested) * 100).toFixed(2)}% <span className="text-xs text-slate-400 uppercase tracking-widest font-black">Abs</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-4">
                        Avg value: ₹{Math.round(currentData.scenarios.average.finalValue).toLocaleString('en-IN')} on ₹{Math.round(currentData.scenarios.average.invested).toLocaleString('en-IN')} invested
                      </p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl text-white">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Median {kpiType === 'SIP' ? 'XIRR' : 'CAGR'}</p>
                      <h3 className="text-3xl font-black text-emerald-400">
                        {(currentData.scenarios.median.xirr >= 0 ? '+' : '')}{(currentData.scenarios.median.xirr * 100).toFixed(2)}%
                      </h3>
                      <p className={`text-md font-bold mt-1 ${currentData.scenarios.median.profit >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                        {currentData.scenarios.median.profit >= 0 ? '+' : ''}{((currentData.scenarios.median.profit / currentData.scenarios.median.invested) * 100).toFixed(2)}% <span className="text-xs text-slate-400 uppercase tracking-widest font-black">Abs</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-4">
                        Median value: ₹{Math.round(currentData.scenarios.median.finalValue).toLocaleString('en-IN')}
                      </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KPICard 
                      title="Latest (ongoing)" 
                      data={currentData.scenarios.latest} 
                      borderColor="border-indigo-500/50" 
                      titleColor="text-indigo-500"
                  />
                  <KPICard 
                      title="Best ever" 
                      data={currentData.scenarios.best} 
                      borderColor="border-emerald-500/50" 
                      titleColor="text-emerald-500"
                  />
                  <KPICard 
                      title="Worst ever" 
                      data={currentData.scenarios.worst} 
                      borderColor="border-orange-500/50" 
                      titleColor="text-orange-500"
                      isWorst
                  />
                  <KPICard 
                      title="Average" 
                      data={currentData.scenarios.average} 
                      borderColor="border-slate-200" 
                      titleColor="text-slate-500"
                      subtitle="Across all historical windows"
                      isAggregated
                  />
                  <KPICard 
                      title="Median" 
                      data={currentData.scenarios.median} 
                      borderColor="border-slate-200" 
                      titleColor="text-slate-500"
                      isAggregated
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pb-12">
                  <div className="bg-slate-900 p-8 rounded-3xl text-white h-full flex flex-col">
                      <h4 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">
                        {kpiType === 'SIP' ? 'XIRR' : 'CAGR'} distribution — {kpiType === 'SIP' ? (useStepUpKPI ? 'Step-up' : 'Regular') : 'Lumpsum'} Mode
                      </h4>
                      <div className="space-y-6 flex-grow">
                        {currentData.distribution.map((item: any) => (
                            <div key={item.label} className="space-y-2">
                              <div className="flex justify-between items-end">
                                  <span className="text-xs font-bold text-slate-400">{item.label}</span>
                                  <span className="text-sm font-black text-emerald-400">{item.percent.toFixed(1)}%</span>
                              </div>
                              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.percent}%` }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                              </div>
                            </div>
                        ))}
                      </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">
                              <th colSpan={5} className="pb-2">Performance Breakdown ({kpiType === 'SIP' ? (useStepUpKPI ? 'Step-up' : 'Regular') : 'Lumpsum'})</th>
                            </tr>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                              <th className="py-4 px-2">Scenario</th>
                              <th className="py-4 px-2">Period</th>
                              <th className="py-4 px-2">Invested</th>
                              <th className="py-4 px-2">Value</th>
                              <th className="py-4 px-2">{kpiType === 'SIP' ? 'XIRR' : 'CAGR'}</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[
                              { label: 'Latest', key: 'latest' },
                              { label: 'Best ever', key: 'best' },
                              { label: 'Worst ever', key: 'worst' },
                              { label: 'Average', key: 'average' },
                              { label: 'Median', key: 'median' }
                            ].map((item) => {
                              const scenario = currentData.scenarios[item.key];
                              return (
                                  <tr key={item.label} className="border-b border-slate-50 hover:bg-slate-100/50 transition-colors">
                                    <td className="py-4 px-2 font-bold text-slate-900">{item.label}</td>
                                    <td className="py-4 px-2 text-xs text-slate-500 font-mono">
                                        {item.key === 'average' || item.key === 'median' 
                                          ? `— all ${kpiAnalysis.totalWindows} windows` 
                                          : `${scenario.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')} → ${scenario.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}`}
                                    </td>
                                    <td className="py-4 px-2 font-medium text-slate-600 font-mono">₹{Math.round(scenario.invested).toLocaleString('en-IN')}</td>
                                    <td className="py-4 px-2 font-bold text-emerald-600 font-mono">₹{Math.round(scenario.finalValue).toLocaleString('en-IN')}</td>
                                    <td className={`py-4 px-2 font-black font-mono ${scenario.xirr > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {scenario.xirr > 0 ? '+' : ''}{(scenario.xirr * 100).toFixed(2)}%
                                    </td>
                                  </tr>
                              );
                            })}
                        </tbody>
                      </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drawdown Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Drawdown Analysis (%)</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} title="Date" />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDD)" name="Drawdown (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Returns Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Yearly Returns Distribution</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const yearlyAvg = results.yearlyReturns.reduce((acc, curr) => acc + curr.returnVal, 0) / results.yearlyReturns.length;
                const yearlyMedian = results.medianYearlyReturn;
                
                return (
                  <BarChart data={results.yearlyReturns}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                      formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, 'Return']}
                    />
                    <ReferenceLine 
                      y={yearlyAvg} 
                      stroke="#4f46e5" 
                      strokeDasharray="4 4" 
                      label={{ position: 'right', value: `Avg: ${(yearlyAvg * 100).toFixed(2)}%`, fill: '#4f46e5', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <ReferenceLine 
                      y={yearlyMedian} 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      label={{ position: 'left', value: `Med: ${(yearlyMedian * 100).toFixed(2)}%`, fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <Bar dataKey="returnVal" radius={[4, 4, 0, 0]}>
                      {results.yearlyReturns.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.returnVal > 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, data, borderColor, titleColor, subtitle, isAggregated = false, isWorst = false }: any) => {
  const profitSign = data.profit >= 0 ? '+' : '-';
  const profitColor = data.profit >= 0 ? 'text-emerald-500' : 'text-rose-500';
  const xirrSign = data.xirr >= 0 ? '+' : '';
  const xirrColor = data.xirr >= 0 ? 'text-emerald-500' : 'text-rose-500';

  const absReturn = (data.profit / data.invested) * 100;
  const absReturnSign = absReturn >= 0 ? '+' : '';
  const absReturnColor = absReturn >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80';

  return (
    <div className={`p-5 rounded-2xl border-2 ${borderColor} bg-white shadow-sm flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-6">
        <h5 className={`text-xs font-black uppercase tracking-wider ${titleColor}`}>{title}</h5>
        <div className="text-right">
          <span className={`text-2xl font-black ${xirrColor} block`}>
            {xirrSign}{(data.xirr * 100).toFixed(2)}%
          </span>
          <span className={`text-sm font-bold ${absReturnColor}`}>
            {absReturnSign}{absReturn.toFixed(2)}% <span className="text-[10px] text-slate-400 uppercase tracking-widest block sm:inline">Abs</span>
          </span>
        </div>
      </div>
      
      <div className="space-y-2 mb-6 flex-grow">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase">{isAggregated ? `Avg invested` : 'Invested'}</span>
          <span className="font-black text-slate-800">₹{Math.round(data.invested).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase">{isAggregated ? `Avg final value` : 'Final value'}</span>
          <span className="font-black text-emerald-600">₹{Math.round(data.finalValue).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase">{isAggregated ? `Avg profit` : 'Profit/Loss'}</span>
          <span className={`font-black ${profitColor}`}>
            {profitSign}₹{Math.abs(Math.round(data.profit)).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 italic">
          {subtitle || (
            <>
              {data.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
              <span className="mx-1">→</span>
              {data.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
            </>
          )}
        </p>
      </div>
    </div>
  );
};

