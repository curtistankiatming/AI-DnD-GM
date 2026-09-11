'use strict';

// Server-only transport. A caller-owned AbortSignal is the single wall-clock
// deadline: it covers connection, response headers AND the complete response.
// node:http has no fetch/Undici five-minute response-header timer. Socket reuse,
// redirects, proxies and automatic retries are deliberately not used here.
const http = require('node:http');
const https = require('node:https');
const MAX_REPLY_BYTES = 131072;

function localResponse(address, { method = 'GET', headers = {}, body, signal } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(address); } catch { reject(new Error('Local API address is invalid.')); return; }
    if (!['http:', 'https:'].includes(url.protocol) ||
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash ||
        !['/v1/models', '/v1/chat/completions'].includes(url.pathname)) {
      reject(new Error('Local transport only accepts the configured loopback model API.')); return;
    }
    if (!signal) { reject(new Error('Local transport requires a bounded request signal.')); return; }
    if (signal.aborted) { reject(new Error('Local request aborted.')); return; }
    let request, response, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      if (error) {
        response?.destroy();
        request?.destroy();
        reject(error);
      } else resolve(value);
    };
    const abort = () => finish(new Error('Local request aborted.'));
    signal.addEventListener('abort', abort, { once: true });
    try {
      const options = { method, headers, agent: false };
      // localhost must stay loopback even with a modified hosts/DNS setup.
      if (url.hostname === 'localhost') options.lookup = (_host, opts, callback) => {
        if (opts?.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
        else callback(null, '127.0.0.1', 4);
      };
      request = (url.protocol === 'https:' ? https : http).request(url, options, incoming => {
        response = incoming;
        const status = incoming.statusCode || 0;
        if (status >= 300 && status < 400) {
          finish(new Error('Local model redirect refused. No other host was contacted.')); return;
        }
        if (status < 200 || status >= 300) {
          // Do not retain or expose a backend's potentially private error body.
          incoming.destroy();
          finish(null, { ok: false, status, text: async () => '', json: async () => null }); return;
        }
        if (Number(incoming.headers['content-length']) > MAX_REPLY_BYTES) {
          finish(new Error('Local model reply exceeded the size limit.')); return;
        }
        const chunks = []; let total = 0;
        incoming.on('data', chunk => {
          total += chunk.length;
          if (total > MAX_REPLY_BYTES) { finish(new Error('Local model reply exceeded the size limit.')); return; }
          chunks.push(chunk);
        });
        incoming.on('error', () => finish(new Error('Local model response disconnected before completion.')));
        incoming.on('aborted', () => finish(new Error('Local model response disconnected before completion.')));
        incoming.on('end', () => {
          if (!incoming.complete) { finish(new Error('Local model response disconnected before completion.')); return; }
          const raw = Buffer.concat(chunks).toString('utf8');
          finish(null, { ok: true, status, text: async () => raw, json: async () => JSON.parse(raw) });
        });
      });
      request.on('error', () => finish(new Error('Local model connection failed. Check the local server. No cloud fallback was used.')));
      // No earlier idle timeout: the caller's deadline cannot be reset by chunks.
      request.setTimeout(0);
      if (body !== undefined) request.end(body); else request.end();
    } catch {
      finish(new Error('Local model connection failed. Check the local server. No cloud fallback was used.'));
    }
  });
}
module.exports = { localResponse, MAX_REPLY_BYTES };
