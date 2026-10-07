const cron = require('node-cron');
const { runDueChecks } = require('./checker');
const CheckResult = require('../models/CheckResult');

let running = false;

function startScheduler() {
  // Tick every minute; each monitor decides for itself whether it is due
  // (so one monitor can run every minute and another every 30 minutes).
  cron.schedule('* * * * *', async () => {
    if (running) return; // don't overlap if a tick is slow
    running = true;
    try {
      const n = await runDueChecks();
      if (n) console.log(`[cron] ran ${n} check(s)`);
    } catch (err) {
      console.error('[cron] check run failed:', err.message);
    } finally {
      running = false;
    }
  });

  // Nightly cleanup of old history
  cron.schedule('15 3 * * *', async () => {
    const days = Number(process.env.RETENTION_DAYS) || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { deletedCount } = await CheckResult.deleteMany({ checkedAt: { $lt: cutoff } });
    console.log(`[cron] pruned ${deletedCount} old check results`);
  });

  console.log('[cron] scheduler started (every minute)');
}

module.exports = { startScheduler };
