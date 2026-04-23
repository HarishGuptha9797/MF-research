import { NavData, RawNavData, FundMeta } from '../types';
import * as XLSX from 'xlsx';

export const parseDate = (dateVal: string | number): Date | null => {
  if (typeof dateVal === 'number') {
    // Excel serial date support
    try {
      const date = XLSX.SSF.parse_date_code(dateVal);
      return new Date(date.y, date.m - 1, date.d);
    } catch {
      return null;
    }
  }

  const dateStr = String(dateVal).trim();
  if (!dateStr) return null;

  // Normalize separator for manual parsing
  const clean = dateStr.replace(/\//g, "-").replace(/\s+/g, "-").replace(/--/g, "-");
  const parts = clean.split("-");

  // Helper for named months
  const monthMap: { [key: string]: number } = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };

  const getMonthNum = (m: string) => {
    if (!m) return NaN;
    const low = m.toLowerCase();
    if (monthMap[low]) return monthMap[low];
    if (monthMap[low.substring(0, 3)]) return monthMap[low.substring(0, 3)];
    return parseInt(m);
  };

  if (parts.length === 3) {
    let day = NaN, month = NaN, year = NaN;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = +parts[0];
      month = getMonthNum(parts[1]);
      day = +parts[2];
    } else {
      // Typically DD-MM-YYYY in India, but handle DD-MMM-YYYY and MM-DD-YYYY
      const p0 = +parts[0];
      const p1 = getMonthNum(parts[1]);
      // check if parts[1] was a text month
      const isP1Text = /[a-zA-Z]/.test(parts[1]);
      
      if (isP1Text) {
        day = p0;
        month = p1;
      } else {
        if (p0 > 12) {
          day = p0;
          month = p1;
        } else {
          // Default Indian
          day = p0;
          month = p1;
        }
      }
      year = +parts[2];
      if (year < 100) year += year > 50 ? 1900 : 2000;
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  // Try standard JS parsing as fallback (handles many formats like 01-Jan-2024 if not split above)
  const nativeDate = new Date(dateStr);
  if (!isNaN(nativeDate.getTime())) {
    const year = nativeDate.getFullYear();
    if (year > 1900 && year < 2100) return nativeDate;
  }

  return null;
};

export const normalizeData = (rawData: any[]): { data: NavData[]; meta: FundMeta } | null => {
  if (!rawData || rawData.length === 0) return null;

  // Standardize the input as rows (array of arrays or array of objects)
  const isAOA = Array.isArray(rawData[0]);
  
  const clean = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const dateAliases = ['date', 'dated', 'transactiondate', 'navdate', 'transdated', 'navdated'];
  const navAliases = ['nav', 'navvalue', 'netassetvalue', 'closingprice', 'price', 'value', 'navval'];
  const fundNameAliases = ['scheme', 'schemename', 'fund', 'fundname'];
  const fundHouseAliases = ['fundhouse', 'amc', 'mutualfund'];
  const categoryAliases = ['category', 'schemecategory', 'type'];

  let headerIndex = -1;
  let colMap: { [key: string]: number | string } = {};

  const keys = isAOA ? [] : Object.keys(rawData[0]);

  // Scan for headers
  const scanLimit = Math.min(rawData.length, 50);
  for (let i = 0; i < scanLimit; i++) {
    const row = rawData[i];
    
    if (isAOA) {
      const rowArr = row as any[];
      let dIdx = -1, nIdx = -1, sIdx = -1, fhIdx = -1, cIdx = -1;
      
      rowArr.forEach((cell, idx) => {
        const cCell = clean(cell);
        if (dIdx === -1 && dateAliases.some(a => cCell === a || cCell.includes(a))) dIdx = idx;
        if (nIdx === -1 && navAliases.some(a => cCell === a || cCell.includes(a))) nIdx = idx;
        if (sIdx === -1 && fundNameAliases.some(a => cCell === a || cCell.includes(a))) sIdx = idx;
        if (fhIdx === -1 && fundHouseAliases.some(a => cCell === a || cCell.includes(a))) fhIdx = idx;
        if (cIdx === -1 && categoryAliases.some(a => cCell === a || cCell.includes(a))) cIdx = idx;
      });

      if (dIdx !== -1 && nIdx !== -1) {
        headerIndex = i + 1; // Data starts after header
        colMap = { date: dIdx, nav: nIdx, scheme: sIdx, house: fhIdx, category: cIdx };
        break;
      }

      // Value heuristic if no named headers yet
      let hdIdx = -1, hnIdx = -1;
      rowArr.forEach((cell, idx) => {
        if (hdIdx === -1 && parseDate(cell)) hdIdx = idx;
        if (hnIdx === -1 && !isNaN(parseFloat(String(cell).replace(/,/g, ''))) && typeof cell !== 'boolean' && String(cell).length < 20) hnIdx = idx;
      });

      if (hdIdx !== -1 && hnIdx !== -1 && hdIdx !== hnIdx) {
        headerIndex = i; // This row IS data
        colMap = { date: hdIdx, nav: hnIdx };
        break;
      }
    } else {
      // Logic for array of objects (if SheetJS already parsed headers)
      const objKeys = Object.keys(row);
      let dKey = '', nKey = '', sKey = '', fhKey = '', cKey = '';

      objKeys.forEach(k => {
        const ck = clean(k);
        if (!dKey && dateAliases.some(a => ck === a || ck.includes(a))) dKey = k;
        if (!nKey && navAliases.some(a => ck === a || ck.includes(a))) nKey = k;
        if (!sKey && fundNameAliases.some(a => ck === a || ck.includes(a))) sKey = k;
        if (!fhKey && fundHouseAliases.some(a => ck === a || ck.includes(a))) fhKey = k;
        if (!cKey && categoryAliases.some(a => ck === a || ck.includes(a))) cKey = k;
      });

      if (dKey && nKey) {
        headerIndex = i;
        colMap = { date: dKey, nav: nKey, scheme: sKey, house: fhKey, category: cKey };
        break;
      }
    }
  }

  if (headerIndex === -1) return null;

  const validData: NavData[] = [];
  const tableData = rawData.slice(headerIndex);
  
  let fundHouse = 'Unknown';
  let schemeName = 'Portfolio Data';
  let category = 'Mutual Fund';

  // Get metadata from the first row of data or header row
  const firstRow = tableData[0] || rawData[headerIndex - 1];
  if (firstRow) {
    if (colMap.house !== undefined) fundHouse = String(isAOA ? firstRow[colMap.house as number] : firstRow[colMap.house as string] || 'Unknown');
    if (colMap.scheme !== undefined) schemeName = String(isAOA ? firstRow[colMap.scheme as number] : firstRow[colMap.scheme as string] || 'Portfolio Data');
    if (colMap.category !== undefined) category = String(isAOA ? firstRow[colMap.category as number] : firstRow[colMap.category as string] || 'Mutual Fund');
  }

  for (const row of tableData) {
    const rawDate = isAOA ? row[colMap.date as number] : row[colMap.date as string];
    const rawNav = isAOA ? row[colMap.nav as number] : row[colMap.nav as string];

    if (rawDate === undefined || rawNav === undefined) continue;

    const parsedDate = parseDate(rawDate);
    const navStr = String(rawNav).replace(/,/g, '').trim();
    const parsedNav = parseFloat(navStr);

    if (parsedDate && !isNaN(parsedNav)) {
      validData.push({ date: parsedDate, nav: parsedNav });
    }
  }

  if (validData.length === 0) return null;

  validData.sort((a, b) => a.date.getTime() - b.date.getTime());

  const uniqueData: NavData[] = [];
  const seenDates = new Set<number>();
  for (const item of validData) {
    const time = item.date.getTime();
    if (!seenDates.has(time)) {
      uniqueData.push(item);
      seenDates.add(time);
    }
  }

  return {
    data: uniqueData,
    meta: { fundHouse, schemeName, category },
  };
};
