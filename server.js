import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Revolt Motors Voice Bot Server...');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Middleware configured');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    apiKey: process.env.GEMINI_API_KEY ? 'Configured' : 'Missing',
    endpoints: ['/health', '/voice', '/voice-audio']
  });
});

// Text chat endpoint
app.post('/voice', async (req, res) => {
  const { message } = req.body;
  
  if (!message) return res.status(400).json({ reply: "Message is required" });

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ reply: "API key not configured. Please add GEMINI_API_KEY to your .env file." });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `You are a helpful assistant. User says: "${message}"` }] }]
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
    res.json({ reply });

  } catch (error) {
    console.error('Text API error:', error.response?.data || error.message);
    res.json({ reply: "Sorry, I'm having trouble connecting to the AI service right now." });
  }
});

// Audio endpoint
app.post('/voice-audio', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ replyText: "No audio data received", audioUrl: null });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: "Transcribe and respond to this audio message." },
              { inline_data: { mime_type: "audio/webm", data: audio } }
            ]
          }
        ]
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    const replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I processed your audio but couldn't generate a response.";
    res.json({ replyText, audioUrl: null });

  } catch (error) {
    console.error('Audio processing error:', error.response?.data || error.message);
    res.status(500).json({ replyText: "Sorry, I couldn't process your audio message.", audioUrl: null });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎉 Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
});
