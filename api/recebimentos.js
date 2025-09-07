// api/recebimentos.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
  const { method } = req;

  if (method === "POST") {
    const { cliente_id, itens, forma_pagamento, total } = req.body;

    if (!cliente_id || !itens || !Array.isArray(itens) || itens.length === 0 || !forma_pagamento || !total) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      // 1️⃣ Criar venda
      const vendaResult = await query(
        "INSERT INTO vendas (cliente_id, forma_pagamento, total, data) VALUES ($1,$2,$3,NOW()) RETURNING *",
        [cliente_id, forma_pagamento, total]
      );
      const venda = vendaResult.rows[0];

      // 2️⃣ Inserir itens da venda e atualizar estoque
      for (const item of itens) {
        // Verifica estoque atual
        const estoqueResult = await query(
          "SELECT quantidade FROM produtos WHERE id = $1",
          [item.produto_id]
        );

        if (estoqueResult.rows.length === 0) {
          return res.status(404).json({ error: `Produto ID ${item.produto_id} não encontrado` });
        }

        const estoqueAtual = estoqueResult.rows[0].quantidade;

        if (estoqueAtual < item.quantidade) {
          return res.status(400).json({
            error: `Estoque insuficiente para o produto ID ${item.produto_id}. Disponível: ${estoqueAtual}`,
          });
        }

        // Insere item da venda
        await query(
          "INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco, tamanho) VALUES ($1,$2,$3,$4,$5)",
          [venda.id, item.produto_id, item.quantidade, item.preco, item.tamanho]
        );

        // Atualiza estoque com segurança
        await query(
          "UPDATE produtos SET quantidade = quantidade - $1 WHERE id = $2",
          [item.quantidade, item.produto_id]
        );
      }

      // 3️⃣ Se for fiado, cria conta a receber
      if (forma_pagamento.toLowerCase() === "consignado") {
        await query(
          "INSERT INTO contasareceber (cliente_id, valor, status, data_vencimento) VALUES ($1,$2,$3, NOW() + INTERVAL '30 days')",
          [cliente_id, total, "Pendente"]
        );
      }

      return res.status(201).json({ message: "Venda concluída com sucesso", venda });
    } catch (err) {
      console.error("Erro API Recebimentos:", err);
      return res.status(500).json({ error: "Erro ao finalizar venda" });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
