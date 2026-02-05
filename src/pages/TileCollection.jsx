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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTiles();
    }, []);

    const loadTiles = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/products');
            if (response.ok) {
                const data = await response.json();
                // Filter into existing structure
                setFloorTiles(data.filter(p => p.type === 'floor'));
                setWallTiles(data.filter(p => p.type === 'wall'));
            } else {
                console.error("Failed to fetch products");
            }
        } catch (error) {
            console.error("Error loading products:", error);
        }
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

    const handleSave = async () => {
        if (!imagePreview || !tileSize || !designNumber || !tileAmount) {
            alert("Please fill all fields!");
            return;
        }

        setLoading(true);

        const newTile = {
            id: Date.now(),
            type: tileType,
            image: imagePreview,
            size: tileSize,
            design: designNumber,
            amount: parseFloat(tileAmount)
        };

        try {
            const response = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTile)
            });

            if (response.ok) {
                alert("Tile saved successfully!");
                handleClear();
                loadTiles(); // Reload from server
            } else {
                alert("Failed to save tile to server.");
            }
        } catch (error) {
            console.error("Error saving tile:", error);
            alert("Error saving tile.");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setImageFile(null);
        setImagePreview(null);
        setTileSize('');
        setDesignNumber('');
        setTileAmount('');
        setTileType('floor');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this tile?")) return;

        try {
            const response = await fetch(`http://localhost:5000/api/products/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadTiles(); // Reload from server
            } else {
                alert("Failed to delete tile.");
            }
        } catch (error) {
            console.error("Error deleting tile:", error);
        }
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
                        <button className="btn-primary" onClick={handleSave} disabled={loading}>
                            <Plus size={16} style={{ marginRight: '6px' }} />
                            {loading ? 'Saving...' : 'Save Tile'}
                        </button>
                    </div>
                </section>

                {/* FLOOR TILES */}
                <div className="section-divider">
                    <Grid size={24} color="#2f6b4b" />
                    <h2>Floor Tile Collection</h2>
                    <span className="muted">({floorTiles.length} items)</span>
                </div>

                {floorTiles.length === 0 ? (
                    <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>No floor tiles found in server collection.</div>
                ) : (
                    <div className="collections-grid">
                        {floorTiles.map((tile, idx) => (
                            <div key={tile.id || idx} className="tile-card">
                                <img src={tile.image} alt={tile.design} className="tile-img" />
                                <div className="tile-info">
                                    <h4>{tile.design}</h4>
                                    <div className="tile-meta">Size: {tile.size}</div>
                                    <div className="tile-meta">Price: ₹{tile.amount}</div>
                                    <button className="delete-btn" onClick={() => handleDelete(tile.id)}>
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
                    <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>No wall tiles found in server collection.</div>
                ) : (
                    <div className="collections-grid">
                        {wallTiles.map((tile, idx) => (
                            <div key={tile.id || idx} className="tile-card">
                                <img src={tile.image} alt={tile.design} className="tile-img" />
                                <div className="tile-info">
                                    <h4>{tile.design}</h4>
                                    <div className="tile-meta">Size: {tile.size}</div>
                                    <div className="tile-meta">Price: ₹{tile.amount}</div>
                                    <button className="delete-btn" onClick={() => handleDelete(tile.id)}>
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
