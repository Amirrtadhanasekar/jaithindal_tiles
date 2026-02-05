import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useProgress, PerspectiveCamera, useTexture, PointerLockControls } from '@react-three/drei';
import '../styles/ai-generation.css';
import { ArrowLeft, Box, Maximize, RotateCcw, ChevronRight, Camera, Footprints } from 'lucide-react';

// --- Room Rendering Component (The 3D Logic) ---
// --- Room Rendering Component (The 3D Logic) ---
// --- Room Rendering Component (The 3D Logic) ---

// Helper for configuring texture repeats
const useConfiguredTexture = (urll, w, h, scale) => {
    const tex = useTexture(urll);
    React.useLayoutEffect(() => {
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            const repeatX = Math.max(1, Math.round(w / (3 * scale)));
            const repeatY = Math.max(1, Math.round(h / (3 * scale)));
            tex.repeat.set(repeatX, repeatY);
            tex.needsUpdate = true;
        }
    }, [tex, w, h, scale]);
    return tex;
};

// Component for a wall with a texture
const TexturedWall = ({ size, position, rotation, imageUrl, scaleFt }) => {
    // Only fetch if imageUrl is valid
    if (!imageUrl) return <PlainMesh size={size} position={position} rotation={rotation} />;

    // Determine dimensions for repeating (Width vs Height) depending on orientation? 
    // Actually boxGeometry is [x, y, z].
    // For UV mapping, BoxGeometry usually maps per face.
    // We assume the face visible is the main one.
    // Simplifying: layout logic handled in hook. 
    // But wait, the hook needs specific W/H of the face.
    // For walls, we just pass the main dimensions.

    // Logic from previous code:
    // w = isSide ? size[2] : size[0];
    // h = size[1];
    // We need to know if it's "side".
    // Let's pass 'isSide' prop or 'faceSize'.
    // Simpler: Just pass `repeatSize` prop.

    return <TexturedBox size={size} position={position} rotation={rotation} imageUrl={imageUrl} scaleFt={scaleFt} />;
};

const TexturedBox = ({ size, position, rotation, imageUrl, scaleFt }) => {
    // We determine repeat based on max dimension to keep it simple and robust
    // Or stick to the specific logic if we can.
    // Let's stick to specific logic by passing "faceWidth" prop?
    // Actually, let's just use the largest dimensions for repeat to ensure it looks tiled.

    const tex = useTexture(imageUrl);
    React.useLayoutEffect(() => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // Simple logic: Repeat = Dimension / 3. 
        // We apply to all faces equally which is fine for a thin box
        const repX = Math.max(1, Math.round(size[0] / (3 * scaleFt)));
        const repY = Math.max(1, Math.round(size[1] / (3 * scaleFt)));
        // For side walls (rotated), size[0] is thickness. 
        // This is the tricky part.
        // We should fix the UVs or just use specific materials vs single material.
        // The previous code mapped standard material to the whole mesh.
        // Let's stick to that but calculate repeats smartly.

        // If thickness is small (size[0] or size[2] < 1), we shouldn't repeat much on that axis.
        // But texture.repeat is global for the map.

        tex.repeat.set(repX, repY);
        // This works for Front/Back walls where X is width.
        // For Side walls, we want Z as width.
        // BUT, we rotate the mesh or geometry?
        // Previous code:
        // isSide ? size[2] : size[0]

    }, [tex, size, scaleFt]);

    return (
        <mesh position={position} rotation={rotation || [0, 0, 0]}>
            <boxGeometry args={size} />
            <meshStandardMaterial map={tex} roughness={1} />
        </mesh>
    );
};

// --- Standard Fixtures (Normal Room) ---
const StandardFixtures = ({ roomW, roomL, roomH, lightIntensity }) => {
    return (
        <group position={[-roomW * 0.4, 0, -roomL * 0.4]}>
            {/* Lamp Base */}
            <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.04, 32]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Pole */}
            <mesh position={[0, roomH * 0.4, 0]}>
                <cylinderGeometry args={[0.015, 0.015, roomH * 0.8, 16]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Shade */}
            <mesh position={[0, roomH * 0.8, 0]}>
                <cylinderGeometry args={[0.15, 0.25, 0.25, 32, 1, true]} />
                <meshStandardMaterial color="#fafafa" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
            {/* Dynamic Light */}
            <pointLight position={[0, roomH * 0.8, 0]} intensity={lightIntensity} color="#fff" distance={10} decay={2} />
        </group>
    );
};

// Refined "Smart" Textured Mesh that handles orientation repeats
const SmartTexturedMesh = ({ size, position, rotation, imageUrl, faceDimensions, scaleFt }) => {
    const tex = useTexture(imageUrl);
    React.useLayoutEffect(() => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        const [w, h] = faceDimensions;
        const rX = Math.max(1, Math.round(w / (3 * scaleFt)));
        const rY = Math.max(1, Math.round(h / (3 * scaleFt)));
        tex.repeat.set(rX, rY);
    }, [tex, imageUrl, faceDimensions, scaleFt]);

    return (
        <mesh position={position} rotation={rotation || [0, 0, 0]}>
            <boxGeometry args={size} />
            <meshStandardMaterial map={tex} roughness={1} />
        </mesh>
    );
};

const PlainMesh = ({ size, position, rotation, color = 0xf2efe8, roughness = 1 }) => (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
);

// --- Walk Logic ---
const WalkManager = ({ active, eyeLevel = 1.6 }) => {
    const { camera } = useThree();
    const [move, setMove] = useState({ f: false, b: false, l: false, r: false });

    useEffect(() => {
        if (!active) return;
        const handleKey = (e, isDown) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') setMove(p => ({ ...p, f: isDown }));
            if (k === 's' || k === 'arrowdown') setMove(p => ({ ...p, b: isDown }));
            if (k === 'a' || k === 'arrowleft') setMove(p => ({ ...p, l: isDown }));
            if (k === 'd' || k === 'arrowright') setMove(p => ({ ...p, r: isDown }));
        };
        const down = e => handleKey(e, true);
        const up = e => handleKey(e, false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [active]);

    useFrame((_, delta) => {
        if (!active) return;
        const speed = 2.5 * delta; // Speed in scale units (approx)
        if (move.f) camera.translateZ(-speed);
        if (move.b) camera.translateZ(speed);
        if (move.l) camera.translateX(-speed);
        if (move.r) camera.translateX(speed);

        // Enforce eye level height roughly
        // We allow some bobbing or just hardlock Y to prevent flying
        // camera.position.y = eyeLevel; 
    });
    return null;
};

const KitchenFeatures = ({ roomW, roomL, roomH }) => {
    // Scaling factor from RoomScene
    const S = 0.12;
    const counterH = 3 * S;
    const counterD = 2.1 * S;
    const upperH = 2.5 * S;
    const upperD = 1.1 * S;

    return (
        <group>
            {/* Lower Cabinets - Back Wall */}
            <mesh position={[0, counterH / 2, -roomL / 2 + counterD / 2]} receiveShadow castShadow>
                <boxGeometry args={[roomW, counterH, counterD]} />
                <meshStandardMaterial color="#3E2723" roughness={0.8} />
            </mesh>

            {/* Countertop */}
            <mesh position={[0, counterH + 0.01, -roomL / 2 + counterD / 2]} receiveShadow>
                <boxGeometry args={[roomW, 0.02, counterD + 0.02]} />
                <meshStandardMaterial color="#eceff1" roughness={0.2} metalness={0.1} />
            </mesh>

            {/* Upper Cabinets */}
            <mesh position={[0, roomH - upperH / 2 - (0.5 * S), -roomL / 2 + upperD / 2]} castShadow>
                <boxGeometry args={[roomW, upperH, upperD]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>

            {/* Sink Placeholder */}
            <mesh position={[-roomW * 0.25, counterH + 0.025, -roomL / 2 + counterD / 2]}>
                <boxGeometry args={[2.5 * S, 0.01, 1.5 * S]} />
                <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Faucet */}
            <group position={[-roomW * 0.25, counterH + 0.03, -roomL / 2 + counterD * 0.2]}>
                <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
                    <meshStandardMaterial color="silver" />
                </mesh>
                <mesh position={[0, 0.3, 0.08]} rotation={[Math.PI / 4, 0, 0]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
                    <meshStandardMaterial color="silver" />
                </mesh>
            </group>

            {/* Stove / Hob */}
            <mesh position={[roomW * 0.2, counterH + 0.025, -roomL / 2 + counterD / 2]}>
                <boxGeometry args={[2.5 * S, 0.02, 1.8 * S]} />
                <meshStandardMaterial color="#111" roughness={0.2} />
            </mesh>

            {/* Chimney Hood */}
            <mesh position={[roomW * 0.2, roomH - upperH - (0.8 * S), -roomL / 2 + counterD / 2]} castShadow>
                <coneGeometry args={[1.5 * S, 1.5 * S, 4]} />
                <meshStandardMaterial color="#333" metalness={0.6} />
            </mesh>

            {/* Utensils: Pot */}
            <mesh position={[roomW * 0.25, counterH + 0.06, -roomL / 2 + counterD / 2 + 0.05]} castShadow>
                <cylinderGeometry args={[0.05, 0.04, 0.08, 16]} />
                <meshStandardMaterial color="#bf360c" />
            </mesh>

            {/* Utensils: Pan */}
            <group position={[roomW * 0.15, counterH + 0.03, -roomL / 2 + counterD / 2 - 0.05]}>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.05, 0.03, 16]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>
        </group>
    );
};

// --- Bedroom Features ---
const BedroomFeatures = ({ roomW, roomL, roomH }) => {
    const S = 0.12;
    return (
        <group>
            {/* Bed Frame */}
            <mesh position={[0, S * 1.5, -roomL * 0.2]} castShadow>
                <boxGeometry args={[roomW * 0.5, S * 3, roomL * 0.6]} />
                <meshStandardMaterial color="#5D4037" />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, S * 3 + S * 0.5, -roomL * 0.2]}>
                <boxGeometry args={[roomW * 0.45, S, roomL * 0.55]} />
                <meshStandardMaterial color="#FFF" />
            </mesh>
            {/* Pillows */}
            <mesh position={[-roomW * 0.1, S * 4, -roomL * 0.4]}>
                <boxGeometry args={[S * 2, S * 0.5, S]} />
                <meshStandardMaterial color="#DDD" />
            </mesh>
            <mesh position={[roomW * 0.1, S * 4, -roomL * 0.4]}>
                <boxGeometry args={[S * 2, S * 0.5, S]} />
                <meshStandardMaterial color="#DDD" />
            </mesh>
            {/* Side Tables */}
            <mesh position={[-roomW * 0.35, S * 1.5, -roomL * 0.4]} castShadow>
                <boxGeometry args={[S * 1.5, S * 3, S * 1.5]} />
                <meshStandardMaterial color="#4E342E" />
            </mesh>
            <mesh position={[roomW * 0.35, S * 1.5, -roomL * 0.4]} castShadow>
                <boxGeometry args={[S * 1.5, S * 3, S * 1.5]} />
                <meshStandardMaterial color="#4E342E" />
            </mesh>
        </group>
    );
};

// --- Bathroom Features ---
const BathroomFeatures = ({ roomW, roomL, roomH }) => {
    const S = 0.12;
    return (
        <group>
            {/* Modern Vanity Unit (Left Side) */}
            <group position={[-roomW * 0.35, 0, -roomL * 0.4]}>
                {/* Cabinet */}
                <mesh position={[0, S * 3, 0]} castShadow receiveShadow>
                    <boxGeometry args={[S * 6, S * 6, S * 4]} />
                    <meshStandardMaterial color="#424242" roughness={0.6} />
                </mesh>
                {/* Countertop */}
                <mesh position={[0, S * 6 + 0.02, 0]} receiveShadow>
                    <boxGeometry args={[S * 6.2, 0.04, S * 4.2]} />
                    <meshStandardMaterial color="#f5f5f5" roughness={0.2} metalness={0.1} />
                </mesh>
                {/* Vessel Sink */}
                <mesh position={[0, S * 6 + S * 0.5, 0]}>
                    <cylinderGeometry args={[S * 1.5, S * 1.2, S * 1, 32]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                <mesh position={[0, S * 6 + S * 0.6, 0]}>
                    <cylinderGeometry args={[S * 1.4, S * 1.1, S * 0.9, 32]} />
                    <meshStandardMaterial color="#ddd" side={THREE.BackSide} />
                </mesh>
                {/* Faucet */}
                <group position={[0, S * 6, -S * 1.2]}>
                    <mesh position={[0, S * 0.8, 0]}>
                        <cylinderGeometry args={[0.02, 0.03, S * 1.5]} />
                        <meshStandardMaterial color="silver" metalness={0.9} roughness={0.1} />
                    </mesh>
                    <mesh position={[0, S * 1.4, S * 0.3]} rotation={[Math.PI / 4, 0, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, S * 0.6]} />
                        <meshStandardMaterial color="silver" metalness={0.9} roughness={0.1} />
                    </mesh>
                </group>
                {/* Large Measured Mirror */}
                <group position={[0, S * 12, -S * 2.15]}>
                    <mesh>
                        <boxGeometry args={[S * 5.8, S * 8, 0.05]} />
                        <meshStandardMaterial color="silver" metalness={1} roughness={0.05} />
                    </mesh>
                    {/* Frame */}
                    <mesh position={[0, 0, -0.01]}>
                        <boxGeometry args={[S * 6, S * 8.2, 0.04]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                    {/* Vanity Light Bar */}
                    <mesh position={[0, S * 4.2, 0.2]}>
                        <boxGeometry args={[S * 4, S * 0.5, S * 0.5]} />
                        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} />
                    </mesh>
                </group>
            </group>

            {/* Contemporary Toilet (Right Side) */}
            <group position={[roomW * 0.35, 0, -roomL * 0.4]}>
                {/* Tank */}
                <mesh position={[0, S * 4, -S * 1]}>
                    <boxGeometry args={[S * 3.5, S * 3, S * 1.5]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                {/* Connector */}
                <mesh position={[0, S * 2, -S * 0.8]}>
                    <boxGeometry args={[S * 2, S * 4, S * 2]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                {/* Bowl */}
                <mesh position={[0, S * 2, S * 0.5]}>
                    <cylinderGeometry args={[S * 1.3, S * 1, S * 2.5]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                {/* Seat Lid */}
                <mesh position={[0, S * 3.3, S * 0.5]} rotation={[-0.1, 0, 0]}>
                    <cylinderGeometry args={[S * 1.35, S * 1.35, 0.05]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
            </group>

            {/* Walk-in Shower Area (Front Section) */}
            <group position={[0, 0, roomL * 0.3]}>
                {/* Glass Partition */}
                <mesh position={[0, roomH / 2, 0]}>
                    <boxGeometry args={[roomW, roomH, 0.05]} />
                    <meshStandardMaterial color="#aaddff" transparent opacity={0.2} metalness={0.9} roughness={0} />
                </mesh>
                {/* Frame for Glass */}
                <mesh position={[0, roomH / 2, 0]}>
                    <boxGeometry args={[roomW + 0.1, roomH + 0.1, 0.04]} />
                    <meshStandardMaterial color="#111" wireframe />
                </mesh>

                {/* Shower Head */}
                <group position={[roomW * 0.3, roomH - S * 2, -S * 2]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, S * 3]} />
                        <meshStandardMaterial color="silver" metalness={0.9} />
                    </mesh>
                    <mesh position={[0, 0, S * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[S * 1, S * 0.1, 0.1]} />
                        <meshStandardMaterial color="silver" metalness={0.9} />
                    </mesh>
                </group>

                {/* Mixer Panel */}
                <group position={[roomW * 0.3, S * 10, -0.05]}>
                    <mesh>
                        <boxGeometry args={[S * 1.5, S * 2.5, 0.05]} />
                        <meshStandardMaterial color="silver" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 0.1, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.1]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                </group>

                {/* Floor Drain */}
                <mesh position={[roomW * 0.3, 0.01, S * 2]}>
                    <circleGeometry args={[S * 0.8]} />
                    <meshStandardMaterial color="#999" />
                </mesh>
            </group>

            {/* Towel Rack (Side Wall) */}
            <group position={[-roomW / 2 + 0.1, S * 12, S * 4]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.02, 0.02, S * 5]} />
                    <meshStandardMaterial color="silver" metalness={1} />
                </mesh>
                {/* Towel */}
                <mesh position={[0, -S * 1.5, 0]}>
                    <boxGeometry args={[0.05, S * 3, S * 3]} />
                    <meshStandardMaterial color="#00bcd4" />
                </mesh>
            </group>
        </group>
    );
};

// --- Living Room Features ---
const LivingRoomFeatures = ({ roomW, roomL, roomH }) => {
    const S = 0.12;
    return (
        <group>
            {/* Sofa */}
            <group position={[0, 0, -roomL * 0.3]}>
                <mesh position={[0, S * 1.5, 0]}> {/* Base */}
                    <boxGeometry args={[roomW * 0.6, S * 3, S * 3]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[0, S * 3, -S * 1.2]}> {/* Backrest */}
                    <boxGeometry args={[roomW * 0.6, S * 3, S * 0.5]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[-roomW * 0.25, S * 2.5, 0]}> {/* Armrest L */}
                    <boxGeometry args={[S * 0.5, S * 2, S * 3]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[roomW * 0.25, S * 2.5, 0]}> {/* Armrest R */}
                    <boxGeometry args={[S * 0.5, S * 2, S * 3]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
            </group>

            {/* Coffee Table */}
            <group position={[0, 0, 0]}>
                <mesh position={[0, S * 1.2, 0]}> {/* Top */}
                    <boxGeometry args={[roomW * 0.3, S * 0.2, S * 2.5]} />
                    <meshStandardMaterial color="#3E2723" />
                </mesh>
                <mesh position={[0, S * 0.6, 0]}> {/* Base */}
                    <boxGeometry args={[S * 1, S * 1.2, S * 1]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>

            {/* TV Unit */}
            <group position={[0, 0, roomL * 0.4]}>
                <mesh position={[0, S * 2, 0]}> {/* Stand */}
                    <boxGeometry args={[roomW * 0.5, S * 2, S * 1.5]} />
                    <meshStandardMaterial color="#4E342E" />
                </mesh>
                <mesh position={[0, S * 4 + S * 1, 0]}> {/* TV Screen */}
                    <boxGeometry args={[roomW * 0.4, S * 3.5, S * 0.2]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </group>
        </group>
    );
};

// --- Balcony Features ---
const BalconyFeatures = ({ roomW, roomL, roomH }) => {
    const S = 0.12;
    return (
        <group>
            {/* Railing at Front */}
            <group position={[0, S * 3, roomL / 2 - 0.1]}>
                {/* Handrail */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[roomW, S * 0.5, S * 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                {/* Bars - Simplified loop */}
                {[-0.4, -0.2, 0, 0.2, 0.4].map((offset, i) => (
                    <mesh key={i} position={[roomW * offset, -S * 1.5, 0]}>
                        <cylinderGeometry args={[S * 0.1, S * 0.1, S * 3]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                ))}
            </group>
            {/* Plant Pot */}
            <group position={[roomW * 0.3, S * 1, -roomL * 0.3]}>
                <mesh>
                    <cylinderGeometry args={[S * 1, S * 0.8, S * 2]} />
                    <meshStandardMaterial color="#D84315" />
                </mesh>
                <mesh position={[0, S * 1.2, 0]}> {/* Plant */}
                    <sphereGeometry args={[S * 1]} />
                    <meshStandardMaterial color="green" />
                </mesh>
            </group>
        </group>
    );
};

// --- Parking Features ---
const ParkingFeatures = ({ roomW, roomL, roomH }) => {
    return (
        <group>
            {/* Parking Line Strips */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, roomL * 0.8]} />
                <meshBasicMaterial color="yellow" />
            </mesh>
            <mesh position={[-roomW * 0.25, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, roomL * 0.8]} />
                <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[roomW * 0.25, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, roomL * 0.8]} />
                <meshBasicMaterial color="white" />
            </mesh>
        </group>
    );
};


// --- Luxury Features ---
const LuxuryFixtures = ({ roomW, roomL, roomH, lightIntensity }) => {
    const mouldingSize = 0.08;
    return (
        <group>
            {/* Crown Molding (Ceiling) */}
            <group position={[0, roomH - mouldingSize / 2, 0]}>
                {/* Back */}
                <mesh position={[0, 0, -roomL / 2 + mouldingSize / 2]}>
                    <boxGeometry args={[roomW, mouldingSize, mouldingSize]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Front */}
                <mesh position={[0, 0, roomL / 2 - mouldingSize / 2]}>
                    <boxGeometry args={[roomW, mouldingSize, mouldingSize]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Left */}
                <mesh position={[-roomW / 2 + mouldingSize / 2, 0, 0]}>
                    <boxGeometry args={[mouldingSize, mouldingSize, roomL]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Right */}
                <mesh position={[roomW / 2 - mouldingSize / 2, 0, 0]}>
                    <boxGeometry args={[mouldingSize, mouldingSize, roomL]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
            </group>

            {/* Baseboards (Floor) */}
            <group position={[0, mouldingSize / 2, 0]}>
                {/* Back */}
                <mesh position={[0, 0, -roomL / 2 + mouldingSize / 2]}>
                    <boxGeometry args={[roomW, mouldingSize, mouldingSize / 4]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Front */}
                <mesh position={[0, 0, roomL / 2 - mouldingSize / 2]}>
                    <boxGeometry args={[roomW, mouldingSize, mouldingSize / 4]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Left */}
                <mesh position={[-roomW / 2 + mouldingSize / 2, 0, 0]}>
                    <boxGeometry args={[mouldingSize / 4, mouldingSize, roomL]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
                {/* Right */}
                <mesh position={[roomW / 2 - mouldingSize / 2, 0, 0]}>
                    <boxGeometry args={[mouldingSize / 4, mouldingSize, roomL]} />
                    <meshStandardMaterial color="#fff" roughness={0.3} />
                </mesh>
            </group>

            {/* Premium Standing Lamp */}
            <group position={[-roomW * 0.4, 0, -roomL * 0.4]}>
                {/* Gold Base */}
                <mesh position={[0, 0.02, 0]}>
                    <cylinderGeometry args={[0.12, 0.15, 0.05, 32]} />
                    <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Gold Pole */}
                <mesh position={[0, roomH * 0.4, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, roomH * 0.8, 16]} />
                    <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Elegant Shade */}
                <mesh position={[0, roomH * 0.8, 0]}>
                    <cylinderGeometry args={[0.2, 0.1, 0.3, 32, 1, true]} />
                    <meshStandardMaterial color="#fff8e1" transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
                {/* Dynamic light */}
                <pointLight position={[0, roomH * 0.75, 0]} intensity={lightIntensity} color="#fff8e1" distance={12} decay={2} />
            </group>
        </group>
    );
};

// --- Standard Fixtures Removed Duplicate ---


const RoomScene = ({ setup, floorTile, walls, setSceneInfo, timeOfDay, isWalkMode }) => {
    const { camera } = useThree();
    const controlsRef = useRef();

    const SCALE_FT = 0.12;
    const roomW = Math.max(1, setup.width) * SCALE_FT;
    const roomL = Math.max(1, setup.length) * SCALE_FT;
    const roomH = Math.max(1, setup.height) * SCALE_FT;
    const eyeLevel = roomH * 0.55; // Approx eye level related to ceiling

    // Check if Luxury Model
    const isLuxury = setup.model === 'Luxury Room';

    // Day/Night Logic
    // Time: 0 to 24.
    // Day: 6 to 18. Peak sun at 12.
    // Night: 18 to 6.

    // Sun Angle: (time - 6) / 12 * PI for day.
    const isDay = timeOfDay > 5 && timeOfDay < 19;

    // Sun Position (moves East to West)
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
    const sunX = Math.cos(sunAngle) * roomW * 2;
    const sunY = Math.sin(sunAngle) * roomH * 3;

    // Intensities
    // Sun: smooth curve during day, 0 at night
    const sunIntensity = isDay ? Math.sin(sunAngle) * 1.0 : 0;

    // Ambient: Bright at day, dim blue at night
    const ambientIntensity = isDay ? 0.5 : 0.1;
    const ambientColor = isDay ? 0xffffff : 0x1a237e; // White vs Midnight Blue

    // Indoor: On at night, off/low at day.
    // Smooth transition around dusk/dawn? Let's just say if Sun < 0.3, lights come on.
    const indoorIntensity = sunIntensity < 0.2 ? 0.8 : 0;

    useEffect(() => {
        if (isWalkMode) {
            // Enter walk mode: set camera to inside room
            camera.position.set(0, eyeLevel, roomL * 0.4);
            camera.lookAt(0, eyeLevel, -roomL * 0.4);
        } else {
            // Reset to Orbit view
            const diag = Math.max(roomW, roomL) * 1.8;
            camera.position.set(diag, roomH * 1.2 + 0.2, diag);
            camera.lookAt(0, roomH * 0.45, 0);
            if (controlsRef.current) {
                controlsRef.current.target.set(0, roomH * 0.45, 0);
                controlsRef.current.update();
            }
        }
    }, [roomW, roomL, roomH, camera, isWalkMode, eyeLevel]);

    useEffect(() => {
        if (setSceneInfo) {
            setSceneInfo({
                resetView: () => {
                    const diag = Math.max(roomW, roomL) * 1.8;
                    camera.position.set(diag, roomH * 1.2 + 0.2, diag);
                    if (controlsRef.current) {
                        controlsRef.current.target.set(0, roomH * 0.45, 0);
                        controlsRef.current.update();
                    }
                }
            });
        }
    }, [setSceneInfo, roomW, roomL, roomH, camera]);

    const wallThickness = 0.06;

    // Floor Logic
    const RenderFloor = () => {
        const width = roomW;
        const length = roomL;
        if (floorTile && floorTile.image) {
            return <SmartTexturedMesh
                size={[width, length, 0.02]} // Added thickness to BoxGeometry to prevent default depth
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                imageUrl={floorTile.image}
                faceDimensions={[setup.width, setup.length]}
                scaleFt={1}
            />;
            // Wait, previous logic was: width / 3.
            // My Smart helper takes dimension and divides by (3 * scaleFt).
            // If I pass setup.width (15) and scaleFt=1 => 15 / 3 = 5 repeats. Correct.
        }
        return (
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color={isLuxury ? 0xf5f5f5 : 0xdbc3a2} roughness={isLuxury ? 0.3 : 0.95} metalness={isLuxury ? 0.1 : 0} />
            </mesh>
        );
    };

    // Wall Logic Helper
    const RenderWall = ({ type, position, size, rotation, isSide }) => {
        const tile = walls[type];
        if (tile && tile.image) {
            // Calculate face dimensions in FT for repeats
            // If Side: width is roomL (setup.length)
            // If Front/Back: width is roomW (setup.width)
            // Height is setup.height
            const wFt = isSide ? setup.length : setup.width;
            const hFt = setup.height;

            return <SmartTexturedMesh
                size={size}
                position={position}
                rotation={rotation}
                imageUrl={tile.image}
                faceDimensions={[wFt, hFt]}
                scaleFt={1}
            />
        }
        return <PlainMesh size={size} position={position} rotation={rotation} color={isLuxury ? 0xffffff : 0xf2efe8} />;
    };

    return (
        <>
            {/* Dynamic Lighting System */}
            <ambientLight intensity={ambientIntensity} color={ambientColor} />

            {/* Sun / Moon Directional Light */}
            <directionalLight
                position={[sunX, sunY, 5]}
                intensity={sunIntensity}
                color={isDay ? 0xfffae6 : 0xaab6fe}
                castShadow
            />

            {/* Luxury Ambiance - Indoor Lights (Controlled by Day/Night) */}
            {/* We moved the point light into LuxuryFixtures to be dynamic, OR we keep a general one here */}
            {/* For non-luxury models, maybe we want a basic bulb? No, stick to luxury requirement. */}

            <group>
                {/* Floor - Special case for geometry */}
                <RenderFloor />

                {/* Back Wall */}
                <RenderWall
                    type="back"
                    position={[0, roomH / 2, -roomL / 2]}
                    size={[roomW, roomH, wallThickness]}
                    isSide={false}
                />

                {/* Front Wall */}
                <RenderWall
                    type="front"
                    position={[0, roomH / 2, roomL / 2]}
                    size={[roomW, roomH, wallThickness]}
                    isSide={false}
                />

                {/* Left Wall */}
                <RenderWall
                    type="left"
                    position={[-roomW / 2, roomH / 2, 0]}
                    size={[wallThickness, roomH, roomL]}
                    isSide={true}
                />

                {/* Right Wall */}
                <RenderWall
                    type="right"
                    position={[roomW / 2, roomH / 2, 0]}
                    size={[wallThickness, roomH, roomL]}
                    isSide={true}
                />

                {setup.roomType === 'Kitchen' && (
                    <KitchenFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}
                {setup.roomType === 'Bedroom' && (
                    <BedroomFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}
                {setup.roomType === 'Bathroom' && (
                    <BathroomFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}
                {setup.roomType === 'Living Room' && (
                    <LivingRoomFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}
                {setup.roomType === 'Balcony' && (
                    <BalconyFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}
                {setup.roomType === 'Parking' && (
                    <ParkingFeatures roomW={roomW} roomL={roomL} roomH={roomH} />
                )}

                {/* Fixtures based on Model */}
                {isLuxury ? (
                    <LuxuryFixtures roomW={roomW} roomL={roomL} roomH={roomH} lightIntensity={indoorIntensity} />
                ) : (
                    <StandardFixtures roomW={roomW} roomL={roomL} roomH={roomH} lightIntensity={indoorIntensity} />
                )}

                {/* Grid Helper */}
                <gridHelper args={[Math.max(roomW, roomL) * 1.2, 10, 0xdddddd, 0xeeeeee]} position={[0, 0.001, 0]} />
            </group>

            <OrbitControls
                ref={controlsRef}
                makeDefault
                minDistance={0.1}
                maxDistance={Math.max(roomW, roomL) * 6}
                enableDamping={true}
                dampingFactor={0.08}
                enabled={!isWalkMode}
            />
            {isWalkMode && (
                <>
                    <PointerLockControls selector="#viewerWrap" />
                    <WalkManager active={isWalkMode} eyeLevel={eyeLevel} />
                </>
            )}
        </>
    );
};

// --- Sub Components for Textures ---
const SmartTexturedMeshContent = ({ imageUrl, w, h }) => {
    const tex = useTexture(imageUrl);
    React.useLayoutEffect(() => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)));
    }, [tex, w, h]);
    return <meshStandardMaterial map={tex} roughness={0.95} />;
};



// --- Loading Screen Component ---
const Loader = ({ onFinished }) => {
    const [progress, setProgress] = useState(0);
    const [stepsDone, setStepsDone] = useState([false, false, false, false, false]);

    useEffect(() => {
        const seq = [700, 900, 1200, 900, 600];
        const total = seq.reduce((a, b) => a + b, 0);
        let elapsed = 0;
        let stepIdx = 0;

        const run = () => {
            if (stepIdx >= seq.length) {
                setProgress(100);
                setStepsDone(stepsDone.map(() => true));
                setTimeout(onFinished, 500);
                return;
            }
            const duration = seq[stepIdx];
            const start = performance.now();

            const tick = (now) => {
                const p = Math.min(1, (now - start) / duration);
                const overall = Math.min(1, (elapsed + p * duration) / total);
                setProgress(Math.round(overall * 100));

                if (p < 1) {
                    requestAnimationFrame(tick);
                } else {
                    setStepsDone(prev => {
                        const next = [...prev];
                        next[stepIdx] = true;
                        return next;
                    });
                    elapsed += duration;
                    stepIdx++;
                    setTimeout(run, 160);
                }
            };
            requestAnimationFrame(tick);
        }
        run();
    }, [onFinished]);

    return (
        <div className="progress-modal" style={{ display: 'flex' }}>
            <div className="modal-card">
                <div className="star">✦</div>
                <h3>Generating Your Room</h3>
                <p className="muted">AI is creating a realistic 3D visualization</p>
                <div className="progress-wrap">
                    <div className="progress-bar-bg">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="progress-pct">{progress}%</div>
                </div>
                <ol className="progress-steps">
                    <li className={stepsDone[0] ? 'done' : ''}>Analyzing room parameters</li>
                    <li className={stepsDone[1] ? 'done' : ''}>Processing AI model</li>
                    <li className={stepsDone[2] ? 'done' : ''}>Generating 3D structure</li>
                    <li className={stepsDone[3] ? 'done' : ''}>Applying textures and lighting</li>
                    <li className={stepsDone[4] ? 'done' : ''}>Finalizing visualization</li>
                </ol>
            </div>
        </div>
    );
};


const AiGeneration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [setup, setSetup] = useState({ width: 15, length: 20, height: 9, area: 300, roomType: 'Living Room', model: 'Normal Room' });
    const [sceneInfo, setSceneInfo] = useState(null);

    // Day/Night State
    const [timeOfDay, setTimeOfDay] = useState(12); // 0 to 24

    // Tiles
    const [showPicker, setShowPicker] = useState(false);
    const [pickerType, setPickerType] = useState('floor');
    const [availableTiles, setAvailableTiles] = useState([]);

    // Selection State
    const [floorTile, setFloorTile] = useState(null);
    const [walls, setWalls] = useState({ front: null, back: null, left: null, right: null });

    // Modal State
    const [pendingWallTile, setPendingWallTile] = useState(null);
    const [showWallModal, setShowWallModal] = useState(false);

    // Premium Features
    const [isWalkMode, setIsWalkMode] = useState(false);
    const isLuxury = setup.model === 'Luxury Room';

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('tileSetup');
            if (stored) {
                const parsed = JSON.parse(stored);
                setSetup(prev => ({ ...prev, ...parsed, height: 9 }));
            }
        } catch (e) { console.error(e); }

        const loadServerTiles = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/products');
                if (response.ok) {
                    const data = await response.json();
                    if (data.length > 0) {
                        setAvailableTiles(data);
                    } else {
                        // Fallback if empty
                        setAvailableTiles([
                            { image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=200&q=80', design: 'Marble White', size: '2x2', amount: 120, type: 'floor' },
                            { image: 'https://images.unsplash.com/photo-1517482439563-71887e0b5722?auto=format&fit=crop&w=200&q=80', design: 'Granite Grey', size: '2x2', amount: 140, type: 'floor' },
                            { image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?auto=format&fit=crop&w=200&q=80', design: 'Wood Finish', size: '4x1', amount: 180, type: 'wall' },
                        ]);
                    }
                }
            } catch (error) {
                console.error("Error loading tiles:", error);
                // Load fallback
                setAvailableTiles([
                    { image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=200&q=80', design: 'Marble White', size: '2x2', amount: 120, type: 'floor' },
                    { image: 'https://images.unsplash.com/photo-1517482439563-71887e0b5722?auto=format&fit=crop&w=200&q=80', design: 'Granite Grey', size: '2x2', amount: 140, type: 'floor' },
                    { image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?auto=format&fit=crop&w=200&q=80', design: 'Wood Finish', size: '4x1', amount: 180, type: 'wall' },
                ]);
            }
        };

        loadServerTiles();
    }, []);

    const handleDimensionChange = (e, dim) => {
        const val = Number(e.target.value);
        setSetup(prev => ({
            ...prev,
            [dim]: val,
            area: dim === 'height' ? prev.area : (dim === 'width' ? val * prev.length : prev.width * val)
        }));
    };

    const viewerRef = useRef(null);

    const handleResetDesign = () => {
        setFloorTile(null);
        setWalls({ front: null, back: null, left: null, right: null });
        if (sceneInfo) sceneInfo.resetView();
    };

    const handleFullscreen = () => {
        if (!viewerRef.current) return;
        if (!document.fullscreenElement) {
            viewerRef.current.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    const handleSnapshot = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            // Temporarily render to ensure buffer is fresh (though preserveDrawingBuffer helps)
            try {
                const data = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `JTT-Design-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = data;
                link.click();
            } catch (err) {
                console.error("Snapshot failed:", err);
            }
        }
    };

    const selectTile = (tile) => {
        if (pickerType === 'floor') {
            setFloorTile(tile);
        } else {
            setPendingWallTile(tile);
            setShowWallModal(true);
        }
    };

    const applyWallTile = (scope) => {
        if (!pendingWallTile) return;

        if (scope === 'all') {
            setWalls({
                front: pendingWallTile,
                back: pendingWallTile,
                left: pendingWallTile,
                right: pendingWallTile
            });
        } else if (scope === 'front') {
            setWalls(prev => ({ ...prev, front: pendingWallTile }));
        } else if (scope === 'back') {
            setWalls(prev => ({ ...prev, back: pendingWallTile }));
        } else if (scope === 'left') {
            setWalls(prev => ({ ...prev, left: pendingWallTile }));
        } else if (scope === 'right') {
            setWalls(prev => ({ ...prev, right: pendingWallTile }));
        }

        setShowWallModal(false);
        setPendingWallTile(null);
    };

    if (loading) {
        return <Loader onFinished={() => setLoading(false)} />;
    }

    return (
        <div className="ai-page-body">
            <header className="topbar">
                <div className="brand">
                    <div className="logo-circle">JTT</div>
                    <div className="brand-text">
                        <div className="brand-name">JAI THINDAL TILES</div>
                    </div>
                </div>
                <nav className="breadcrumbs">
                    <button className="crumb" onClick={() => navigate('/customer')}>Customer Details</button>
                    <button className="crumb" onClick={() => navigate('/dashboard')}>Home</button>
                    <button className="crumb" onClick={() => navigate('/room-setup')}>Room Setup</button>
                    <button className="crumb active">AI Generation</button>
                    <button className="crumb" onClick={() => navigate('/collection')}>Tile Selection</button>
                </nav>
            </header>

            <main className="ai-page">
                <div className="container">
                    <h1 className="title">AI-Generated 3D Room Visualization</h1>
                    <p className="subtitle muted">Explore your room in immersive 3D — rotate, zoom and inspect before selecting tiles.</p>

                    <div className="content-grid">
                        {/* LEFT: 3D Viewer */}
                        <section className="card large" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
                            <div id="viewerWrap" ref={viewerRef} className="viewer-wrap" style={{ width: '100%', height: '500px' }}>
                                <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
                                    <Suspense fallback={<Html center>Loading 3D...</Html>}>
                                        <RoomScene
                                            setup={setup}
                                            floorTile={floorTile}
                                            walls={walls}
                                            setSceneInfo={setSceneInfo}
                                            timeOfDay={timeOfDay}
                                            isWalkMode={isWalkMode}
                                        />
                                    </Suspense>
                                </Canvas>

                                <div className="controls-top" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                                    {/* Day/Night Slider */}
                                    <div className="time-control" style={{
                                        background: 'rgba(255,255,255,0.9)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
                                        <span style={{ fontSize: '12px', fontWeight: '600' }}>
                                            {timeOfDay < 6 ? 'Night' : timeOfDay < 18 ? 'Day' : 'Night'}
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="24"
                                            step="0.5"
                                            value={timeOfDay}
                                            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                                            style={{ width: '80px', cursor: 'grab' }}
                                            title={`Time: ${Math.floor(timeOfDay)}:00`}
                                        />
                                    </div>

                                    <button className="control-btn" onClick={() => handleResetDesign()}>
                                        <RotateCcw size={14} style={{ marginRight: 4 }} /> Reset
                                    </button>
                                    <button className="control-btn" onClick={() => handleFullscreen()}>
                                        <Maximize size={14} style={{ marginRight: 4 }} /> Full Screen
                                    </button>

                                    <>
                                        <div style={{ width: '1px', height: '20px', background: '#ccc', margin: '0 4px' }}></div>
                                        <button
                                            className={`control-btn ${isWalkMode ? 'active-mode' : ''}`}
                                            onClick={() => setIsWalkMode(!isWalkMode)}
                                            title="Virtual Walkthrough"
                                        >
                                            <Footprints size={14} style={{ marginRight: 4 }} /> {isWalkMode ? 'Exit Walk' : 'Walk'}
                                        </button>
                                        <button
                                            className="control-btn"
                                            onClick={handleSnapshot}
                                            title="Take Snapshot"
                                        >
                                            <Camera size={14} style={{ marginRight: 4 }} /> Snap
                                        </button>
                                    </>
                                </div>
                                {isWalkMode && (
                                    <div style={{
                                        position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
                                        background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 16px', borderRadius: '20px',
                                        zIndex: 20, fontSize: '0.9rem', pointerEvents: 'none'
                                    }}>
                                        Move: W A S D • Look: Mouse • Click to start • ESC to show cursor
                                    </div>
                                )}

                                <div className="info-bottom">
                                    <div className="interactive">Interactive Controls
                                        <small> • Left click: rotate • Scroll: zoom • Right click: pan</small>
                                    </div>
                                    <button className="btn-primary" onClick={() => setShowPicker(!showPicker)}>Select Tiles ➜</button>
                                </div>

                                {/* Wall Selection Modal */}
                                {showWallModal && (
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '320px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                            <h3 style={{ margin: '0 0 10px' }}>Apply Wall Tile</h3>
                                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                                                Do you want to apply this tile to all walls or a single wall?
                                            </p>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <button
                                                    onClick={() => applyWallTile('all')}
                                                    style={{ padding: '10px', background: '#2f6b4b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                                                >
                                                    Apply to All 4 Walls
                                                </button>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => applyWallTile('front')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#333', borderRadius: '6px', cursor: 'pointer' }}>Front</button>
                                                    <button onClick={() => applyWallTile('back')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#333', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => applyWallTile('left')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#333', borderRadius: '6px', cursor: 'pointer' }}>Left</button>
                                                    <button onClick={() => applyWallTile('right')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#333', borderRadius: '6px', cursor: 'pointer' }}>Right</button>
                                                </div>
                                                <button
                                                    onClick={() => { setShowWallModal(false); setPendingWallTile(null); }}
                                                    style={{ marginTop: '10px', padding: '8px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inline Picker - Moved outside viewerWrap so it doesn't obscure the canvas */}
                            {showPicker && (
                                <div id="tilePickerWrap" className="tile-picker" style={{ background: 'white', zIndex: 10, borderTop: '1px solid #ddd', padding: '15px', display: 'flex', flexDirection: 'column', height: '250px' }}>
                                    <div className="tile-picker-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div>
                                            <div className="picker-title" style={{ fontWeight: 'bold' }}>Apply Tiles to This Room</div>
                                            <div className="picker-sub muted" style={{ fontSize: '0.85em' }}>Loaded from admin collections; click a tile to apply instantly.</div>
                                        </div>
                                        <div className="picker-actions" style={{ display: 'flex', gap: '10px' }}>
                                            <button className={`picker-btn ${pickerType === 'floor' ? 'picker-btn-active' : ''}`} onClick={() => setPickerType('floor')}>Floor Collection</button>
                                            <button className={`picker-btn ${pickerType === 'wall' ? 'picker-btn-active' : ''}`} onClick={() => setPickerType('wall')}>Wall Collection</button>
                                        </div>
                                    </div>
                                    <div className="tile-picker-grid" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                                        {availableTiles.filter(t => t.type === pickerType).map((tile, i) => (
                                            <div key={i} className="picker-card" onClick={() => selectTile(tile)} style={{ border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', minWidth: '120px' }}>
                                                <img src={tile.image} alt={tile.design} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                                                <div style={{ padding: '8px', fontSize: '0.8em' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{tile.design}</div>
                                                    <div>₹{tile.amount}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {availableTiles.filter(t => t.type === pickerType).length === 0 && (
                                            <div style={{ padding: '20px', color: '#999' }}>No tiles found for this collection.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* RIGHT PANEL */}
                        <aside className="right-col">
                            <div className="card">
                                <h4>Room Parameters <span className="muted" style={{ fontWeight: 400, fontSize: '0.9em', cursor: 'pointer' }} onClick={() => navigate('/room-setup')}> (Edit)</span></h4>

                                <div className="param"><strong>Room Type</strong><div>{setup.roomType}</div></div>
                                <div className="param"><strong>Width</strong><div>{setup.width} ft</div></div>
                                <div className="param"><strong>Length</strong><div>{setup.length} ft</div></div>
                                <div className="param"><strong>Total Area</strong><div>{setup.area.toFixed(2)} sq ft</div></div>
                                <div className="param"><strong>Room Model</strong><div>{setup.model}</div></div>
                                <div className="param" style={{ alignItems: 'flex-start' }}>
                                    <strong>Cost Estimation</strong>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                                            ₹{(() => {
                                                let total = 0;
                                                if (floorTile && floorTile.amount) total += setup.area * (Number(floorTile.amount) || 0);

                                                const h = setup.height;
                                                const w = setup.width;
                                                const l = setup.length;
                                                const fbArea = w * h;
                                                const sArea = l * h;

                                                if (walls.front && walls.front.amount) total += fbArea * (Number(walls.front.amount) || 0);
                                                if (walls.back && walls.back.amount) total += fbArea * (Number(walls.back.amount) || 0);
                                                if (walls.left && walls.left.amount) total += sArea * (Number(walls.left.amount) || 0);
                                                if (walls.right && walls.right.amount) total += sArea * (Number(walls.right.amount) || 0);
                                                return total.toFixed(2);
                                            })()}
                                        </div>
                                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {floorTile && (
                                                <div title="Floor Tile">Floor: {floorTile.size} • ₹{floorTile.amount}/sq.ft</div>
                                            )}
                                            {walls.front && (
                                                <div title="Front Wall">Front: {walls.front.size} • ₹{walls.front.amount}/sq.ft</div>
                                            )}
                                            {walls.back && (
                                                <div title="Back Wall">Back: {walls.back.size} • ₹{walls.back.amount}/sq.ft</div>
                                            )}
                                            {walls.left && (
                                                <div title="Left Wall">Left: {walls.left.size} • ₹{walls.left.amount}/sq.ft</div>
                                            )}
                                            {walls.right && (
                                                <div title="Right Wall">Right: {walls.right.size} • ₹{walls.right.amount}/sq.ft</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="dimension-controls">
                                    <h4>Adjust Room Dimensions</h4>

                                    <div className="slider-group">
                                        <div className="slider-label">
                                            <span>Width</span> <span className="slider-value">{setup.width} ft</span>
                                        </div>
                                        <input
                                            type="range" className="dimension-slider"
                                            min="5" max="30" step="1"
                                            value={setup.width}
                                            onChange={(e) => handleDimensionChange(e, 'width')}
                                        />
                                        <div className="slider-hint">Drag to adjust room width (5-30 ft)</div>
                                    </div>

                                    <div className="slider-group">
                                        <div className="slider-label">
                                            <span>Length</span> <span className="slider-value">{setup.length} ft</span>
                                        </div>
                                        <input
                                            type="range" className="dimension-slider"
                                            min="5" max="40" step="1"
                                            value={setup.length}
                                            onChange={(e) => handleDimensionChange(e, 'length')}
                                        />
                                        <div className="slider-hint">Drag to adjust room length (5-40 ft)</div>
                                    </div>

                                    <div className="slider-group">
                                        <div className="slider-label">
                                            <span>Height</span> <span className="slider-value">{setup.height} ft</span>
                                        </div>
                                        <input
                                            type="range" className="dimension-slider"
                                            min="3" max="15" step="1"
                                            value={setup.height}
                                            onChange={(e) => handleDimensionChange(e, 'height')}
                                        />
                                        <div className="slider-hint">Drag to adjust ceiling height (7-15 ft)</div>
                                    </div>
                                </div>

                                <div className="note card small muted mt">
                                    <strong>3D Visualization Ready</strong>
                                    <p className="muted">Rotate, zoom, and explore your room from different angles using mouse controls. Adjust dimensions in real-time.</p>
                                </div>
                            </div>

                            <div className="card mt small">
                                <h4>AI-Powered Precision</h4>
                                <div className="precision">
                                    <div className="big">{Math.round(setup.area)}</div>
                                    <div className="label muted">Square Feet</div>
                                    <div className="spacer"></div>
                                    <div className="big">3D</div>
                                    <div className="label muted">Visualization</div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AiGeneration;
