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

    // 1️⃣ Buscar itens da venda
    const { rows: itens } = await client.query(
      `
      SELECT produto_id, quantidade
      FROM vendas_itens
      WHERE venda_id = $1
      `,
      [venda_id]
    );

    // 2️⃣ Devolver itens para o estoque
    for (const item of itens) {
      await client.query(
        `
        UPDATE produtos
        SET estoque = estoque + $1
        WHERE id = $2
        `,
        [item.quantidade, item.produto_id]
      );
    }

    // 3️⃣ Marcar venda como cancelada
    await client.query(
      `
      UPDATE vendas
      SET cancelada = true
      WHERE id = $1
      `,
      [venda_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Venda cancelada e estoque devolvido com sucesso",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao cancelar venda:", err);
    return res.status(500).json({ error: "Erro ao cancelar venda" });
  } finally {
    client.release();
  }
}
