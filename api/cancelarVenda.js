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

  const { venda_id } = req.body;

  if (!venda_id) {
    return res.status(400).json({ error: "ID da venda não informado" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Verifica se a venda existe
    const venda = await client.query(
      "SELECT id FROM vendas WHERE id = $1",
      [venda_id]
    );

    if (venda.rowCount === 0) {
      throw new Error("Venda não encontrada");
    }

    // 2️⃣ Buscar itens da venda
    const itens = await client.query(
      "SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = $1",
      [venda_id]
    );

    // 3️⃣ Devolver estoque (se houver itens)
    for (const item of itens.rows) {
      await client.query(
        "UPDATE produtos SET estoque = estoque + $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    // 4️⃣ Remover itens da venda
    await client.query(
      "DELETE FROM vendas_itens WHERE venda_id = $1",
      [venda_id]
    );

    // 5️⃣ Remover venda
    await client.query(
      "DELETE FROM vendas WHERE id = $1",
      [venda_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({ message: "Venda cancelada com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("ERRO AO CANCELAR VENDA:", {
      venda_id,
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      error: err.message || "Erro ao cancelar venda"
    });

  } finally {
    client.release();
  }
}
