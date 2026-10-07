const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.SESSION_DAYS ? `${Number(process.env.SESSION_DAYS)}d` : '7d',
  });
}

function setSessionCookie(res, token) {
  res.cookie('api_monitor_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: (Number(process.env.SESSION_DAYS) || 7) * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie('api_monitor_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.api_monitor_session;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

module.exports = { signToken, setSessionCookie, clearSessionCookie, requireAuth };
