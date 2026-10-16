// debts.js - Správa půjček a splátek s ochranou proti dvojímu odečtení
import { dbGetAll, dbPut, toCents } from './db.js';

/**
 * Zkontroluje a vrátí stav půjček pro daný měsíc (zda už byla splátka potvrzena)
 */
export async function getDebtsWithMonthlyStatus(periodKey) {
  const debts = await dbGetAll('debts_payable');

  return debts.map(debt => {
    if (!debt.paymentHistory) {
      debt.paymentHistory = [];
    }

    const paymentThisMonth = debt.paymentHistory.find(p => p.period === periodKey);

    return {
      ...debt,
      isPaidThisMonth: !!paymentThisMonth,
      paidDetails: paymentThisMonth || null
    };
  });
}

/**
 * Potvrdí úhradu splátky pro daný měsíc a bezpečně sníží jistinu
 */
export async function confirmDebtPayment(debtId, periodKey, customAmountCents = null) {
  const debts = await dbGetAll('debts_payable');
  const debt = debts.find(d => d.id === debtId);
  if (!debt) return null;

  if (!debt.paymentHistory) {
    debt.paymentHistory = [];
  }

  // OCHRANA: Pokud už platba v tomto měsíci existuje, neodečítáme znovu
  const existing = debt.paymentHistory.find(p => p.period === periodKey);
  if (existing) {
    return debt;
  }

  const paymentAmountCents = customAmountCents !== null ? customAmountCents : debt.monthlyPaymentCents;

  // Snížení jistiny (nesmí klesnout pod nulu)
  debt.principalRemainingCents = Math.max(0, debt.principalRemainingCents - paymentAmountCents);
  debt.lastPaymentDate = new Date().toISOString().slice(0, 10);

  debt.paymentHistory.push({
    period: periodKey,
    amountCents: paymentAmountCents,
    date: debt.lastPaymentDate
  });

  await dbPut('debts_payable', debt);
  return debt;
}

/**
 * Zruší potvrzení splátky (vrátí jistinu zpět při omylu)
 */
export async function revertDebtPayment(debtId, periodKey) {
  const debts = await dbGetAll('debts_payable');
  const debt = debts.find(d => d.id === debtId);
  if (!debt || !debt.paymentHistory) return null;

  const paymentIndex = debt.paymentHistory.findIndex(p => p.period === periodKey);
  if (paymentIndex === -1) return debt;

  const removedPayment = debt.paymentHistory[paymentIndex];
  debt.principalRemainingCents += removedPayment.amountCents;
  debt.paymentHistory.splice(paymentIndex, 1);

  await dbPut('debts_payable', debt);
  return debt;
}

/**
 * Ruční oprava zůstatku jistiny podle výpisu věřitele
 */
export async function updateDebtPrincipal(debtId, newPrincipalCents) {
  const debts = await dbGetAll('debts_payable');
  const debt = debts.find(d => d.id === debtId);
  if (!debt) return null;

  debt.principalRemainingCents = newPrincipalCents;
  await dbPut('debts_payable', debt);
  return debt;
}
