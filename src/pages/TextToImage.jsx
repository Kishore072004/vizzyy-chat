import { useState } from 'react';
import '../styles/TextToImage.css';

function TextToImage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        const newImages = data.images.map((url, idx) => ({
          url,
          prompt: prompt.trim(),
          id: Date.now() + idx
        }));
        setGeneratedImages(prev => [...newImages, ...prev]);
        setPrompt('');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page-content">
      <form className="generator-form" onSubmit={handleGenerate}>
        <div className="input-group">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the art you want to create... (e.g., 'a futuristic city at sunset')"
            disabled={isGenerating}
            rows={3}
          />
          <button type="submit" disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? 'Generating...' : 'Generate Art'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </form>

      {isGenerating && (
        <div className="generating-indicator">
          <div className="spinner"></div>
          <span>Creating your masterpiece...</span>
          <p className="generating-note">This may take 10-20 seconds</p>
        </div>
      )}

      <div className="gallery">
        {generatedImages.map((item) => (
          <div key={item.id} className="gallery-item">
            <img 
              src={item.url} 
              alt={item.prompt}
              onError={(e) => {
                console.error('Image failed to load:', item.url);
                e.target.src = 'https://via.placeholder.com/1024x1024/667eea/ffffff?text=Image+Loading+Error';
              }}
            />
            <div className="image-actions">
              <div className="image-prompt">{item.prompt}</div>
              <a href={item.url} download={`vizzy-art-${item.id}.png`} className="download-btn">
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      {generatedImages.length === 0 && !isGenerating && (
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h2>Start Creating</h2>
          <p>Enter a description above to generate your first artwork</p>
          <div className="example-prompts">
            <button onClick={() => setPrompt('A majestic lion in a mystical forest')}>
              Mystical Lion
            </button>
            <button onClick={() => setPrompt('Futuristic city with flying cars at sunset')}>
              Futuristic City
            </button>
            <button onClick={() => setPrompt('Abstract colorful geometric patterns')}>
              Abstract Art
            </button>
            <button onClick={() => setPrompt('Serene mountain landscape with aurora')}>
              Mountain Aurora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextToImage;
