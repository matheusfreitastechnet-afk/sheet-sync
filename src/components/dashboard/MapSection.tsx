import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Map, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboard } from '@/contexts/DashboardContext';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/config/constants';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Cache de geocodificação no localStorage
const GEOCODE_CACHE_KEY = 'geocodeCache';

const getGeocodeCache = (): Record<string, [number, number]> => {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveGeocodeCache = (cache: Record<string, [number, number]>) => {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail
  }
};

// Geocodificação via Nominatim API (OpenStreetMap)
const geocodeBairro = async (bairro: string, cidade?: string): Promise<[number, number] | null> => {
  const cache = getGeocodeCache();
  const contexts = ['Natal, RN, Brasil', 'Parnamirim, RN, Brasil', 'Fortaleza, CE, Brasil', 'Mossoró, RN, Brasil'];
  
  if (cidade) {
    contexts.unshift(cidade);
  }

  for (const context of contexts) {
    const cacheKey = `${bairro} | ${context}`.toLowerCase();
    
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    const query = `${bairro}, ${context}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
    
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const coords: [number, number] = [lat, lon];
        
        cache[cacheKey] = coords;
        saveGeocodeCache(cache);
        
        return coords;
      }
    } catch (err) {
      console.warn(`Geocoding failed for ${query}:`, err);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return null;
};

// Custom cluster icon
const createClusterIcon = (count: number): L.DivIcon => {
  const size = count > 50 ? 50 : count > 20 ? 40 : 30;
  const color = count > 50 ? '#f5576c' : count > 20 ? '#ffa726' : '#43e97b';
  
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${size > 40 ? '14px' : '12px'};
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface NeighborhoodData {
  name: string;
  count: number;
  coords: [number, number];
  items: any[];
}

export const MapSection: React.FC = () => {
  const { filteredData } = useDashboard();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState('');
  const [neighborhoodData, setNeighborhoodData] = useState<NeighborhoodData[]>([]);

  // Agrupa dados por bairro
  const bairroGroups = useMemo(() => {
    const groups: Record<string, { items: any[]; cidade?: string }> = {};
    
    filteredData.forEach(item => {
      let bairro = String(item.Bairro || item.bairro || '').trim();
      if (!bairro) return;
      
      bairro = bairro.toUpperCase();
      if (bairro === 'NV PARNAMIRIM') bairro = 'NOVA PARNAMIRIM';
      
      if (!groups[bairro]) {
        groups[bairro] = { 
          items: [],
          cidade: String(item.Cidade || item['Municipio/UF'] || item.Municipio || '').trim()
        };
      }
      groups[bairro].items.push(item);
    });
    
    return groups;
  }, [filteredData]);

  // Inicializa mapa Leaflet (vanilla, sem react-leaflet)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Força resize após inicialização
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Geocodifica bairros
  useEffect(() => {
    const geocodeAll = async () => {
      const results: NeighborhoodData[] = [];
      const bairros = Object.entries(bairroGroups);
      
      if (bairros.length === 0) {
        setNeighborhoodData([]);
        return;
      }

      setIsGeocoding(true);
      
      for (let i = 0; i < bairros.length; i++) {
        const [name, { items, cidade }] = bairros[i];
        setGeocodeProgress(`Carregando mapa: ${Math.round(((i + 1) / bairros.length) * 100)}%`);
        
        let coords: [number, number] | null = null;
        
        const itemWithCoords = items.find(item => {
          const lat = parseFloat(item.Latitude || item.Lat || '');
          const lon = parseFloat(item.Longitude || item.Lon || item.Long || '');
          return !isNaN(lat) && !isNaN(lon);
        });
        
        if (itemWithCoords) {
          const lat = parseFloat(itemWithCoords.Latitude || itemWithCoords.Lat);
          const lon = parseFloat(itemWithCoords.Longitude || itemWithCoords.Lon || itemWithCoords.Long);
          coords = [lat, lon];
        } else {
          coords = await geocodeBairro(name, cidade);
        }
        
        if (coords) {
          results.push({
            name,
            count: items.length,
            coords,
            items
          });
        }
      }
      
      setNeighborhoodData(results);
      setIsGeocoding(false);
      setGeocodeProgress('');
    };

    geocodeAll();
  }, [bairroGroups]);

  // Atualiza marcadores no mapa
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (neighborhoodData.length === 0) return;

    // Adiciona novos marcadores
    neighborhoodData.forEach(neighborhood => {
      const popupContent = `
        <div style="padding: 8px; max-height: 300px; overflow-y: auto;">
          <h4 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
            ${neighborhood.name} (${neighborhood.count} Atendimentos)
          </h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${neighborhood.items.slice(0, 10).map(item => `
              <li style="font-size: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin-bottom: 4px;">
                <strong>Técnico:</strong> ${item.Recurso || 'N/A'}<br>
                <strong>Tipo:</strong> ${item['Tipo de Atividade'] || 'N/A'}<br>
                <strong>Baixa:</strong> ${item['Cód de Baixa 1'] || 'N/A'}
              </li>
            `).join('')}
            ${neighborhood.items.length > 10 ? `
              <li style="font-size: 11px; color: #666;">
                + ${neighborhood.items.length - 10} atividades...
              </li>
            ` : ''}
          </ul>
        </div>
      `;

      const marker = L.marker(neighborhood.coords, {
        icon: createClusterIcon(neighborhood.count)
      })
        .bindPopup(popupContent, { maxWidth: 300 })
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Ajusta bounds para mostrar todos os marcadores
    if (neighborhoodData.length > 0) {
      const bounds = L.latLngBounds(neighborhoodData.map(n => n.coords));
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [neighborhoodData]);

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Map className="w-5 h-5 text-accent" />
        Mapa - Volume de Atividades por Bairro
      </h3>
      
      {isGeocoding && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{geocodeProgress}</span>
        </div>
      )}
      
      <div 
        ref={mapContainerRef}
        className="h-[500px] rounded-xl overflow-hidden border border-border"
        style={{ minHeight: '500px' }}
      />

      {neighborhoodData.length === 0 && !isGeocoding && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado de bairro disponível para exibir no mapa
        </div>
      )}
    </div>
  );
};
