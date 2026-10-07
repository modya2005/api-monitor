const express = require('express');
const router = express.Router();

// Built-in endpoints you can point monitors at while testing.
//   /demo/ok       -> 200 JSON, fast
//   /demo/slow     -> 200 JSON after ~1.5 s
//   /demo/fail     -> 500
//   /demo/flaky    -> fails roughly every other minute (good for testing alerts)
//   /demo/toggle   -> POST/GET flips a switch that /demo/switch obeys
//   /demo/switch   -> 200 normally, 500 after you hit /demo/toggle

let switchedOff = false;

router.get('/ok', (req, res) => res.json({ status: 'ok', data: { id: 1, name: 'demo' } }));

router.get('/slow', (req, res) => setTimeout(() => res.json({ status: 'ok' }), 1500));

router.get('/fail', (req, res) => res.status(500).json({ error: 'Internal Server Error' }));

router.get('/flaky', (req, res) => {
  const minute = Math.floor(Date.now() / 60000);
  if (minute % 2 === 0) return res.status(500).json({ error: 'flaky failure' });
  res.json({ status: 'ok' });
});

router.all('/toggle', (req, res) => {
  switchedOff = !switchedOff;
  res.json({ switchedOff });
});

router.get('/switch', (req, res) => {
  if (switchedOff) return res.status(500).json({ error: 'switched off' });
  res.json({ status: 'ok' });
});

module.exports = router;
