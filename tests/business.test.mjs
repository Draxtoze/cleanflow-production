import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentTotal, snapshotApartment, staffSummary, toGrosz, validateBackup, BACKUP_VERSION } from '../js/business.js';

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
