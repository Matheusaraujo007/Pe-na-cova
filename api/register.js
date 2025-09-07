import pkg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // coloque a URL do Neon no Vercel
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { usuario, senha } = req.body;

  if (!usuario || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });

  try {
    const hash = await bcrypt.hash(senha, 10);

    const query = 'INSERT INTO usuarios (nome, senha) VALUES ($1, $2)';
    await pool.query(query, [usuario, hash]);

    res.status(200).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    if (err.code === '23505') {
      // Violação de unicidade
      return res.status(400).json({ error: 'Usuário já existe!' });
    }
    res.status(500).json({ error: err.message });
  }
}
