import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { FundSearch } from './components/FundSearch';
import { SummaryCards } from './components/SummaryCards';
import { AnalysisCharts } from './components/AnalysisCharts';
import { ComparisonTables } from './components/ComparisonTables';
import { Insights } from './components/Insights';
import { normalizeData } from './utils/parseUtils';
import { 
  calculateCAGR, 
  calculateMaxDrawdown, 
  calculateYearlyReturns, 
  calculateMonthlyReturns,
  calculateRollingReturns, 
  calculateSIP, 
  calculateLumpsum,
  calculateStandardDeviation,
  calculateSinceInception,
  generateInsights,
  SipSimulationResult,
  analyzeRollingInvestment
} from './utils/calcUtils';
import { AnalysisResults, SipScenario } from './types';
import { BarChart, RefreshCw, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // SIP Interactive State
  const [sipScenario, setSipScenario] = useState<SipScenario>('Historical');
  const [sipPeriod, setSipPeriod] = useState<string>('3-year');
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [monthlySip, setMonthlySip] = useState(10000);
  const [investmentType, setInvestmentType] = useState<'SIP' | 'Lumpsum'>('SIP');
  const [lumpsumAmount, setLumpsumAmount] = useState(100000);

  const processData = (json: any[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const normalized = normalizeData(json);
      if (!normalized) {
        setIsProcessing(false);
        return;
      }

      const { data, meta } = normalized;
      const start = data[0];
      const end = data[data.length - 1];
      const days = (end.date.getTime() - start.date.getTime()) / (1000 * 60 * 60 * 24);

      const cagr = calculateCAGR(start.nav, end.nav, days);
      const { maxDrawdown, drawdownData } = calculateMaxDrawdown(data);
      const yearlyReturns = calculateYearlyReturns(data);
      const monthlyReturns = calculateMonthlyReturns(data);
      
      const dailyRets: number[] = [];
      for (let i = 1; i < data.length; i++) {
        dailyRets.push((data[i].nav - data[i-1].nav) / data[i-1].nav);
      }
      
      const meanDailyRet = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
      const varDaily = dailyRets.reduce((a, b) => a + Math.pow(b - meanDailyRet, 2), 0) / dailyRets.length;
      const stdDev = Math.sqrt(varDaily) * Math.sqrt(252);
      
      const riskFreeRate = 0.065; 
      const sharpeRatio = stdDev !== 0 ? (cagr - riskFreeRate) / stdDev : 0;
      
      const targetD = riskFreeRate / 252;
      const downSq = dailyRets.map(r => Math.pow(Math.min(r - targetD, 0), 2));
      const downStd = Math.sqrt(downSq.reduce((a, b) => a + b, 0) / downSq.length) * Math.sqrt(252);
      const sortinoRatio = downStd > 0 ? (cagr - riskFreeRate) / downStd : 0;

      const romd = maxDrawdown !== 0 ? cagr / maxDrawdown : 0;

      const rolling1Y = calculateRollingReturns(data, 365, '1-year');
      const rolling3Y = calculateRollingReturns(data, 1095, '3-year');
      const rolling5Y = calculateRollingReturns(data, 1825, '5-year');
      const rolling7Y = calculateRollingReturns(data, 2555, '7-year');
      const rolling10Y = calculateRollingReturns(data, 3650, '10-year');
      const sinceInception = calculateSinceInception(data);

      const { standard: sipGrowth, stepUp: stepUpSipGrowth } = calculateSIP(data, 10000, 10);

      const sortedYearly = [...yearlyReturns].sort((a, b) => a.returnVal - b.returnVal);
      const midYearly = Math.floor(sortedYearly.length / 2);
      const medianYearlyReturn = sortedYearly.length % 2 !== 0 
        ? sortedYearly[midYearly].returnVal 
        : (sortedYearly[midYearly - 1].returnVal + sortedYearly[midYearly].returnVal) / 2;

      const preSebiReturns = yearlyReturns.filter(y => y.preSebi).map(y => y.absReturn);
      const postSebiReturns = yearlyReturns.filter(y => !y.preSebi).map(y => y.absReturn);
      const preSebiAvg = preSebiReturns.length ? preSebiReturns.reduce((a, b) => a + b, 0) / preSebiReturns.length : undefined;
      const postSebiAvg = postSebiReturns.length ? postSebiReturns.reduce((a, b) => a + b, 0) / postSebiReturns.length : undefined;

      const analysisResults: AnalysisResults = {
        meta,
        data,
        cagr,
        maxDrawdown,
        sharpeRatio,
        sortinoRatio,
        romd,
        medianYearlyReturn,
        stdDev,
        latestNav: end,
        yearlyReturns,
        monthlyReturns,
        preSebiAvg,
        postSebiAvg,
        rollingReturns: [rolling1Y, rolling3Y, rolling5Y, rolling7Y, rolling10Y, sinceInception],
        sipGrowth: [],
        stepUpSipGrowth: [],
        drawdownData,
        insights: generateInsights({ cagr, maxDrawdown, sharpeRatio, stdDev }, preSebiAvg, postSebiAvg)
      };

      setResults(analysisResults);
      setRawData(json);
      setIsProcessing(false);
    }, 500);
  };

  const handleReset = () => {
    setResults(null);
    setRawData(null);
  };

  // Calculate Dynamic Investment for sidebar and charts
  const dynamicInvestment = useMemo(() => {
    if (!results) return null;
    
    // Scenario-aware data slicing and target calculation
    const selectedRolling = results.rollingReturns.find(r => r.label === sipPeriod);
    let slice = results.data;
    let targetCAGR: number | undefined;

    if (sipScenario === 'Historical') {
      const years = parseInt(sipPeriod);
      if (isNaN(years)) {
        // Since Inception case
        slice = results.data;
      } else {
        const targetDate = new Date(results.latestNav.date);
        targetDate.setFullYear(targetDate.getFullYear() - years);

        let bestIdx = 0;
        let minDiff = Infinity;
        
        for (let i = 0; i < results.data.length; i++) {
          const diff = Math.abs(results.data[i].date.getTime() - targetDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = i;
          } else if (diff > minDiff) {
            break;
          }
        }
        slice = results.data.slice(bestIdx);
      }
    } else if (sipScenario === 'Best' && selectedRolling?.summary.best.startDate) {
      // Use the ACTUAL historical window for the Best period
      slice = results.data.filter(d => 
        d.date >= selectedRolling.summary.best.startDate! && 
        d.date <= selectedRolling.summary.best.endDate!
      );
    } else if (sipScenario === 'Worst' && selectedRolling?.summary.worst.startDate) {
      // Use the ACTUAL historical window for the Worst period
      slice = results.data.filter(d => 
        d.date >= selectedRolling.summary.worst.startDate! && 
        d.date <= selectedRolling.summary.worst.endDate!
      );
    } else {
      // For Average/Median, use latest timeline but apply synthetic CAGR
      const days = sipPeriod === 'Since Inception' 
        ? (results.latestNav.date.getTime() - results.data[0].date.getTime()) / (1000 * 60 * 60 * 24)
        : parseInt(sipPeriod) * 365.25;
      
      const cutoff = new Date(results.latestNav.date);
      cutoff.setDate(cutoff.getDate() - days);
      slice = results.data.filter(d => d.date >= cutoff);

      if (sipScenario === 'Average') targetCAGR = selectedRolling?.summary.avg;
      else if (sipScenario === 'Median') targetCAGR = selectedRolling?.summary.median;
    }

    const simResult = investmentType === 'SIP' 
      ? calculateSIP(slice, monthlySip, stepUpPercent, targetCAGR)
      : calculateLumpsum(slice, lumpsumAmount, targetCAGR);

    // For Lumpsum, rolling analysis based on historical windows
    const analysis = selectedRolling 
      ? analyzeRollingInvestment(
          selectedRolling, 
          results.data, 
          investmentType === 'SIP' ? monthlySip : lumpsumAmount, 
          stepUpPercent, 
          investmentType
        ) 
      : null;

    return { ...simResult, analysis };
  }, [results, sipScenario, sipPeriod, stepUpPercent, monthlySip, investmentType, lumpsumAmount]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BarChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              FundAnalyzer
            </h1>
          </div>
          
          {results && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
                  Professional Performance Analysis.
                </h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
                  Search our database or upload your mutual fund NAV data to generate institutional-grade performance metrics, risk ratios, and rolling returns verification.
                </p>
                <FundSearch onFundSelected={processData} />
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-4 text-slate-400">
                <div className="h-px bg-slate-200 w-32" />
                <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">OR</span>
                <div className="h-px bg-slate-200 w-32" />
              </div>

              <FileUpload onDataLoaded={processData} isLoading={isProcessing} />
              
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <RefreshCw className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">Dynamic Analysis</h4>
                  <p className="text-sm text-slate-500">Calculate CAGR, Max Drawdown, and Sharpe Ratio instantly from raw NAV data.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">Verification First</h4>
                  <p className="text-sm text-slate-500">Every yearly return calculation is mapped to start/end dates and NAVs for full transparency.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Info className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">Rule-based Insights</h4>
                  <p className="text-sm text-slate-500">Get automated pros, cons, and risk levels based on quantitative performance thresholds.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pb-20"
            >
              {/* Fund Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                    Performance Report
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">{results.meta.schemeName}</h2>
                  <div className="flex gap-4 mt-1 text-slate-500 text-sm">
                    <p>Fund House: <span className="font-semibold text-slate-700">{results.meta.fundHouse}</span></p>
                    <p>Category: <span className="font-semibold text-slate-700">{results.meta.category}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400">Analysis Period</p>
                  <p className="font-bold text-slate-700">
                    {results.data[0].date.toLocaleDateString()} — {results.latestNav.date.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <SummaryCards results={results} />
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                  <AnalysisCharts 
                    results={results} 
                    sipScenario={sipScenario}
                    setSipScenario={setSipScenario}
                    sipPeriod={sipPeriod}
                    setSipPeriod={setSipPeriod}
                    stepUpPercent={stepUpPercent}
                    setStepUpPercent={setStepUpPercent}
                    monthlySip={monthlySip}
                    setMonthlySip={setMonthlySip}
                    investmentType={investmentType}
                    setInvestmentType={setInvestmentType}
                    lumpsumAmount={lumpsumAmount}
                    setLumpsumAmount={setLumpsumAmount}
                    dynamicInvestment={dynamicInvestment}
                  />
                </div>
                <div className="space-y-8">
                  <Insights results={results} />
                  {dynamicInvestment && (
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                      <h4 className="font-bold text-lg mb-2">{investmentType} Strategy</h4>
                      <p className="text-sm text-indigo-100 mb-6 leading-relaxed">
                        Mode: <span className="font-bold underline">{sipScenario}</span>. {investmentType === 'SIP' && `Increasing your contribution by ${stepUpPercent}% annually significantly accelerates wealth.`}
                      </p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider">{investmentType === 'SIP' ? 'Invested (Step-up)' : 'Invested'}</p>
                            <p className="text-xl font-bold">₹{dynamicInvestment.stepUp[dynamicInvestment.stepUp.length-1].invested.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-indigo-200">Final Value</p>
                            <p className="text-2xl font-bold">₹{dynamicInvestment.stepUp[dynamicInvestment.stepUp.length-1].value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/10 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-indigo-200 uppercase">Net Profit</p>
                            <p className="font-bold text-lg">
                              ₹{(dynamicInvestment.stepUp[dynamicInvestment.stepUp.length-1].value - dynamicInvestment.stepUp[dynamicInvestment.stepUp.length-1].invested).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="bg-white/10 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-indigo-200 uppercase">{investmentType === 'SIP' ? 'XIRR' : 'CAGR'} (Annualized)</p>
                            <p className="font-bold text-lg">
                              {(dynamicInvestment.summary.stepUpXirr * 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <ComparisonTables results={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-slate-800 mb-2">FundAnalyzer</p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            This tool is for informational purposes. All calculations are derived strictly from the uploaded NAV data. Always verify specific fund numbers before making investment decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
