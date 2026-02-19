import { useState } from 'react';
import TextToImage from './pages/TextToImage';
import ImageToImage from './pages/ImageToImage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('text-to-image');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>Vizzy Art Generator</h1>
            <p>Create stunning visual art with AI</p>
          </div>
          
          <nav className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'text-to-image' ? 'active' : ''}`}
              onClick={() => setActiveTab('text-to-image')}
            >
              <span className="tab-icon">✨</span>
              <span>Text to Image</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'image-to-image' ? 'active' : ''}`}
              onClick={() => setActiveTab('image-to-image')}
            >
              <span className="tab-icon">🎨</span>
              <span>Image to Image</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'text-to-image' ? <TextToImage /> : <ImageToImage />}
      </main>
    </div>
  );
}

export default App;
