'use strict';

function buildFilters(query = {}) {
  const clauses = [];
  const values = [];
  const add = (sql, value) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };
  if (query.entity) add('entity = ?', query.entity);
  if (query.action) add('action = ?', query.action);
  if (query.user) {
    values.push(`%${query.user}%`);
    clauses.push(`(user_id ILIKE $${values.length} OR user_email ILIKE $${values.length})`);
  }
  if (query.dateFrom) add('occurred_at >= ?', query.dateFrom);
  if (query.dateTo) add('occurred_at <= ?', query.dateTo);
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

function matchesFilters(event, filters = {}) {
  if (filters.entity && event.entity !== filters.entity) return false;
  if (filters.action && event.action !== filters.action) return false;
  if (filters.user) {
    const needle = String(filters.user).toLowerCase();
    if (!String(event.userId || '').toLowerCase().includes(needle) &&
        !String(event.userEmail || '').toLowerCase().includes(needle)) return false;
  }
  return true;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('El evento debe ser un objeto');
  if (!raw.id || !raw.entity || !raw.action || !raw.timestamp || raw.data === undefined) {
    throw new Error('Evento incompleto');
  }
  const timestamp = new Date(raw.timestamp);
  if (Number.isNaN(timestamp.getTime())) throw new Error('Timestamp invalido');
  return {
    id: String(raw.id), entity: String(raw.entity), action: String(raw.action),
    userId: raw.userId == null ? null : String(raw.userId),
    userEmail: raw.userEmail == null ? null : String(raw.userEmail),
    timestamp: timestamp.toISOString(), data: raw.data,
  };
}

module.exports = { buildFilters, matchesFilters, normalizeEvent };
