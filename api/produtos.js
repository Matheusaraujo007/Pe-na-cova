// /api/produtos.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_CUSTOM,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM produtos ORDER BY id DESC');
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { codigo, descricao, tamanho, quantidade, preco } = req.body;
      if (!codigo || !descricao || !tamanho || !quantidade || !preco) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

      const result = await pool.query(
        `INSERT INTO produtos (codigo, descricao, tamanho, quantidade, preco)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [codigo, descricao, tamanho, quantidade, preco]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM produtos WHERE id=$1', [id]);
      return res.status(200).json({ message: 'Produto excluído com sucesso' });
    }

    if (req.method === 'PUT') {
      const { id, codigo, descricao, tamanho, quantidade, preco } = req.body;
      const result = await pool.query(
        `UPDATE produtos 
         SET codigo=$1, descricao=$2, tamanho=$3, quantidade=$4, preco=$5
         WHERE id=$6 RETURNING *`,
        [codigo, descricao, tamanho, quantidade, preco, id]
      );
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API produtos:', error);
    return res.status(500).json({ error: 'Erro no servidor: ' + error.message });
  }
}
// Atualizar estoque
if (method === "PUT") {
  const { id, quantidade } = body; // nova quantidade
  if (!id || quantidade == null) {
    return res.status(400).json({ error: "ID e quantidade são obrigatórios" });
  }
  const result = await query(
    "UPDATE produtos SET quantidade = $1 WHERE id = $2 RETURNING *",
    [quantidade, id]
  );
  return res.status(200).json(result.rows[0]);
}