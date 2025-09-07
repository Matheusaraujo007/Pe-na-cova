// api/relatorio.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔹 Função auxiliar para executar query
async function executarQuery(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// 🔹 Ajuste de data para UTC-3 (Brasília)
function formatarDataBrasilia(data) {
  if (!data) return '';
  const dt = new Date(data);
  dt.setHours(dt.getHours() - 3); // Ajuste para UTC-3
  return dt.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  const { method } = req;
  const { dataInicio, dataFim, cliente, produto } = req.query;

  if (method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // 🔹 Buscar vendas
    let vendas = await executarQuery(`
      SELECT v.id as venda_id, v.data, c.nome as cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE ($1 IS NULL OR v.data >= $1)
        AND ($2 IS NULL OR v.data <= $2)
        AND ($3 IS NULL OR LOWER(c.nome) LIKE '%' || LOWER($3) || '%')
      ORDER BY v.data DESC
    `, [dataInicio || null, dataFim || null, cliente || null]);

    const relatorio = [];

    for (let venda of vendas) {
      let produtos = await executarQuery(`
        SELECT p.descricao, vp.tamanho, vp.quantidade, vp.subtotal
        FROM vendas_itens vp
        LEFT JOIN produtos p ON vp.produto_id = p.id
        WHERE vp.venda_id = $1
        ${produto ? "AND LOWER(p.descricao) LIKE '%' || LOWER($2) || '%'" : ""}
      `, produto ? [venda.venda_id, produto] : [venda.venda_id]);

      relatorio.push({
        data: formatarDataBrasilia(venda.data),
        cliente: venda.cliente || 'Cliente não encontrado',
        produtos: produtos.map(p => ({
          descricao: p.descricao || '-',
          tamanho: p.tamanho || '-',
          quantidade: p.quantidade || 0,
          subtotal: Number(p.subtotal) || 0  // garantir number para toFixed
        }))
      });
    }

    return res.status(200).json(relatorio);

  } catch (err) {
    console.error("Erro na API de relatório:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
