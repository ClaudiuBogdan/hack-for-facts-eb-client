import { useState, useEffect, useMemo } from 'react';
import { GroupedChapter, GroupedFunctional, GroupedEconomic, GroupedSubchapter } from '@/schemas/financial';
import { ExecutionLineItem } from '@/lib/api/entities';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { match } from '@/components/entities/highlight-utils';
import { useChapterMap, useIncomeSubchapterMap } from '@/lib/analytics-utils';
import { getEconomicChapterName, getEconomicSubchapterName } from '@/lib/economic-classifications';

// Keeping local type helpers minimal to avoid unused warnings

const robustTrim = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/\uFEFF/g, '')
    .trim();

const twoDigitFromAnyCode = (codeLike: string | number | null | undefined): string | null => {
  if (codeLike == null) return null;
  const raw = robustTrim(String(codeLike)).replace(/\.$/, '');
  const m = raw.match(/^(\d{2})/);
  return m ? m[1] : null;
};

const twoGroupFromAnyCode = (codeLike: string | number | null | undefined): string | null => {
  if (codeLike == null) return null;
  const raw = robustTrim(String(codeLike)).replace(/\.$/, '');
  const m = raw.match(/^(\d{2})\.(\d{2})/);
  return m ? `${m[1]}.${m[2]}` : null;
};

// Chapter map and income subchapter map are now loaded lazily via React Query hooks

export type MinimalExecutionLineItem = Pick<ExecutionLineItem, 'account_category' | 'amount' | 'functionalClassification' | 'economicClassification'>

const groupByFunctional = (
  items: MinimalExecutionLineItem[],
  chapterMap: Map<string, string>
): GroupedChapter[] => {
  type EconAgg = { name: string; amount: number };
  type FuncAgg = { economics: Map<string, EconAgg>; total: number; name: string };
  type ChapterAgg = { functionals: Map<string, FuncAgg>; total: number; description?: string };

  const chapters = new Map<string, ChapterAgg>();

  for (const item of items) {
    const funcCodeRaw = item.functionalClassification?.functional_code;
    if (!funcCodeRaw) continue;

    const funcCode = robustTrim(funcCodeRaw);
    if (!funcCode || funcCode === '00.00.00' || funcCode === '0') continue;

    const prefix = twoDigitFromAnyCode(funcCode);
    if (!prefix) continue;

    // Ensure chapter bucket (use map description if known)
    let chapter = chapters.get(prefix);
    if (!chapter) {
      chapter = {
        functionals: new Map(),
        total: 0,
        description: chapterMap.get(prefix) ?? 'Neclasificat',
      };
      chapters.set(prefix, chapter);
    }

    // Functional bucket
    const funcName = robustTrim(item.functionalClassification?.functional_name) || 'Unknown';
    let functional = chapter.functionals.get(funcCode);
    if (!functional) {
      functional = { economics: new Map(), total: 0, name: funcName };
      chapter.functionals.set(funcCode, functional);
    }

    const amount = item.amount || 0;
    functional.total += amount;
    chapter.total += amount;

    // Economics
    const ecoCodeRaw = item.economicClassification?.economic_code;
    if (ecoCodeRaw && ecoCodeRaw !== '0' && ecoCodeRaw !== '00.00.00') {
      const ecoCode = robustTrim(ecoCodeRaw);
      if (ecoCode) {
        const ecoName = robustTrim(item.economicClassification?.economic_name) || 'Unknown';
        let econ = functional.economics.get(ecoCode);
        if (!econ) {
          econ = { name: ecoName, amount: 0 };
          functional.economics.set(ecoCode, econ);
        }
        econ.amount += amount;
      }
    }
  }

  // Materialize & sort
  const out: GroupedChapter[] = [];
  chapters.forEach((ch, prefix) => {
    const functionals: GroupedFunctional[] = [];
    ch.functionals.forEach((f, code) => {
      const economics: GroupedEconomic[] = Array.from(f.economics, ([ecoCode, eco]) => ({
        code: ecoCode,
        name: eco.name,
        amount: eco.amount,
      })).sort((a, b) => b.amount - a.amount);

      functionals.push({ code, name: f.name, totalAmount: f.total, economics });
    });

    functionals.sort((a, b) => b.totalAmount - a.totalAmount);
    out.push({
      prefix,
      description: ch.description ?? chapterMap.get(prefix) ?? 'Neclasificat',
      totalAmount: ch.total,
      functionals,
    });
  });

  out.sort((a, b) => b.totalAmount - a.totalAmount);
  return out;
};

const twoDigitEco = (codeLike: string | number | null | undefined): string | null => {
  if (codeLike == null) return null;
  const raw = robustTrim(String(codeLike)).replace(/\.$/, '');
  const m = raw.match(/^(\d{2})/);
  return m ? m[1] : null;
};

const twoGroupEco = (codeLike: string | number | null | undefined): string | null => {
  if (codeLike == null) return null;
  const raw = robustTrim(String(codeLike)).replace(/\.$/, '');
  const m = raw.match(/^(\d{2})\.(\d{2})/);
  return m ? `${m[1]}.${m[2]}` : null;
};

const groupByEconomic = (
  items: MinimalExecutionLineItem[],
): GroupedChapter[] => {
  type FuncAgg = { total: number; name: string };
  type SubAgg = { functionals: Map<string, FuncAgg>; total: number; name: string };
  type ChapterAgg = {
    functionals: Map<string, FuncAgg>; // functionals without a subchapter
    subchapters: Map<string, SubAgg>;
    total: number;
    description?: string;
  };

  const chapters = new Map<string, ChapterAgg>();

  for (const item of items) {
    const ecoCodeRaw = item.economicClassification?.economic_code;
    if (!ecoCodeRaw) continue;

    const ecoCode = robustTrim(ecoCodeRaw);
    if (!ecoCode || ecoCode === '00.00.00' || ecoCode === '0') continue;

    const prefix = twoDigitEco(ecoCode);
    if (!prefix) continue;

    let chapter = chapters.get(prefix);
    if (!chapter) {
      chapter = {
        functionals: new Map(),
        subchapters: new Map(),
        total: 0,
        description: getEconomicChapterName(prefix) ?? 'Neclasificat',
      };
      chapters.set(prefix, chapter);
    }

    const subPrefix = twoGroupEco(ecoCode);
    const subName = subPrefix ? getEconomicSubchapterName(subPrefix) ?? null : null;
    const amount = item.amount || 0;
    const funcCode = robustTrim(item.functionalClassification?.functional_code) || '';
    const funcName = robustTrim(item.functionalClassification?.functional_name) || 'Unknown';

    const pushIntoFunctional = (container: Map<string, FuncAgg>) => {
      let functional = container.get(funcCode);
      if (!functional) {
        functional = { total: 0, name: funcName };
        container.set(funcCode, functional);
      }
      functional.total += amount;
    };

    if (subPrefix && subName) {
      let sub = chapter.subchapters.get(subPrefix);
      if (!sub) {
        sub = { functionals: new Map(), total: 0, name: subName };
        chapter.subchapters.set(subPrefix, sub);
      }
      pushIntoFunctional(sub.functionals);
      sub.total += amount;
    } else {
      // fallback: put directly under chapter
      pushIntoFunctional(chapter.functionals);
    }

    chapter.total += amount;
  }

  const out: GroupedChapter[] = [];
  chapters.forEach((ch, prefix) => {
    const functionals: GroupedFunctional[] = [];
    ch.functionals.forEach((f, code) => {
      functionals.push({ code, name: f.name, totalAmount: f.total, economics: [] });
    });
    functionals.sort((a, b) => b.totalAmount - a.totalAmount);

    const subchapters: GroupedSubchapter[] = [];
    ch.subchapters.forEach((s, code) => {
      const subFunctionals: GroupedFunctional[] = [];
      s.functionals.forEach((f, fCode) => {
        subFunctionals.push({ code: fCode, name: f.name, totalAmount: f.total, economics: [] });
      });
      subFunctionals.sort((a, b) => b.totalAmount - a.totalAmount);
      subchapters.push({ code, name: s.name, totalAmount: s.total, functionals: subFunctionals });
    });
    subchapters.sort((a, b) => b.totalAmount - a.totalAmount);

    out.push({
      prefix,
      description: ch.description ?? getEconomicChapterName(prefix) ?? 'Neclasificat',
      totalAmount: ch.total,
      functionals,
      subchapters,
    });
  });

  out.sort((a, b) => b.totalAmount - a.totalAmount);
  return out;
};

/** Group incomes by subchapter (NN.MM) inside each chapter. Expenses remain chapter → functional. */
const groupIncomeBySubchapter = (
  items: MinimalExecutionLineItem[],
  incomeSubchapterMap: Map<string, string>,
  chapterMap: Map<string, string>
): GroupedChapter[] => {
  type EconAgg = { name: string; amount: number };
  type FuncAgg = { economics: Map<string, EconAgg>; total: number; name: string };
  type SubAgg = { functionals: Map<string, FuncAgg>; total: number; name: string };
  type ChapterAgg = {
    functionals: Map<string, FuncAgg>; // functionals without a subchapter
    subchapters: Map<string, SubAgg>;
    total: number;
    description?: string;
  };

  const chapters = new Map<string, ChapterAgg>();

  for (const item of items) {
    const funcCodeRaw = item.functionalClassification?.functional_code;
    if (!funcCodeRaw) continue;

    const funcCode = robustTrim(funcCodeRaw);
    if (!funcCode || funcCode === '00.00.00' || funcCode === '0') continue;

    const prefix = twoDigitFromAnyCode(funcCode);
    if (!prefix) continue;

    let chapter = chapters.get(prefix);
    if (!chapter) {
      chapter = {
        functionals: new Map(),
        subchapters: new Map(),
        total: 0,
        description: chapterMap.get(prefix) ?? 'Neclasificat',
      };
      chapters.set(prefix, chapter);
    }

    const subPrefix = twoGroupFromAnyCode(funcCode);
    const subName = subPrefix ? incomeSubchapterMap.get(subPrefix) ?? null : null;
    const amount = item.amount || 0;
    const funcName = robustTrim(item.functionalClassification?.functional_name) || 'Unknown';

    const pushIntoFunctional = (container: Map<string, FuncAgg>) => {
      let functional = container.get(funcCode);
      if (!functional) {
        functional = { economics: new Map(), total: 0, name: funcName };
        container.set(funcCode, functional);
      }
      functional.total += amount;

      const ecoCodeRaw = item.economicClassification?.economic_code;
      if (ecoCodeRaw && ecoCodeRaw !== '0' && ecoCodeRaw !== '00.00.00') {
        const ecoCode = robustTrim(ecoCodeRaw);
        if (ecoCode) {
          const ecoName = robustTrim(item.economicClassification?.economic_name) || 'Unknown';
          let econ = functional.economics.get(ecoCode);
          if (!econ) {
            econ = { name: ecoName, amount: 0 };
            functional.economics.set(ecoCode, econ);
          }
          econ.amount += amount;
        }
      }
    };

    if (subPrefix && subName) {
      let sub = chapter.subchapters.get(subPrefix);
      if (!sub) {
        sub = {
          functionals: new Map(),
          total: 0,
          name: subName,
        };
        chapter.subchapters.set(subPrefix, sub);
      }
      pushIntoFunctional(sub.functionals);
      sub.total += amount;
    } else {
      // fallback: put directly under chapter
      pushIntoFunctional(chapter.functionals);
    }

    chapter.total += amount;
  }

  const out: GroupedChapter[] = [];
  chapters.forEach((ch, prefix) => {
    const functionals: GroupedFunctional[] = [];
    ch.functionals.forEach((f, code) => {
      const economics: GroupedEconomic[] = Array.from(f.economics, ([ecoCode, eco]) => ({
        code: ecoCode,
        name: eco.name,
        amount: eco.amount,
      })).sort((a, b) => b.amount - a.amount);
      functionals.push({ code, name: f.name, totalAmount: f.total, economics });
    });
    functionals.sort((a, b) => b.totalAmount - a.totalAmount);

    const subchapters: GroupedSubchapter[] = [];
    ch.subchapters.forEach((s, code) => {
      const subFunctionals: GroupedFunctional[] = [];
      s.functionals.forEach((f, fCode) => {
        const economics: GroupedEconomic[] = Array.from(f.economics, ([ecoCode, eco]) => ({
          code: ecoCode,
          name: eco.name,
          amount: eco.amount,
        })).sort((a, b) => b.amount - a.amount);
        subFunctionals.push({ code: fCode, name: f.name, totalAmount: f.total, economics });
      });
      subFunctionals.sort((a, b) => b.totalAmount - a.totalAmount);
      subchapters.push({ code, name: s.name, totalAmount: s.total, functionals: subFunctionals });
    });
    subchapters.sort((a, b) => b.totalAmount - a.totalAmount);

    out.push({
      prefix,
      description: ch.description ?? chapterMap.get(prefix) ?? 'Neclasificat',
      totalAmount: ch.total,
      functionals,
      subchapters,
    });
  });

  out.sort((a, b) => b.totalAmount - a.totalAmount);
  return out;
};

const filterGroups = (
  groups: GroupedChapter[],
  term: string,
  options?: { subchapterCodePrefix?: 'fn' | 'ec' }
): GroupedChapter[] => {
  const query = term.trim();
  if (!query) return groups;
  const subchapterCodePrefix = options?.subchapterCodePrefix ?? 'fn';

  const filtered = new Map<string, GroupedChapter>();

  groups.forEach((chapter) => {
    const chapterText = `${chapter.description} ${chapter.prefix}`;
    const chapterMatches = match(chapterText, query).length > 0;

    if (chapterMatches) {
      filtered.set(chapter.prefix, { ...chapter });
      return;
    }

    const matchedFunctionals: GroupedFunctional[] = [];
    const matchedSubchapters: GroupedSubchapter[] = [];

    // When subchapters exist, filter inside them first
    chapter.subchapters?.forEach((sub) => {
      const subText = `${sub.name} ${subchapterCodePrefix}:${sub.code}`;
      const subMatches = match(subText, query).length > 0;

      if (subMatches) {
        matchedSubchapters.push({ ...sub });
        return;
      }

      const subFuncs: GroupedFunctional[] = [];
      sub.functionals.forEach((func) => {
        const funcText = `${func.name} fn:${func.code}`;
        const funcMatches = match(funcText, query).length > 0;
        if (funcMatches) {
          subFuncs.push({ ...func });
          return;
        }

        const matchedEconomics: GroupedEconomic[] = [];
        func.economics.forEach((eco) => {
          const ecoText = `${eco.name} ec:${eco.code}`;
          if (match(ecoText, query).length > 0) {
            matchedEconomics.push({ ...eco });
          }
        });

        if (matchedEconomics.length > 0) {
          const newTotal = matchedEconomics.reduce((s, e) => s + e.amount, 0);
          subFuncs.push({ ...func, economics: matchedEconomics, totalAmount: newTotal });
        }
      });

      if (subFuncs.length > 0) {
        const newTotal = subFuncs.reduce((s, f) => s + f.totalAmount, 0);
        matchedSubchapters.push({ ...sub, functionals: subFuncs.sort((a, b) => b.totalAmount - a.totalAmount), totalAmount: newTotal });
      }
    });

    // Also check functionals directly under chapter (for items outside subchapters)
    chapter.functionals.forEach((func) => {
      const funcText = `${func.name} fn:${func.code}`;
      const funcMatches = match(funcText, query).length > 0;

      if (funcMatches) {
        matchedFunctionals.push({ ...func });
        return;
      }

      const matchedEconomics: GroupedEconomic[] = [];
      func.economics.forEach((eco) => {
        const ecoText = `${eco.name} ec:${eco.code}`;
        if (match(ecoText, query).length > 0) {
          matchedEconomics.push({ ...eco });
        }
      });

      if (matchedEconomics.length > 0) {
        const newTotal = matchedEconomics.reduce((s, e) => s + e.amount, 0);
        matchedFunctionals.push({ ...func, economics: matchedEconomics, totalAmount: newTotal });
      }
    });

    if (matchedFunctionals.length > 0 || matchedSubchapters.length > 0) {
      const totalFromFuncs = matchedFunctionals.reduce((s, f) => s + f.totalAmount, 0);
      const totalFromSubs = matchedSubchapters.reduce((s, sub) => s + sub.totalAmount, 0);
      const newChapterTotal = totalFromFuncs + totalFromSubs;
      filtered.set(chapter.prefix, {
        ...chapter,
        functionals: matchedFunctionals.sort((a, b) => b.totalAmount - a.totalAmount),
        subchapters: matchedSubchapters,
        totalAmount: newChapterTotal,
      });
    }
  });

  return Array.from(filtered.values()).sort((a, b) => b.totalAmount - a.totalAmount);
};

/** ---------- hook ---------- **/
export const useFinancialData = (
  lineItems: MinimalExecutionLineItem[],
  totalIncome: number | null,
  totalExpenses: number | null,
  initialExpenseSearchTerm?: string,
  initialIncomeSearchTerm?: string,
  options?: { computeEconomic?: boolean }
) => {
  // Lazy maps
  const { data: chapterMap = new Map<string, string>() } = useChapterMap();
  const { data: incomeSubchapterMap = new Map<string, string>() } = useIncomeSubchapterMap();

  const [expenseSearchTerm, setExpenseSearchTerm] = useState(initialExpenseSearchTerm ?? '');
  const [incomeSearchTerm, setIncomeSearchTerm] = useState(initialIncomeSearchTerm ?? '');
  const [expenseSearchActive, setExpenseSearchActive] = useState(!!initialExpenseSearchTerm);
  const [incomeSearchActive, setIncomeSearchActive] = useState(!!initialIncomeSearchTerm);

  useEffect(() => {
    const nextTerm = initialExpenseSearchTerm ?? '';
    if (expenseSearchTerm !== nextTerm) {
      setExpenseSearchTerm(nextTerm);
    }
  }, [initialExpenseSearchTerm, expenseSearchTerm]);

  useEffect(() => {
    const nextTerm = initialIncomeSearchTerm ?? '';
    if (incomeSearchTerm !== nextTerm) {
      setIncomeSearchTerm(nextTerm);
    }
  }, [initialIncomeSearchTerm, incomeSearchTerm]);

  const debouncedExpenseSearchTerm = useDebouncedValue(expenseSearchTerm, 300);
  const debouncedIncomeSearchTerm = useDebouncedValue(incomeSearchTerm, 300);

  const expenses = useMemo(() => lineItems.filter((li) => li.account_category === 'ch'), [lineItems]);
  const incomes = useMemo(() => lineItems.filter((li) => li.account_category === 'vn'), [lineItems]);

  // Group using lazily loaded maps
  const expenseGroups = useMemo(() => groupByFunctional(expenses, chapterMap), [expenses, chapterMap]);
  const incomeGroups = useMemo(() => groupIncomeBySubchapter(incomes, incomeSubchapterMap, chapterMap), [incomes, incomeSubchapterMap, chapterMap]);
  const economicGroups = useMemo(() => (options?.computeEconomic ? groupByEconomic(expenses) : []), [expenses, options?.computeEconomic]);

  const filteredExpenseGroups = useMemo(
    () => filterGroups(expenseGroups, debouncedExpenseSearchTerm),
    [expenseGroups, debouncedExpenseSearchTerm]
  );
  const filteredIncomeGroups = useMemo(
    () => filterGroups(incomeGroups, debouncedIncomeSearchTerm),
    [incomeGroups, debouncedIncomeSearchTerm]
  );
  const filteredEconomicGroups = useMemo(
    () => filterGroups(economicGroups, debouncedExpenseSearchTerm, { subchapterCodePrefix: 'ec' }),
    [economicGroups, debouncedExpenseSearchTerm]
  );

  const expenseBase = useMemo(
    () => totalExpenses ?? expenseGroups.reduce((sum, ch) => sum + ch.totalAmount, 0),
    [totalExpenses, expenseGroups]
  );
  const incomeBase = useMemo(
    () => totalIncome ?? incomeGroups.reduce((sum, ch) => sum + ch.totalAmount, 0),
    [totalIncome, incomeGroups]
  );

  return {
    expenseSearchTerm,
    onExpenseSearchChange: setExpenseSearchTerm,
    expenseSearchActive,
    onExpenseSearchToggle: setExpenseSearchActive,
    debouncedExpenseSearchTerm,
    filteredExpenseGroups,
    expenseBase,
    incomeSearchTerm,
    onIncomeSearchChange: setIncomeSearchTerm,
    incomeSearchActive,
    onIncomeSearchToggle: setIncomeSearchActive,
    debouncedIncomeSearchTerm,
    filteredIncomeGroups,
    incomeBase,
    filteredEconomicGroups,
    economicGroups,
  };
};
