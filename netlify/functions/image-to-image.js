import multipart from 'parse-multipart-data';
import FormData from 'form-data';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

    if (!STABILITY_API_KEY) {
      throw new Error('API key not configured');
    }

    // Parse multipart form data
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

    let prompt = '';
    let imageBuffer = null;

    for (const part of parts) {
      if (part.name === 'prompt') {
        prompt = part.data.toString();
      } else if (part.name === 'image') {
        imageBuffer = part.data;
      }
    }

    if (!imageBuffer || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image and prompt are required' })
      };
    }

    // Create form data for Stability AI
    const formData = new FormData();
    formData.append('init_image', imageBuffer, {
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
      throw new Error(`Stability AI error: ${stabilityResponse.status}`);
    }

    const stabilityData = await stabilityResponse.json();
    
    if (stabilityData.artifacts && stabilityData.artifacts.length > 0) {
      const base64Image = stabilityData.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${base64Image}`;
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          content: `Transformed: "${prompt}"`,
          images: [imageUrl],
          timestamp: new Date().toISOString(),
        })
      };
    }

    throw new Error('No image generated');
  } catch (error) {
    console.error('Image-to-Image error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to transform image',
        details: error.message
      })
    };
  }
}
