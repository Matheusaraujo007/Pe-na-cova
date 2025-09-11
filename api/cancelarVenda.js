// api/cancelarVenda.js
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { venda_id } = req.body;
  if (!venda_id) {
    return res.status(400).json({ error: "ID da venda é obrigatório" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Buscar os itens da venda
    const itens = await client.query(
      "SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = $1",
      [venda_id]
    );

    // 2️⃣ Devolver estoque
    for (const item of itens.rows) {
      await client.query(
        "UPDATE produtos SET quantidade = quantidade + $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    // 3️⃣ Deletar itens da venda
    await client.query("DELETE FROM vendas_itens WHERE venda_id = $1", [venda_id]);

    // 4️⃣ Deletar contas a receber relacionadas
    await client.query("DELETE FROM contasareceber WHERE venda_id = $1", [venda_id]);

    // 5️⃣ Deletar a venda
    await client.query("DELETE FROM vendas WHERE id = $1", [venda_id]);

    await client.query("COMMIT");

    return res.status(200).json({ message: "Venda cancelada com sucesso" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao cancelar venda:", err);
    return res.status(500).json({ error: "Erro ao cancelar venda" });
  } finally {
    client.release();
  }
}
