import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method === "GET") {
      const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
      return res.status(200).json(result.rows);
    }

    if (method === "POST") {
      const { nome, telefone, endereco, observacoes } = req.body;
      if (!nome || !telefone || !endereco) {
        return res.status(400).json({ error: "Nome, telefone e endereço são obrigatórios" });
      }

      const result = await pool.query(
        "INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES ($1,$2,$3,$4) RETURNING *",
        [nome, telefone, endereco, observacoes]
      );
      return res.status(201).json(result.rows[0]);
    }

    // Método não permitido
    return res.status(405).json({ error: "Método não permitido" });

  } catch (err) {
    console.error("API Clientes:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
