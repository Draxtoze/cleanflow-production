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

export const isoMonthStart = iso => `${String(iso).slice(0, 7)}-01`;
export const monthEnd = monthStart => { const month = new Date(`${monthStart}T12:00:00Z`); month.setUTCMonth(month.getUTCMonth() + 1); return month.toISOString().slice(0, 10); };
export const reportStatus = (start, endExclusive, today = localDate(new Date())) => endExclusive <= today ? 'final' : start > today ? 'forecast' : 'temporary';
const within = (date, start, endExclusive) => date >= start && date < endExclusive;
const assignmentRows = (assignment, apartmentsById, categoriesById) => (assignment.apartments || []).map(apartment => {
  const live = apartmentsById.get(apartment.apartmentId);
  const category = categoriesById.get(live?.categoryId || '');
  return { date: assignment.date, apartmentId: apartment.apartmentId, apartmentName: apartment.name, categoryName: category?.name || '', status: assignment.status, expectedGrosz: assignment.status === 'planned' ? apartment.priceGrosz : 0, confirmedGrosz: assignment.status === 'confirmed' ? apartment.priceGrosz : 0 };
});
export function weeklyStaffReport(data, weekStart) {
  const weekEnd = addDays(weekStart, 7); const apartmentsById = new Map((data.apartments || []).map(item => [item.id, item])); const categoriesById = new Map((data.categories || []).map(item => [item.id, item]));
  const staff = (data.staff || []).filter(person => person.active !== false).sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || a.name.localeCompare(b.name));
  const sections = staff.map(person => {
    const jobs = (data.assignments || []).filter(item => item.staffId === person.id && within(item.date, weekStart, weekEnd));
    const rows = jobs.flatMap(job => assignmentRows(job, apartmentsById, categoriesById)).sort((a, b) => a.date.localeCompare(b.date) || a.apartmentName.localeCompare(b.apartmentName));
    const payments = (data.payments || []).filter(item => item.staffId === person.id && within(item.date, weekStart, weekEnd)).sort((a, b) => a.date.localeCompare(b.date));
    const confirmedToEnd = (data.assignments || []).filter(item => item.staffId === person.id && item.status === 'confirmed' && item.date < weekEnd).reduce((sum, item) => sum + assignmentTotal(item), 0);
    const paidToEnd = (data.payments || []).filter(item => item.staffId === person.id && item.date < weekEnd).reduce((sum, item) => sum + item.amountGrosz, 0);
    return { staff: person, rows, payments, plannedCount: rows.filter(row => row.status === 'planned').length, confirmedCount: rows.filter(row => row.status === 'confirmed').length, expectedGrosz: rows.reduce((sum, row) => sum + row.expectedGrosz, 0), confirmedGrosz: rows.reduce((sum, row) => sum + row.confirmedGrosz, 0), paidGrosz: payments.reduce((sum, payment) => sum + payment.amountGrosz, 0), dueAtEndGrosz: confirmedToEnd - paidToEnd };
  });
  return { weekStart, weekEnd, sections, totals: { plannedCount: sections.reduce((sum, item) => sum + item.plannedCount, 0), confirmedCount: sections.reduce((sum, item) => sum + item.confirmedCount, 0), expectedGrosz: sections.reduce((sum, item) => sum + item.expectedGrosz, 0), confirmedGrosz: sections.reduce((sum, item) => sum + item.confirmedGrosz, 0), paidGrosz: sections.reduce((sum, item) => sum + item.paidGrosz, 0), dueAtEndGrosz: sections.reduce((sum, item) => sum + item.dueAtEndGrosz, 0) } };
}
export function monthlyCategoryReport(data, monthStart, categoryId = '') {
  const end = monthEnd(monthStart); const category = (data.categories || []).find(item => item.id === categoryId); const apartments = (data.apartments || []).filter(item => (item.categoryId || '') === categoryId).sort((a, b) => a.name.localeCompare(b.name));
  const apartmentsById = new Map(apartments.map(item => [item.id, item])); const reservations = (data.reservations || []).filter(item => apartmentsById.has(item.apartmentId) && item.checkIn < end && item.checkOut > monthStart).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const arrivals = reservations.filter(item => within(item.checkIn, monthStart, end)); const departures = reservations.filter(item => within(item.checkOut, monthStart, end));
  const turnovers = departures.filter(out => (data.reservations || []).some(inside => inside.apartmentId === out.apartmentId && inside.checkIn === out.checkOut)).map(out => ({ apartmentId: out.apartmentId, date: out.checkOut }));
  const stayNights = reservation => Math.max(0, Math.round((Date.parse(`${(reservation.checkOut < end ? reservation.checkOut : end)}T00:00:00Z`) - Date.parse(`${(reservation.checkIn > monthStart ? reservation.checkIn : monthStart)}T00:00:00Z`)) / 86400000));
  return { monthStart, monthEnd: end, category: { id: categoryId, name: category?.name || '' }, apartments, reservations, arrivals, departures, turnovers, totalNights: reservations.reduce((sum, item) => sum + stayNights(item), 0), staysByApartment: apartments.map(apartment => ({ apartment, reservations: reservations.filter(item => item.apartmentId === apartment.id) })) };
}