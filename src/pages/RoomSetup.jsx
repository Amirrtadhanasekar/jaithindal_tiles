import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/room-setup.css';
import { ArrowLeft, ArrowRight, Settings } from 'lucide-react';

const RoomSetup = () => {
    const navigate = useNavigate();
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [dimMethod, setDimMethod] = useState('width-length'); // 'width-length' or 'total-area'
    const [width, setWidth] = useState('');
    const [length, setLength] = useState('');
    const [totalArea, setTotalArea] = useState('');
    const [selectedModel, setSelectedModel] = useState('Normal Room');

    const [readyArea, setReadyArea] = useState('0.00 sq. ft');

    useEffect(() => {
        calculateArea();
    }, [width, length, totalArea, dimMethod]);

    const calculateArea = () => {
        let area = 0;
        if (dimMethod === 'total-area') {
            const v = parseFloat(totalArea);
            area = (isNaN(v) ? 0 : v);
        } else {
            const w = parseFloat(width);
            const l = parseFloat(length);
            area = (isNaN(w) || isNaN(l)) ? 0 : (w * l);
        }
        setReadyArea(`${area.toFixed(2)} sq. ft`);
        return area;
    };

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
    };

    const handleDimMethodChange = (method) => {
        setDimMethod(method);
        // Logic to clear other inputs or keep them can vary, keeping them for now is safer
    };

    const handleModelSelect = (model, disabled) => {
        if (disabled) return;
        setSelectedModel(model);
    };

    const handleGenerate = () => {
        const area = parseFloat(readyArea.split(' ')[0]); // simple parsing from display string or recalculate
        if (!selectedRoom) {
            alert('Please select a Room Type.');
            return;
        }
        if (area <= 0) {
            alert('Please enter valid room dimensions or total area.');
            return;
        }

        const widthVal = parseFloat(width);
        const lengthVal = parseFloat(length);
        const totalAreaVal = parseFloat(totalArea);

        let finalWidth = (!isNaN(widthVal) && widthVal > 0) ? widthVal : null;
        let finalLength = (!isNaN(lengthVal) && lengthVal > 0) ? lengthVal : null;
        let finalArea = (!isNaN(totalAreaVal) && totalAreaVal > 0) ? totalAreaVal : area;

        // Infer width/length if missing
        if (!finalWidth || !finalLength) {
            if (finalArea > 0) {
                const side = Math.sqrt(finalArea);
                if (!finalWidth) finalWidth = Math.round(side * 100) / 100;
                if (!finalLength) finalLength = Math.round(side * 100) / 100;
            } else {
                if (!finalWidth) finalWidth = 15;
                if (!finalLength) finalLength = 20;
                finalArea = finalWidth * finalLength;
            }
        }

        const setup = {
            roomType: selectedRoom,
            area: finalArea,
            model: selectedModel,
            width: finalWidth,
            length: finalLength,
            createdAt: new Date().toISOString()
        };

        sessionStorage.setItem('tileSetup', JSON.stringify(setup));
        navigate('/ai'); // Corresponds to ai-generation.html
    };

    const rooms = [
        { name: 'Kitchen', icon: '🍽️', desc: 'Modern kitchen spaces with countertops and backsplash areas' },
        { name: 'Bedroom', icon: '🛏️', desc: 'Comfortable bedroom floors and accent walls' },
        { name: 'Bathroom', icon: '🚿', desc: 'Waterproof bathroom walls and floors' },
        { name: 'Living Room', icon: '🛋️', desc: 'Spacious living areas with elegant flooring' },
        { name: 'Balcony', icon: '🏖️', desc: 'Outdoor balcony spaces with weather-resistant tiles' },
        { name: 'Elevation', icon: '🏢', desc: 'Exterior building facades and elevation designs' },
        { name: 'Parking', icon: '🚗', desc: 'Durable parking area flooring solutions' },
    ];

    return (
        <div className="setup-body"> {/* Context wrapper if needed for global styles */}
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
                    <button className="crumb active">Room Setup</button>
                    <button className="crumb">AI Generation</button>
                    <button className="crumb">Tile Selection</button>
                </nav>
            </header>

            <main className="setup-page">
                <div className="container">
                    <div className="page-header">
                        <h1>Tile Visualization Setup</h1>
                        <p className="muted">Configure room parameters for AI-powered 3D visualization</p>
                    </div>

                    {/* Room Types */}
                    <section className="card">
                        <h4 className="section-head">Select Room Type</h4>
                        <p className="muted small">Choose the type of room you want to visualize</p>

                        <div className="room-grid">
                            {rooms.map(room => (
                                <button
                                    key={room.name}
                                    className={`room-card ${selectedRoom === room.name ? 'active' : ''}`}
                                    onClick={() => handleRoomSelect(room.name)}
                                    style={selectedRoom === room.name ? { borderColor: 'rgba(47,107,75,0.32)' } : {}}
                                >
                                    <div className="room-icon">{room.icon}</div>
                                    <div className="room-title">{room.name}</div>
                                    <div className="room-desc muted">{room.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Room Dimensions */}
                    <section className="card mt">
                        <h4 className="section-head">Room Dimensions</h4>
                        <p className="muted small">Choose your preferred measurement method</p>

                        <div className="dim-methods">
                            <label
                                className={`dim-radio ${dimMethod === 'width-length' ? 'selected' : ''}`}
                                onClick={() => handleDimMethodChange('width-length')}
                            >
                                <input
                                    type="radio"
                                    name="dimMethod"
                                    value="width-length"
                                    checked={dimMethod === 'width-length'}
                                    onChange={() => { }}
                                />
                                <div className="radio-title">Width &amp; Length</div>
                                <div className="radio-sub muted">Enter separate measurements</div>
                            </label>

                            <label
                                className={`dim-radio ${dimMethod === 'total-area' ? 'selected' : ''}`}
                                onClick={() => handleDimMethodChange('total-area')}
                            >
                                <input
                                    type="radio"
                                    name="dimMethod"
                                    value="total-area"
                                    checked={dimMethod === 'total-area'}
                                    onChange={() => { }}
                                />
                                <div className="radio-title">Total Area</div>
                                <div className="radio-sub muted">Enter total square feet</div>
                            </label>
                        </div>

                        {dimMethod === 'width-length' ? (
                            <div className="dim-inputs">
                                <div className="dim-col">
                                    <label className="field">
                                        <span className="label-text">Width (feet) *</span>
                                        <input
                                            id="width"
                                            type="number"
                                            min="1"
                                            placeholder="Enter width"
                                            value={width}
                                            onChange={(e) => setWidth(e.target.value)}
                                        />
                                        <small className="muted">Minimum 1 foot</small>
                                    </label>
                                </div>
                                <div className="dim-col">
                                    <label className="field">
                                        <span className="label-text">Length (feet) *</span>
                                        <input
                                            id="length"
                                            type="number"
                                            min="1"
                                            placeholder="Enter length"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                        />
                                        <small className="muted">Minimum 1 foot</small>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="dim-total">
                                <label className="field">
                                    <span className="label-text">Total Area (sq.ft) *</span>
                                    <input
                                        id="totalArea"
                                        type="number"
                                        min="1"
                                        placeholder="Enter area"
                                        value={totalArea}
                                        onChange={(e) => setTotalArea(e.target.value)}
                                    />
                                    <small className="muted">Enter total square feet</small>
                                </label>
                            </div>
                        )}
                    </section>

                    {/* Room Model */}
                    <section className="card mt">
                        <h4 className="section-head">Room Model</h4>
                        <p className="muted small">Select the room style for visualization</p>

                        <div className="model-row">
                            <button
                                className={`model-card ${selectedModel === 'Normal Room' ? 'selected' : ''}`}
                                onClick={() => handleModelSelect('Normal Room', false)}
                            >
                                <div className="model-title">Normal Room</div>
                                <div className="model-desc muted">Standard room layout with basic structure and proportions</div>
                                {selectedModel === 'Normal Room' && <div className="model-tag">Selected</div>}
                            </button>

                            <button className="model-card disabled" onClick={() => handleModelSelect('Luxury Room', true)}>
                                <div className="model-title">Luxury Room</div>
                                <div className="model-desc muted">Premium room design with elegant features and spacious layout</div>
                                <div className="coming">Coming Soon</div>
                            </button>

                            <button className="model-card disabled" onClick={() => handleModelSelect('Compact Room', true)}>
                                <div className="model-title">Compact Room</div>
                                <div className="model-desc muted">Space-efficient design optimized for smaller areas</div>
                                <div className="coming">Coming Soon</div>
                            </button>
                        </div>
                    </section>

                    {/* Ready to generate */}
                    <section className="card mt">
                        <div className="ready-row">
                            <div className="ready-info">
                                <h4>Ready to Generate?</h4>
                                <ul className="ready-list muted">
                                    <li>Room Type: <span id="readyRoom">{selectedRoom || 'Not selected'}</span></li>
                                    <li>Total Area: <span id="readyArea">{readyArea}</span></li>
                                    <li>Room Model: <span id="readyModel">{selectedModel}</span></li>
                                </ul>
                            </div>

                            <div className="ready-actions">
                                <button id="backBtn" className="btn-outline" onClick={() => navigate('/dashboard')}>
                                    <ArrowLeft size={16} style={{ marginRight: '8px', display: 'inline' }} /> Back to Home
                                </button>
                                <button id="generateBtn" className="btn-primary" onClick={handleGenerate}>
                                    Generate 3D Room <Settings size={16} style={{ marginLeft: '8px', display: 'inline' }} />
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default RoomSetup;
