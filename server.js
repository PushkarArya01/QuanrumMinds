
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/analyze', async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5500',
        'X-Title': 'AI Triage Dashboard'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: req.body.messages
      })
    });
    const data = await response.json();
    console.log("API RESPONSE:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
