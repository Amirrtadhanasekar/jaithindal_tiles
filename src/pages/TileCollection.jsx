import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/tile-collection.css';
import { Upload, Trash2, Layers, Grid, Plus, Image as ImageIcon } from 'lucide-react';

const TileCollection = () => {
    const navigate = useNavigate();

    // Form State
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [tileSize, setTileSize] = useState('');
    const [designNumber, setDesignNumber] = useState('');
    const [tileAmount, setTileAmount] = useState('');
    const [tileType, setTileType] = useState('floor');

    // Collections State
    const [floorTiles, setFloorTiles] = useState([]);
    const [wallTiles, setWallTiles] = useState([]);

    useEffect(() => {
        loadTiles();
    }, []);

    const loadTiles = () => {
        const fTiles = JSON.parse(localStorage.getItem('floor')) || [];
        const wTiles = JSON.parse(localStorage.getItem('wall')) || [];
        setFloorTiles(fTiles);
        setWallTiles(wTiles);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!imagePreview || !tileSize || !designNumber || !tileAmount) {
            alert("Please fill all fields!");
            return;
        }

        const newTile = {
            image: imagePreview,
            size: tileSize,
            design: designNumber,
            amount: tileAmount,
            id: Date.now()
        };

        const key = tileType; // 'floor' or 'wall'
        const currentTiles = JSON.parse(localStorage.getItem(key)) || [];
        currentTiles.push(newTile);

        localStorage.setItem(key, JSON.stringify(currentTiles));

        alert("Tile saved successfully!");
        handleClear();
        loadTiles();
    };

    const handleClear = () => {
        setImageFile(null);
        setImagePreview(null);
        setTileSize('');
        setDesignNumber('');
        setTileAmount('');
        setTileType('floor');
    };

    const handleDelete = (type, index) => {
        if (!window.confirm("Are you sure you want to delete this tile?")) return;

        const key = type;
        const currentTiles = JSON.parse(localStorage.getItem(key)) || [];
        currentTiles.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(currentTiles));
        loadTiles();
    };

    return (
        <div className="collection-page">
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
                    <button className="crumb" onClick={() => navigate('/ai')}>AI Generation</button>
                    <button className="crumb active">Tile Selection</button>
                </nav>
            </header>

            <main className="container">
                <div className="page-header">
                    <h1>Tile Collection Manager</h1>
                    <p className="muted">Upload new tiles to the collection or manage existing ones.</p>
                </div>

                {/* UPLOAD SECTION */}
                <section className="card upload-section">
                    <h4 className="section-head"><Upload size={18} style={{ marginRight: '8px', display: 'inline' }} /> Upload New Tile</h4>

                    <div className="upload-grid">
                        <div>
                            <label className="field">
                                <span className="label-text">Tile Image</span>
                                <div className="file-input-wrapper">
                                    <input type="file" accept="image/*" onChange={handleImageChange} />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="preview-img" style={{ maxHeight: '150px' }} />
                                    ) : (
                                        <div style={{ color: '#9ca3af', padding: '20px' }}>
                                            <ImageIcon size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
                                            Click to Upload Image
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="field">
                                <span className="label-text">Tile Type</span>
                                <select value={tileType} onChange={(e) => setTileType(e.target.value)}>
                                    <option value="floor">Floor Tile</option>
                                    <option value="wall">Wall Tile</option>
                                </select>
                            </label>

                            <label className="field">
                                <span className="label-text">Size (e.g. 2x2)</span>
                                <input type="text" value={tileSize} onChange={(e) => setTileSize(e.target.value)} placeholder="Ex: 2x2, 4x4" />
                            </label>

                            <label className="field">
                                <span className="label-text">Design Number/Name</span>
                                <input type="text" value={designNumber} onChange={(e) => setDesignNumber(e.target.value)} placeholder="Ex: Marble-01" />
                            </label>

                            <label className="field">
                                <span className="label-text">Amount (₹)</span>
                                <input type="number" value={tileAmount} onChange={(e) => setTileAmount(e.target.value)} placeholder="0.00" />
                            </label>
                        </div>
                    </div>

                    <div className="action-row">
                        <button className="btn-outline" onClick={handleClear}>Reset</button>
                        <button className="btn-primary" onClick={handleSave}><Plus size={16} style={{ marginRight: '6px' }} /> Save Tile</button>
                    </div>
                </section>

                {/* FLOOR TILES */}
                <div className="section-divider">
                    <Grid size={24} color="#2f6b4b" />
                    <h2>Floor Tile Collection</h2>
                    <span className="muted">({floorTiles.length} items)</span>
                </div>

                {floorTiles.length === 0 ? (
                    <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>No floor tiles found in collection.</div>
                ) : (
                    <div className="collections-grid">
                        {floorTiles.map((tile, idx) => (
                            <div key={idx} className="tile-card">
                                <img src={tile.image} alt={tile.design} className="tile-img" />
                                <div className="tile-info">
                                    <h4>{tile.design}</h4>
                                    <div className="tile-meta">Size: {tile.size}</div>
                                    <div className="tile-meta">Price: ₹{tile.amount}</div>
                                    <button className="delete-btn" onClick={() => handleDelete('floor', idx)}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* WALL TILES */}
                <div className="section-divider" style={{ marginTop: '50px' }}>
                    <Layers size={24} color="#9153a3" />
                    <h2>Wall Tile Collection</h2>
                    <span className="muted">({wallTiles.length} items)</span>
                </div>

                {wallTiles.length === 0 ? (
                    <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>No wall tiles found in collection.</div>
                ) : (
                    <div className="collections-grid">
                        {wallTiles.map((tile, idx) => (
                            <div key={idx} className="tile-card">
                                <img src={tile.image} alt={tile.design} className="tile-img" />
                                <div className="tile-info">
                                    <h4>{tile.design}</h4>
                                    <div className="tile-meta">Size: {tile.size}</div>
                                    <div className="tile-meta">Price: ₹{tile.amount}</div>
                                    <button className="delete-btn" onClick={() => handleDelete('wall', idx)}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
};

export default TileCollection;
