// api/relatorio.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função auxiliar
async function executarQuery(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

export default async function handler(req, res) {
  const { method } = req;
  const { dataInicio, dataFim, cliente, produto } = req.query;

  if (method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Monta query dinâmica para vendas
    let queryText = `
      SELECT v.id as venda_id, v.data, c.nome as cliente
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (dataInicio) {
      queryText += ` AND v.data >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      queryText += ` AND v.data <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    if (cliente) {
      queryText += ` AND LOWER(c.nome) LIKE '%' || LOWER($${paramIndex}) || '%'`;
      params.push(cliente);
      paramIndex++;
    }

    queryText += " ORDER BY v.data DESC";

    const vendas = await executarQuery(queryText, params);

    // Buscar produtos de cada venda
    const relatorio = [];
    for (let venda of vendas) {
      let produtosQuery = `
        SELECT p.descricao, vp.tamanho, vp.quantidade, vp.preco, (vp.quantidade * vp.preco) AS subtotal
        FROM vendas_itens vp
        LEFT JOIN produtos p ON vp.produto_id = p.id
        WHERE vp.venda_id = $1
      `;
      const produtosParams = [venda.venda_id];

      if (produto) {
        produtosQuery += ` AND LOWER(p.descricao) LIKE '%' || LOWER($2) || '%'`;
        produtosParams.push(produto);
      }

      const produtos = await executarQuery(produtosQuery, produtosParams);

      relatorio.push({
        data: venda.data ? venda.data.toISOString().split("T")[0] : "",
        cliente: venda.cliente || "Cliente não encontrado",
        produtos: produtos.map(p => ({
          descricao: p.descricao || "-",
          tamanho: p.tamanho || "-",
          quantidade: p.quantidade || 0,
          subtotal: Number(p.subtotal) || 0
        }))
      });
    }

    return res.status(200).json(relatorio);
  } catch (err) {
    console.error("Erro na API de relatório:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
