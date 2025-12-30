import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CustomerDetails from './pages/CustomerDetails';
import HomeDashboard from './pages/HomeDashboard';
import Calculator from './pages/Calculator';

// Placeholder components for routes not yet implemented
import RoomSetup from './pages/RoomSetup';
import TileCollection from './pages/TileCollection';
import AiGeneration from './pages/AiGeneration';
import Review from './pages/Review';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/customer" element={<CustomerDetails />} />
        <Route path="/dashboard" element={<HomeDashboard />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/room-setup" element={<RoomSetup />} />
        <Route path="/collection" element={<TileCollection />} />
        <Route path="/ai" element={<AiGeneration />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}

export default App;
