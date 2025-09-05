import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função auxiliar para executar queries
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  const { method, url, body, query: params } = req;

  try {
    // ----------------- CLIENTES -----------------
    if (url.startsWith("/api/clientes")) {
      if (method === "GET") {
        const result = await query("SELECT * FROM clientes ORDER BY id DESC");
        return res.status(200).json(result.rows);
      }

      if (method === "POST") {
        const { nome, telefone, email } = body;
        if (!nome || !telefone) {
          return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
        }
        const result = await query(
          "INSERT INTO clientes (nome, telefone, email) VALUES ($1,$2,$3) RETURNING *",
          [nome, telefone, email]
        );
        return res.status(201).json(result.rows[0]);
      }
    }

    // ----------------- PRODUTOS -----------------
    if (url.startsWith("/api/produtos")) {
      if (method === "GET") {
        const result = await query("SELECT * FROM produtos ORDER BY id DESC");
        return res.status(200).json(result.rows);
      }

      if (method === "POST") {
        const { nome, preco, estoque } = body;
        if (!nome || preco == null) {
          return res.status(400).json({ error: "Nome e preço são obrigatórios" });
        }
        const result = await query(
          "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3) RETURNING *",
          [nome, preco, estoque ?? 0]
        );
        return res.status(201).json(result.rows[0]);
      }
    }

    // ----------------- VENDAS -----------------
    if (url.startsWith("/api/vendas")) {
      if (method === "GET") {
        const result = await query("SELECT * FROM vendas ORDER BY id DESC");
        return res.status(200).json(result.rows);
      }

      if (method === "POST") {
        const { cliente_id, produto_id, quantidade, forma_pagamento, total } = body;
        if (!cliente_id || !produto_id || !quantidade || !forma_pagamento || !total) {
          return res.status(400).json({ error: "Todos os campos são obrigatórios" });
        }

        const result = await query(
          "INSERT INTO vendas (cliente_id, produto_id, quantidade, forma_pagamento, total) VALUES ($1,$2,$3,$4,$5) RETURNING *",
          [cliente_id, produto_id, quantidade, forma_pagamento, total]
        );

        if (forma_pagamento === "Fiado") {
          await query(
            "INSERT INTO contasareceber (cliente_id, valor, status) VALUES ($1,$2,$3)",
            [cliente_id, total, "Pendente"]
          );
        }

        return res.status(201).json(result.rows[0]);
      }
    }

    // ----------------- CONTAS A RECEBER -----------------
    if (url.startsWith("/api/contasareceber")) {
      if (method === "GET") {
        const result = await query(
          `SELECT c.id, cl.nome, c.valor, c.status 
           FROM contasareceber c 
           INNER JOIN clientes cl ON c.cliente_id = cl.id 
           ORDER BY c.id DESC`
        );
        return res.status(200).json(result.rows);
      }

      if (method === "PUT") {
        const { id } = params;
        const { status } = body;
        if (!id || !status) {
          return res.status(400).json({ error: "ID e status são obrigatórios" });
        }
        const result = await query(
          "UPDATE contasareceber SET status = $1 WHERE id = $2 RETURNING *",
          [status, id]
        );
        return res.status(200).json(result.rows[0]);
      }
    }

    // ----------------- NOT FOUND -----------------
    return res.status(404).json({ error: "Rota não encontrada" });
  } catch (err) {
    console.error("Erro no handler:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
