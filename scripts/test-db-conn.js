const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.FALLBACK_DATABASE_URL;
if (!connectionString) {
  console.error('No DATABASE_URL or FALLBACK_DATABASE_URL set in environment');
  process.exit(1);
}

async function tryConnect(opts, label) {
  const pool = new Pool({ connectionString, ...opts });
  try {
    console.log(`Trying: ${label}`);
    const res = await pool.query('SELECT NOW() as now');
    console.log(`${label} success:`, res.rows[0]);
  } catch (err) {
    console.error(`${label} error:`, err && err.message ? err.message : err);
  } finally {
    await pool.end().catch(() => {});
  }
}

(async () => {
  // Try without SSL override
  await tryConnect({}, 'no-ssl');

  // Try with ssl: true
  await tryConnect({ ssl: true }, 'ssl-true');

  // Try with rejectUnauthorized: false
  await tryConnect({ ssl: { rejectUnauthorized: false } }, 'ssl-no-verify');

  process.exit(0);
})();
