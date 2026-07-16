export interface UserProfile {
  nombre: string;
  telefono: string;
  foto: string;
  uid?: string;
  role?: 'usuario' | 'conductor';
  moto?: string;
  placa?: string;
  pinSeguridad?: string;
  tiempoEstimado?: string;
  calificacion?: string;
}

export interface Recorrido {
  id: string;
  usuarioId: string;
  nombre: string;
  telefono: string;
  dePartida: string;
  coordenadasGoogleMaps: string;
  notas: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'completed' | 'cancelled';
  createdAt: string;
  conductorId?: string;
  conductorNombre?: string;
  conductorTelefono?: string;
  conductorFoto?: string;
  conductorMoto?: string;
  conductorPlaca?: string;
  conductorPinSeguridad?: string;
  conductorTiempoEstimado?: string;
  conductorAfuera?: boolean;
  driverLatOffset?: number;
  driverLonOffset?: number;
  passengerLat?: number;
  passengerLon?: number;
  calificacionPasajero?: number;
  comentarioPasajero?: string;
  calificadoAt?: string;
}

export interface ContactoConfianza {
  nombre: string;
  telefono: string;
  foto: string;
}

export interface ViajeProgramado {
  id: string;
  titulo: string;
  fechaHora: string;
  origen: string;
  notas: string;
  notificado: boolean;
}
