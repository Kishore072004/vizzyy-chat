export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    if (!FREEPIK_API_KEY) {
      throw new Error('API key not configured');
    }

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

    // Poll for completion
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        content: `Created: "${prompt}"`,
        images: images,
        timestamp: new Date().toISOString(),
      })
    };
  } catch (error) {
    console.error('Text-to-Image error:', error);
    
    // Fallback
    const timestamp = Date.now();
    const seed = encodeURIComponent(JSON.parse(event.body).prompt + timestamp);
    const imageUrl = `https://api.dicebear.com/7.x/shapes/png?seed=${seed}&size=1024`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        content: `Placeholder for: "${JSON.parse(event.body).prompt}"`,
        images: [imageUrl],
        timestamp: new Date().toISOString(),
      })
    };
  }
}
