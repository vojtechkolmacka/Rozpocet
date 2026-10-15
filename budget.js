// budget.js - Finanční logika pro měsíční rozpočty a platby
import { dbGetAll, dbAdd, dbPut, toCents } from './db.js';

/**
 * Vrátí textový klíč období ve formátu "YYYY-MM" (např. "2026-10")
 */
export function getPeriodKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Zajistí, že pro dané období existují záznamy plateb vygenerované ze šablon
 */
export async function ensureMonthInitialized(periodKey) {
  const allMonthly = await dbGetAll('monthly_expenses');
  const monthItems = allMonthly.filter(item => item.period === periodKey);

  // Pokud pro tento měsíc již záznamy máme, nic nového negenerujeme
  if (monthItems.length > 0) {
    return monthItems;
  }

  // Načteme aktivní šablony pravidelných výdajů
  const templates = await dbGetAll('recurring_templates');
  const activeTemplates = templates.filter(t => t.active !== false);

  const createdItems = [];
  for (const t of activeTemplates) {
    const newItem = {
      templateId: t.id,
      name: t.name,
      category: t.category,
      plannedAmountCents: t.amountCents,
      paidAmountCents: 0,
      dueDay: t.dueDay,
      period: periodKey,
      isPaid: false,
      paidDate: null,
      isLoanRepayment: !!t.isLoanRepayment,
      note: ''
    };
    const id = await dbAdd('monthly_expenses', newItem);
    newItem.id = id;
    createdItems.push(newItem);
  }

  return createdItems;
}

/**
 * Přepne stav zaplacení položky (zaplaceno / nezaplaceno)
 */
export async function toggleExpensePaid(expenseId, isPaidNow, actualPaidCents = null) {
  const allExpenses = await dbGetAll('monthly_expenses');
  const expense = allExpenses.find(e => e.id === expenseId);
  if (!expense) return null;

  if (isPaidNow) {
    expense.isPaid = true;
    expense.paidAmountCents = actualPaidCents !== null ? actualPaidCents : expense.plannedAmountCents;
    expense.paidDate = new Date().toISOString().slice(0, 10);
  } else {
    expense.isPaid = false;
    expense.paidAmountCents = 0;
    expense.paidDate = null;
  }

  await dbPut('monthly_expenses', expense);
  return expense;
}

/**
 * Spočítá celkovou finanční bilanci pro dané období
 */
export async function getMonthSummary(periodKey) {
  const allExpenses = await dbGetAll('monthly_expenses');
  const monthExpenses = allExpenses.filter(e => e.period === periodKey);

  const allIncomes = await dbGetAll('incomes');
  const monthIncomes = allIncomes.filter(i => i.period === periodKey);

  let plannedExpensesCents = 0;
  let paidExpensesCents = 0;
  let unpaidExpensesCents = 0;

  for (const exp of monthExpenses) {
    plannedExpensesCents += exp.plannedAmountCents;
    if (exp.isPaid) {
      paidExpensesCents += exp.paidAmountCents;
    } else {
      unpaidExpensesCents += exp.plannedAmountCents;
    }
  }

  const receivedIncomesCents = monthIncomes
    .filter(inc => inc.isReceived)
    .reduce((sum, inc) => sum + inc.amountCents, 0);

  return {
    period: periodKey,
    totalPlannedExpensesCents: plannedExpensesCents,
    totalPaidExpensesCents: paidExpensesCents,
    totalUnpaidExpensesCents: unpaidExpensesCents,
    totalReceivedIncomesCents: receivedIncomesCents,
    netCashFlowCents: receivedIncomesCents - paidExpensesCents,
    expensesCount: monthExpenses.length,
    paidCount: monthExpenses.filter(e => e.isPaid).length
  };
}
