import { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Compass, Bike, User, AlertCircle, RefreshCw } from 'lucide-react';
import { Recorrido } from '../types';

interface RadarMapProps {
  recorridosActivos: Recorrido[];
  conductorOnline: boolean;
  aceptarRecorrido: (id: string) => void;
  mostrarAlertaCustom: (text: string, callback: (() => void) | null, title?: string) => void;
}

// Custom Premium Dark Map Style
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#111111" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111111" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#333333" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#aaaaaa" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#999999" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#777777" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#252525" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2e2e2e" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#3e3e3e" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#555555" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#333333" }],
  },
];

export default function RadarMap({
  recorridosActivos,
  conductorOnline,
  aceptarRecorrido,
  mostrarAlertaCustom,
}: RadarMapProps) {
  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';
  const [retryCount, setRetryCount] = useState(0);

  // Center on Neiva, Huila
  const center = { lat: 2.9273, lng: -75.28189 };

  // Filter pending rides
  const pendingRides = useMemo(() => {
    return recorridosActivos.filter((r) => r.status === 'pending');
  }, [recorridosActivos]);

  // Generate stable coordinates based on ID string seed if coordinates are missing
  const getRideCoordinates = (ride: Recorrido) => {
    if (ride.passengerLat && ride.passengerLon) {
      return { lat: ride.passengerLat, lng: ride.passengerLon };
    }
    // Deterministic fallback using the ID to prevent flickering
    const seed = ride.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((seed % 100) - 50) * 0.0001;
    const lonOffset = (((seed * 7) % 100) - 50) * 0.0001;
    return {
      lat: center.lat + latOffset,
      lng: center.lng + lonOffset,
    };
  };

  if (!hasValidKey) {
    return (
      <div className="bg-bg-dark border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-bold tracking-widest text-brand-secondary uppercase flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-brand-secondary animate-spin-slow" /> Radar de Solicitudes Activas
          </span>
          <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full uppercase">
            Mapa Offline
          </span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[280px] bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-brand-primary animate-pulse" />
          </div>
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Google Maps API Key Requerida</h3>
          <p className="text-xs text-text-secondary max-w-sm mb-4 leading-relaxed">
            Para activar la navegación satelital real y ver las solicitudes activas de Neiva en el mapa, por favor configura tu API key.
          </p>

          <div className="text-left bg-white/5 border border-white/5 rounded-xl p-3.5 w-full max-w-xs space-y-2.5 text-[11px] text-text-secondary leading-normal">
            <p><strong>Paso 1:</strong> Obtén una llave en la <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-brand-secondary underline hover:text-emerald-400">Consola de Google Maps</a></p>
            <p><strong>Paso 2:</strong> Agrégala como secreto en AI Studio:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Haz clic en el engranaje de <strong>Configuración (⚙️)</strong></li>
              <li>Selecciona la pestaña de <strong>Secrets</strong></li>
              <li>Ingresa <code>GOOGLE_MAPS_PLATFORM_KEY</code> y pega tu valor</li>
            </ul>
          </div>
          <button 
            type="button"
            onClick={() => setRetryCount(prev => prev + 1)}
            className="mt-4 flex items-center gap-1.5 bg-brand-primary hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Re-evaluar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold tracking-widest text-brand-secondary uppercase flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-brand-secondary animate-spin-slow" /> Radar de Solicitudes Activas
        </span>
        <span className="text-[9px] font-bold text-brand-secondary bg-brand-secondary/10 border border-brand-secondary/20 px-2 py-0.5 rounded-full uppercase">
          Navegación Satelital
        </span>
      </div>

      <div className="relative w-full h-80 bg-black rounded-2xl overflow-hidden border border-white/5 shadow-inner">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={center}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            styles={mapStyle}
            disableDefaultUI={true}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Driver position (You) */}
            <AdvancedMarker position={center}>
              <div className="relative flex flex-col items-center">
                <span className={`absolute -inset-1.5 rounded-full ${conductorOnline ? 'bg-brand-secondary/20 animate-ping' : 'bg-neutral-800'}`} />
                <div className="w-7 h-7 rounded-full bg-brand-secondary border-2 border-white flex items-center justify-center shadow-lg shadow-brand-secondary/40">
                  <Bike className="w-4 h-4 text-white" />
                </div>
                <span className="text-[7px] font-bold text-white bg-black/90 px-1 py-0.5 rounded-md border border-white/10 mt-0.5 uppercase whitespace-nowrap">Tú (Piloto)</span>
              </div>
            </AdvancedMarker>

            {/* Render passenger requests */}
            {conductorOnline &&
              pendingRides.map((ride) => {
                const ridePos = getRideCoordinates(ride);
                return (
                  <AdvancedMarker
                    key={ride.id}
                    position={ridePos}
                    onClick={() => {
                      mostrarAlertaCustom(
                        `🚀 Solicitud de ${ride.nombre}.\n📍 Origen: ${ride.dePartida}\n📝 Nota: "${ride.notas || "Sin notas"}"\n\n¿Aceptar este viaje e iniciar navegación?`,
                        () => aceptarRecorrido(ride.id),
                        "DETALLES DE SOLICITUD"
                      );
                    }}
                  >
                    <div className="relative flex flex-col items-center group cursor-pointer active:scale-95 transition-transform">
                      <span className="absolute -inset-2 rounded-full bg-brand-primary/40 animate-ping" />
                      <div className="w-6.5 h-6.5 rounded-full bg-brand-primary border-2 border-white flex items-center justify-center shadow-md">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[7px] font-bold text-white bg-brand-primary px-1 py-0.5 rounded-md mt-0.5 shadow-md uppercase whitespace-nowrap">
                        {ride.nombre.split(' ')[0]}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })}
          </Map>
        </APIProvider>

        {!conductorOnline && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Radar Apagado</p>
            <p className="text-[10px] text-text-secondary max-w-[200px]">Ponte en línea para activar el rastreador de solicitudes en tiempo real.</p>
          </div>
        )}
      </div>
    </div>
  );
}
