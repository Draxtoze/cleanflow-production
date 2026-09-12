import { validateReservationRecord } from './reservations.js';

export const BACKUP_VERSION = 3;
export const toGrosz = value => {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a valid PLN amount with no more than two decimal places.');
  return Math.round(Number(normalized) * 100);
};
export const formatPLN = grosz => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format((Number(grosz) || 0) / 100);
export const id = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const localDate = date => new Date(date).toLocaleDateString('en-CA');
export const addDays = (date, number) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + number); return localDate(next); };
export const weekDays = anchor => { const date = new Date(`${anchor}T12:00:00`); const offset = (date.getDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => addDays(localDate(date), i - offset)); };
export const snapshotApartment = apartment => ({ apartmentId: apartment.id, name: apartment.name, priceGrosz: apartment.priceGrosz });
export function assignmentTotal(assignment) { return assignment.apartments.reduce((sum, item) => sum + item.priceGrosz, 0); }
export function staffSummary(staffId, assignments, payments) {
  const own = assignments.filter(item => item.staffId === staffId);
  const expectedGrosz = own.filter(item => item.status === 'planned').reduce((sum, item) => sum + assignmentTotal(item), 0);
  const confirmedGrosz = own.filter(item => item.status === 'confirmed').reduce((sum, item) => sum + assignmentTotal(item), 0);
  const paidGrosz = payments.filter(item => item.staffId === staffId).reduce((sum, item) => sum + item.amountGrosz, 0);
  return { expectedGrosz, confirmedGrosz, paidGrosz, dueGrosz: confirmedGrosz - paidGrosz };
}
export function validateBackup(data) {
  if (!data || ![1, 2, BACKUP_VERSION].includes(data.version) || !data.data || typeof data.data !== 'object') throw new Error('This is not a supported CleanFlow backup.');
  for (const key of ['staff', 'apartments', 'assignments', 'payments', 'settings']) if (!Array.isArray(data.data[key])) throw new Error(`Backup is missing a valid ${key} collection.`);
  for (const key of ['categories', 'reservations', 'checkoutStates']) if (data.data[key] !== undefined && !Array.isArray(data.data[key])) throw new Error(`Backup is missing a valid ${key} collection.`);
  for (const assignment of data.data.assignments) {
    if (!assignment.id || !assignment.staffId || !/^\d{4}-\d{2}-\d{2}$/.test(assignment.date) || !['planned', 'confirmed'].includes(assignment.status) || !Array.isArray(assignment.apartments)) throw new Error('The backup contains an invalid assignment.');
    if (assignment.apartments.some(apartment => !Number.isInteger(apartment.priceGrosz) || apartment.priceGrosz < 0)) throw new Error('The backup contains an invalid money snapshot.');
  }
  if (data.data.payments.some(payment => !payment.id || !payment.staffId || !Number.isInteger(payment.amountGrosz) || payment.amountGrosz <= 0)) throw new Error('The backup contains an invalid payment.');
  const reservations = data.data.reservations || [];
  reservations.forEach(reservation => validateReservationRecord(reservation, reservations, reservation.id));
  for (const state of data.data.checkoutStates || []) if (!state.id || !state.apartmentId || !/^\d{4}-\d{2}-\d{2}$/.test(state.date) || !['ignored'].includes(state.status)) throw new Error('The backup contains an invalid checkout state.');
  return true;
}
