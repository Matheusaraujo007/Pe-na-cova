// /api/clientes.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Sua variável do Vercel
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const { method, query, body } = req;
  const id = query.id;

  try {
    // ----------------- GET -----------------
    if (method === "GET") {
      const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
      return res.status(200).json(result.rows);
    }

    // ----------------- POST -----------------
    if (method === "POST") {
      const { nome, telefone, endereco, observacoes } = body;
      const result = await pool.query(
        "INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES ($1,$2,$3,$4) RETURNING *",
        [nome, telefone, endereco || '', observacoes || '']
      );
      return res.status(201).json(result.rows[0]);
    }

    // ----------------- PUT -----------------
    if (method === "PUT") {
      if (!id) return res.status(400).json({ error: "ID é necessário para atualizar" });
      const { nome, telefone, endereco, observacoes } = body;
      const result = await pool.query(
        "UPDATE clientes SET nome=$1, telefone=$2, endereco=$3, observacoes=$4 WHERE id=$5 RETURNING *",
        [nome, telefone, endereco || '', observacoes || '', id]
      );
      return res.status(200).json(result.rows[0]);
    }

    // ----------------- DELETE -----------------
    if (method === "DELETE") {
      if (!id) return res.status(400).json({ error: "ID é necessário para deletar" });
      await pool.query("DELETE FROM clientes WHERE id=$1", [id]);
      return res.status(200).json({ message: "Cliente deletado com sucesso" });
    }

    // ----------------- MÉTODO NÃO PERMITIDO -----------------
    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end(`Método ${method} não permitido`);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  // Permitir qualquer origem (ou coloque o domínio do seu site)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { method } = req;

  try {
    if (method === "GET") {
      const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
      return res.status(200).json(result.rows);
    }

    if (method === "POST") {
      const { nome, telefone, endereco, observacoes } = req.body;
      const result = await pool.query(
        "INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES ($1,$2,$3,$4) RETURNING *",
        [nome, telefone, endereco, observacoes]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      await pool.query("DELETE FROM clientes WHERE id = $1", [id]);
      return res.status(200).json({ message: "Cliente excluído" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro API Clientes:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor: " + err.message });
  }
}
