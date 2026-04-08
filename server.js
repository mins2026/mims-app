// MIMS Server — Proxy seguro + Protótipo
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting simples
const rateLimit = {};
function checkRateLimit(ip) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  if (!rateLimit[ip]) rateLimit[ip] = { count: 0, reset: now + hour };
  if (now > rateLimit[ip].reset) rateLimit[ip] = { count: 0, reset: now + hour };
  rateLimit[ip].count++;
  return rateLimit[ip].count <= 100;
}

// ── Saúde
app.get('/health', (req, res) => {
  res.json({ status: 'MIMS online 🌿', version: '3.0' });
});

// ── Protótipo principal
app.get('/prototipo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prototipo.html'));
});

// ── Demo (alias)
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prototipo.html'));
});

// ── Proxy da API Anthropic (chave protegida no servidor)
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada.' });
  }

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um momento.' });
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

// ── Root → redireciona para /prototipo
app.get('/', (req, res) => {
  res.redirect('/prototipo');
});

// ── Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prototipo.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 MIMS rodando na porta ${PORT}`);
  console.log(`   Protótipo: /prototipo`);
  console.log(`   API proxy: POST /api/chat`);
});
