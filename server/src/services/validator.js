// Validates an API response against the rules configured on a monitor.
// Returns an array of human-readable problems (empty array = valid).

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function validateResponse({ monitor, statusCode, responseMs, data, rawBody }) {
  const problems = [];

  if (statusCode !== monitor.expectedStatus) {
    problems.push(`Expected status ${monitor.expectedStatus} but got ${statusCode}`);
  }

  const rules = monitor.validation || {};

  if (rules.maxResponseMs > 0 && responseMs > rules.maxResponseMs) {
    problems.push(`Response took ${responseMs} ms (limit ${rules.maxResponseMs} ms)`);
  }

  if (rules.bodyContains && !String(rawBody).includes(rules.bodyContains)) {
    problems.push(`Body does not contain "${rules.bodyContains}"`);
  }

  if (rules.requiredFields && rules.requiredFields.length) {
    if (data === null || typeof data !== 'object') {
      problems.push('Response is not valid JSON, cannot check required fields');
    } else {
      for (const field of rules.requiredFields) {
        const value = getPath(data, field);
        if (value === undefined || value === null) {
          problems.push(`Missing required field "${field}"`);
        }
      }
    }
  }

  return problems;
}

module.exports = { validateResponse };
