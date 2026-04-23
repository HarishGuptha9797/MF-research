import { NavData, YearlyReturn, RollingReturn, SipResult } from '../types';

export const calculateCAGR = (startNav: number, endNav: number, days: number): number => {
  if (days <= 0 || startNav <= 0) return 0;
  // Using 365.25 for leap year accuracy as per strict instructions
  return Math.pow(endNav / startNav, 365.25 / days) - 1;
};

export const calculateMaxDrawdown = (data: NavData[]): { maxDrawdown: number; drawdownData: { date: Date; drawdown: number }[] } => {
  let peak = -Infinity;
  let maxDD = 0;
  const drawdownData = [];

  for (const item of data) {
    if (item.nav > peak) {
      peak = item.nav;
    }
    const dd = (peak - item.nav) / peak;
    if (dd > maxDD) {
      maxDD = dd;
    }
    drawdownData.push({ date: item.date, drawdown: -dd * 100 });
  }

  return { maxDrawdown: maxDD, drawdownData };
};

export const calculateMonthlyReturns = (data: NavData[]) => {
  const yearsMap = new Map<number, Map<number, NavData[]>>();
  
  data.forEach((item) => {
    const year = item.date.getFullYear();
    const month = item.date.getMonth();
    
    if (!yearsMap.has(year)) {
      yearsMap.set(year, new Map());
    }
    const monthsMap = yearsMap.get(year)!;
    if (!monthsMap.has(month)) {
      monthsMap.set(month, []);
    }
    monthsMap.get(month)!.push(item);
  });

  const results: { year: number; months: { [key: number]: number | null }; ytd: number }[] = [];
  
  yearsMap.forEach((monthsMap, year) => {
    const months: { [key: number]: number | null } = {};
    let firstNavYear: number | null = null;
    let lastNavYear: number | null = null;

    for (let i = 0; i < 12; i++) {
       if (monthsMap.has(i)) {
         const mData = monthsMap.get(i)!;
         const start = mData[0];
         const end = mData[mData.length - 1];
         months[i] = ((end.nav - start.nav) / start.nav) * 100;
         
         if (firstNavYear === null) firstNavYear = start.nav;
         lastNavYear = end.nav;
       } else {
         months[i] = null;
       }
    }
    
    // YTD calculate
    const ytd = (firstNavYear && lastNavYear) ? ((lastNavYear - firstNavYear) / firstNavYear) * 100 : 0;
    
    results.push({
      year,
      months,
      ytd
    });
  });

  return results.sort((a, b) => a.year - b.year);
};

export const calculateYearlyReturns = (data: NavData[]): YearlyReturn[] => {
  const yearlyMap = new Map<number, NavData[]>();
  data.forEach((item) => {
    const year = item.date.getFullYear();
    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, []);
    }
    yearlyMap.get(year)!.push(item);
  });

  const results: YearlyReturn[] = [];
  yearlyMap.forEach((yearData, year) => {
    const start = yearData[0];
    const end = yearData[yearData.length - 1];
    
    const absReturn = (end.nav - start.nav) / start.nav;
    const days = (end.date.getTime() - start.date.getTime()) / (1000 * 60 * 60 * 24);
    const cagr = calculateCAGR(start.nav, end.nav, days);
    
    // Classify phase (7-5-3-1 rule)
    const retPct = absReturn * 100;
    let phase = "Negative";
    if (retPct >= 0 && retPct < 7) {
      phase = "Irritation";
    } else if (retPct >= 7 && retPct < 9) {
      phase = "Disappointment";
    } else if (retPct >= 9 && retPct < 12) {
      phase = "Moderate";
    } else if (retPct >= 12) {
      phase = "Bull";
    }

    results.push({
      year,
      startDate: start.date,
      endDate: end.date,
      startNav: start.nav,
      endNav: end.nav,
      absReturn: retPct,
      cagr: cagr * 100,
      returnVal: absReturn, // For charts/logic using raw ratio
      phase,
      preSebi: year < 2018
    });
  });

  return results.sort((a, b) => a.year - b.year);
};

export const calculateStandardDeviation = (yearlyReturns: number[]): number => {
  if (yearlyReturns.length === 0) return 0;
  const mean = yearlyReturns.reduce((a, b) => a + b, 0) / yearlyReturns.length;
  const variance = yearlyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / yearlyReturns.length;
  return Math.sqrt(variance);
};

export const calculateRollingReturns = (data: NavData[], periodDays: number, label: string): RollingReturn => {
  const results: RollingReturn['data'] = [];
  const years = Math.round(periodDays / 365.25);
  
  for (let right = 0; right < data.length; right++) {
    const endNav = data[right];
    
    // Find nearest start date exactly X years before end date
    const targetDate = new Date(endNav.date);
    targetDate.setFullYear(targetDate.getFullYear() - years);

    let bestLeft = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < right; i++) {
      const diff = Math.abs(data[i].date.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        bestLeft = i;
      } else if (diff > minDiff) {
        break;
      }
    }

    const startNav = data[bestLeft];
    const daysDiff = (endNav.date.getTime() - startNav.date.getTime()) / (1000 * 60 * 60 * 24);
    
    // Allow +/- 15 days for nearest date logic (covers weekends/holidays easily)
    if (Math.abs(daysDiff - periodDays) < 15) {
      const lumpSumReturn = calculateCAGR(startNav.nav, endNav.nav, daysDiff);
      
      // Basic standard SIP for the rolling returns table view
      let sipValue = 0;
      let sipInvested = 0;
      let lastMonth = -1;
      
      for (let k = bestLeft; k <= right; k++) {
        const d = data[k];
        if (d.date.getMonth() !== lastMonth) {
          const units = 1000 / d.nav;
          sipInvested += 1000;
          sipValue += units * endNav.nav;
          lastMonth = d.date.getMonth();
        }
      }
      const sipAbsReturn = sipInvested > 0 ? (sipValue - sipInvested) / sipInvested : 0;

      results.push({ 
        date: endNav.date, 
        startDate: startNav.date, 
        startIdx: bestLeft,
        endIdx: right,
        returnVal: lumpSumReturn,
        sipReturn: sipAbsReturn,
        days: daysDiff
      });
    }
  }

  const values = results.map(r => r.returnVal);
  const totalCount = values.length;
  
  // Find extreme indices in the original results array
  let bestIdxRel = 0;
  let worstIdxRel = 0;
  let maxV = -Infinity;
  let minV = Infinity;

  results.forEach((r, idx) => {
    if (r.returnVal > maxV) {
      maxV = r.returnVal;
      bestIdxRel = idx;
    }
    if (r.returnVal < minV) {
      minV = r.returnVal;
      worstIdxRel = idx;
    }
  });

  const bestLumpResult = results[bestIdxRel];
  const worstLumpResult = results[worstIdxRel];

  const formatRange = (start: Date, end: Date) => {
    const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    return `${startStr} → ${endStr}`;
  };

  const avg = totalCount > 0 ? values.reduce((a, b) => a + b, 0) / totalCount : 0;
  const sortedValues = [...values].sort((a, b) => a - b);
  let median = 0;
  if (totalCount > 0) {
    const mid = Math.floor(totalCount / 2);
    median = totalCount % 2 !== 0 
      ? sortedValues[mid] 
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  
  const variance = totalCount > 0 ? values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / totalCount : 0;
  const stdDev = Math.sqrt(variance);

  const counts = { greaterThan20: 0, between10And20: 0, between0And10: 0, negative: 0 };
  values.forEach(v => {
    if (v >= 0.20) counts.greaterThan20++;
    else if (v >= 0.10) counts.between10And20++;
    else if (v >= 0) counts.between0And10++;
    else counts.negative++;
  });

  const emptyResult = { value: 0, range: '-', startDate: new Date(), endDate: new Date(), startNav: 0, endNav: 0, days: 0 };

  return {
    periodDays,
    label,
    data: results,
    summary: {
      avg,
      median,
      best: bestLumpResult ? { 
        value: bestLumpResult.returnVal, 
        range: formatRange(bestLumpResult.startDate, bestLumpResult.date),
        startDate: bestLumpResult.startDate,
        endDate: bestLumpResult.date,
        startNav: data[bestLumpResult.startIdx].nav,
        endNav: data[bestLumpResult.endIdx].nav,
        days: bestLumpResult.days
      } : emptyResult,
      worst: worstLumpResult ? { 
        value: worstLumpResult.returnVal, 
        range: formatRange(worstLumpResult.startDate, worstLumpResult.date),
        startDate: worstLumpResult.startDate,
        endDate: worstLumpResult.date,
        startNav: data[worstLumpResult.startIdx].nav,
        endNav: data[worstLumpResult.endIdx].nav,
        days: worstLumpResult.days
      } : emptyResult,
      bestIdx: bestIdxRel,
      worstIdx: worstIdxRel,
      stdDev,
      buckets: {
        greaterThan20: { count: counts.greaterThan20, percent: totalCount ? (counts.greaterThan20 / totalCount) * 100 : 0 },
        between10And20: { count: counts.between10And20, percent: totalCount ? (counts.between10And20 / totalCount) * 100 : 0 },
        between0And10: { count: counts.between0And10, percent: totalCount ? (counts.between0And10 / totalCount) * 100 : 0 },
        negative: { count: counts.negative, percent: totalCount ? (counts.negative / totalCount) * 100 : 0 },
      },
      totalCount
    }
  };
};

export interface SipSimulationResult {
  standard: SipResult[];
  stepUp: SipResult[];
  summary: {
    standardXirr: number;
    stepUpXirr: number;
  };
  analysis?: any; // Detailed rolling analysis
}

export const calculateLumpsum = (
  data: NavData[],
  initialAmount: number,
  targetCAGR?: number
): SipSimulationResult => {
  if (data.length === 0) return { standard: [], stepUp: [], summary: { standardXirr: 0, stepUpXirr: 0 } };

  const finalGrowth: SipResult[] = [];
  const startNav = data[0].nav;
  const units = initialAmount / startNav;

  data.forEach((item) => {
    const days = (item.date.getTime() - data[0].date.getTime()) / (1000 * 60 * 60 * 24);
    const vNav = targetCAGR !== undefined ? Math.pow(1 + targetCAGR, days / 365.25) : item.nav;
    
    // For Lumpsum, standard and step-up are effectively the same as step-up doesn't apply to a one-time investment
    // but we return both to fit the SipSimulationResult interface or we could adjust the interface
    const value = targetCAGR !== undefined 
      ? initialAmount * vNav // vNav is already indexed to 1 at start
      : units * vNav;

    finalGrowth.push({
      date: item.date,
      invested: initialAmount,
      value: value,
      units: targetCAGR !== undefined ? 0 : units
    });
  });

  // Calculate CAGR as XIRR for Lumpsum
  const first = finalGrowth[0];
  const last = finalGrowth[finalGrowth.length - 1];
  const days = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24);
  const xirr = calculateCAGR(initialAmount, last.value, days);

  return {
    standard: finalGrowth,
    stepUp: finalGrowth, // Same for now
    summary: {
      standardXirr: xirr,
      stepUpXirr: xirr
    }
  };
};

export const calculateSIP = (
  data: NavData[], 
  initialMonthlyAmount: number, 
  stepUpPercent: number = 0,
  targetCAGR?: number 
): SipSimulationResult => {
  if (data.length === 0) return { standard: [], stepUp: [], summary: { standardXirr: 0, stepUpXirr: 0 } };

  const finalStd: SipResult[] = [];
  const finalStep: SipResult[] = [];
  
  // Cash flow tracking for XIRR
  const cashFlowsStd: { date: Date; amount: number }[] = [];
  const cashFlowsStep: { date: Date; amount: number }[] = [];

  let uStd = 0;
  let uStep = 0;
  let tInvStd = 0;
  let tInvStep = 0;
  let curMonthly = initialMonthlyAmount;
  let lYear = data[0].date.getFullYear();
  let lMonth = -1;

  data.forEach((item) => {
    const year = item.date.getFullYear();
    const month = item.date.getMonth();
    const days = (item.date.getTime() - data[0].date.getTime()) / (1000 * 60 * 60 * 24);
    const vNav = targetCAGR !== undefined ? Math.pow(1 + targetCAGR, days / 365.25) : item.nav;

    if (month !== lMonth) {
      if (year !== lYear) {
        curMonthly *= (1 + stepUpPercent / 100);
        lYear = year;
      }
      
      uStd += initialMonthlyAmount / vNav;
      uStep += curMonthly / vNav;
      tInvStd += initialMonthlyAmount;
      tInvStep += curMonthly;
      lMonth = month;

      // Register outflows (negative)
      cashFlowsStd.push({ date: item.date, amount: -initialMonthlyAmount });
      cashFlowsStep.push({ date: item.date, amount: -curMonthly });
    }

    finalStd.push({
      date: item.date,
      invested: tInvStd,
      value: uStd * vNav,
      units: uStd
    });
    finalStep.push({
      date: item.date,
      invested: tInvStep,
      value: uStep * vNav,
      units: uStep
    });
  });

  // Final inflows (market value) for XIRR calculation
  const lastDate = data[data.length - 1].date;
  const finalValueStdCount = uStd * (targetCAGR !== undefined ? Math.pow(1 + targetCAGR, (lastDate.getTime() - data[0].date.getTime()) / (1000 * 365.25 * 60 * 60 * 24)) : data[data.length - 1].nav);
  const finalValueStepCount = uStep * (targetCAGR !== undefined ? Math.pow(1 + targetCAGR, (lastDate.getTime() - data[0].date.getTime()) / (1000 * 365.25 * 60 * 60 * 24)) : data[data.length - 1].nav);

  // Use the last push value from final arrays for consistency
  const fValueStd = finalStd[finalStd.length - 1].value;
  const fValueStep = finalStep[finalStep.length - 1].value;

  cashFlowsStd.push({ date: lastDate, amount: fValueStd });
  cashFlowsStep.push({ date: lastDate, amount: fValueStep });

  return { 
    standard: finalStd, 
    stepUp: finalStep,
    summary: {
      standardXirr: calculateXIRR(cashFlowsStd),
      stepUpXirr: calculateXIRR(cashFlowsStep)
    }
  };
};

/**
 * Calculates XIRR (Extended Internal Rate of Return) for a series of cash flows.
 * Uses Newton-Raphson method to find the root.
 */
export const calculateXIRR = (cashFlows: { date: Date; amount: number }[]): number => {
  if (cashFlows.length < 2) return 0;

  const maxIter = 100;
  const precision = 0.0000001;
  let x0 = 0.1; // Initial guess: 10%
  let x1 = 0;

  const npv = (rate: number) => {
    return cashFlows.reduce((acc, cf) => {
      const days = (cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24);
      return acc + cf.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };

  const derivative = (rate: number) => {
    return cashFlows.reduce((acc, cf) => {
      const days = (cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24);
      return acc - (days / 365) * cf.amount / Math.pow(1 + rate, days / 365 + 1);
    }, 0);
  };

  for (let i = 0; i < maxIter; i++) {
    const fValue = npv(x0);
    const fPrime = derivative(x0);
    
    x1 = x0 - fValue / fPrime;
    if (Math.abs(x1 - x0) <= precision) return x1;
    x0 = x1;
  }

  return x0; // Fallback to last guess
};

export const analyzeRollingInvestment = (
  rollingReturn: RollingReturn,
  fullData: NavData[],
  amount: number,
  stepUpPercent: number = 0,
  type: 'SIP' | 'Lumpsum' = 'SIP'
) => {
  const rollingData = rollingReturn.data;
  const windowResults: { 
    startDate: Date; 
    endDate: Date; 
    reg: { invested: number; finalValue: number; profit: number; xirr: number };
    step: { invested: number; finalValue: number; profit: number; xirr: number };
  }[] = [];

  for (const window of rollingData) {
    const slice = fullData.slice(window.startIdx, window.endIdx + 1);
    const sim = type === 'SIP' 
      ? calculateSIP(slice, amount, stepUpPercent)
      : calculateLumpsum(slice, amount);

    const lastPointReg = sim.standard[sim.standard.length - 1];
    const lastPointStep = sim.stepUp[sim.stepUp.length - 1];

    windowResults.push({
      startDate: window.startDate,
      endDate: window.date,
      reg: {
        invested: lastPointReg.invested,
        finalValue: lastPointReg.value,
        profit: lastPointReg.value - lastPointReg.invested,
        xirr: sim.summary.standardXirr
      },
      step: {
        invested: lastPointStep.invested,
        finalValue: lastPointStep.value,
        profit: lastPointStep.value - lastPointStep.invested,
        xirr: sim.summary.stepUpXirr
      }
    });
  }

  if (windowResults.length === 0) return null;

  const processMode = (mode: 'reg' | 'step') => {
    // Best/Worst are now anchored to the Lump Sum Extremes for date consistency
    const best = windowResults[rollingReturn.summary.bestIdx];
    const worst = windowResults[rollingReturn.summary.worstIdx];
    const latest = windowResults[windowResults.length - 1];
    
    const sorted = [...windowResults].sort((a, b) => a[mode].xirr - b[mode].xirr);
    const avgXirr = windowResults.reduce((acc, curr) => acc + curr[mode].xirr, 0) / windowResults.length;
    const avgInvested = windowResults.reduce((acc, curr) => acc + curr[mode].invested, 0) / windowResults.length;
    const avgValue = windowResults.reduce((acc, curr) => acc + curr[mode].finalValue, 0) / windowResults.length;
    
    const mid = Math.floor(windowResults.length / 2);
    const median = windowResults.length % 2 !== 0 
      ? sorted[mid] 
      : {
          ...sorted[mid],
          [mode]: {
            ...sorted[mid][mode],
            xirr: (sorted[mid - 1][mode].xirr + sorted[mid][mode].xirr) / 2,
            invested: (sorted[mid - 1][mode].invested + sorted[mid][mode].invested) / 2,
            finalValue: (sorted[mid - 1][mode].finalValue + sorted[mid][mode].finalValue) / 2,
            profit: ((sorted[mid - 1][mode].finalValue + sorted[mid][mode].finalValue) / 2) - ((sorted[mid - 1][mode].invested + sorted[mid][mode].invested) / 2)
          }
        };

    const distribution = [
      { label: '>20% XIRR', min: 0.20, max: Infinity, color: '#10b981' },
      { label: '15–20%', min: 0.15, max: 0.20, color: '#34d399' },
      { label: '10–15%', min: 0.10, max: 0.15, color: '#a7f3d0' },
      { label: '0–10%', min: 0.00, max: 0.10, color: '#e5e7eb' },
      { label: 'Negative', min: -Infinity, max: 0.00, color: '#f43f5e' }
    ].map(bucket => {
      const count = windowResults.filter(r => r[mode].xirr >= bucket.min && r[mode].xirr < bucket.max).length;
      return {
        label: bucket.label,
        count,
        percent: (count / windowResults.length) * 100,
        color: bucket.color
      };
    });

    return {
      scenarios: {
        latest: { ...latest[mode], startDate: latest.startDate, endDate: latest.endDate },
        best: { ...best[mode], startDate: best.startDate, endDate: best.endDate },
        worst: { ...worst[mode], startDate: worst.startDate, endDate: worst.endDate },
        average: {
          startDate: new Date(), 
          endDate: new Date(),
          invested: avgInvested,
          finalValue: avgValue,
          profit: avgValue - avgInvested,
          xirr: avgXirr
        },
        median: { ...median[mode], startDate: median.startDate, endDate: median.endDate }
      },
      distribution
    };
  };

  return {
    reg: processMode('reg'),
    step: processMode('step'),
    totalWindows: windowResults.length
  };
};

export const calculateSinceInception = (data: NavData[]): RollingReturn => {
  if (data.length < 2) {
    return {
      periodDays: 0,
      label: 'Since Inception',
      data: [],
      summary: {
        avg: 0, median: 0, stdDev: 0, totalCount: 0, bestIdx: 0, worstIdx: 0,
        best: { value: 0, range: '-', startDate: new Date(), endDate: new Date(), startNav: 0, endNav: 0, days: 0 },
        worst: { value: 0, range: '-', startDate: new Date(), endDate: new Date(), startNav: 0, endNav: 0, days: 0 },
        buckets: { greaterThan20: { count: 0, percent: 0 }, between10And20: { count: 0, percent: 0 }, between0And10: { count: 0, percent: 0 }, negative: { count: 0, percent: 0 } }
      }
    };
  }

  const start = data[0];
  const end = data[data.length - 1];
  const days = (end.date.getTime() - start.date.getTime()) / (1000 * 60 * 60 * 24);
  const returnVal = calculateCAGR(start.nav, end.nav, days);

  // Simple SIP for this period
  let sipValue = 0;
  let sipInvested = 0;
  let lastMonth = -1;
  for (let k = 0; k < data.length; k++) {
    const d = data[k];
    if (d.date.getMonth() !== lastMonth) {
      const units = 1000 / d.nav;
      sipInvested += 1000;
      sipValue += units * end.nav;
      lastMonth = d.date.getMonth();
    }
  }
  const sipReturn = sipInvested > 0 ? (sipValue - sipInvested) / sipInvested : 0;

  const formatRange = (s: Date, e: Date) => {
    const startStr = s.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const endStr = e.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    return `${startStr} → ${endStr}`;
  };

  const point = {
    date: end.date,
    startDate: start.date,
    startIdx: 0,
    endIdx: data.length - 1,
    returnVal,
    sipReturn,
    days
  };

  return {
    periodDays: Math.round(days),
    label: 'Since Inception',
    data: [point],
    summary: {
      avg: returnVal,
      median: returnVal,
      best: {
        value: returnVal,
        range: formatRange(start.date, end.date),
        startDate: start.date,
        endDate: end.date,
        startNav: start.nav,
        endNav: end.nav,
        days
      },
      worst: {
        value: returnVal,
        range: formatRange(start.date, end.date),
        startDate: start.date,
        endDate: end.date,
        startNav: start.nav,
        endNav: end.nav,
        days
      },
      bestIdx: 0,
      worstIdx: 0,
      stdDev: 0,
      totalCount: 1,
      buckets: {
        greaterThan20: { count: returnVal >= 0.20 ? 1 : 0, percent: returnVal >= 0.20 ? 100 : 0 },
        between10And20: { count: (returnVal >= 0.10 && returnVal < 0.20) ? 1 : 0, percent: (returnVal >= 0.10 && returnVal < 0.20) ? 100 : 0 },
        between0And10: { count: (returnVal >= 0 && returnVal < 0.10) ? 1 : 0, percent: (returnVal >= 0 && returnVal < 0.10) ? 100 : 0 },
        negative: { count: returnVal < 0 ? 1 : 0, percent: returnVal < 0 ? 100 : 0 },
      }
    }
  };
};

export const generateInsights = (results: any, preSebiAvg?: number, postSebiAvg?: number) => {
  const pros = [];
  const cons = [];
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
  
  if (results.cagr > 0.15) pros.push('Strong historical returns (CAGR > 15%).');
  if (results.maxDrawdown < 0.15) pros.push('Low max drawdown observed.');
  if (results.sharpeRatio > 1) pros.push('Excellent risk-adjusted returns (Sharpe > 1).');
  
  if (results.maxDrawdown > 0.3) {
    cons.push('Significant max drawdown (> 30%) - highly volatile.');
    riskLevel = 'High';
  }
  if (results.cagr < 0.08) cons.push('Historical returns are relatively low.');
  if (results.stdDev > 0.2) cons.push('High volatility in yearly returns.');

  // SEBI Context
  if (preSebiAvg !== undefined && postSebiAvg !== undefined) {
    if (preSebiAvg > postSebiAvg + 5) {
      cons.push(`Pre-2018 returns (${preSebiAvg.toFixed(1)}%) were significantly higher than Post-2018 (${postSebiAvg.toFixed(1)}%) due to SEBI reclassification. Future expectations should use the Post-2018 average.`);
    } else if (postSebiAvg > preSebiAvg + 5) {
      pros.push(`The fund has successfully adapted to SEBI reclassification and improved returns Post-2018 (${postSebiAvg.toFixed(1)}%).`);
    }
  }

  if (results.maxDrawdown < 0.1 && results.stdDev < 0.1) riskLevel = 'Low';

  let conclusion = `The fund has delivered ${riskLevel.toLowerCase()} to medium risk performance over the period analyzed. `;
  if (results.cagr > 0.12 && results.maxDrawdown < 0.2) {
    conclusion += 'It shows a good balance of growth and stability.';
  } else if (results.maxDrawdown > 0.25) {
    conclusion += 'Investors should be prepared for significant volatility and potential period of negative returns.';
  } else {
    conclusion += 'It might be suitable for investors with a moderate risk appetite.';
  }

  return { pros, cons, riskLevel, conclusion };
};
