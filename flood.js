export const config = { maxDuration: 30 };

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, n = 25, method = 'GET', timeout = 9000 } = req.body || {};
  if (!url) return res.status(400).json({ error: 'missing url' });

  const count = Math.min(Math.max(parseInt(n, 10) || 25, 1), 100);
  const t0 = Date.now();
  let ok = 0, fail = 0, bytes = 0, sum = 0, min = Infinity, max = 0;

  const jobs = [];
  for (let i = 0; i < count; i++) {
    const u = url + (url.includes('?') ? '&' : '?') + '_cb=' + Math.random().toString(36).slice(2) + i;
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeout);
    const s = Date.now();
    jobs.push(
      fetch(u, {
        method,
        signal: ac.signal,
        cache: 'no-store',
        redirect: 'follow',
        headers: {
          'user-agent': UA,
          accept: '*/*',
          'cache-control': 'no-cache',
          'accept-encoding': 'gzip, deflate, br'
        }
      })
        .then(async r => {
          const b = await r.arrayBuffer().catch(() => new ArrayBuffer(0));
          bytes += b.byteLength;
          ok++;
          const d = Date.now() - s;
          sum += d; if (d < min) min = d; if (d > max) max = d;
        })
        .catch(() => { fail++; })
        .finally(() => clearTimeout(to))
    );
  }

  await Promise.all(jobs);

  return res.status(200).json({
    ok, fail, bytes, ms: Date.now() - t0,
    avg: ok ? Math.round(sum / ok) : 0,
    min: min === Infinity ? 0 : min,
    max
  });
}
