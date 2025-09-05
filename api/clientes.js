import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM clientes ORDER BY id DESC');
      res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { nome, telefone, endereco, observacoes } = req.body;
      const result = await client.query(
        'INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome, telefone, endereco, observacoes]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erro na API:', error);
    res.status(500).json({ error: 'Erro no servidor: ' + error.message });
  } finally {
    client.release();
  }
}
