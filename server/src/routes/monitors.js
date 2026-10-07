const express = require('express');
const mongoose = require('mongoose');
const Monitor = require('../models/Monitor');
const CheckResult = require('../models/CheckResult');
const { runCheck } = require('../services/checker');
const { monitorStats } = require('../services/stats');
const { checkUrl } = require('../services/urlGuard');

const router = express.Router();

function pickInput(body) {
  const v = body.validation || {};
  const out = {
    name: body.name, url: body.url, method: body.method, intervalMinutes: body.intervalMinutes,
    timeoutMs: body.timeoutMs, expectedStatus: body.expectedStatus, alertEmail: body.alertEmail,
    active: body.active,
    validation: {
      requiredFields: Array.isArray(v.requiredFields) ? v.requiredFields.map((s) => String(s).trim()).filter(Boolean) : undefined,
      bodyContains: v.bodyContains, maxResponseMs: v.maxResponseMs,
    },
  };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  if (out.validation) {
    Object.keys(out.validation).forEach((k) => out.validation[k] === undefined && delete out.validation[k]);
    if (!Object.keys(out.validation).length) delete out.validation;
  }
  return out;
}

function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  next();
}

async function ownedMonitor(req, res) {
  const monitor = await Monitor.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!monitor) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  return monitor;
}

router.get('/', async (req, res, next) => {
  try {
    const monitors = await Monitor.find({ owner: req.user.sub }).sort({ name: 1 });
    const withStats = await Promise.all(monitors.map(async (m) => {
      const [stats, recent] = await Promise.all([
        monitorStats(m._id),
        CheckResult.find({ monitor: m._id }).sort({ checkedAt: -1 }).limit(48)
          .select('checkedAt statusCode responseMs success').lean().then((rows) => rows.reverse()),
      ]);
      return { ...m.toObject(), stats, recent };
    }));
    res.json(withStats);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const input = pickInput(req.body);
    if (!input.name || !input.url) return res.status(400).json({ error: 'name and url are required' });
    const problem = checkUrl(input.url);
    if (problem) return res.status(400).json({ error: problem });
    const monitor = await Monitor.create({ ...input, owner: req.user.sub });
    runCheck(monitor).catch((err) => console.error('initial check failed:', err.message));
    res.status(201).json(monitor);
  } catch (e) {
    if (e.name === 'ValidationError') return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.get('/:id', validId, async (req, res, next) => {
  try {
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    res.json({ ...monitor.toObject(), stats: await monitorStats(monitor._id) });
  } catch (e) { next(e); }
});

router.put('/:id', validId, async (req, res, next) => {
  try {
    const input = pickInput(req.body);
    if (input.url) {
      const problem = checkUrl(input.url);
      if (problem) return res.status(400).json({ error: problem });
    }
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    Object.assign(monitor, input);
    if (input.validation) monitor.validation = { ...monitor.validation?.toObject?.(), ...input.validation };
    await monitor.save();
    res.json(monitor);
  } catch (e) {
    if (e.name === 'ValidationError') return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.delete('/:id', validId, async (req, res, next) => {
  try {
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    await Monitor.deleteOne({ _id: monitor._id });
    await CheckResult.deleteMany({ monitor: monitor._id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/check', validId, async (req, res, next) => {
  try {
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    res.json(await runCheck(monitor));
  } catch (e) { next(e); }
});

router.get('/:id/results', validId, async (req, res, next) => {
  try {
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const results = await CheckResult.find({ monitor: monitor._id }).sort({ checkedAt: -1 }).limit(limit);
    res.json(results.reverse());
  } catch (e) { next(e); }
});

router.get('/:id/failures', validId, async (req, res, next) => {
  try {
    const monitor = await ownedMonitor(req, res);
    if (!monitor) return;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const failures = await CheckResult.find({ monitor: monitor._id, success: false }).sort({ checkedAt: -1 }).limit(limit);
    res.json(failures);
  } catch (e) { next(e); }
});

module.exports = router;
