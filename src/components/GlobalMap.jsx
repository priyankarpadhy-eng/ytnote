import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useActivePresence } from '../hooks/useActivePresence';
import { useTheme } from '../contexts/ThemeContext';

// --- Fuzzing Logic (Privacy) ---
const fuzzLocation = (coord) => {
    // Adds roughly 5-7km of randomness (-0.05 to +0.05)
    const offset = (Math.random() - 0.5) * 0.1;
    return parseFloat((coord + offset).toFixed(3));
};

// --- Heatmap Layer Component ---
const HeatmapLayer = ({ points }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        // Points format: [lat, lng, intensity]
        const heatPoints = points.map(p => [p.lat, p.lng, 0.8]);

        if (!heatLayerRef.current) {
            heatLayerRef.current = L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 14,
                gradient: {
                    0.4: 'blue',
                    0.6: 'cyan',
                    0.7: 'lime',
                    0.8: 'yellow',
                    1.0: 'red'
                }
            }).addTo(map);
        } else {
            heatLayerRef.current.setLatLngs(heatPoints);
        }

        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        };
    }, [map, points]);

    return null;
};

// --- Main Map Component ---
export default function GlobalMap() {
    const { currentUser } = useAuth();
    const { activeUsers } = useActivePresence();
    const { isDarkMode } = useTheme();
    const [geoJsonData, setGeoJsonData] = useState(null);

    // Throttling Ref
    const lastPingTimeRef = useRef(0);

    // 1. Fetch GeoJSON for Borders (Same as before)
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error("Failed to load map borders", err));
    }, []);

    // 2. Get User Location (Same as before)
    useEffect(() => {
        if (!currentUser) return;
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                if (data.latitude && data.longitude) {
                    const realLat = parseFloat(data.latitude);
                    const realLng = parseFloat(data.longitude);
                    const fuzzedLat = fuzzLocation(realLat);
                    const fuzzedLng = fuzzLocation(realLng);
                    const loc = { lat: fuzzedLat, lng: fuzzedLng };
                    updatePresence(loc);
                }
            })
            .catch(err => console.warn("IP Geolocation failed:", err));
    }, [currentUser]);

    // 3. Presence Update (Same as before)
    const updatePresence = (loc) => {
        if (!currentUser || !loc) return;
        const now = Date.now();
        if (now - lastPingTimeRef.current < 300000 && lastPingTimeRef.current !== 0) return;
        const userStatusRef = ref(rtdb, '/status/' + currentUser.uid);
        const presenceData = {
            lat: loc.lat,
            lng: loc.lng,
            isOnline: true,
            lastSeen: serverTimestamp(),
        };
        set(userStatusRef, presenceData);
        onDisconnect(userStatusRef).remove();
        lastPingTimeRef.current = now;
    };

    // Style for borders (Adapted for theme?)
    const geoJsonStyle = {
        fillColor: "transparent",
        weight: 0,
        opacity: 0,
        color: "transparent",
        fillOpacity: 0
    };

    const onEachCountry = (feature, layer) => {
        if (feature.properties && feature.properties.name) {
            layer.bindTooltip(feature.properties.name, {
                permanent: false,
                direction: "center",
                className: "country-label"
            });
            layer.on({
                mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 2,
                        color: '#60a5fa', // Blue-400
                        opacity: 1
                    });
                },
                mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle(geoJsonStyle);
                }
            });
        }
    };

    return (
        <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 relative group">
            <style>
                {`
                    .country-label {
                        background: transparent;
                        border: none;
                        box-shadow: none;
                        color: ${isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'};
                        font-weight: bold;
                        font-size: 10px;
                        text-shadow: ${isDarkMode ? '0 0 2px black' : '0 0 2px white'};
                    }
                `}
            </style>
            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%', background: isDarkMode ? '#121212' : '#f8f9fa' }}
                scrollWheelZoom={true}
                zoomControl={false}
                minZoom={2}
                // Keep the world bounds
                maxBounds={[[-90, -180], [90, 180]]}
            >
                {/* Dynamically switch Tile Layer based on Theme */}
                <TileLayer
                    url={isDarkMode
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    }
                    attribution='&copy; CARTO'
                />

                {/* Borders Layer */}
                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        style={geoJsonStyle}
                        onEachFeature={onEachCountry}
                    />
                )}

                {/* Heatmap Overlay */}
                <HeatmapLayer points={activeUsers} />
            </MapContainer>

            {/* Overlay Stats */}
            <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-white/10 p-3 rounded-lg z-[1000] pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-slate-900 dark:text-white text-xs font-bold font-mono">
                        {activeUsers.length} ONLINE
                    </span>
                </div>
            </div>
        </div>
    );
}
