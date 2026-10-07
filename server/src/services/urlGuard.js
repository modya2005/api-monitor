const dns = require('dns').promises;
const net = require('net');

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;

  if (net.isIPv4(h)) {
    const [a, b] = h.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }

  if (net.isIPv6(h)) {
    return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h === '::';
  }
  return false;
}

function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return 'Invalid URL'; }
  if (!['http:', 'https:'].includes(u.protocol)) return 'Only http and https URLs are allowed';
  if (u.username || u.password) return 'URLs with embedded credentials are not allowed';
  if (process.env.ALLOW_PRIVATE_HOSTS !== 'true' && isPrivateHost(u.hostname)) return 'Private / local addresses are not allowed';
  return null;
}

async function assertPublicUrl(raw) {
  const problem = checkUrl(raw);
  if (problem) return problem;
  if (process.env.ALLOW_PRIVATE_HOSTS === 'true') return null;

  const u = new URL(raw);
  try {
    const records = await dns.lookup(u.hostname, { all: true, verbatim: true });
    if (!records.length || records.some((r) => isPrivateHost(r.address))) {
      return 'The URL resolves to a private / local address';
    }
  } catch {
    return 'The hostname could not be resolved';
  }
  return null;
}

module.exports = { checkUrl, assertPublicUrl, isPrivateHost };
