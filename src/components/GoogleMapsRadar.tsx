import React, { useState } from "react";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow 
} from "@vis.gl/react-google-maps";
import { 
  Bike, 
  User, 
  MapPin, 
  Compass, 
  SlidersHorizontal,
  Layers,
  Activity,
  Info
} from "lucide-react";
import { Recorrido } from "../types";

interface GoogleMapsRadarProps {
  recorridosActivos: Recorrido[];
  conductoresCercanos: {
    id: string;
    nombre: string;
    moto: string;
    placa: string;
    latOffset: number;
    lonOffset: number;
  }[];
  usuarioActual: {
    nombre: string;
    telefono: string;
    foto?: string;
  };
}

// Neiva, Colombia coordinates
const NEIVA_CENTER = { lat: 2.9273, lng: -75.28189 };

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "" && API_KEY !== "YOUR_API_KEY";

export default function GoogleMapsRadar({
  recorridosActivos,
  conductoresCercanos,
  usuarioActual
}: GoogleMapsRadarProps) {
  const [selectedElement, setSelectedElement] = useState<{
    type: "driver" | "passenger";
    id: string;
    name: string;
    subtitle: string;
    extra?: string;
    lat: number;
    lng: number;
  } | null>(null);

  const [filterType, setFilterType] = useState<"all" | "drivers" | "passengers">("all");

  // Filter pending active passenger requests
  const activePassengers = recorridosActivos.filter(r => r.status === "pending");

  // Fallback interactive rendering in case the user does not have a Google Maps API key yet
  if (!hasValidKey) {
    return (
      <div className="bg-bg-dark border border-white/10 rounded-3xl overflow-hidden shadow-xl mt-4 flex flex-col relative select-none">
        {/* Decorative top strip */}
        <div className="bg-gradient-to-r from-brand-primary via-orange-500 to-amber-500 h-[3px] w-full" />
        
        {/* API Key Instructions */}
        <div className="p-5 bg-white/5 border-b border-white/10 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Info className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            Se requiere API Key de Google Maps
          </h4>
          <p className="text-[10px] text-text-secondary mt-1 max-w-md mx-auto">
            Para ver el mapa real conectado a Google Maps Platform con tus coordenadas satelitales, por favor agrega tu API Key.
          </p>
          <div className="mt-3 text-left bg-black/40 border border-white/5 p-3 rounded-xl text-[9px] text-text-secondary space-y-1.5 max-w-sm mx-auto font-mono">
            <p className="text-white font-bold mb-1">Pasos para activar:</p>
            <p>1. Consigue tu API Key en la consola de Google Cloud.</p>
            <p>2. Abre <span className="text-brand-primary">Ajustes (icono de engranaje ⚙️ arriba a la derecha)</span>.</p>
            <p>3. Selecciona <span className="text-brand-primary">Secrets</span>, ingresa <code className="text-white">GOOGLE_MAPS_PLATFORM_KEY</code> y pega tu llave.</p>
            <p>4. El aplicativo se compilará automáticamente en tiempo real.</p>
          </div>
        </div>

        {/* Fallback Simulation Visual Map */}
        <div className="relative bg-[#070b12] h-[250px] flex items-center justify-center">
          <div className="absolute inset-0 opacity-15 flex flex-col items-center justify-center p-4">
            <div className="w-40 h-40 rounded-full border border-brand-primary/20 animate-pulse flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-orange-500/20 flex items-center justify-center">
                <Compass className="w-8 h-8 text-white/30 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
            </div>
          </div>
          
          <div className="z-10 text-center px-4">
            <span className="text-[9px] font-mono font-bold tracking-widest text-brand-primary uppercase block mb-1">
              Modo Simulado Activo
            </span>
            <p className="text-xs text-white font-bold">
              Conductores cercanos: {conductoresCercanos.length} • Solicitudes: {activePassengers.length}
            </p>
            <p className="text-[10px] text-text-secondary mt-1 max-w-xs">
              Los conductores conectados verán aquí el mapa interactivo de Neiva, Huila con todas las rutas una vez configurado el servicio de mapas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark border border-white/10 rounded-3xl overflow-hidden shadow-xl mt-4 flex flex-col relative select-none">
      {/* Decorative top strip */}
      <div className="bg-gradient-to-r from-emerald-500 via-brand-primary to-amber-500 h-[3px] w-full" />

      {/* Header with status */}
      <div className="p-4 bg-white/5 border-b border-white/5 flex flex-wrap justify-between items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h4 className="font-display text-xs font-black text-white uppercase tracking-wider">
              Google Maps Radar Conductor
            </h4>
          </div>
          <p className="text-[9px] text-text-secondary font-mono tracking-widest mt-0.5 uppercase">
            Satelital en Tiempo Real • Neiva
          </p>
        </div>

        {/* View filters */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg text-[9px] font-bold">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${filterType === "all" ? "bg-brand-primary text-white" : "text-text-secondary hover:text-white"}`}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => setFilterType("drivers")}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${filterType === "drivers" ? "bg-brand-primary text-white" : "text-text-secondary hover:text-white"}`}
          >
            Otros Pilotos ({conductoresCercanos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("passengers")}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${filterType === "passengers" ? "bg-brand-primary text-white" : "text-text-secondary hover:text-white"}`}
          >
            Servicios ({activePassengers.length})
          </button>
        </div>
      </div>

      {/* Google Maps View */}
      <div className="relative bg-black h-[350px]">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={NEIVA_CENTER}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "350px" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {/* 1. Render Passenger Requests as Advanced Markers */}
            {(filterType === "all" || filterType === "passengers") &&
              activePassengers.map((ride) => {
                const lat = ride.passengerLat || (NEIVA_CENTER.lat + (Math.random() - 0.5) * 0.01);
                const lng = ride.passengerLon || (NEIVA_CENTER.lng + (Math.random() - 0.5) * 0.01);

                return (
                  <AdvancedMarker
                    key={ride.id}
                    position={{ lat, lng }}
                    onClick={() => {
                      setSelectedElement({
                        type: "passenger",
                        id: ride.id,
                        name: ride.nombre,
                        subtitle: `📍 Origen: ${ride.dePartida}`,
                        extra: ride.notas ? `💬 "${ride.notas}"` : "Sin notas adicionales",
                        lat,
                        lng
                      });
                    }}
                  >
                    {/* Custom Styled Passenger Marker with explicit dimension */}
                    <div className="w-10 h-10 flex items-center justify-center relative cursor-pointer">
                      <span className="absolute inset-0 bg-brand-primary/30 rounded-full animate-ping" />
                      <div className="w-8 h-8 rounded-full bg-brand-primary border-2 border-white flex items-center justify-center shadow-lg text-white">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* 2. Render Nearby Drivers as Advanced Markers */}
            {(filterType === "all" || filterType === "drivers") &&
              conductoresCercanos.map((driver) => {
                const lat = NEIVA_CENTER.lat + driver.latOffset;
                const lng = NEIVA_CENTER.lng + driver.lonOffset;

                return (
                  <AdvancedMarker
                    key={driver.id}
                    position={{ lat, lng }}
                    onClick={() => {
                      setSelectedElement({
                        type: "driver",
                        id: driver.id,
                        name: driver.nombre,
                        subtitle: `🏍️ Moto: ${driver.moto}`,
                        extra: `Placa: ${driver.placa} • Piloto de Confianza`,
                        lat,
                        lng
                      });
                    }}
                  >
                    {/* Custom Styled Driver Marker with explicit dimension */}
                    <div className="w-10 h-10 flex items-center justify-center relative cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg text-white">
                        <Bike className="w-4 h-4" />
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* Render selected marker details inside Google Maps InfoWindow */}
            {selectedElement && (
              <InfoWindow
                position={{ lat: selectedElement.lat, lng: selectedElement.lng }}
                onCloseClick={() => setSelectedElement(null)}
              >
                <div className="p-2 text-black max-w-[200px]">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                    {selectedElement.type === "passenger" ? "Cliente Solicitando" : "Conductor de confianza"}
                  </span>
                  <h5 className="font-bold text-xs mt-0.5 text-gray-900">{selectedElement.name}</h5>
                  <p className="text-[10px] text-gray-700 mt-1">{selectedElement.subtitle}</p>
                  {selectedElement.extra && (
                    <p className="text-[9px] font-mono text-brand-primary mt-1 font-bold">{selectedElement.extra}</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Mini info overlay beneath the map */}
      <div className="p-3 bg-white/5 border-t border-white/5 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="text-[10px] text-text-secondary">
          <span className="text-white font-bold">Monitoreo Activo:</span> Toca cualquier ícono de conductor o pasajero en el mapa para visualizar detalles, ruta e iniciar el servicio directamente.
        </div>
      </div>
    </div>
  );
}
