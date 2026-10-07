const CheckResult = require('../models/CheckResult');

const HOUR = 60 * 60 * 1000;

// Uptime % and average response time for one monitor over a time window.
async function windowStats(monitorId, hours) {
  const since = new Date(Date.now() - hours * HOUR);
  const [row] = await CheckResult.aggregate([
    { $match: { monitor: monitorId, checkedAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        ok: { $sum: { $cond: ['$success', 1, 0] } },
        avgMs: { $avg: { $cond: ['$success', '$responseMs', null] } },
        maxMs: { $max: '$responseMs' },
      },
    },
  ]);
  if (!row) return { checks: 0, uptime: null, avgResponseMs: null, maxResponseMs: null };
  return {
    checks: row.total,
    uptime: Math.round((row.ok / row.total) * 1000) / 10, // one decimal, e.g. 99.7
    avgResponseMs: row.avgMs == null ? null : Math.round(row.avgMs),
    maxResponseMs: row.maxMs ?? null,
  };
}

async function monitorStats(monitorId) {
  const [day, week, month] = await Promise.all([
    windowStats(monitorId, 24),
    windowStats(monitorId, 24 * 7),
    windowStats(monitorId, 24 * 30),
  ]);
  return { last24h: day, last7d: week, last30d: month };
}

module.exports = { monitorStats };
