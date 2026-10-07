const mongoose = require('mongoose');

const validationSchema = new mongoose.Schema(
  {
    // Dot-paths that must exist in a JSON response, e.g. ["data.id", "status"]
    requiredFields: { type: [String], default: [] },
    // Substring that must appear in the response body
    bodyContains: { type: String, default: '' },
    // Fail the check if the response is slower than this (0 = disabled)
    maxResponseMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const monitorSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    method: { type: String, enum: ['GET', 'POST', 'HEAD'], default: 'GET' },
    intervalMinutes: { type: Number, default: 5, min: 1, max: 1440 },
    timeoutMs: { type: Number, default: 10000, min: 500, max: 60000 },
    expectedStatus: { type: Number, default: 200 },
    validation: { type: validationSchema, default: () => ({}) },
    alertEmail: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true },

    // Live state, updated after every check
    status: { type: String, enum: ['up', 'down', 'unknown'], default: 'unknown' },
    lastCheckedAt: Date,
    lastStatusCode: Number,
    lastResponseMs: Number,
    lastError: String,
    consecutiveFailures: { type: Number, default: 0 },
    downSince: Date,
  },
  { timestamps: true }
);

monitorSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('Monitor', monitorSchema);
