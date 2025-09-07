import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_CUSTOM,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // 🔹 Lista todos os clientes
      const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      // 🔹 Cadastra um novo cliente
      const { nome, telefone, endereco, observacoes } = req.body;
      const result = await pool.query(
        'INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome, telefone, endereco, observacoes]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      // 🔹 Atualiza um cliente existente
      const { id } = req.query;
      const { nome, telefone, endereco, observacoes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório' });
      }

      const result = await pool.query(
        'UPDATE clientes SET nome = $1, telefone = $2, endereco = $3, observacoes = $4 WHERE id = $5 RETURNING *',
        [nome, telefone, endereco, observacoes, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      // 🔹 Exclui um cliente
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório' });
      }

      await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Cliente excluído com sucesso' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro no servidor: ' + error.message });
  }
}
