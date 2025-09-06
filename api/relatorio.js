// api/vendas.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função auxiliar para queries
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Handler principal
export default async function handler(req, res) {
  try {
    // Buscando todas as vendas
    const vendas = await query(`
      SELECT v.id as venda_id, v.data, c.nome as cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.data DESC
    `);

    // Para cada venda, buscar produtos
    const relatorio = [];
    for (let venda of vendas) {
      const produtos = await query(`
        SELECT p.descricao, vp.tamanho, vp.quantidade, vp.subtotal
        FROM venda_produtos vp
        LEFT JOIN produtos p ON vp.produto_id = p.id
        WHERE vp.venda_id = $1
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

    res.status(200).json(relatorio);
  } catch (err) {
    console.error("Erro na API de vendas:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}
