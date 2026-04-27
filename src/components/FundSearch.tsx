import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, ChevronDown } from 'lucide-react';

interface FundMeta {
  scheme_code: number;
  scheme_name: string;
  fund_house: string;
  scheme_category: string;
}

interface FundSearchProps {
  onFundSelected: (jsonPayload: any[]) => void;
}

export const FundSearch: React.FC<FundSearchProps> = ({ onFundSelected }) => {
  const [funds, setFunds] = useState<FundMeta[]>([]);
  const [isLoadingFunds, setIsLoadingFunds] = useState(true);
  
  const [query, setQuery] = useState('');
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch master list of funds exactly once on load to populate selector
    fetch('/api/funds/all')
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          const text = await res.text();
          throw new Error('Expected JSON, got ' + contentType + ': ' + text.substring(0, 30));
        }
      })
      .then(data => {
        if (Array.isArray(data)) {
          setFunds(data);
        } else {
          console.error('API returned non-array data:', data);
          setFunds([]);
        }
        setIsLoadingFunds(false);
      })
      .catch(err => {
        console.error('Failed to load funds master list', err);
        setFunds([]);
        setIsLoadingFunds(false);
      });
  }, []);

  const filteredFunds = useMemo(() => {
    if (!query) return funds.slice(0, 50); // Show top 50 if empty so it doesn't crash DOM
    const lowerQ = query.toLowerCase();
    // Use local array filtering for instant dropdown performance (no network required)
    return funds.filter(f => f.scheme_name.toLowerCase().includes(lowerQ)).slice(0, 100);
  }, [funds, query]);

  const selectFund = async (fundMeta: FundMeta) => {
    setShowDropdown(false);
    setIsLoadingNav(true);
    setQuery(fundMeta.scheme_name); 
    
    try {
      const res = await fetch(`/api/funds/${fundMeta.scheme_code}/full`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        onFundSelected(data);
      } else {
        const text = await res.text();
        console.error("API returned error or HTML. Content type:", contentType, text.substring(0,50));
        alert("Failed to load NAV data for this fund.");
      }
    } catch(err) {
      console.error(err);
      alert("Error connecting to server.");
    } finally {
      setIsLoadingNav(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {isLoadingFunds ? (
         <div className="flex items-center justify-center gap-2 text-indigo-600 bg-white border-2 border-indigo-100 py-4 rounded-2xl shadow-sm">
           <Loader2 className="w-5 h-5 animate-spin" />
           <span className="font-semibold text-sm">Loading comprehensive fund database...</span>
         </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-700 shadow-sm"
            placeholder="Search for a mutual fund to analyze..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
            {isLoadingNav ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Search className="w-6 h-6" />
            )}
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      )}

      {showDropdown && filteredFunds.length > 0 && !isLoadingNav && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-80 overflow-y-auto">
          {filteredFunds.map((fund) => (
            <button
              key={fund.scheme_code}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-slate-50 last:border-b-0 transition-colors"
              onMouseDown={(e) => {
                // Prevent focus loss which closes the dropdown before click registers
                e.preventDefault();
                selectFund(fund);
              }}
            >
              <div className="text-sm font-bold text-slate-800">{fund.scheme_name}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">Code: {fund.scheme_code}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
