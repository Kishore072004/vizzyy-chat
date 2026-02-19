import { useState } from 'react';
import '../styles/ImageToImage.css';

function ImageToImage() {
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }

      setUploadedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!uploadedImage) {
      setError('Please upload an image first');
      return;
    }

    if (!prompt.trim()) {
      setError('Please describe how you want to transform the image');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      formData.append('image', uploadedImage);

      const response = await fetch('/api/image-to-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transform image');
      }

      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        const newImages = data.images.map((url, idx) => ({
          url,
          prompt: prompt.trim(),
          originalImage: imagePreview,
          id: Date.now() + idx
        }));
        setGeneratedImages(prev => [...newImages, ...prev]);
        setPrompt('');
        removeImage();
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to transform image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page-content">
      <form className="generator-form" onSubmit={handleGenerate}>
        <div className="upload-area">
          {!imagePreview ? (
            <label className="upload-zone">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isGenerating}
              />
              <div className="upload-content">
                <span className="upload-icon">📷</span>
                <h3>Upload Your Image</h3>
                <p>Click or drag an image here to transform it</p>
                <span className="upload-hint">Supports JPG, PNG (Max 10MB)</span>
              </div>
            </label>
          ) : (
            <div className="uploaded-image-preview">
              <img src={imagePreview} alt="Preview" />
              <button
                type="button"
                onClick={removeImage}
                className="remove-btn"
                disabled={isGenerating}
              >
                ✕ Remove Image
              </button>
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="transform-controls">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to transform this image... (e.g., 'turn into a watercolor painting', 'make it look like Van Gogh painted it')"
              disabled={isGenerating}
              rows={3}
            />
            <button type="submit" disabled={isGenerating || !prompt.trim()}>
              {isGenerating ? 'Transforming...' : 'Transform Image'}
            </button>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
      </form>

      {isGenerating && (
        <div className="generating-indicator">
          <div className="spinner"></div>
          <span>Transforming your image with AI...</span>
          <p className="generating-note">This may take 15-30 seconds</p>
        </div>
      )}

      <div className="gallery">
        {generatedImages.map((item) => (
          <div key={item.id} className="gallery-item">
            <div className="comparison">
              <div className="comparison-side">
                <span className="label">Original</span>
                <img src={item.originalImage} alt="Original" />
              </div>
              <div className="comparison-arrow">→</div>
              <div className="comparison-side">
                <span className="label">Transformed</span>
                <img 
                  src={item.url} 
                  alt={item.prompt}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/512x512/667eea/ffffff?text=Error';
                  }}
                />
              </div>
            </div>
            <div className="image-actions">
              <div className="image-prompt">{item.prompt}</div>
              <a href={item.url} download={`transformed-${item.id}.png`} className="download-btn">
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      {generatedImages.length === 0 && !isGenerating && !imagePreview && (
        <div className="empty-state">
          <div className="empty-icon">🖼️</div>
          <h2>Transform Your Images</h2>
          <p>Upload an image and describe how you want to transform it</p>
          <div className="example-prompts">
            <div className="example-item">
              <strong>Artistic Styles:</strong> watercolor, oil painting, Van Gogh style, anime
            </div>
            <div className="example-item">
              <strong>Effects:</strong> pencil sketch, cartoon, cyberpunk, vintage photo
            </div>
            <div className="example-item">
              <strong>Enhancements:</strong> professional photo, cinematic lighting, HDR
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageToImage;
