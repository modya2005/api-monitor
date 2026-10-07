const mongoose = require('mongoose');

const checkResultSchema = new mongoose.Schema({
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
  checkedAt: { type: Date, default: Date.now, index: true },
  statusCode: Number,
  responseMs: Number,
  success: { type: Boolean, required: true },
  // Why it failed: network error, wrong status, slow response, validation problems
  error: String,
  validationErrors: { type: [String], default: [] },
});

checkResultSchema.index({ monitor: 1, checkedAt: -1 });

module.exports = mongoose.model('CheckResult', checkResultSchema);
