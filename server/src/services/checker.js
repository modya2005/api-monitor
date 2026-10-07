const axios = require('axios');
const CheckResult = require('../models/CheckResult');
const { validateResponse } = require('./validator');
const { sendDownAlert, sendRecoveryAlert } = require('./mailer');
const { assertPublicUrl } = require('./urlGuard');

async function runCheck(monitor) {
  const checkedAt = new Date();
  let statusCode, responseMs, error = null, validationErrors = [];

  const urlProblem = await assertPublicUrl(monitor.url);
  if (urlProblem) {
    error = urlProblem;
  } else {
    const started = Date.now();
    try {
      const res = await axios({
        url: monitor.url,
        method: monitor.method,
        timeout: monitor.timeoutMs,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: (x) => x,
        maxContentLength: 5 * 1024 * 1024,
        maxRedirects: 0,
        headers: { 'User-Agent': 'api-monitor/2.0' },
      });
      responseMs = Date.now() - started;
      statusCode = res.status;

      const rawBody = typeof res.data === 'string' ? res.data : '';
      let data = null;
      try { data = JSON.parse(rawBody); } catch {}
      validationErrors = validateResponse({ monitor, statusCode, responseMs, data, rawBody });
      if (validationErrors.length) error = validationErrors.join('; ');
    } catch (err) {
      responseMs = Date.now() - started;
      if (err.response?.status >= 300 && err.response?.status < 400) {
        statusCode = err.response.status;
        error = 'Redirect responses are not followed by the monitor';
      } else {
        error = err.code === 'ECONNABORTED' || /timeout/i.test(err.message)
          ? `Timed out after ${monitor.timeoutMs} ms`
          : err.message;
      }
    }
  }

  const success = !error && statusCode === monitor.expectedStatus;
  if (!success && !error) error = `Expected HTTP ${monitor.expectedStatus}, received ${statusCode}`;

  const result = await CheckResult.create({
    monitor: monitor._id, checkedAt, statusCode, responseMs, success,
    error: error || undefined, validationErrors,
  });

  const wasDown = monitor.status === 'down';
  const prevDownSince = monitor.downSince;
  monitor.lastCheckedAt = checkedAt;
  monitor.lastStatusCode = statusCode;
  monitor.lastResponseMs = responseMs;
  monitor.lastError = error || undefined;

  if (success) {
    monitor.status = 'up';
    monitor.consecutiveFailures = 0;
    monitor.downSince = undefined;
  } else {
    monitor.status = 'down';
    monitor.consecutiveFailures += 1;
    if (!wasDown) monitor.downSince = checkedAt;
  }
  await monitor.save();

  if (!success && !wasDown) await sendDownAlert(monitor, result);
  if (success && wasDown) await sendRecoveryAlert(monitor, result, prevDownSince);
  return result;
}

async function runDueChecks() {
  const monitors = await require('../models/Monitor').find({ active: true });
  const now = Date.now();
  const due = monitors.filter((m) => !m.lastCheckedAt || now - m.lastCheckedAt.getTime() >= m.intervalMinutes * 60000 - 5000);
  await Promise.allSettled(due.map((m) => runCheck(m)));
  return due.length;
}

module.exports = { runCheck, runDueChecks };
