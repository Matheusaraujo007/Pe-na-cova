// /api/clientes.js
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
    } else if (req.method === 'POST') {
      const { nome, telefone, endereco, observacoes } = req.body;
      if (!nome || !telefone || !endereco) {
        res.status(400).json({ error: 'Nome, telefone e endereço são obrigatórios' });
        return;
      }

      const insertQuery = `
        INSERT INTO clientes (nome, telefone, endereco, observacoes)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [nome, telefone, endereco, observacoes || ''];

      const result = await client.query(insertQuery, values);
      res.status(201).json(result.rows[0]);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Método ${req.method} não permitido` });
    }
  } catch (error) {
    console.error("Erro na API clientes:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    client.release();
  }
}
