import express from 'express';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// API Keys - Add these in Render environment variables
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Text-to-Image endpoint
app.post('/api/text-to-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Text-to-Image:', prompt);

    const requestBody = {
      prompt: prompt,
      aspect_ratio: 'square_1_1'
    };

    const createResponse = await fetch('https://api.freepik.com/v1/ai/mystic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-freepik-api-key': FREEPIK_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!createResponse.ok) {
      throw new Error(`Freepik API error: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.data?.task_id;

    if (!taskId) {
      throw new Error('No task_id received');
    }

    let images = [];
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-freepik-api-key': FREEPIK_API_KEY,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (statusData.data?.status === 'COMPLETED') {
          if (statusData.data?.generated && Array.isArray(statusData.data.generated)) {
            images = statusData.data.generated.filter(url => typeof url === 'string' && url.length > 0);
          }
          
          if (images.length > 0) {
            break;
          }
        }

        if (statusData.data?.status === 'FAILED') {
          throw new Error('Generation failed');
        }
      }

      attempts++;
    }

    if (images.length === 0) {
      throw new Error('Generation timed out');
    }

    res.json({
      content: `Created: "${prompt}"`,
      images: images,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error:', error);
    
    const timestamp = Date.now();
    const seed = encodeURIComponent(req.body.prompt + timestamp);
    const imageUrl = `https://api.dicebear.com/7.x/shapes/png?seed=${seed}&size=1024`;

    res.json({
      content: `Placeholder for: "${req.body.prompt}"`,
      images: [imageUrl],
      timestamp: new Date().toISOString(),
    });
  }
});

// Image-to-Image endpoint
app.post('/api/image-to-image', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const uploadedImage = req.file;

    if (!uploadedImage || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    console.log('Image-to-Image:', prompt);

    const resizedImageBuffer = await sharp(uploadedImage.buffer)
      .resize(1024, 1024, {
        fit: 'cover',
        position: 'center',
        kernel: sharp.kernel.lanczos3
      })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const formData = new FormData();
    formData.append('init_image', resizedImageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35');
    formData.append('text_prompts[0][text]', prompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');
    formData.append('steps', '50');

    const stabilityResponse = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'application/json',
          ...formData.getHeaders(),
        },
        body: formData.getBuffer(),
      }
    );

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error('Stability AI error:', stabilityResponse.status, errorText);
      throw new Error(`Stability AI error: ${stabilityResponse.status}`);
    }

    const stabilityData = await stabilityResponse.json();
    
    if (stabilityData.artifacts && stabilityData.artifacts.length > 0) {
      const base64Image = stabilityData.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${base64Image}`;
      
      console.log('Image transformed successfully');
      return res.json({
        content: `Transformed: "${prompt}"`,
        images: [imageUrl],
        timestamp: new Date().toISOString(),
      });
    }

    throw new Error('No image generated');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to transform image',
      details: error.message
    });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Vizzy Art Generator running on port ${PORT}`);
});
