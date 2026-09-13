import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentTotal, monthlyCategoryReport, reportStatus, snapshotApartment, staffSummary, toGrosz, validateBackup, weeklyStaffReport, BACKUP_VERSION } from '../js/business.js';
import { checkoutsOn, checkoutCleaningStatus, formatDmy, parseDmy, validateReservationRecord } from '../js/reservations.js';
import { bookingNightLabel, formatBookingWeekday, priorityLabel, t } from '../js/i18n.js';

const planned = { id: 'a1', staffId: 's1', date: '2026-09-01', status: 'planned', apartments: [{ apartmentId: 'p1', name: 'One', priceGrosz: 12550 }] };
const confirmed = { id: 'a2', staffId: 's1', date: '2026-09-02', status: 'confirmed', apartments: [{ apartmentId: 'p2', name: 'Two', priceGrosz: 9900 }] };
test('money parsing retains grosz exactly', () => { assert.equal(toGrosz('123,45'), 12345); assert.throws(() => toGrosz('1.234')); });
test('planned jobs are not real earnings', () => { assert.deepEqual(staffSummary('s1', [planned, confirmed], []), { expectedGrosz: 12550, confirmedGrosz: 9900, paidGrosz: 0, dueGrosz: 9900 }); });
test('payments may create an overpayment credit', () => { assert.equal(staffSummary('s1', [confirmed], [{ staffId: 's1', amountGrosz: 12000 }]).dueGrosz, -2100); });
test('apartment price snapshot does not change', () => { const snapshot = snapshotApartment({ id: 'p1', name: 'One', priceGrosz: 12550 }); assert.equal(assignmentTotal({ apartments: [snapshot] }), 12550); });
test('backup validation accepts versioned data and rejects bad money', () => { assert.equal(validateBackup({ version: BACKUP_VERSION, data: { staff: [], apartments: [], assignments: [planned], payments: [], settings: [] } }), true); assert.throws(() => validateBackup({ version: BACKUP_VERSION, data: { staff: [], apartments: [], assignments: [{ ...planned, apartments: [{ priceGrosz: 1.5 }] }], payments: [], settings: [] } })); });

test('removing one apartment from a planned assignment lowers only the expected balance', () => {
  const twoApartments = { ...planned, apartments: [...planned.apartments, { apartmentId: 'p3', name: 'Three', priceGrosz: 8750 }] };
  const afterRemoval = { ...twoApartments, apartments: twoApartments.apartments.filter(item => item.apartmentId !== 'p1') };
  assert.equal(staffSummary('s1', [twoApartments], []).expectedGrosz, 21300);
  assert.equal(staffSummary('s1', [afterRemoval], []).expectedGrosz, 8750);
  assert.equal(staffSummary('s1', [afterRemoval], []).dueGrosz, 0);
});
test('backup categories are validated while legacy backups remain importable', () => {
  const modern = { version: BACKUP_VERSION, data: { staff: [], apartments: [], categories: [{ id: 'c1', name: 'City centre' }], assignments: [], payments: [], settings: [] } };
  assert.equal(validateBackup(modern), true);
  assert.throws(() => validateBackup({ ...modern, data: { ...modern.data, categories: {} } }));
  assert.equal(validateBackup({ version: 1, data: { staff: [], apartments: [], assignments: [], payments: [], settings: [] } }), true);
});

const stay = { id: 'r1', apartmentId: 'p1', checkIn: '2026-09-10', checkOut: '2026-09-13', notes: '' };
test('reservation dates accept DD/MM/YYYY input and preserve checkout exclusivity', () => {
  assert.equal(parseDmy('13/09/2026'), '2026-09-13');
  assert.equal(formatDmy('2026-09-13'), '13/09/2026');
  assert.equal(validateReservationRecord(stay, [stay], stay.id), true);
  assert.equal(validateReservationRecord({ ...stay, id: 'r2', checkIn: '2026-09-13', checkOut: '2026-09-15' }, [stay]), true);
});
test('reservation overlaps are rejected but different apartments may overlap', () => {
  assert.throws(() => validateReservationRecord({ ...stay, id: 'r2', checkIn: '2026-09-12', checkOut: '2026-09-15' }, [stay]));
  assert.equal(validateReservationRecord({ ...stay, id: 'r3', apartmentId: 'p2', checkIn: '2026-09-12', checkOut: '2026-09-15' }, [stay]), true);
});
test('checkout cleaning state distinguishes planned, confirmed, ignored and priority-date checkouts', () => {
  const plannedCheckout = { id: 'a3', date: '2026-09-13', status: 'planned', apartments: [{ apartmentId: 'p1', name: 'One', priceGrosz: 100 }] };
  assert.deepEqual(checkoutsOn([stay], '2026-09-13'), [stay]);
  assert.equal(checkoutCleaningStatus('p1', '2026-09-13', [plannedCheckout], []), 'planned');
  assert.equal(checkoutCleaningStatus('p1', '2026-09-13', [{ ...plannedCheckout, status: 'confirmed' }], []), 'confirmed');
  assert.equal(checkoutCleaningStatus('p1', '2026-09-13', [], [{ id: 'skip', apartmentId: 'p1', date: '2026-09-13', status: 'ignored' }]), 'ignored');
});
test('backups keep reservation and checkout information while rejecting conflicts', () => {
  const valid = { version: BACKUP_VERSION, data: { staff: [], apartments: [], assignments: [], payments: [], reservations: [stay], checkoutStates: [{ id: 'skip', apartmentId: 'p1', date: '2026-09-13', status: 'ignored' }], settings: [] } };
  assert.equal(validateBackup(valid), true);
  assert.throws(() => validateBackup({ ...valid, data: { ...valid.data, reservations: [stay, { ...stay, id: 'r2', checkIn: '2026-09-12', checkOut: '2026-09-14' }] } }));
});
test('booking translations use English fallback and Polish plural forms', () => {
  assert.equal(t('unknown', 'bookings.title'), 'Booking schedule');
  assert.equal(bookingNightLabel('pl', 1), 'noc');
  assert.equal(bookingNightLabel('pl', 3), 'noce');
  assert.equal(bookingNightLabel('pl', 5), 'nocy');
  assert.equal(priorityLabel('pl', 5), 'priorytetów');
  assert.equal(formatBookingWeekday('pl', '2026-09-14'), 'Pon');
  assert.equal(formatBookingWeekday('en', '2026-09-14'), 'Mon');
});
test('weekly staff report preserves planned and confirmed financial separation', () => {
  const data = { staff: [{ id: 's1', name: 'Anna', active: true }], apartments: [{ id: 'p1', name: 'One', categoryId: 'c1' }, { id: 'p2', name: 'Two', categoryId: 'c1' }], categories: [{ id: 'c1', name: 'Central' }], assignments: [planned, confirmed], payments: [{ id: 'pay', staffId: 's1', date: '2026-09-02', amountGrosz: 3000 }], reservations: [], checkoutStates: [] };
  const report = weeklyStaffReport(data, '2026-08-31');
  assert.equal(report.sections.length, 1);
  assert.equal(report.totals.expectedGrosz, 12550);
  assert.equal(report.totals.confirmedGrosz, 9900);
  assert.equal(report.totals.paidGrosz, 3000);
  assert.equal(report.sections[0].dueAtEndGrosz, 6900);
  assert.equal(data.assignments[0].status, 'planned');
});
test('monthly category report keeps checkout-exclusive stays and detects turnover', () => {
  const data = { staff: [], assignments: [], payments: [], checkoutStates: [], categories: [{ id: 'c1', name: 'Central' }], apartments: [{ id: 'p1', name: 'One', categoryId: 'c1' }], reservations: [{ id: 'r1', apartmentId: 'p1', checkIn: '2026-08-30', checkOut: '2026-09-03', notes: '' }, { id: 'r2', apartmentId: 'p1', checkIn: '2026-09-03', checkOut: '2026-09-07', notes: '' }] };
  const report = monthlyCategoryReport(data, '2026-09-01', 'c1');
  assert.equal(report.reservations.length, 2);
  assert.equal(report.totalNights, 6);
  assert.equal(report.departures.length, 2);
  assert.deepEqual(report.turnovers, [{ apartmentId: 'p1', date: '2026-09-03' }]);
});
test('report status distinguishes final, temporary and forecast periods', () => {
  assert.equal(reportStatus('2026-09-01', '2026-09-08', '2026-09-10'), 'final');
  assert.equal(reportStatus('2026-09-08', '2026-09-15', '2026-09-10'), 'temporary');
  assert.equal(reportStatus('2026-09-15', '2026-09-22', '2026-09-10'), 'forecast');
});