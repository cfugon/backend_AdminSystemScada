// src/utils/validate.js
function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').toLowerCase());
}

function assert(condition, message, status = 400) {
  if (!condition) {
    const err = new Error(message);
    err.status = status;
    throw err;
  }
}

module.exports = { isEmail, assert };
