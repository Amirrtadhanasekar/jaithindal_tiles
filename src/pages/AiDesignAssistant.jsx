import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Sparkles,
    MessageSquare,
    ArrowLeft,
    Upload,
    Send,
    Zap,
    Image as ImageIcon
} from 'lucide-react';
import '../styles/design-assistant.css';

const AiDesignAssistant = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('matcher'); // matcher, pairing, chatbot
    const [allTiles, setAllTiles] = useState([]);

    useEffect(() => {
        const fetchTiles = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/products');
                if (response.ok) {
                    const data = await response.json();

                    // Normalize data for the assistant (Capitalize type)
                    const formattedTiles = data.map(t => ({
                        ...t,
                        type: t.type.charAt(0).toUpperCase() + t.type.slice(1) // 'floor' -> 'Floor'
                    }));

                    setAllTiles(formattedTiles);
                } else {
                    console.error("Failed to fetch tiles for AI Assistant");
                }
            } catch (error) {
                console.error("Error loading tiles:", error);
            }
        };

        fetchTiles();
    }, []);

    return (
        <div className="assistant-page-wrapper">
            {/* Standard Topbar */}
            <header className="topbar">
                <div className="brand">
                    <div className="logo-circle">JTT</div>
                    <div className="brand-text">
                        <div className="brand-name">JAI THINDAL TILES</div>
                    </div>
                </div>
                <nav className="breadcrumbs" aria-label="Breadcrumb">
                    <button className="crumb" onClick={() => navigate('/customer')}>Customer Details</button>
                    <button className="crumb" onClick={() => navigate('/dashboard')}>Home</button>
                    <button className="crumb" onClick={() => navigate('/room-setup')}>Room Setup</button>
                    <button className="crumb active">AI Design Assistant</button>
                </nav>
            </header>

            <div className="design-assistant-container">

                <div className="assistant-header">
                    <h1 className="assistant-title">AI Design Assistant</h1>
                    <p className="assistant-subtitle">
                        Unlock the power of AI to visualize, match, and choose the perfect tiles for your dream space.
                    </p>
                </div>

                <div className="assistant-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'matcher' ? 'active' : ''}`}
                        onClick={() => setActiveTab('matcher')}
                    >
                        <Camera size={20} /> Style Matcher
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'pairing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pairing')}
                    >
                        <Sparkles size={20} /> Intelligent Pairing
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'chatbot' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chatbot')}
                    >
                        <MessageSquare size={20} /> Chatbot Advisor
                    </button>
                </div>

                <div className="assistant-content">
                    {activeTab === 'matcher' && <StyleMatcher allTiles={allTiles} />}
                    {activeTab === 'pairing' && <IntelligentPairing allTiles={allTiles} />}
                    {activeTab === 'chatbot' && <ChatbotAdvisor />}
                </div>
            </div>
        </div>
    );
};

// ------------------- SUB COMPONENTS -------------------

const StyleMatcher = ({ allTiles }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSelectedImage(imageUrl);
            setResults(null);
            // Simulate analysis
            setIsAnalyzing(true);

            setTimeout(() => {
                setIsAnalyzing(false);
                // Randomly select 2-3 tiles from the actual loaded tiles to simulate a match
                if (allTiles.length > 0) {
                    // Shuffle and pick 3
                    const shuffled = [...allTiles].sort(() => 0.5 - Math.random());
                    const suggestions = shuffled.slice(0, 3).map(tile => ({
                        id: tile.id,
                        name: tile.design,
                        type: tile.type,
                        match: Math.floor(Math.random() * (99 - 85) + 85) + "%", // Random match %
                        img: tile.image
                    }));
                    setResults(suggestions);
                } else {
                    // Fallback if no tiles exist
                    setResults([]);
                }
            }, 2000);
        }
    };

    return (
        <div className="matcher-container">
            {!selectedImage ? (
                <div
                    className="upload-zone"
                    onClick={() => fileInputRef.current.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        hidden
                        accept="image/*"
                    />
                    <Upload className="upload-icon" />
                    <h3>Upload Your Inspiration</h3>
                    <p className="muted">Click to upload an image of a room you love</p>
                </div>
            ) : (
                <div className="upload-zone" style={{ borderStyle: 'solid' }}>
                    <img src={selectedImage} alt="Preview" className="preview-image" />
                </div>
            )}

            {isAnalyzing && (
                <div className="analyzing-loader">
                    <div className="spinner"></div>
                    <p>AI is analyzing texture, color, and style from your collection...</p>
                </div>
            )}

            {results && (
                <>
                    <div className="results-header">
                        <h3>Matched Tiles from Collection</h3>
                        {results.length === 0 && <p className="text-warning">No tiles found in collection to match.</p>}
                    </div>
                    <div className="analysis-results">
                        {results.map((item) => (
                            <div key={item.id} className="suggestion-card">
                                <img src={item.img} alt={item.name} className="suggestion-img" />
                                <div className="suggestion-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div className="suggestion-title">{item.name}</div>
                                        <div className="suggestion-match">{item.match} match</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{item.type} Tile</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {selectedImage && !isAnalyzing && (
                <button
                    className="btn-outline"
                    onClick={() => { setSelectedImage(null); setResults(null); }}
                    style={{ marginTop: '2rem' }}
                >
                    Try Another Image
                </button>
            )}
        </div>
    );
};

const IntelligentPairing = ({ allTiles }) => {
    const [selectedTile, setSelectedTile] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    // Use first 4 tiles as options, or fallback
    const displayOptions = allTiles.length > 0 ? allTiles.slice(0, 4) : [];

    useEffect(() => {
        if (selectedTile) {
            // Find complementary tiles from the REST of the array
            // Logic: Pick random tiles that are NOT the selected one
            const others = allTiles.filter(t => t.id !== selectedTile);
            const shuffled = others.sort(() => 0.5 - Math.random());

            const recs = shuffled.slice(0, 2).map(t => {
                // Generate a more specific reason based on tile type or random design logic
                const reasons = [
                    `The texture of ${t.design} provides a striking contrast to the selected tile.`,
                    `This ${t.type} tile shares complementary undertones, creating a cohesive look.`,
                    `A perfect match! The finish of this tile balances the base selection beautifully.`,
                    `This pairing works well because the neutral colors ground the bolder base tile.`
                ];
                const randomReason = reasons[Math.floor(Math.random() * reasons.length)];

                return {
                    id: t.id,
                    name: t.design,
                    img: t.image,
                    reason: randomReason
                };
            });

            setSuggestions(recs);
        }
    }, [selectedTile, allTiles]);

    return (
        <div className="pairing-container">
            <div className="selection-panel">
                <div className="section-label"><Zap className="accent-text" /> Select Base Tile</div>
                {displayOptions.length === 0 ? (
                    <div className="muted">No tiles in inventory.</div>
                ) : (
                    <div className="tile-grid">
                        {displayOptions.map(tile => (
                            <div
                                key={tile.id}
                                className={`tile-option ${selectedTile === tile.id ? 'selected' : ''}`}
                                onClick={() => setSelectedTile(tile.id)}
                            >
                                <img src={tile.image} alt={tile.design} />
                                <div style={{ padding: '0.5rem', fontWeight: '600' }}>{tile.design}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="recommendation-panel">
                <div className="section-label"><Sparkles className="accent-text" /> AI Suggested Combinations</div>
                {suggestions.length > 0 ? (
                    <div className="tile-grid">
                        {suggestions.map(tile => (
                            <div key={tile.id} className="tile-option">
                                <img src={tile.img} alt={tile.name} />
                                <div style={{ padding: '0.5rem' }}>
                                    <div style={{ fontWeight: '600' }}>{tile.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{tile.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        Select a tile to see recommendations
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatbotAdvisor = () => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: "Hello! I'm your Jaithindal AI Assistant. Ask me anything about tiles, maintenance, or design trends!" }
    ]);
    const [input, setInput] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simulate AI Typying
        setTimeout(() => {
            const aiResponseText = generateResponse(input);
            const aiMsg = { id: Date.now() + 1, sender: 'ai', text: aiResponseText };
            setMessages(prev => [...prev, aiMsg]);
        }, 1000);
    };

    const generateResponse = (query) => {
        const q = query.toLowerCase();
        if (q.includes('price') || q.includes('cost')) return "Our tiles range from ₹45 to ₹250 per sq.ft depending on the material (Ceramic vs Vitrified). Would you like to see a specific category?";
        if (q.includes('bathroom') || q.includes('toilet')) return "For bathrooms, I highly recommend 'Anti-Skid' or 'Matte Finish' tiles to prevent slipping when wet. 300x300mm is a popular size.";
        if (q.includes('kitchen')) return "Kitchens look great with Dado tiles (highlighters) above the counter. Glossy finishes are easier to clean oil splashes from.";
        if (q.includes('living')) return "Large format (600x1200mm) GVT tiles are trending for living rooms as they give a spacious, seamless look.";
        if (q.includes('thank')) return "You're welcome! Let me know if you need help with anything else.";
        // Fallback
        return "That's an interesting question. While I'm still learning, I'd suggest visiting our 'Tile Collection' page to explore more options or contacting our sales team for specific queries.";
    };

    return (
        <div className="chat-container">
            <div className="chat-messages" ref={containerRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="chat-input-area">
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Ask about bathroom tiles, maintenance, prices..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className="send-btn" onClick={handleSend}>
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default AiDesignAssistant;
