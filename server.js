// MIMS API Proxy Server
// Hospede isso no Railway (railway.app) — gratuito para volumes baixos
// Ele protege sua chave de API e serve o frontend

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'MIMS online 🌿', version: '1.0' });
});

// ── Proxy da API Anthropic (chave fica segura no servidor)
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error('Erro na API:', err);
    res.status(500).json({ error: 'Erro interno ao chamar a API.' });
  }
});

// ── Serve o frontend para qualquer rota não encontrada
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 MIMS rodando na porta ${PORT}`);
});
