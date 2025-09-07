// api/recebimentos.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { cliente_id, itens, forma_pagamento, total, desconto } = req.body;

  if (!cliente_id || !itens || itens.length === 0 || total == null) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Inserir venda
    const total_final = total - desconto;
    const vendaResult = await client.query(
      `INSERT INTO vendas 
       (cliente_id, total, desconto, total_final, forma_pagamento, data) 
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [cliente_id, total, desconto, total_final, forma_pagamento]
    );
    const venda = vendaResult.rows[0];

    // 2️⃣ Inserir itens
    for (let item of itens) {
      await client.query(
        `INSERT INTO vendas_itens
         (venda_id, produto_id, quantidade, preco, tamanho)
         VALUES ($1,$2,$3,$4,$5)`,
        [venda.id, item.produto_id, item.quantidade, item.preco, item.tamanho]
      );

      // 3️⃣ Atualizar estoque
      await client.query(
        `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
        [item.quantidade, item.produto_id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ venda });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao processar recebimento:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  } finally {
    client.release();
  }
}
