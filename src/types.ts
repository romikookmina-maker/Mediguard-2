export interface Medication {
  id: string;
  name: string;
  dose: string;
  schedule: string; // "Mañana" | "Mediodía" | "Tarde" | "Noche"
  timeStr: string; // e.g. "08:30 AM" or "02:15 PM"
  doctor: string;
  remaining: number;
}

export type DoseStatus = 'pendiente' | 'tomado' | 'retrasado' | 'olvidado';

export interface ActiveDose {
  id: string;
  medId: string;
  name: string;
  dose: string;
  slot: string; // "Mañana" | "Mediodía" | "Tarde" | "Noche"
  scheduledTimeStr: string;
  status: DoseStatus;
  takenAtTime?: string;
  dayOfWeek: string; // E.g. "Lunes", "Sábado"
  dateStr: string; // E.g. "13 Jun"
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  timeLabel: string;
  type: 'take' | 'delay' | 'miss' | 'system' | 'treatment_added';
  title: string;
  details: string;
}

export type ConnectionType = 'bluetooth' | 'wifi' | 'disconnected';

export interface IoTState {
  batteryStatus: number; // 100 | 50 | 15
  connection: ConnectionType;
  doorsOpen: boolean;
  consecutiveStreak: number;
}

export interface AIInsights {
  summary: string;
  risk: string; // "Bajo", "Medio", "Alto"
  pattern: string;
  suggestion: string;
}
