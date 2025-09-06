// api/vendas.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { dataInicio, dataFim, cliente, produto } = query;

  try {
    // ---------------- Buscando vendas com JOIN ----------------
    let vendas = await query(`
      SELECT v.id as venda_id, v.data, c.nome as cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE ($1 IS NULL OR v.data >= $1)
        AND ($2 IS NULL OR v.data <= $2)
        AND ($3 IS NULL OR LOWER(c.nome) LIKE '%' || LOWER($3) || '%')
      ORDER BY v.data DESC
    `, [dataInicio || null, dataFim || null, cliente || null]);

    // ---------------- Buscando produtos de cada venda ----------------
    const relatorio = [];
    for (let venda of vendas) {
      let produtos = await query(`
        SELECT p.descricao, vp.tamanho, vp.quantidade, vp.subtotal
        FROM venda_produtos vp
        LEFT JOIN produtos p ON vp.produto_id = p.id
        WHERE vp.venda_id = $1
        ${produto ? "AND LOWER(p.descricao) LIKE '%' || LOWER($2) || '%'" : ""}
      `, produto ? [venda.venda_id, produto] : [venda.venda_id]);

      relatorio.push({
        data: venda.data ? venda.data.toISOString().split('T')[0] : '',
        cliente: venda.cliente || 'Cliente não encontrado',
        produtos: produtos.map(p => ({
          descricao: p.descricao || '-',
          tamanho: p.tamanho || '-',
          quantidade: p.quantidade || 0,
          subtotal: p.subtotal || 0
        }))
      });
    }

    return res.status(200).json(relatorio);
  } catch (err) {
    console.error("Erro na API de vendas:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
