const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'dashboard_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'cakra123',
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT id, file_id, week, date, product, customer, omzet
      FROM sales_records
      WHERE EXTRACT(YEAR FROM date) = 2025
      ORDER BY date ASC
      LIMIT 10
    `);

    console.log(result.rows);
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await client.end();
  }
}

run();
