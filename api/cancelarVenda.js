import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if(req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { venda_id, id } = req.body;
const vendaId = venda_id || id;
if(!vendaId) return res.status(400).json({ error: "ID da venda não informado" });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Buscar itens da venda
    const itens = await client.query(
      `SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = $1`,
      [venda_id]
    );

    // Devolver quantidade ao estoque
    for(const item of itens.rows) {
      await client.query(
        `UPDATE produtos SET estoque = estoque + $1 WHERE id = $2`,
        [item.quantidade, item.produto_id]
      );
    }

    // Deletar itens da venda
    await client.query(`DELETE FROM vendas_itens WHERE venda_id = $1`, [venda_id]);
    // Deletar a própria venda
    await client.query(`DELETE FROM vendas WHERE id = $1`, [venda_id]);

    await client.query("COMMIT");
    res.status(200).json({ message: "Venda cancelada com sucesso" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar venda" });
  } finally {
    client.release();
  }
}

