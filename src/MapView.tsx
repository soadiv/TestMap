import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Popup } from 'maplibre-gl';
import type { MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapTilerStyle = 'https://api.maptiler.com/maps/streets/style.json?key=TwkH4bIhwiWu3jAEikEb';
const geojsonUrl = './ur.geojson';

// Модальное окно с отдельной картой района
function DistrictModal({ feature, onClose }: { feature: any, onClose: () => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapTilerStyle,
      center: feature?.geometry?.type === 'Polygon'
        ? feature.geometry.coordinates[0][0]
        : [53.233, 57.0],
      zoom: 9,
    });
    map.on('load', () => {
      map.addSource('district', {
        type: 'geojson',
        data: feature,
      });
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'district',
        paint: {
          'fill-color': '#d22',
          'fill-opacity': 0.5,
        },
      });
      map.addLayer({
        id: 'district-outline',
        type: 'line',
        source: 'district',
        paint: {
          'line-color': '#000',
          'line-width': 2,
        },
      });
      // Автофит
      const bounds = new maplibregl.LngLatBounds();
      const coords = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0][0];
      coords.forEach((c: number[]) => bounds.extend([c[0], c[1]]));
      map.fitBounds(bounds, { padding: 40 });
    });
    return () => map.remove();
  }, [feature]);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '80vw', height: '80vh', background: '#fff', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>Закрыть</button>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const hoveredStateId = useRef<number | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [districtFeature, setDistrictFeature] = useState<MapGeoJSONFeature | null>(null);
  const geojsonData = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapTilerStyle,
      center: [53.233, 57.0],
      zoom: 7,
    });
    mapRef.current = map;

    map.on('load', () => {
      fetch(geojsonUrl)
        .then((res) => res.json())
        .then((data) => {
          geojsonData.current = data;
          map.addSource('udmurtia', {
            type: 'geojson',
            data,
            generateId: true,
          });
          map.addLayer({
            id: 'udmurtia-fill',
            type: 'fill',
            source: 'udmurtia',
            paint: {
              'fill-color': '#088',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.7,
                0.3,
              ],
            },
          });
          map.addLayer({
            id: 'udmurtia-outline',
            type: 'line',
            source: 'udmurtia',
            paint: {
              'line-color': '#000',
              'line-width': 1,
            },
          });

          // Hover logic
          map.on('mousemove', 'udmurtia-fill', (e: MapLayerMouseEvent) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              if (hoveredStateId.current !== null) {
                map.setFeatureState(
                  { source: 'udmurtia', id: hoveredStateId.current },
                  { hover: false }
                );
              }
              hoveredStateId.current = feature.id as number;
              map.setFeatureState(
                { source: 'udmurtia', id: hoveredStateId.current },
                { hover: true }
              );

              // Popup
              const name = feature.properties?.['name:ru'] || feature.properties?.['name'] || 'Без названия';
              if (!popupRef.current) {
                popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
              }
              popupRef.current
                .setLngLat(e.lngLat)
                .setHTML(`<div style='font-size:16px;'>${name}</div>`)
                .addTo(map);
            }
          });

          map.on('mouseleave', 'udmurtia-fill', () => {
            if (hoveredStateId.current !== null) {
              map.setFeatureState(
                { source: 'udmurtia', id: hoveredStateId.current },
                { hover: false }
              );
            }
            hoveredStateId.current = null;
            if (popupRef.current) {
              popupRef.current.remove();
              popupRef.current = null;
            }
          });

          // Click logic
          map.on('click', 'udmurtia-fill', (e: MapLayerMouseEvent) => {
            if (e.features && e.features.length > 0) {
              setDistrictFeature(e.features[0]);
            }
          });
        });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <>
      <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />
      {districtFeature && (
        <DistrictModal feature={districtFeature} onClose={() => setDistrictFeature(null)} />
      )}
    </>
  );
};

export default MapView; 