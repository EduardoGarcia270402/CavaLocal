'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFilters, matchesFilters, normalizeEvent } = require('../src/query');

test('construye filtros parametrizados sin interpolar entrada', () => {
  const out = buildFilters({ entity: 'wine', action: 'UPDATE', user: "x' OR 1=1" });
  assert.equal(out.where, 'WHERE entity = $1 AND action = $2 AND (user_id ILIKE $3 OR user_email ILIKE $3)');
  assert.deepEqual(out.values, ['wine', 'UPDATE', "%x' OR 1=1%"]);
});

test('normaliza y valida el contrato del evento', () => {
  const event = normalizeEvent({ id: '1', entity: 'wine', action: 'CREATE', timestamp: '2026-01-01', data: {} });
  assert.equal(event.timestamp, '2026-01-01T00:00:00.000Z');
  assert.throws(() => normalizeEvent({ entity: 'wine' }), /incompleto/);
});

test('aplica filtros SSE por entidad, accion y usuario', () => {
  const event = { entity: 'payment', action: 'PAY', userId: 'u-1', userEmail: 'ana@example.com' };
  assert.equal(matchesFilters(event, { entity: 'payment', action: 'PAY', user: 'ANA@' }), true);
  assert.equal(matchesFilters(event, { entity: 'wine' }), false);
});
