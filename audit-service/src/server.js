'use strict';

const amqp = require('amqplib');
const cors = require('cors');
const express = require('express');
const { Pool, Client } = require('pg');
const { buildFilters, matchesFilters, normalizeEvent } = require('./query');

const port = Number(process.env.PORT || 3002);
const databaseUrl = process.env.DATABASE_URL || 'postgresql://audit:audit@localhost:5432/audit';
const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const pool = new Pool({ connectionString: databaseUrl });
const clients = new Set();
let rabbitConnection;
let rabbitReady = false;
let shuttingDown = false;

const rowToEvent = (row) => ({
  id: row.id, entity: row.entity, action: row.action,
  userId: row.user_id, userEmail: row.user_email,
  timestamp: row.occurred_at.toISOString(), data: row.data,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      occurred_at TIMESTAMPTZ NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity);
    CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events(action);
    CREATE INDEX IF NOT EXISTS audit_events_user_id_idx ON audit_events(user_id);
    CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events(occurred_at DESC);
  `);
}

async function persist(event) {
  const result = await pool.query(
    `INSERT INTO audit_events(id, entity, action, user_id, user_email, occurred_at, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING *`,
    [event.id, event.entity, event.action, event.userId, event.userEmail, event.timestamp, event.data],
  );
  if (result.rows[0]) await pool.query('SELECT pg_notify($1, $2)', ['audit_events', event.id]);
  return Boolean(result.rows[0]);
}

async function connectRabbit() {
  if (shuttingDown || rabbitReady) return;
  try {
    rabbitConnection = await amqp.connect(rabbitUrl);
    rabbitConnection.on('error', (error) => console.warn('RabbitMQ:', error.message));
    rabbitConnection.on('close', () => {
      rabbitReady = false;
      if (!shuttingDown) setTimeout(connectRabbit, 5000);
    });
    const channel = await rabbitConnection.createChannel();
    await channel.assertExchange('audit.events', 'topic', { durable: true });
    await channel.assertQueue('audit.events.queue', { durable: true });
    await channel.bindQueue('audit.events.queue', 'audit.events', 'audit.#');
    await channel.prefetch(20);
    await channel.consume('audit.events.queue', async (message) => {
      if (!message) return;
      let event;
      try {
        event = normalizeEvent(JSON.parse(message.content.toString('utf8')));
      } catch (error) {
        console.error('Evento invalido descartado:', error.message);
        channel.nack(message, false, false);
        return;
      }
      try {
        await persist(event);
        channel.ack(message);
      } catch (error) {
        console.error('No se pudo persistir el evento:', error.message);
        channel.nack(message, false, true);
      }
    }, { noAck: false });
    rabbitReady = true;
    console.log('Consumidor RabbitMQ listo (ACK manual)');
  } catch (error) {
    rabbitReady = false;
    console.warn('RabbitMQ no disponible, reintentando:', error.message);
    if (!shuttingDown) setTimeout(connectRabbit, 5000);
  }
}

async function listenForEvents() {
  const listener = new Client({ connectionString: databaseUrl });
  await listener.connect();
  await listener.query('LISTEN audit_events');
  listener.on('notification', async (notification) => {
    try {
      const result = await pool.query('SELECT * FROM audit_events WHERE id = $1', [notification.payload]);
      if (!result.rows[0]) return;
      const event = rowToEvent(result.rows[0]);
      for (const client of clients) {
        if (matchesFilters(event, client.filters)) {
          client.response.write(`id: ${event.id}\nevent: audit\ndata: ${JSON.stringify(event)}\n\n`);
        }
      }
    } catch (error) { console.error('Error difundiendo SSE:', error.message); }
  });
  listener.on('error', (error) => {
    console.error('LISTEN PostgreSQL:', error.message);
    if (!shuttingDown) setTimeout(listenForEvents, 5000);
  });
  return listener;
}

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/audit', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const { where, values } = buildFilters(req.query);
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM audit_events ${where}`, values);
    const params = [...values, pageSize, (page - 1) * pageSize];
    const rows = await pool.query(
      `SELECT * FROM audit_events ${where} ORDER BY occurred_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      params,
    );
    res.json({ items: rows.rows.map(rowToEvent), total: count.rows[0].total, page, pageSize });
  } catch (error) { next(error); }
});

app.get('/api/audit/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 2000\nevent: connected\ndata: {"ok":true}\n\n');
  const client = { response: res, filters: { entity: req.query.entity, action: req.query.action, user: req.query.user } };
  clients.add(client);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
  req.on('close', () => { clearInterval(heartbeat); clients.delete(client); });
});

app.get('/health/live', (_req, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()) }));
app.get('/health/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(rabbitReady ? 200 : 503).json({ status: rabbitReady ? 'ok' : 'degraded', database: 'up', rabbitmq: rabbitReady ? 'up' : 'down' });
  } catch { res.status(503).json({ status: 'down', database: 'down', rabbitmq: rabbitReady ? 'up' : 'down' }); }
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'No se pudo procesar la solicitud' });
});

async function start() {
  await initDb();
  await listenForEvents();
  app.listen(port, () => console.log(`Audit service en :${port}`));
  void connectRabbit();
}

async function stop() {
  shuttingDown = true;
  try { await rabbitConnection?.close(); } catch {}
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

if (require.main === module) start().catch((error) => { console.error(error); process.exit(1); });
module.exports = { app, initDb, persist };
