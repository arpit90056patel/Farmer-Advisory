require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const systemPrompt = `You are an AI Digital Krishi Officer specializing in Kerala agriculture. Focus exclusively on topics like coconut, rubber, spices, rice, traditional Kerala farming practices, crop advisory, diseases, monsoon farming, government schemes, market prices, and weather alerts. Always respond helpfully, accurately, and in a farmer-first manner. If the query is not agriculture-related, politely redirect to relevant topics. Keep responses concise and practical.`;

const modelName = 'gemini-2.0-flash';

app.use(cors());
app.use(express.json({ limit: '20mb' })); // For images

// Proxy endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, language, imageBase64, mimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Language-specific prompt
    const langMap = { en: 'English', hi: 'Hindi', ml: 'Malayalam' };
    const langPrompt = `Respond in ${langMap[language || 'en']}. ${prompt}`;

    // Prepend system prompt
    const fullPrompt = `${systemPrompt}\n\nUser: ${langPrompt}`;

    console.log('Processing prompt:', fullPrompt.substring(0, 100) + '...');

    const model = genAI.getGenerativeModel({ model: modelName });

    let result;
    if (imageBase64 && mimeType) {
      const validImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'];
      if (!validImageTypes.includes(mimeType)) {
        console.warn('Invalid MIME type:', mimeType);
        return res.status(400).json({ error: 'Invalid image format. Use PNG, JPEG, WebP, HEIC, HEIF, or BMP.' });
      }
      console.log('Processing image - MIME:', mimeType, 'Base64 length:', imageBase64.length);
      try {
        result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          },
          { text: fullPrompt }
        ]);
      } catch (imgError) {
        console.error('Image processing error:', imgError.message, imgError.stack);
        return res.status(500).json({ error: `Image processing failed: ${imgError.message}. Try a different image.` });
      }
    } else {
      result = await model.generateContent(fullPrompt);
    }

    const text = result.response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    console.log('Gemini response:', text.substring(0, 100) + '...');
    res.json({ response: text });
  } catch (error) {
    console.error('Gemini Error:', error.message, error.stack);
    res.status(500).json({ error: `API error: ${error.message}. Check API key, image size, or try a text-only query.` });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));