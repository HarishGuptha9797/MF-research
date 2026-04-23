export interface NavData {
  date: Date;
  nav: number;
}

export interface RawNavData {
  fund_house?: string;
  scheme_type?: string;
  scheme_category?: string;
  scheme_code?: string;
  scheme_name?: string;
  isin_growth?: string;
  Date: string | number;
  NAV_Value: string | number;
}

export interface FundMeta {
  fundHouse: string;
  schemeName: string;
  category: string;
}

export interface YearlyReturn {
  year: number;
  startDate: Date;
  endDate: Date;
  startNav: number;
  endNav: number;
  absReturn: number;
  cagr: number;
  returnVal: number; // Keep for internal consistency/sorting if needed, mapping to absReturn
  phase?: string;
  preSebi?: boolean;
}

export interface RollingReturn {
  periodDays: number;
  label: string;
  data: { 
    date: Date; 
    startDate: Date; 
    startIdx: number; 
    endIdx: number; 
    returnVal: number; 
    sipReturn: number;
    days: number;
  }[];
  summary: {
    avg: number;
    median: number;
    best: { 
      value: number; 
      range: string; 
      startDate: Date; 
      endDate: Date;
      startNav: number;
      endNav: number;
      days: number;
    };
    worst: { 
      value: number; 
      range: string; 
      startDate: Date; 
      endDate: Date;
      startNav: number;
      endNav: number;
      days: number;
    };
    bestIdx: number;
    worstIdx: number;
    stdDev: number;
    buckets: {
      greaterThan20: { count: number; percent: number };
      between10And20: { count: number; percent: number };
      between0And10: { count: number; percent: number };
      negative: { count: number; percent: number };
    };
    totalCount: number;
  };
}

export interface SipResult {
  date: Date;
  invested: number;
  value: number;
  units: number;
}

export type SipScenario = 'Historical' | 'Best' | 'Average' | 'Median' | 'Worst';

export interface MonthlyReturn {
  year: number;
  months: { [month: number]: number | null }; // 0 for Jan, 11 for Dec
  ytd: number;
}

export interface AnalysisResults {
  meta: FundMeta;
  data: NavData[];
  cagr: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  romd: number;
  medianYearlyReturn: number;
  stdDev: number;
  latestNav: NavData;
  yearlyReturns: YearlyReturn[];
  monthlyReturns: MonthlyReturn[];
  preSebiAvg?: number;
  postSebiAvg?: number;
  rollingReturns: RollingReturn[];
  sipGrowth: SipResult[];
  stepUpSipGrowth: SipResult[];
  drawdownData: { date: Date; drawdown: number }[];
  insights: {
    pros: string[];
    cons: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
    conclusion: string;
  };
}
