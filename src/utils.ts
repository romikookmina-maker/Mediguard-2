import { Medication, ActiveDose, ActivityEvent, IoTState, AIInsights } from './types';

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformina',
    dose: '500mg • 1 Tableta',
    schedule: 'Mañana',
    timeStr: '08:30 AM',
    doctor: 'Dr. Solís',
    remaining: 24,
  },
  {
    id: 'med-2',
    name: 'Lisinopril',
    dose: '20mg • 1 Tableta',
    schedule: 'Mediodía',
    timeStr: '01:00 PM',
    doctor: 'Dr. Martínez',
    remaining: 18,
  },
  {
    id: 'med-3',
    name: 'Atorvastatina',
    dose: '40mg • 1 Tableta',
    schedule: 'Noche',
    timeStr: '09:00 PM',
    doctor: 'Dra. Sánchez',
    remaining: 12,
  },
];

export const INITIAL_ACTIVE_DOSES: ActiveDose[] = [
  {
    id: 'active-1',
    medId: 'med-1',
    name: 'Metformina',
    dose: '500mg • 1 Tableta',
    slot: 'Mañana',
    scheduledTimeStr: '08:30 AM',
    status: 'pendiente',
    dayOfWeek: 'LUNES',
    dateStr: '13 Jun',
  },
  {
    id: 'active-2',
    medId: 'med-2',
    name: 'Lisinopril',
    dose: '20mg • 1 Tableta',
    slot: 'Mediodía',
    scheduledTimeStr: '01:00 PM',
    status: 'tomado',
    takenAtTime: '08:05 AM',
    dayOfWeek: 'LUNES',
    dateStr: '13 Jun',
  },
  {
    id: 'active-3',
    medId: 'med-3',
    name: 'Atorvastatina',
    dose: '40mg • 1 Tableta',
    slot: 'Noche',
    scheduledTimeStr: '09:00 PM',
    status: 'pendiente',
    dayOfWeek: 'LUNES',
    dateStr: '13 Jun',
  },
];

export const INITIAL_ACTIVITY_LOG: ActivityEvent[] = [
  {
    id: 'act-1',
    timestamp: Date.now() - 1000 * 60 * 60 * 7, // 7 hours ago
    timeLabel: 'Hoy, 08:05 AM',
    type: 'take',
    title: 'Dosis Tomada: Lisinopril',
    details: 'Puntual • Confirmada por sensor de vibración en compartimento 2.',
  },
  {
    id: 'act-2',
    timestamp: Date.now() - 1000 * 60 * 60 * 18, // 18 hours ago
    timeLabel: 'Ayer, 09:00 PM',
    type: 'miss',
    title: 'Alerta: Dosis Omitida',
    details: 'Fin de semana (Atorvastatina, compartimento 3 no detectó apertura).',
  },
  {
    id: 'act-3',
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    timeLabel: 'Viernes, 02:30 PM',
    type: 'system',
    title: 'Dispositivo Reiniciado',
    details: 'Actualización automática de firmware vía Wi-Fi completada con éxito.',
  },
];

/**
 * AI Insights Engine
 * Dynamically evaluates the user's treatment program, interactive history log,
 * and current IoT physical states to output preventively focused clinical suggestions.
 */
export function generateAIInsights(
  activeDoses: ActiveDose[],
  history: ActivityEvent[],
  iot: IoTState
): AIInsights {
  // Count compliance metrics
  const totalEvaluated = history.filter(h => h.type === 'take' || h.type === 'miss' || h.type === 'delay').length;
  const takenCount = history.filter(h => h.type === 'take' || h.type === 'delay').length;
  const missCount = history.filter(h => h.type === 'miss').length;

  const adherencePct = totalEvaluated > 0 ? Math.round((takenCount / totalEvaluated) * 100) : 92;

  // 1. Core Summary Calculation
  let summary = 'Alta adherencia general.';
  if (adherencePct >= 90) {
    summary = 'Alta adherencia general. Nivel de protección óptimo.';
  } else if (adherencePct >= 75) {
    summary = 'Adherencia intermedia. Se observa una leve inestabilidad.';
  } else {
    summary = 'Adherencia crítica en tratamiento. Requiere supervisión médica.';
  }

  // 2. Risk Level Evaluation
  let risk = 'Bajo';
  if (adherencePct < 75 || iot.batteryStatus === 15 || iot.connection === 'disconnected') {
    risk = 'Alto';
  } else if (adherencePct < 85 || missCount >= 2) {
    risk = 'Medio';
  }

  // 3. Pattern Detection Logic based on events
  let pattern = 'Olvidos leves localizados en fines de semana.';
  const hasWeekendOmission = history.some(
    h => h.type === 'miss' && (h.details.toLowerCase().includes('fin de semana') || h.title.toLowerCase().includes('sábado') || h.title.toLowerCase().includes('viernes'))
  );

  if (iot.connection === 'disconnected') {
    pattern = 'Pérdida de enlace local de datos. No se pueden subir registros al servidor.';
  } else if (hasWeekendOmission) {
    pattern = 'Tiene un 25% más de probabilidad de olvidar la dosis del viernes o sábado por la noche.';
  } else if (missCount > 0) {
    pattern = `Inconstancia ligera detectada durante las últimas ${totalEvaluated} tomas examinadas.`;
  } else {
    pattern = 'Patrón estable excelente. Sin anomalías horarias o cognitivas.';
  }

  // 4. Actionable Suggestions
  let suggestion = '"Se sugiere programar recordatorios de voz adicionales para los sábados a las 9:00 AM."';
  if (iot.batteryStatus === 15) {
    suggestion = '"Alerta de batería crítica (15%). Se sugiere conectar el alimentador del cargador en las próximas 2 horas."';
  } else if (iot.connection === 'disconnected') {
    suggestion = '"Asegure que Bluetooth esté activado en su teléfono celular para restablecer el canal de alertas críticas del cuidador."';
  } else if (hasWeekendOmission) {
    suggestion = '"Se sugiere adelantar la alarma de Atorvastatina 15 minutos en fines de semana antes de que salga del domicilio."';
  } else if (adherencePct >= 95) {
    suggestion = '"Adherencia ejemplar. Mantenga su racha consecutiva de tomas actual para fortalecer la eficacia terapéutica."';
  }

  return {
    summary,
    risk,
    pattern,
    suggestion,
  };
}
