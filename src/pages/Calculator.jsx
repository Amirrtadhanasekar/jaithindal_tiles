import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/calculator.css';
import { tileSpecs } from '../utils/calculatorData';

const AREAS = ["Kitchen", "Bedroom", "Bathroom", "Living Room", "Balcony", "Elevation", "Parking", "Total Floor"];

const Calculator = () => {
    const navigate = useNavigate();
    // State for Area Selection
    const [selectedAreas, setSelectedAreas] = useState([]);

    // State for Rooms Data
    // Structure: { [areaName]: [{ id: 1, name: "Kitchen 1", types: { floor: {...}, wall: {...} } }] }
    const [roomsData, setRoomsData] = useState({});

    // State for Tile Selection within Rooms
    // We will just store everything in roomsData for simplicity or use a separate way to update deep state.

    // Separate state for "Total Floor Inputs" (The dedicated section if 'Total Floor Only' is selected or via checkbox??)
    // In legacy, 'Total Floor' is just another area in the checkbox list, but it also has a "Total Floor Inputs" div that seems global?
    // Looking at legacy script.js:
    // if (area === "Total Floor Only") -> shows #totalFloorInputs
    // But existing checkboxes are "Kitchen", "Total Floor" etc.
    // Let's assume "Total Floor" from the list triggers the specific Total Floor section logic.

    // Side Cutting
    const [sideCutting, setSideCutting] = useState({ enabled: false, runningFeet: '', tileSize: '4', price: '' });

    // Calculated Totals
    const [grandTotal, setGrandTotal] = useState(null);

    // Helpers
    const toggleArea = (area) => {
        if (selectedAreas.includes(area)) {
            setSelectedAreas(selectedAreas.filter(a => a !== area));
            const newRoomsData = { ...roomsData };
            delete newRoomsData[area];
            setRoomsData(newRoomsData);
        } else {
            setSelectedAreas([...selectedAreas, area]);
            // Initialize with 1 room
            setRoomsData({
                ...roomsData,
                [area]: [createRoom(area, 1)]
            });
        }
    };

    const createRoom = (area, index) => ({
        id: Date.now() + Math.random(),
        index: index,
        name: `${area} ${index}`,
        selectedTypes: [], // "Floor", "Wall", "Highlight", "TotalFloor", "TotalWall"
        inputs: {
            floor: { length: '', width: '', tileSize: '1', price: '', design: '' },
            wall: { length: '', height: '', tileSize: '1', price: '', dark: '', highlight: '', light: '', design: '' },
            highlight: { count: '', price: '', tileSize: '1.25', design: '' },
            totalFloor: { count: 1, items: [{ sqft: '', tileSize: '1', price: '', design: '' }] },
            totalWall: { count: 1, items: [{ sqft: '', tileSize: '1', price: '', design: '' }] }
        },
        results: null
    });

    const updateRoomCount = (area, count) => {
        const currentRooms = roomsData[area] || [];
        let newRooms = [...currentRooms];
        if (count > currentRooms.length) {
            for (let i = currentRooms.length + 1; i <= count; i++) {
                newRooms.push(createRoom(area, i));
            }
        } else if (count < currentRooms.length) {
            newRooms = newRooms.slice(0, count);
        }
        setRoomsData({ ...roomsData, [area]: newRooms });
    };

    const updateRoomData = (area, roomIndex, field, value) => {
        const rooms = [...roomsData[area]];
        rooms[roomIndex] = { ...rooms[roomIndex], [field]: value };
        setRoomsData({ ...roomsData, [area]: rooms });
    };

    const toggleRoomType = (area, roomIndex, type) => {
        const rooms = [...roomsData[area]];
        const room = rooms[roomIndex];
        const types = room.selectedTypes.includes(type)
            ? room.selectedTypes.filter(t => t !== type)
            : [...room.selectedTypes, type];
        rooms[roomIndex] = { ...room, selectedTypes: types };
        setRoomsData({ ...roomsData, [area]: rooms });
    };

    const updateRoomInput = (area, roomIndex, type, field, value) => {
        const rooms = [...roomsData[area]];
        const room = rooms[roomIndex];
        rooms[roomIndex] = {
            ...room,
            inputs: {
                ...room.inputs,
                [type]: { ...room.inputs[type], [field]: value }
            }
        };
        setRoomsData({ ...roomsData, [area]: rooms });
    };

    // Specifically for nested arrays like totalFloor items
    const updateTotalItem = (area, roomIndex, type, itemIndex, field, value) => {
        const rooms = [...roomsData[area]];
        const room = rooms[roomIndex]; // e.g. Kitchen 1
        const items = [...room.inputs[type].items];
        items[itemIndex] = { ...items[itemIndex], [field]: value };

        rooms[roomIndex] = {
            ...room,
            inputs: {
                ...room.inputs,
                [type]: { ...room.inputs[type], items }
            }
        };
        setRoomsData({ ...roomsData, [area]: rooms });
    };

    const addTotalItem = (area, roomIndex, type) => {
        const rooms = [...roomsData[area]];
        const room = rooms[roomIndex];
        const items = [...room.inputs[type].items, { sqft: '', tileSize: '1', price: '', design: '' }];
        rooms[roomIndex] = {
            ...room,
            inputs: {
                ...room.inputs,
                [type]: { ...room.inputs[type], items, count: items.length }
            }
        };
        setRoomsData({ ...roomsData, [area]: rooms });
    }

    // Calculation Logic
    const calculateRoom = (area, roomIndex) => {
        const room = roomsData[area][roomIndex];
        let totalCost = 0, totalWeight = 0, totalArea = 0;
        let output = [];
        // We need detailed data for the UI

        const calculateType = (type) => {
            const inp = room.inputs[type];
            let details = {};

            if (type === 'highlight') {
                const spec = tileSpecs[inp.tileSize];
                const numTiles = parseInt(inp.count) || 0;
                const price = parseFloat(inp.price) || 0;

                if (numTiles > 0 && price > 0 && spec) {
                    const areaVal = (numTiles / spec.pcs) * spec.coverage;
                    const cost = areaVal * price;
                    const weight = numTiles * (spec.weight / spec.pcs);
                    const totalBoxes = Math.ceil(numTiles / spec.pcs);

                    totalCost += cost; totalWeight += weight; totalArea += areaVal;

                    details = {
                        type: "Highlight Tile",
                        count: numTiles,
                        totalBoxes,
                        area: areaVal,
                        cost,
                        weight,
                        price,
                        design: inp.design
                    };
                    output.push(details);
                }
            } else if (type === 'floor' || type === 'wall') {
                const l = parseFloat(inp.length);
                const h = parseFloat(inp.width) || parseFloat(inp.height);
                const p = parseFloat(inp.price) || 0;
                const spec = tileSpecs[inp.tileSize];

                if (!isNaN(l) && !isNaN(h) && p > 0 && spec) {
                    let tilesPerL, tilesPerH;
                    if (inp.tileSize === "2.25") { // 16x16
                        tilesPerL = Math.ceil((l * 12) / 16);
                        tilesPerH = Math.ceil((h * 12) / 16);
                    } else if (inp.tileSize === "2.75x5.25") {
                        tilesPerL = Math.ceil((l * 12) / 63);
                        tilesPerH = Math.ceil((h * 12) / 31.5);
                    } else {
                        tilesPerL = Math.ceil(l / spec.w);
                        tilesPerH = Math.ceil(h / spec.h);
                    }
                    const totalTiles = tilesPerL * tilesPerH;

                    if (type === 'wall') {
                        const dark = parseInt(inp.dark) || 0;
                        const highlight = parseInt(inp.highlight) || 0;
                        const lightInput = inp.light;
                        const light = lightInput ? parseInt(lightInput) : Math.max(0, tilesPerH - (dark + highlight));

                        const darkBoxes = Math.ceil((dark * tilesPerL) / spec.pcs);
                        const highlightBoxes = Math.ceil((highlight * tilesPerL) / spec.pcs);
                        const lightBoxes = Math.ceil((light * tilesPerL) / spec.pcs);
                        const totalBoxes = darkBoxes + highlightBoxes + lightBoxes;
                        const totalSqFt = totalBoxes * spec.coverage;

                        const cost = totalSqFt * p;
                        const weight = totalBoxes * spec.weight;
                        totalCost += cost; totalWeight += weight; totalArea += totalSqFt;

                        details = {
                            type: "Wall Tile",
                            dimensions: `${l}x${h}`,
                            tilesPerWidth: tilesPerL,
                            tilesPerLength: tilesPerH,
                            darkRows: dark, darkBoxes,
                            highlightRows: highlight, highlightBoxes,
                            lightRows: light, lightBoxes,
                            totalBoxes,
                            area: totalSqFt,
                            cost,
                            weight,
                            price: p,
                            design: inp.design
                        };
                        output.push(details);
                    } else {
                        const totalBoxes = Math.ceil(totalTiles / spec.pcs);
                        const totalSqFt = totalBoxes * spec.coverage;
                        const cost = totalSqFt * p;
                        const weight = totalBoxes * spec.weight;
                        totalCost += cost; totalWeight += weight; totalArea += totalSqFt;

                        details = {
                            type: "Floor Tile",
                            dimensions: `${l}x${h}`,
                            tilesPerWidth: tilesPerL,
                            tilesPerLength: tilesPerH,
                            totalBoxes,
                            area: totalSqFt,
                            cost,
                            weight,
                            price: p,
                            design: inp.design
                        };
                        output.push(details);
                    }
                }
            } else if (type === 'totalFloor' || type === 'totalWall') {
                inp.items.forEach((item, idx) => {
                    const sqft = parseFloat(item.sqft);
                    const p = parseFloat(item.price);
                    const spec = tileSpecs[item.tileSize];

                    if (!isNaN(sqft) && !isNaN(p) && spec) {
                        const boxes = Math.ceil(sqft / spec.coverage);
                        const areaVal = boxes * spec.coverage;
                        const cost = boxes * (p * spec.coverage);
                        const weight = boxes * spec.weight;

                        totalCost += cost; totalWeight += weight; totalArea += areaVal;

                        output.push({
                            type: type === 'totalFloor' ? `Total Floor ${idx + 1}` : `Total Wall ${idx + 1}`,
                            area: areaVal,
                            cost,
                            weight,
                            price: p,
                            totalBoxes: boxes,
                            design: item.design
                        });
                    }
                });
            }
        };

        room.selectedTypes.forEach(t => {
            const key = t === "Total Floor" ? "totalFloor" : t === "Total Wall" ? "totalWall" : t.toLowerCase();
            calculateType(key);
        });

        const newRooms = [...roomsData[area]];
        newRooms[roomIndex] = { ...room, results: { output, totalCost, totalWeight, totalArea } };
        setRoomsData({ ...roomsData, [area]: newRooms });
    };

    const calculateGrandSummary = async () => {
        let gArea = 0, gCost = 0, gWeight = 0;

        Object.keys(roomsData).forEach(area => {
            roomsData[area].forEach(room => {
                if (room.results) {
                    gArea += room.results.totalArea;
                    gCost += room.results.totalCost;
                    gWeight += room.results.totalWeight;
                }
            });
        });

        const loadingCharges = Math.ceil((gWeight * 0.25) / 10) * 10;
        const totalAmount = Math.round(gCost + loadingCharges);

        setGrandTotal({
            area: gArea,
            weight: gWeight,
            tileCost: gCost,
            loadingCharges,
            totalAmount
        });

        // --- Save Customer Data to Backend ---
        const customer = JSON.parse(sessionStorage.getItem('customer'));
        // Check if we have customer data and if we haven't already saved it IN THIS SESSION logic
        if (customer && !customer.isSaved) {
            try {
                // Prepare Rooms Data
                const roomsPayload = [];
                Object.keys(roomsData).forEach(area => {
                    roomsData[area].forEach(room => {
                        if (room.results) {
                            const items = room.results.output.map(res => ({
                                type: res.type,
                                design: res.design || '',
                                area: res.area,
                                boxes: res.totalBoxes || 0,
                                price: res.price,
                                cost: res.cost,
                                weight: res.weight,
                                description: res.dimensions || ''
                            }));

                            roomsPayload.push({
                                name: room.name,
                                areaType: area,
                                totalArea: room.results.totalArea,
                                totalCost: room.results.totalCost,
                                totalWeight: room.results.totalWeight,
                                items: items
                            });
                        }
                    });
                });

                // Ensure we send fresh payload without isSaved flag
                const payload = {
                    fullname: customer.fullname,
                    phone: customer.phone,
                    address: customer.address,
                    attender: customer.attender,
                    attenderPhone: customer.attenderPhone,
                    totalAmount: totalAmount,
                    totalArea: gArea,
                    totalWeight: gWeight,
                    rooms: roomsPayload
                };

                const response = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log('Customer saved to backend successfully.');
                    alert('Customer details saved to backend!');
                    // Mark as saved so we don't duplicate on repeated clicks
                    customer.isSaved = true;
                    sessionStorage.setItem('customer', JSON.stringify(customer));
                } else {
                    console.error('Failed to save customer backend.');
                }
            } catch (err) {
                console.error('Error saving customer:', err);
            }
        }

        setTimeout(() => document.getElementById("summary-section")?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handlePrint = () => {
        window.print();
    };

    const customer = JSON.parse(sessionStorage.getItem('customer')) || {};





    const renderEstimateContent = () => (
        <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '1px' }}>ESTIMATE</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', fontSize: '12px', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>CUSTOMER NAME: <span style={{ marginLeft: '10px' }}>{customer.fullname || ''}</span></div>
                    <div>CUSTOMER ADDRESS: <span style={{ marginLeft: '10px' }}>{customer.address || ''}</span></div>
                    <div>CUSTOMER NUMBER: <span style={{ marginLeft: '10px' }}>{customer.phone || customer.mobile || ''}</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'right' }}>
                    <div>ATTENDER NAME: <span style={{ marginLeft: '10px' }}>{customer.attender || ''}</span></div>
                    <div>ATTENDER NUMBER: <span style={{ marginLeft: '10px' }}>{customer.attenderPhone || customer.attenderId || ''}</span></div>
                </div>
            </div>
            {Object.keys(roomsData).map(area => roomsData[area].map((room, idx) => {
                if (!room.results) return null;
                return room.results.output.map((res, i) => (
                    <table key={`${room.id}-${i}`} style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '30px', fontSize: '12px' }}>
                        <thead>
                            <tr>
                                <th colSpan="2" style={{ border: '1px solid #999', padding: '5px', textAlign: 'center', background: '#f9f9f9' }}>
                                    AREA - {room.name}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ border: '1px solid #999' }}>
                                <td colSpan="2" style={{ padding: '5px', fontWeight: 'bold' }}>{res.type}</td>
                            </tr>
                            {res.design && (
                                <tr style={{ border: '1px solid #999' }}>
                                    <td colSpan="2" style={{ padding: '5px', textAlign: 'center' }}>( Design Number : {res.design} )</td>
                                </tr>
                            )}
                            {res.darkBoxes > 0 && (
                                <tr style={{ border: '1px solid #999' }}>
                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Dark Tile</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.darkBoxes}</td>
                                </tr>
                            )}
                            {res.highlightBoxes > 0 && (
                                <tr style={{ border: '1px solid #999' }}>
                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Highlight Tile</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.highlightBoxes}</td>
                                </tr>
                            )}
                            {res.lightBoxes > 0 && (
                                <tr style={{ border: '1px solid #999' }}>
                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Light Tile</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.lightBoxes}</td>
                                </tr>
                            )}
                            {(!res.darkBoxes && !res.highlightBoxes && !res.lightBoxes) && res.totalBoxes > 0 && (
                                <tr style={{ border: '1px solid #999' }}>
                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Tiles</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.totalBoxes}</td>
                                </tr>
                            )}
                            <tr style={{ border: '1px solid #999' }}>
                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Total Box</td>
                                <td style={{ padding: '5px', textAlign: 'right' }}>{res.totalBoxes}</td>
                            </tr>
                            <tr style={{ border: '1px solid #999' }}>
                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Price Per Sqft</td>
                                <td style={{ padding: '5px', textAlign: 'right' }}>₹{res.price.toFixed(2)}</td>
                            </tr>
                            <tr style={{ border: '1px solid #999' }}>
                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Total Cost</td>
                                <td style={{ padding: '5px', textAlign: 'right' }}>₹{res.cost.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                ));
            }))}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '20px', fontSize: '13px' }}>
                <thead>
                    <tr>
                        <th colSpan="2" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#fff' }}>GRAND TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ border: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Area</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{grandTotal?.area.toFixed(2)} sq.ft</td>
                    </tr>
                    <tr style={{ border: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Weight</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{grandTotal?.weight.toFixed(2)} kg</td>
                    </tr>
                    <tr style={{ border: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Tile Cost</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal?.tileCost.toFixed(2)}</td>
                    </tr>
                    <tr style={{ border: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Loading Charges</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal?.loadingCharges.toFixed(2)}</td>
                    </tr>
                    <tr style={{ border: '1px solid #000', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Customer Amount</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal?.totalAmount}</td>
                    </tr>
                </tbody>
            </table>
        </>
    );

    return (
        <div className="calculator-body">
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
                    <button className="crumb active">Cost Estimation</button>
                    <button className="crumb" onClick={() => navigate('/room-setup')}>Room Setup</button>
                    <button className="crumb" onClick={() => navigate('/collection')}>Tile Collection</button>
                </nav>
            </header>

            <main className="container app-container">
                <h1>SMART TILE CALCULATOR</h1>
                <br />

                {/* Area Selection */}
                <div id="checkboxAreaSelector" className="input-group">
                    <label><h3>Select Area Types</h3></label>
                    {AREAS.map(area => (
                        <div key={area}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedAreas.includes(area)}
                                    onChange={() => toggleArea(area)}
                                /> {area}
                            </label>
                        </div>
                    ))}
                    <br />
                </div>

                {/* Dynamic Sections */}
                <div id="roomInputs">
                    {selectedAreas.map(area => (
                        <div key={area} className="area-section">
                            <h3>{area}</h3>
                            <div className="input-group">
                                <label><strong>Number of {area}:</strong></label>
                                <input
                                    type="number"
                                    min="1"
                                    value={roomsData[area]?.length || 1}
                                    onChange={(e) => updateRoomCount(area, parseInt(e.target.value) || 1)}
                                />
                            </div>

                            {roomsData[area]?.map((room, idx) => (
                                <div key={room.id} className="room-section" style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0' }}>
                                    <h4>
                                        <label>{area} Name:</label>
                                        <input
                                            type="text"
                                            value={room.name}
                                            onChange={(e) => updateRoomData(area, idx, 'name', e.target.value)}
                                            style={{ marginLeft: '8px', width: '180px' }}
                                        />
                                    </h4>

                                    <div className="input-group">
                                        <label><strong>Select Tile Type(s):</strong></label><br />
                                        {["Floor", "Wall", "Total Floor", "Total Wall", ...(area === "Kitchen" ? ["Highlight"] : [])].map(type => (
                                            <label key={type} style={{ marginRight: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={room.selectedTypes.includes(type)}
                                                    onChange={() => toggleRoomType(area, idx, type)}
                                                /> {type}
                                            </label>
                                        ))}
                                    </div>

                                    {/* --- INPUTS --- */}
                                    {room.selectedTypes.includes("Floor") && (
                                        <div className="floor-tile-inputs">
                                            <h5>Floor Tile Details</h5>
                                            <input type="number" placeholder="Length (ft)" value={room.inputs.floor.length} onChange={(e) => updateRoomInput(area, idx, 'floor', 'length', e.target.value)} />
                                            <input type="number" placeholder="Width (ft)" value={room.inputs.floor.width} onChange={(e) => updateRoomInput(area, idx, 'floor', 'width', e.target.value)} />
                                            <select value={room.inputs.floor.tileSize} onChange={(e) => updateRoomInput(area, idx, 'floor', 'tileSize', e.target.value)}>
                                                {Object.entries(tileSpecs).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="Price (₹)" value={room.inputs.floor.price} onChange={(e) => updateRoomInput(area, idx, 'floor', 'price', e.target.value)} />
                                            <input type="text" placeholder="Design Number" value={room.inputs.floor.design} onChange={(e) => updateRoomInput(area, idx, 'floor', 'design', e.target.value)} />
                                        </div>
                                    )}

                                    {room.selectedTypes.includes("Wall") && (
                                        <div className="wall-tile-inputs">
                                            <h5>Wall Tile Details</h5>
                                            <input type="number" placeholder="Length (ft)" value={room.inputs.wall.length} onChange={(e) => updateRoomInput(area, idx, 'wall', 'length', e.target.value)} />
                                            <input type="number" placeholder="Height (ft)" value={room.inputs.wall.height} onChange={(e) => updateRoomInput(area, idx, 'wall', 'height', e.target.value)} />
                                            <select value={room.inputs.wall.tileSize} onChange={(e) => updateRoomInput(area, idx, 'wall', 'tileSize', e.target.value)}>
                                                {Object.entries(tileSpecs).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="Price (₹)" value={room.inputs.wall.price} onChange={(e) => updateRoomInput(area, idx, 'wall', 'price', e.target.value)} />
                                            <input type="number" placeholder="Dark Rows" value={room.inputs.wall.dark} onChange={(e) => updateRoomInput(area, idx, 'wall', 'dark', e.target.value)} />
                                            <input type="number" placeholder="Highlight Rows" value={room.inputs.wall.highlight} onChange={(e) => updateRoomInput(area, idx, 'wall', 'highlight', e.target.value)} />
                                            <input type="number" placeholder="Light Rows (Auto)" value={room.inputs.wall.light} onChange={(e) => updateRoomInput(area, idx, 'wall', 'light', e.target.value)} />
                                            <input type="text" placeholder="Design Number" value={room.inputs.wall.design} onChange={(e) => updateRoomInput(area, idx, 'wall', 'design', e.target.value)} />
                                        </div>
                                    )}

                                    {/* Total Floor (Multiple) */}
                                    {room.selectedTypes.includes("Total Floor") && (
                                        <div className="totalfloor-tile-inputs">
                                            <h5>Total Floor Details</h5>
                                            <button onClick={() => addTotalItem(area, idx, 'totalFloor')}>+ Add Area</button>
                                            {room.inputs.totalFloor.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="single-totalfloor" style={{ marginTop: '10px', borderTop: '1px dashed #ccc' }}>
                                                    <h6>Total Floor {itemIdx + 1}</h6>
                                                    <input type="number" placeholder="Sq.Ft" value={item.sqft} onChange={(e) => updateTotalItem(area, idx, 'totalFloor', itemIdx, 'sqft', e.target.value)} />
                                                    <select value={item.tileSize} onChange={(e) => updateTotalItem(area, idx, 'totalFloor', itemIdx, 'tileSize', e.target.value)}>
                                                        {Object.entries(tileSpecs).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                                    </select>
                                                    <input type="number" placeholder="Price (₹)" value={item.price} onChange={(e) => updateTotalItem(area, idx, 'totalFloor', itemIdx, 'price', e.target.value)} />
                                                    <input type="text" placeholder="Design" value={item.design} onChange={(e) => updateTotalItem(area, idx, 'totalFloor', itemIdx, 'design', e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {room.selectedTypes.includes("Total Wall") && (
                                        <div className="totalwall-tile-inputs">
                                            <h5>Total Wall Details</h5>
                                            <button onClick={() => addTotalItem(area, idx, 'totalWall')}>+ Add Area</button>
                                            {room.inputs.totalWall.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="single-totalwall" style={{ marginTop: '10px', borderTop: '1px dashed #ccc' }}>
                                                    <h6>Total Wall {itemIdx + 1}</h6>
                                                    <input type="number" placeholder="Sq.Ft" value={item.sqft} onChange={(e) => updateTotalItem(area, idx, 'totalWall', itemIdx, 'sqft', e.target.value)} />
                                                    <select value={item.tileSize} onChange={(e) => updateTotalItem(area, idx, 'totalWall', itemIdx, 'tileSize', e.target.value)}>
                                                        {Object.entries(tileSpecs).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                                    </select>
                                                    <input type="number" placeholder="Price (₹)" value={item.price} onChange={(e) => updateTotalItem(area, idx, 'totalWall', itemIdx, 'price', e.target.value)} />
                                                    <input type="text" placeholder="Design" value={item.design} onChange={(e) => updateTotalItem(area, idx, 'totalWall', itemIdx, 'design', e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Highlight Tile */}
                                    {room.selectedTypes.includes("Highlight") && (
                                        <div className="highlight-tile-inputs">
                                            <h5>Highlight Tile Details</h5>
                                            <select value={room.inputs.highlight.tileSize} onChange={(e) => updateRoomInput(area, idx, 'highlight', 'tileSize', e.target.value)}>
                                                {Object.entries(tileSpecs).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="No. of Tiles" value={room.inputs.highlight.count} onChange={(e) => updateRoomInput(area, idx, 'highlight', 'count', e.target.value)} />
                                            <input type="number" placeholder="Price (₹)" value={room.inputs.highlight.price} onChange={(e) => updateRoomInput(area, idx, 'highlight', 'price', e.target.value)} />
                                            <input type="text" placeholder="Design" value={room.inputs.highlight.design} onChange={(e) => updateRoomInput(area, idx, 'highlight', 'design', e.target.value)} />
                                        </div>
                                    )}

                                    <button style={{ marginTop: '10px' }} onClick={() => calculateRoom(area, idx)}>📋 Calculate {room.name}</button>

                                    {/* Updated Result Display to matching Image 1 */}
                                    {room.results && (
                                        <div className="output-details" style={{ marginTop: '15px', background: '#ecfdf5', borderRadius: '10px', padding: '20px', borderLeft: '5px solid #2f6b4b', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                            {room.results.output.map((res, i) => (
                                                <div key={i} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #cbd5e1' }}>
                                                    <h5 style={{ margin: '0 0 10px', color: '#2f6b4b', fontWeight: 'bold' }}>Area Name: - {res.type.toUpperCase()}</h5>

                                                    {res.tilesPerWidth && <div className="result-line">Tiles along Width: <span className="val">{res.tilesPerWidth}</span></div>}
                                                    {res.tilesPerLength && <div className="result-line">Tiles along Length: <span className="val">{res.tilesPerLength}</span></div>}

                                                    {res.darkRows > 0 && <div className="result-line">Dark Tile Rows: {res.darkRows} &rarr; Boxes: <span className="val">{res.darkBoxes}</span></div>}
                                                    {res.highlightRows > 0 && <div className="result-line">Highlight Tile Rows: {res.highlightRows} &rarr; Boxes: <span className="val">{res.highlightBoxes}</span></div>}
                                                    {res.lightRows > 0 && <div className="result-line">Light Tile Rows: {res.lightRows} &rarr; Boxes: <span className="val">{res.lightBoxes}</span></div>}

                                                    {res.totalBoxes && <div className="result-line">Total Boxes: <span className="val">{res.totalBoxes}</span></div>}
                                                    <div className="result-line">Total Sq.ft: <span className="val">{res.area.toFixed(2)} sq.ft</span></div>
                                                    <div className="result-line">Price per Sq.ft: <span className="val">₹{res.price.toFixed(2)}</span></div>
                                                    <div className="result-line">Total Cost: <span className="val">₹{res.cost.toFixed(2)}</span></div>
                                                    <div className="result-line">Total Weight: <span className="val">{res.weight.toFixed(2)} kg</span></div>
                                                </div>
                                            ))}
                                            <div style={{ paddingTop: '10px', borderTop: '2px solid #2f6b4b' }}>
                                                <div className="result-line"><strong>Total Room Area: {room.results.totalArea.toFixed(2)} sq.ft</strong></div>
                                                <div className="result-line"><strong>Total Room Cost: ₹{room.results.totalCost.toFixed(2)}</strong></div>
                                                <div className="result-line"><strong>Total Room Weight: {room.results.totalWeight.toFixed(2)} kg</strong></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={calculateGrandSummary}>🏁 Final Summary Calculation</button>
                    {grandTotal && <button onClick={handlePrint}>🖨️ Print Estimate</button>}
                </div>

                {grandTotal && (
                    <>
                        <div id="summary-section" style={{ background: '#fff', padding: '20px', marginTop: '40px', fontFamily: 'Courier New, monospace' }}>
                            {renderEstimateContent()}
                        </div>
                        <div className="print-only-copy" style={{ background: '#fff', padding: '20px', marginTop: '40px', fontFamily: 'Courier New, monospace' }}>
                            {renderEstimateContent()}
                        </div>
                        <div style={{ display: 'none' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '1px' }}>ESTIMATE</h2>
                            </div>

                            {/* Customer & Attender Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', fontSize: '12px', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>CUSTOMER NAME: <span style={{ marginLeft: '10px' }}>{customer.fullname || ''}</span></div>
                                    <div>CUSTOMER ADDRESS: <span style={{ marginLeft: '10px' }}>{customer.address || ''}</span></div>
                                    <div>CUSTOMER NUMBER: <span style={{ marginLeft: '10px' }}>{customer.phone || customer.mobile || ''}</span></div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'right' }}>
                                    <div>ATTENDER NAME: <span style={{ marginLeft: '10px' }}>{customer.attender || ''}</span></div>
                                    <div>ATTENDER NUMBER: <span style={{ marginLeft: '10px' }}>{customer.attenderPhone || customer.attenderId || ''}</span></div>
                                </div>
                            </div>

                            {/* Room/Result Tables */}
                            {Object.keys(roomsData).map(area => roomsData[area].map((room, idx) => {
                                if (!room.results) return null;
                                return room.results.output.map((res, i) => (
                                    <table key={`${room.id}-${i}`} style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '30px', fontSize: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th colSpan="2" style={{ border: '1px solid #999', padding: '5px', textAlign: 'center', background: '#f9f9f9' }}>
                                                    AREA - {room.name}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Type Header Row */}
                                            <tr style={{ border: '1px solid #999' }}>
                                                <td colSpan="2" style={{ padding: '5px', fontWeight: 'bold' }}>{res.type}</td>
                                            </tr>
                                            {/* Design Number Row */}
                                            {res.design && (
                                                <tr style={{ border: '1px solid #999' }}>
                                                    <td colSpan="2" style={{ padding: '5px', textAlign: 'center' }}>( Design Number : {res.design} )</td>
                                                </tr>
                                            )}

                                            {/* Dynamic Rows based on Tile Type logic */}
                                            {res.darkBoxes > 0 && (
                                                <tr style={{ border: '1px solid #999' }}>
                                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Dark Tile</td>
                                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.darkBoxes}</td>
                                                </tr>
                                            )}
                                            {res.highlightBoxes > 0 && (
                                                <tr style={{ border: '1px solid #999' }}>
                                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Highlight Tile</td>
                                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.highlightBoxes}</td>
                                                </tr>
                                            )}
                                            {res.lightBoxes > 0 && (
                                                <tr style={{ border: '1px solid #999' }}>
                                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Light Tile</td>
                                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.lightBoxes}</td>
                                                </tr>
                                            )}

                                            {(!res.darkBoxes && !res.highlightBoxes && !res.lightBoxes) && res.totalBoxes > 0 && (
                                                <tr style={{ border: '1px solid #999' }}>
                                                    <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Tiles</td>
                                                    <td style={{ padding: '5px', textAlign: 'right' }}>Boxes: {res.totalBoxes}</td>
                                                </tr>
                                            )}

                                            {/* Summary Rows for this section */}
                                            <tr style={{ border: '1px solid #999' }}>
                                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Total Box</td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{res.totalBoxes}</td>
                                            </tr>
                                            <tr style={{ border: '1px solid #999' }}>
                                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Price Per Sqft</td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>₹{res.price.toFixed(2)}</td>
                                            </tr>
                                            <tr style={{ border: '1px solid #999' }}>
                                                <td style={{ padding: '5px', borderRight: '1px solid #999' }}>Total Cost</td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>₹{res.cost.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ));
                            }))}

                            {/* Grand Total Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '20px', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th colSpan="2" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#fff' }}>GRAND TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ border: '1px solid #000' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Area</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{grandTotal.area.toFixed(2)} sq.ft</td>
                                    </tr>
                                    <tr style={{ border: '1px solid #000' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Weight</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{grandTotal.weight.toFixed(2)} kg</td>
                                    </tr>
                                    <tr style={{ border: '1px solid #000' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Tile Cost</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal.tileCost.toFixed(2)}</td>
                                    </tr>
                                    <tr style={{ border: '1px solid #000' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Loading Charges</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal.loadingCharges.toFixed(2)}</td>
                                    </tr>
                                    <tr style={{ border: '1px solid #000', fontWeight: 'bold' }}>
                                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Total Customer Amount</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{grandTotal.totalAmount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Calculator;
