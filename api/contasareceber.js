// api/contasareceber.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função auxiliar para queries
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Handler principal
export default async function handler(req, res) {
  const { method, body, query: params } = req;

  try {
    // ---------------- GET: Listar todas as contas ----------------
    if (method === "GET") {
      const result = await query(`
        SELECT c.id, cl.nome as cliente, c.valor, c.status, c.data
        FROM contasareceber c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        ORDER BY c.id DESC
      `);
      return res.status(200).json(result.rows);
    }

    // ---------------- POST: Criar nova conta ----------------
    if (method === "POST") {
      const { cliente_id, valor, status } = body;
      if (!cliente_id || valor == null) {
        return res.status(400).json({ error: "Cliente e valor são obrigatórios" });
      }
      const result = await query(
        "INSERT INTO contasareceber (cliente_id, valor, status, data) VALUES ($1,$2,$3,NOW()) RETURNING *",
        [cliente_id, valor, status || "Pendente"]
      );
      return res.status(201).json(result.rows[0]);
    }

    // ---------------- PUT: Atualizar status ----------------
    if (method === "PUT") {
      const { id, status } = body;
      if (!id || !status) {
        return res.status(400).json({ error: "ID e status são obrigatórios" });
      }
      const result = await query(
        "UPDATE contasareceber SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      return res.status(200).json(result.rows[0]);
    }

    // ---------------- Método não permitido ----------------
    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro na API de contas a receber:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
