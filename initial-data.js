// initial-data.js - Výchozí data pro aplikaci Koloběžníkův rozpočet
import { toCents, dbGetAll, dbAdd, dbPut } from './db.js';

// 1. Výchozí pravidelné měsíční výdaje (všechny částky převedené na haléře)
export const DEFAULT_RECURRING_EXPENSES = [
  { name: 'Česká televize', amountCents: toCents('150'), category: 'Bydlení a média', dueDay: 15, active: true },
  { name: 'Vodafone – telefon', amountCents: toCents('266'), category: 'Komunikace', dueDay: 15, active: true },
  { name: 'T-Mobile – internet', amountCents: toCents('450'), category: 'Komunikace', dueDay: 20, active: true },
  { name: 'PVZP – pojištění', amountCents: toCents('400'), category: 'Pojištění', dueDay: 20, active: true },
  { name: 'AvaFin/Crediton – splátka', amountCents: toCents('1100'), category: 'Dluhy a splátky', dueDay: 10, isLoanRepayment: true, active: true },
  { name: 'Provident – splátka', amountCents: toCents('1500'), category: 'Dluhy a splátky', dueDay: 10, isLoanRepayment: true, active: true },
  { name: 'Penzijní příspěvek', amountCents: toCents('100'), category: 'Spoření', dueDay: 15, active: true },
  { name: 'ČEZ – záloha na elektřinu', amountCents: toCents('3000'), category: 'Energie', dueDay: 15, active: true },
  { name: 'Terapie', amountCents: toCents('2000'), category: 'Zdraví a péče', dueDay: 1, active: true },
  { name: 'Investown', amountCents: toCents('500'), category: 'Investice', dueDay: 10, active: true },
  { name: 'ChatGPT Go', amountCents: toCents('200'), category: 'Předplatné a software', dueDay: 1, active: true },
  { name: 'SIPO', amountCents: toCents('77'), category: 'Bydlení', dueDay: 12, active: true },
  { name: 'Spotify', amountCents: toCents('185'), category: 'Zábava', dueDay: 5, active: true },
  { name: 'Google AI Pro', amountCents: toCents('139,90'), category: 'Předplatné a software', dueDay: 8, active: true }
];

// 2. Výchozí půjčky (závazky)
export const DEFAULT_DEBTS_PAYABLE = [
  {
    name: 'Provident',
    principalRemainingCents: toCents('77327,33'),
    monthlyPaymentCents: toCents('1500'),
    dueDay: 10,
    note: 'Snížení k 10. dni v měsíci po potvrzení platby'
  },
  {
    name: 'AvaFin/Crediton',
    principalRemainingCents: toCents('19524'),
    monthlyPaymentCents: toCents('1100'),
    dueDay: 10,
    note: 'Snížení k 10. dni v měsíci po potvrzení platby'
  }
];

// 3. Výchozí pohledávky (peníze, které dluží ostatní mně)
export const DEFAULT_DEBTS_RECEIVABLE = [
  {
    debtor: 'Jiří',
    reason: 'Elektřina a drogerie',
    originalAmountCents: toCents('250'),
    remainingAmountCents: toCents('250'),
    verified: true,
    note: ''
  },
  {
    debtor: 'Jiří',
    reason: 'Fólie na bazén',
    originalAmountCents: toCents('500'),
    remainingAmountCents: toCents('500'),
    verified: true,
    note: ''
  },
  {
    debtor: 'Kov',
    reason: 'Půjčka',
    originalAmountCents: toCents('2500'),
    remainingAmountCents: toCents('2500'),
    verified: true,
    note: ''
  },
  {
    debtor: 'Magda',
    reason: 'Historický záznam (1 200 Kč + 100 Kč)',
    originalAmountCents: toCents('1300'),
    remainingAmountCents: toCents('1300'),
    verified: false, // Označeno jako neověřené dle požadavku
    note: 'Vyžaduje ověření: zda jde o jednu či dvě částky'
  }
];

// 4. Výchozí spořicí cíle a rezerva
export const DEFAULT_SAVINGS_GOALS = [
  { name: 'Celková finanční rezerva a velké výdaje', targetCents: toCents('180000'), allocatedCents: 0, priority: 1 },
  { name: 'Zubní náhrada', targetCents: toCents('30000'), allocatedCents: 0, priority: 2 },
  { name: 'Cestování do Itálie, Monaka a Nice', targetCents: toCents('16000'), allocatedCents: 0, priority: 3 },
  { name: 'Nová koloběžka', targetCents: toCents('25000'), allocatedCents: 0, priority: 4 },
  { name: 'Brikety na zimu', targetCents: toCents('20000'), allocatedCents: 0, priority: 2 },
  { name: 'Právní výdaje', targetCents: toCents('0'), allocatedCents: 0, priority: 3 }
];

// Funkce pro bezpečné jednorázové naplnění databáze
export async function seedInitialData() {
  const existingTemplates = await dbGetAll('recurring_templates');
  if (existingTemplates.length > 0) {
    return false; // Data už existují, nic nepřepisujeme
  }

  // 1. Uložit šablony pravidelných výdajů
  for (const item of DEFAULT_RECURRING_EXPENSES) {
    await dbAdd('recurring_templates', item);
  }

  // 2. Uložit dluhy
  for (const item of DEFAULT_DEBTS_PAYABLE) {
    await dbAdd('debts_payable', item);
  }

  // 3. Uložit pohledávky
  for (const item of DEFAULT_DEBTS_RECEIVABLE) {
    await dbAdd('debts_receivable', item);
  }

  // 4. Uložit spořicí cíle
  for (const item of DEFAULT_SAVINGS_GOALS) {
    await dbAdd('savings_goals', item);
  }

  // 5. Uložit výchozí účty (pro evidenci hotovosti a bankovního účtu)
  await dbAdd('accounts', { name: 'Běžný bankovní účet', balanceCents: 0 });
  await dbAdd('accounts', { name: 'Hotovost v peněžence', balanceCents: 0 });

  return true;
}
