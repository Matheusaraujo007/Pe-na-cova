// api/relatorio.js
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
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { dataInicio, dataFim, cliente, produto } = req.query;

  try {
    // Tratar datas vazias
    const dataInicioParam = dataInicio && dataInicio.trim() !== "" ? dataInicio : null;
    const dataFimParam = dataFim && dataFim.trim() !== "" ? dataFim : null;

    // 1️⃣ Buscar vendas com filtros
    const vendas = await query(
      `
      SELECT v.id as venda_id, v.data, c.nome as cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE ($1 IS NULL OR v.data >= $1)
        AND ($2 IS NULL OR v.data <= $2)
        AND ($3 IS NULL OR LOWER(c.nome) LIKE '%' || LOWER($3) || '%')
      ORDER BY v.data DESC
      `,
      [dataInicioParam, dataFimParam, cliente || null]
    );

    // 2️⃣ Para cada venda, buscar produtos
    const relatorio = [];

    for (const venda of vendas) {
      let produtosQuery = `
        SELECT p.descricao, vi.tamanho, vi.quantidade, vi.preco
        FROM vendas_itens vi
        LEFT JOIN produtos p ON vi.produto_id = p.id
        WHERE vi.venda_id = $1
      `;
      const params = [venda.venda_id];

      if (produto && produto.trim() !== "") {
        produtosQuery += ` AND LOWER(p.descricao) LIKE '%' || LOWER($2) || '%'`;
        params.push(produto);
      }

      const produtos = await query(produtosQuery, params);

      // Calcular subtotal de cada produto
      const produtosComSubtotal = produtos.map(p => ({
        descricao: p.descricao || '-',
        tamanho: p.tamanho || '-',
        quantidade: p.quantidade || 0,
        subtotal: p.preco && p.quantidade ? parseFloat(p.preco) * parseInt(p.quantidade) : 0
      }));

      relatorio.push({
        data: venda.data ? venda.data.toISOString().split("T")[0] : '',
        cliente: venda.cliente || '-',
        produtos: produtosComSubtotal
      });
    }

    return res.status(200).json(relatorio);

  } catch (err) {
    console.error("Erro na API de relatório:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
