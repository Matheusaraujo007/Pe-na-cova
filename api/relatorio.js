// api/relatorio.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function executarQuery(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // 1️⃣ Buscar todas as vendas com clientes
    const vendas = await executarQuery(`
      SELECT v.id AS venda_id, v.data, c.nome AS cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.data DESC
    `);

    // 2️⃣ Buscar os itens de cada venda
    const relatorio = [];
    for (const venda of vendas) {
      const produtos = await executarQuery(`
        SELECT p.descricao, vi.tamanho, vi.quantidade, vi.preco, (vi.quantidade * vi.preco) AS subtotal
        FROM vendas_itens vi
        LEFT JOIN produtos p ON vi.produto_id = p.id
        WHERE vi.venda_id = $1
      `, [venda.venda_id]);

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
    console.error("Erro na API de relatório:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
