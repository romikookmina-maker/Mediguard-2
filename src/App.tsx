import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Settings, 
  Layers, 
  User, 
  Clock, 
  Bell, 
  Wifi, 
  WifiOff, 
  Bluetooth, 
  Battery, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  FileText, 
  Plus, 
  RotateCcw, 
  UserCheck, 
  Info, 
  Calendar, 
  CornerDownRight,
  Download,
  Volume2,
  VolumeX,
  Play,
  LayoutGrid,
  Cpu,
  ShieldCheck,
  Brain,
  MessageSquare
} from 'lucide-react';

import { Medication, ActiveDose, ActivityEvent, ConnectionType, IoTState, DoseStatus } from './types';
import { INITIAL_MEDICATIONS, INITIAL_ACTIVE_DOSES, INITIAL_ACTIVITY_LOG, generateAIInsights } from './utils';

export default function App() {
  // --- STATE SYSTEM ---
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [activeDoses, setActiveDoses] = useState<ActiveDose[]>(INITIAL_ACTIVE_DOSES);
  const [historyLog, setHistoryLog] = useState<ActivityEvent[]>(INITIAL_ACTIVITY_LOG);
  
  // Navigation
  const [currentProfile, setCurrentProfile] = useState<'senior' | 'caregiver'>('senior');
  const [caregiverTab, setCaregiverTab] = useState<'meds' | 'health' | 'alerts' | 'family'>('health');
  
  // IoT Telemetry State
  const [iotState, setIotState] = useState<IoTState>({
    batteryStatus: 100,
    connection: 'wifi',
    doorsOpen: false,
    consecutiveStreak: 5
  });

  // Active alarms & voice speaker configuration
  const [isAlarmTriggered, setIsAlarmTriggered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [alarmIntervalId, setAlarmIntervalId] = useState<any>(null);
  const [selectedMedAlarm, setSelectedMedAlarm] = useState<ActiveDose | null>(null);

  // Form inputs for new medication
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('1 Tableta');
  const [newMedMg, setNewMedMg] = useState('500mg');
  const [newMedSchedule, setNewMedSchedule] = useState<'Mañana' | 'Mediodía' | 'Tarde' | 'Noche'>('Mañana');
  const [newMedTime, setNewMedTime] = useState('08:30 AM');
  const [newMedDoctor, setNewMedDoctor] = useState('Dr. Ramos');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Export PDF Modal
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Success Confirmation Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Digital Clock State
  const [time, setTime] = useState<Date>(new Date());

  // --- AUDIO SYNTHESIS & VOICE REMINDERS ---
  // Generate high-grade diagnostic electronic chime
  const playElectronicChime = () => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(587.33, 0, 0.2); // D5
      playTone(659.25, 0.2, 0.2); // E5
      playTone(880.00, 0.4, 0.4); // A5
    } catch (e) {
      console.warn("Web Audio API blocked or not supported on this device/frame context.", e);
    }
  };

  // Play continuous alarm chime loop when triggered
  useEffect(() => {
    if (isAlarmTriggered) {
      playElectronicChime();
      const interval = setInterval(() => {
        playElectronicChime();
        // Speak voice reminder if support exists
        if (selectedMedAlarm) {
          speakReminders(`Atención. Es hora de tomar su dosis de ${selectedMedAlarm.slot}. Por favor tome su tableta de ${selectedMedAlarm.name}.`);
        }
      }, 4500);
      setAlarmIntervalId(interval);
      return () => clearInterval(interval);
    } else {
      if (alarmIntervalId) {
        clearInterval(alarmIntervalId);
        setAlarmIntervalId(null);
      }
    }
  }, [isAlarmTriggered, isMuted, selectedMedAlarm]);

  // Voice reminders using Web Speech API
  const speakReminders = (text: string) => {
    if (isMuted) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech Synthesis blocked in internal sandbox context or unsupported.", e);
    }
  };

  // Trigger clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show automatic temporary toast notifications
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- ACTIONS & SIMULATION EVENTS ---
  // 1. Simulate pill taken successfully
  const handlePillTaken = (doseId?: string) => {
    // Find dosage
    const activeId = doseId || selectedMedAlarm?.id || activeDoses.find(d => d.status === 'pendiente')?.id;
    if (!activeId) {
      triggerToast("No hay medicamentos pendientes programados para tomar ahora.");
      return;
    }

    // Stop active alarms
    setIsAlarmTriggered(false);

    // Update active doses list
    setActiveDoses(prev => prev.map(dose => {
      if (dose.id === activeId) {
        return {
          ...dose,
          status: 'tomado',
          takenAtTime: time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
      }
      return dose;
    }));

    // Find the medicine source name
    const completedDose = activeDoses.find(d => d.id === activeId);
    const medName = completedDose ? completedDose.name : 'Medicamento';
    const medDose = completedDose ? completedDose.dose : '1 Tableta';

    // Register inside Activity Log
    const newEvent: ActivityEvent = {
      id: `act-taken-${Date.now()}`,
      timestamp: Date.now(),
      timeLabel: `Hoy, ${time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      type: 'take',
      title: `Dosis Tomada: ${medName}`,
      details: `Puntual • Tomado por el paciente. Confirmado por el sensor del compartimento del pastillero inteligente.`
    };
    
    setHistoryLog(prev => [newEvent, ...prev]);

    // Increase steak
    setIotState(prev => ({
      ...prev,
      consecutiveStreak: prev.consecutiveStreak + 1
    }));

    triggerToast(`¡Medicación registrada! Dosis de ${medName} confirmada correctamente.`);
    speakReminders(`Muchas gracias. He registrado que ha tomado su dosis de ${medName}.`);
  };

  // 2. Simulate Compartment physical opening (testing tool)
  const simulateManualApertura = () => {
    // Find if there is an active alarm or if there's any pending medicine
    const pendingDose = activeDoses.find(d => d.status === 'pendiente');
    
    const formattedTime = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    if (isAlarmTriggered && selectedMedAlarm) {
      // Taking of the active alarm
      handlePillTaken(selectedMedAlarm.id);
      return;
    }

    if (pendingDose) {
      // Take the current pending dose, identify if it is "A tiempo" or "Retrasado" based on some simulated rules
      // For nice illustration, let's say: if we have more than 1 take already completed, let's mark it as Delay
      const takenPills = activeDoses.filter(d => d.status === 'tomado').length;
      const isDelayed = takenPills > 0; // Simulate delayed capture
      
      setActiveDoses(prev => prev.map(d => {
        if (d.id === pendingDose.id) {
          return {
            ...d,
            status: isDelayed ? 'retrasado' : 'tomado',
            takenAtTime: formattedTime
          };
        }
        return d;
      }));

      const newEvent: ActivityEvent = {
        id: `act-apertura-${Date.now()}`,
        timestamp: Date.now(),
        timeLabel: `Hoy, ${formattedTime}`,
        type: isDelayed ? 'delay' : 'take',
        title: isDelayed ? `Toma Retrasada: ${pendingDose.name}` : `Dosis Tomada: ${pendingDose.name}`,
        details: isDelayed 
          ? `Completo con retraso (35 minutos de demora). Alerta de recordatorio desactivada desde panel físico.`
          : `Puntual • Apertura detectada físicamente. El micro-sensor magnético registró la extracción exitosa.`
      };

      setHistoryLog(prev => [newEvent, ...prev]);
      
      setIotState(prev => ({
        ...prev,
        consecutiveStreak: prev.consecutiveStreak + (isDelayed ? 0 : 1),
        doorsOpen: true
      }));

      // Auto close door sensory feedback 2 seconds later
      setTimeout(() => {
        setIotState(prev => ({ ...prev, doorsOpen: false }));
      }, 2000);

      triggerToast(`Apertura física simulada. Dosis de ${pendingDose.name} registrada.`);
    } else {
      // No pending doses, make a general hardware opening log
      const newEvent: ActivityEvent = {
        id: `act-sys-open-${Date.now()}`,
        timestamp: Date.now(),
        timeLabel: `Hoy, ${formattedTime}`,
        type: 'system',
        title: 'Apertura de Compartimento',
        details: 'Apertura de mantenimiento fuera de hora de dosis correspondiente. Las compuertas se volvieron a cerrar.'
      };
      setHistoryLog(prev => [newEvent, ...prev]);
      triggerToast("Apertura física registrada (Fuera de hora de tratamiento).");
    }
  };

  // 3. Simulate pill Missed/Forgotten (Testing Tool)
  const simulateOlvido = () => {
    // Find next pending slot or random drug and forcefully mark it missed
    const pendingDose = activeDoses.find(d => d.status === 'pendiente');
    const targetDose = pendingDose || activeDoses[0];

    if (!targetDose) {
      triggerToast("No hay dosis programadas para forzar desvío.");
      return;
    }

    setActiveDoses(prev => prev.map(d => {
      if (d.id === targetDose.id) {
        return {
          ...d,
          status: 'olvidado'
        };
      }
      return d;
    }));

    const formattedTime = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newEvent: ActivityEvent = {
      id: `act-missed-${Date.now()}`,
      timestamp: Date.now(),
      timeLabel: `Hoy, ${formattedTime}`,
      type: 'miss',
      title: `Alerta: Dosis Omitida (${targetDose.name})`,
      details: `Vencimiento de intervalo de aviso. Se consolidó como olvidada por el paciente en el horario de ${targetDose.slot}.`
    };

    setHistoryLog(prev => [newEvent, ...prev]);

    // Reset streak to 0
    setIotState(prev => ({
      ...prev,
      consecutiveStreak: 0
    }));

    triggerToast(`Alerta: Se ha simulado un olvido crítico para ${targetDose.name}.`);
    speakReminders(`Alerta de cuidado: Se ha registrado la omisión del medicamento ${targetDose.name}.`);
  };

  // 4. Force/Simulate Active Pill Reminder Alarm (Testing Tool option)
  const forceTriggerAlarm = (slotDose?: ActiveDose) => {
    // Select first pending medicine
    const pending = slotDose || activeDoses.find(d => d.status === 'pendiente') || activeDoses[0];
    if (!pending) {
      triggerToast("No hay dosis listas para simular la alarma.");
      return;
    }

    setSelectedMedAlarm(pending);
    setIsAlarmTriggered(true);
    triggerToast(`¡Alerta Activa! Iniciando alarma visual/audible para ${pending.name}.`);
    speakReminders(`Es hora de su medicina. Por favor tome su dosis de ${pending.name}.`);
  };

  // 5. Submit Medication Form
  const handleAddNewMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) {
      triggerToast("Por favor escriba el nombre del medicamento.");
      return;
    }

    const medId = `med-${Date.now()}`;
    const newMed: Medication = {
      id: medId,
      name: newMedName,
      dose: `${newMedMg} • ${newMedDose}`,
      schedule: newMedSchedule,
      timeStr: newMedTime,
      doctor: newMedDoctor,
      remaining: 30
    };

    setMedications(prev => [...prev, newMed]);

    // Add to Active Doses Agenda for today
    const newActiveDose: ActiveDose = {
      id: `active-${Date.now()}`,
      medId: medId,
      name: newMedName,
      dose: `${newMedMg} • ${newMedDose}`,
      slot: newMedSchedule,
      scheduledTimeStr: newMedTime,
      status: 'pendiente',
      dayOfWeek: 'LUNES',
      dateStr: '13 Jun'
    };

    setActiveDoses(prev => [...prev, newActiveDose]);

    // Register Event
    const formattedTime = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newEvent: ActivityEvent = {
      id: `act-add-${Date.now()}`,
      timestamp: Date.now(),
      timeLabel: `Hoy, ${formattedTime}`,
      type: 'treatment_added',
      title: 'Tratamiento Incorporado',
      details: `${newMedName} (${newMedMg}) recetado por ${newMedDoctor} agregado a la agenda diaria de dosis.`
    };
    
    setHistoryLog(prev => [newEvent, ...prev]);

    // Reset form states
    setNewMedName('');
    setIsFormOpen(false);
    triggerToast(`¡Medicamento agregado! ${newMedName} incluido en la agenda.`);
  };

  // Calculate Compliance/Adherence percentage based on history
  const totalEvaluated = historyLog.filter(h => h.type === 'take' || h.type === 'miss' || h.type === 'delay').length;
  const takenCount = historyLog.filter(h => h.type === 'take' || h.type === 'delay').length;
  const adherencePct = totalEvaluated > 0 ? Math.round((takenCount / totalEvaluated) * 100) : 92;

  // Render correct visual color code depending on compliance rate
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-secondary dark:text-emerald-400';
    if (score >= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  const getComplianceBg = (score: number) => {
    if (score >= 90) return 'bg-secondary text-white';
    if (score >= 75) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getComplianceStrokeColor = (score: number) => {
    if (score >= 90) return '#006e2f'; // Primary green
    if (score >= 75) return '#d97706'; // Amber-600
    return '#ba1a1a'; // Red error
  };

  // AI preventative insights generator
  const aiInsights = generateAIInsights(activeDoses, historyLog, iotState);

  // Apply Suggestion auto action
  const handleApplySuggestion = () => {
    // Adjust Atorvastatina or upcoming doses inside state
    triggerToast("Aplicando sugerencia de IA: Horario de fin de semana reprogramado a las 08:45 PM (+15 minutos antes). Alarma reajustada.");
    const formattedTime = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newEvent: ActivityEvent = {
      id: `act-ai-apply-${Date.now()}`,
      timestamp: Date.now(),
      timeLabel: `Hoy, ${formattedTime}`,
      type: 'system',
      title: 'IA: Horario Sincronizado',
      details: 'Sugerencia preventiva aplicada. Desplazamiento inteligente de hora de alarma de Metformina / Atorvastatina para compensar fatiga cognitiva de fines de semana.'
    };
    setHistoryLog(prev => [newEvent, ...prev]);
  };

  // --- RENDERING PARSER ---
  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col transition-colors duration-200">
      
      {/* GLOBAL TOAST BANNER */}
      {toastMessage && (
        <div id="toast" className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-2xl shadow-2xl border border-outline flex items-center gap-3 font-semibold text-lg fade-in">
          <Info className="w-6 h-6 text-emerald-400 animate-bounce flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-3 hover:text-red-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}



      {/* ACTIVE SCREEN SENSORY ALARM MODAL OVERLAY */}
      {isAlarmTriggered && selectedMedAlarm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 alarm-pulse">
          <div className="bg-white rounded-[40px] border-8 border-error shadow-2xl p-8 max-w-lg w-full text-center flex flex-col gap-6 fade-in">
            <div className="flex justify-between items-center bg-red-100 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
                <span className="font-bold text-xl uppercase font-senior">ALERTA DE DOSIS</span>
              </div>
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="p-2 bg-white rounded-full border border-red-300 hover:bg-red-50 text-red-700"
                title={isMuted ? "Activar Sonido" : "Silenciar Voz"}
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>

            <div className="py-4">
              <span className="bg-red-500 text-white font-bold tracking-widest uppercase px-6 py-2 rounded-full text-lg">
                Dosis de la {selectedMedAlarm.slot}
              </span>
              <h2 className="text-5xl font-black text-on-background mt-6 tracking-tight font-senior">
                {selectedMedAlarm.name}
              </h2>
              <p className="text-3xl font-extrabold text-red-600 mt-2">
                {selectedMedAlarm.dose}
              </p>
              <div className="bg-red-50 p-4 rounded-3xl mt-6 border-2 border-red-200 flex items-center justify-center gap-3">
                <Clock className="w-6 h-6 text-red-600 animate-spin-slow" />
                <span className="font-bold text-xl text-red-800">
                  Programado: {selectedMedAlarm.scheduledTimeStr}
                </span>
              </div>
            </div>

            <button
              id="btn-take-alarm"
              onClick={() => handlePillTaken(selectedMedAlarm.id)}
              className="w-full bg-emerald-600 border-b-8 border-emerald-800 hover:bg-emerald-500 text-white h-[90px] rounded-3xl flex items-center justify-center gap-4 shadow-xl active:translate-y-2 transition-all font-senior font-extrabold text-2xl active-press cursor-pointer"
            >
              <CheckCircle className="w-8 h-8 whitespace-nowrap fill-emerald-100 text-white flex-shrink-0" />
              <span className="tracking-wide text-white">MEDICAMENTO TOMADO</span>
            </button>

            <button
              onClick={() => {
                setIsAlarmTriggered(false);
                triggerToast("Alarma pausada temporalmente por 1 minuto.");
              }}
              className="text-gray-500 hover:text-gray-800 font-bold underline text-lg"
            >
              Omitir / Recordar más tarde
            </button>
          </div>
        </div>
      )}

      {/* CORE APP LAYOUT BODY */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* ======================================================= */}
        {/* MAIN USER VIEWPORT (SENIOR vs CAREGIVER) */}
        {/* ======================================================= */}
        <div className="flex-1 flex flex-col pb-12">
          
          {currentProfile === 'senior' ? (
            /* 1. SENIOR VIEWPORT (ULTRA ACCESSIBLE) */
            <div className="flex-1 flex flex-col p-6 gap-6 max-w-2xl mx-auto w-full fade-in">
              
              {/* Massive Senior Header */}
              <header className="bg-surface rounded-3xl border-4 border-outline-variant shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row justify-between items-center p-5 z-20 gap-4">
                <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
                  <Heart className="w-12 h-12 text-primary animate-pulse-slow fill-current flex-shrink-0" />
                  <div className="flex flex-col text-center lg:text-left">
                    <span className="font-bold text-4xl text-primary font-senior tracking-tight leading-none mb-1">MediGuard</span>
                    <span className="text-sm font-semibold tracking-wide text-primary/80 uppercase">Pastillero Inteligente</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  {/* Cambiar perfil para acceso de cuido */}
                  <button
                    id="btn-switch-caregiver"
                    onClick={() => {
                      setCurrentProfile('caregiver');
                      triggerToast("Cambiado a Interfaz Dashboard de Cuidador - Métricas avanzadas.");
                    }}
                    className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-blue-200 px-5 py-2.5 rounded-2xl text-base font-extrabold font-senior transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <UserCheck className="w-5 h-5 text-blue-700" />
                    <span className="text-blue-950">Administrar (Cuidador)</span>
                  </button>

                  {/* Connection Widget responsive */}
                  <div className={`w-full sm:w-auto justify-center flex items-center gap-2 ${iotState.connection === 'disconnected' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-secondary-container border-on-secondary-container text-on-secondary-container'} px-4 py-[9px] rounded-2xl border-2 font-bold`}>
                    {iotState.connection === 'wifi' && <Wifi className="w-6 h-6 animate-pulse" />}
                    {iotState.connection === 'bluetooth' && <Bluetooth className="w-6 h-6 animate-pulse" />}
                    {iotState.connection === 'disconnected' && <WifiOff className="w-6 h-6" />}
                    <span className="text-[15px] uppercase tracking-wider">
                      {iotState.connection === 'disconnected' ? 'Sin Conexión' : 'VINCULADO'}
                    </span>
                  </div>
                </div>
              </header>

              {/* Dynamic Giant Live Clock Card */}
              <div className="text-center py-6 bg-surface-container-low rounded-[32px] border-4 border-outline-variant shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] flex flex-col items-center">
                <h1 className="font-senior font-extrabold text-7xl text-primary leading-tight">
                  {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                </h1>
                <p className="font-senior font-bold text-3xl text-on-surface-variant uppercase tracking-widest mt-2">
                  {['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'][time.getDay()]} {time.getDate()} DE JUNIO
                </p>
                {isAlarmTriggered && (
                  <div className="mt-4 bg-red-100 text-red-700 px-6 py-2 rounded-full border border-red-300 animate-bounce flex items-center gap-2 font-bold text-lg">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                    ¡ALERTA DE MEDICINA ACTIVA!
                  </div>
                )}
              </div>

              {/* ACTIVE MEDICATION HERO SCREEN */}
              {activeDoses.some(d => d.status === 'pendiente') ? (
                (() => {
                  const upcoming = activeDoses.find(d => d.status === 'pendiente')!;
                  return (
                    <section className="flex-1 flex flex-col">
                      <div className="bg-secondary-container flex-1 rounded-[40px] border-4 border-on-secondary-container shadow-[8px_8px_0px_0px_rgba(0,110,47,1)] flex flex-col overflow-hidden">
                        
                        {/* Current Slot Timing Banner */}
                        <div className="bg-on-secondary-container text-white py-4 text-center">
                          <span className="font-senior font-extrabold text-3xl tracking-widest uppercase">
                            SIGUIENTE COMPARTIMENTO: {upcoming.slot}
                          </span>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5">
                          {/* Image Box */}
                          <div className="w-48 h-48 rounded-full border-8 border-white bg-white shadow-xl flex items-center justify-center overflow-hidden relative group">
                            <img 
                              alt="Medication pill" 
                              className="w-full h-full object-cover" 
                              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeTqjljujxR0iD-Dqkw0p3oUWGqsCKiABqHDMcNc7x0pvEkVLEyvgR5ZQ1stoEkuLY9VsF-1mNNko0mrq2xQsdBmtSj5D1satA0veS07yYKCNOZIsp8jUbnqULDqwDCGZAQ9v-fmOrePwg9gOZeqz4yezfq2Bn6W9BJzxyr7lJqYVC7yQQA5HL-ONABERmhWekb8SEa3UN6ZWOV-x7NIC_PMjtdB4tT9KHvml9BuXwUfA28txR4ZIyyI2NMUx3TbswvYAtmKgqiaw"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="font-bold text-xs uppercase bg-black/60 px-3 py-1 rounded-full">Zoom Pill</span>
                            </div>
                          </div>

                          <div>
                            <h2 className="font-senior font-extrabold text-5xl text-on-secondary-container mb-1">
                              {upcoming.name}
                            </h2>
                            <p className="text-3xl font-extrabold text-on-secondary-fixed-variant">
                              {upcoming.dose}
                            </p>
                            <p className="text-xl font-bold text-gray-700 mt-2 bg-white/40 px-4 py-1 rounded-full inline-block">
                              Hora recomendada: {upcoming.scheduledTimeStr}
                            </p>
                          </div>
                        </div>

                      </div>
                    </section>
                  );
                })()
              ) : (
                <div className="flex-1 bg-green-50 rounded-[40px] border-4 border-secondary shadow-[8px_8px_0px_0px_rgba(0,110,47,0.5)] p-8 text-center flex flex-col justify-center items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                    <CheckCircle className="w-16 h-16 fill-current" />
                  </div>
                  <h2 className="text-4xl font-extrabold text-secondary font-senior">
                    ¡Dosis Completadas por Hoy!
                  </h2>
                  <p className="text-xl text-gray-700 font-semibold max-w-md">
                    Buen trabajo. Ha cumplido con todas las tomas marcadas en su agenda. El dispensador emitirá alertas para sus cargas de mañana.
                  </p>
                  <div className="bg-white px-6 py-2 rounded-2xl border border-secondary shadow-sm mt-3">
                    <span className="text-gray-500 font-bold">Racha actual consecutiva:</span>
                    <span className="text-secondary font-black text-2xl ml-2">🔥 {iotState.consecutiveStreak} días</span>
                  </div>
                </div>
              )}

              {/* Footer Big Buttons */}
              <div className="flex flex-col gap-4 mt-auto w-full">
                <button
                  id="btn-senior-taken"
                  onClick={() => handlePillTaken()}
                  className="active-press w-full bg-emerald-600 border-b-8 border-emerald-800 hover:bg-emerald-500 text-white h-[84px] sm:h-[96px] rounded-3xl flex items-center justify-center gap-3 sm:gap-4 shadow-xl transition-all font-senior font-extrabold text-xl sm:text-2xl px-4 active-press cursor-pointer"
                >
                  <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 fill-emerald-100 text-white flex-shrink-0" />
                  <span className="truncate tracking-wide text-white">MEDICAMENTO TOMADO</span>
                </button>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <button
                    id="btn-senior-to-history"
                    onClick={() => {
                      setCurrentProfile('caregiver');
                      setCaregiverTab('alerts');
                      triggerToast("Navegando al Historial completo en Vista Cuidador.");
                    }}
                    className="active-press bg-primary text-white h-[64px] sm:h-[76px] rounded-2xl border-b-4 border-on-primary-fixed-variant flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm font-bold text-sm sm:text-lg px-2 active-press cursor-pointer hover:bg-primary/95"
                  >
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>HISTORIAL</span>
                  </button>

                  <button
                    id="btn-senior-to-settings"
                    onClick={() => {
                      setCurrentProfile('caregiver');
                      setCaregiverTab('meds');
                      triggerToast("Accediendo a Perfil de Tratamiento en Vista Cuidador.");
                    }}
                    className="active-press bg-outline text-on-surface h-[64px] sm:h-[76px] rounded-2xl border-b-4 border-on-surface-variant flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm font-bold text-sm sm:text-lg px-2 active-press cursor-pointer hover:bg-gray-200"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>AJUSTES / MEDS</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* 2. CAREGIVER ADVANCED DASHBOARD VIEWPORT */
            <div className="flex-1 flex flex-col p-6 gap-6 max-w-6xl mx-auto w-full fade-in font-sans">
              
              {/* Caregiver Header */}
              <header className="bg-surface rounded-2xl border border-outline-variant shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 gap-4">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-10 h-10 text-primary flex-shrink-0" />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">MediGuard Pro Dashboard</h1>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Consola Clínica de Monitoreo</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Battery Widget */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${iotState.batteryStatus <= 15 ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    <Battery className={`w-5 h-5 ${iotState.batteryStatus <= 15 ? 'text-red-600 fill-current' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold">Batería: {iotState.batteryStatus}%</span>
                  </div>

                  {/* Device Sync Status Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${iotState.connection === 'disconnected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-secondary border-green-200'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${iotState.connection === 'disconnected' ? 'bg-red-500' : 'bg-secondary animate-ping'}`} />
                    <span className="text-xs font-bold uppercase">
                      {iotState.connection === 'disconnected' ? 'Sin Enlace' : `IoT:<sup>${iotState.connection}</sup>`}
                    </span>
                  </div>

                  <button 
                    onClick={() => setIsExportOpen(true)}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-primary/95 transition-all shadow-sm active-press cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar</span>
                  </button>

                  <button
                    id="btn-switch-senior"
                    onClick={() => {
                      setCurrentProfile('senior');
                      triggerToast("Cambiado a Interfaz Mayor (Senior View) - Legibilidad máxima.");
                    }}
                    className="bg-secondary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-secondary/95 transition-all shadow-sm active-press cursor-pointer shadow-md active:scale-95"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Ir a Modo Senior</span>
                  </button>
                </div>
              </header>

              {/* Sub-navigation Tabs */}
              <div className="flex border-b border-outline-variant gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCaregiverTab('health')}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${caregiverTab === 'health' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Panel Analítico & Adherencia</span>
                </button>
                <button
                  onClick={() => setCaregiverTab('meds')}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${caregiverTab === 'meds' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Tratamiento y Medicinas ({medications.length})</span>
                </button>
                <button
                  onClick={() => setCaregiverTab('alerts')}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${caregiverTab === 'alerts' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Registro de Actividad ({historyLog.length})</span>
                </button>
                <button
                  onClick={() => setCaregiverTab('family')}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${caregiverTab === 'family' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Contacto Familiar & Alertas</span>
                </button>
              </div>

              {/* TAB CONTENTS */}
              <div className="flex-1">

                {/* TAB 1: HEALTH PANEL & ADHERENCE */}
                {caregiverTab === 'health' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 fade-in">
                    
                    {/* Left Column: Ring Progress & Graph */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                      
                      {/* Metric Circle Card */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant flex flex-col md:flex-row items-center gap-8">
                        
                        {/* Radial Compliance ring with dynamic color */}
                        <div className="relative w-44 h-44 flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            {/* Background circle track */}
                            <circle 
                              className="text-gray-100" 
                              cx="88" 
                              cy="88" 
                              fill="transparent" 
                              r="76" 
                              stroke="currentColor" 
                              strokeWidth="14"
                            />
                            {/* Dynamic colored ring segment */}
                            <circle 
                              className="transition-all duration-[1200ms] ease-out" 
                              cx="88" 
                              cy="88" 
                              fill="transparent" 
                              r="76" 
                              stroke={getComplianceStrokeColor(adherencePct)} 
                              strokeWidth="14"
                              strokeDasharray="477.5"
                              strokeDashoffset={477.5 - (477.5 * adherencePct) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-extrabold tracking-tight text-on-surface">
                              {adherencePct}%
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                              ADHERENCIA
                            </span>
                          </div>
                        </div>

                        {/* Summary details */}
                        <div className="flex-1">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${getComplianceBg(adherencePct)}`}>
                            {adherencePct >= 90 ? 'Excelente adherencia' : adherencePct >= 75 ? 'Adherencia intermedia' : 'Nivel crítico'}
                          </span>
                          <h3 className="text-xl font-bold text-gray-800">Puntaje del Ciclo Actual</h3>
                          <p className="text-gray-500 text-sm mt-1">
                            Tasa de adherencia clínica basada en las últimas tomas programadas registradas por el pastillero IoT durante esta sesión.
                          </p>

                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                            <div>
                              <p className="text-xs text-gray-400 font-bold uppercase">Tomas Consolidadas</p>
                              <p className="text-lg font-extrabold text-secondary">{takenCount} Dosis</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-bold uppercase">Racha de Días</p>
                              <p className="text-lg font-extrabold text-[#825100]">🔥 {iotState.consecutiveStreak} días</p>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Heatmap/Agenda Weekly Compliance block */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h3 className="font-bold text-lg">Calendario de Cumplimiento (Tracker Semanal)</h3>
                            <p className="text-xs text-gray-400">Verifique el rendimiento día por día haciendo clic en las tomas correspondientes.</p>
                          </div>
                          <Activity className="w-6 h-6 text-secondary flex-shrink-0" />
                        </div>

                        {/* Interactive Grid matching each block index */}
                        <div className="grid grid-cols-7 gap-2 text-center">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, idx) => {
                            // Mocking some colors based on compliance index
                            let color = 'bg-secondary text-white';
                            let statusText = 'Cumplido 100%';
                            
                            if (idx === 2) {
                              color = 'bg-amber-500 text-white';
                              statusText = 'Demora leve';
                            } else if (idx === 5) {
                              // If current score is lowered by simulation, highlight missed days in red!
                              color = adherencePct < 90 ? 'bg-error text-white' : 'bg-secondary text-white';
                              statusText = adherencePct < 90 ? 'Dosis Omitida' : 'Cumplido 100%';
                            } else if (idx === 6) {
                              color = adherencePct < 85 ? 'bg-error text-white' : 'bg-gray-100 text-gray-500';
                              statusText = adherencePct < 85 ? 'Olvidada' : 'No Iniciado';
                            }

                            return (
                              <div key={idx} className="p-3 rounded-xl border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
                                <span className="text-xs font-bold text-gray-400">{day.substring(0,3)}</span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${color} shadow-inner`}>
                                  {idx + 13}
                                </div>
                                <span className="text-[9px] font-black truncate max-w-full text-gray-500 uppercase">{statusText}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 text-xs">
                          <span className="font-bold text-gray-400">Leyenda:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-secondary" />
                            <span className="text-gray-600 font-semibold">Toma a tiempo</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-gray-600 font-semibold">Toma justificada / Demora</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-error" />
                            <span className="text-gray-600 font-semibold">Dosis olvidada</span>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Right Column: AI Insights Preventiva */}
                    <div className="lg:col-span-5">
                      
                      {/* AI Preventative Card Block */}
                      <section className="bg-primary-container text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                        
                        {/* Background glowing particles style */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Sparkles className="w-24 h-24 text-white flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                          <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner text-white">
                            <Brain className="w-6 h-6 text-white flex-shrink-0 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl">Gemini Health Insights</h3>
                            <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">Asistente de IA Preventiva</p>
                          </div>
                          <span className="ml-auto bg-green-400 text-green-950 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse whitespace-nowrap">Análisis en Vivo</span>
                        </div>

                        <div className="space-y-4 relative z-10">
                          
                          {/* Item 1: Summary */}
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                            <div className="flex items-center gap-2 text-green-300 font-bold text-xs uppercase mb-1">
                              <CheckCircle className="w-4 h-4 fill-current" />
                              <span>Resumen de Adherencia</span>
                            </div>
                            <p className="text-sm font-semibold">{aiInsights.summary}</p>
                          </div>

                          {/* Item 2: Risk Profile */}
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase mb-1">
                              <ShieldCheck className="w-4 h-4 text-amber-300 flex-shrink-0" />
                              <span>Nivel de Riesgo Clínico</span>
                            </div>
                            <p className="text-sm font-bold flex items-center gap-1.5">
                              {aiInsights.risk}
                              <span className={`w-2.5 h-2.5 rounded-full ${aiInsights.risk === 'Bajo' ? 'bg-green-400' : aiInsights.risk === 'Medio' ? 'bg-amber-400' : 'bg-red-400 animate-ping'}`} />
                            </p>
                          </div>

                          {/* Item 3: Pattern Omission */}
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                            <div className="flex items-center gap-3 text-red-300 font-bold text-xs uppercase mb-1">
                              <Activity className="w-4 h-4 text-red-300 flex-shrink-0" />
                              <span>Patrón de Comportamiento</span>
                            </div>
                            <p className="text-sm font-semibold">{aiInsights.pattern}</p>
                          </div>

                        </div>

                        {/* Actionable Prompt Footer Advice */}
                        <div className="mt-6 pt-6 border-t border-white/20 relative z-10 flex flex-col gap-4">
                          <p className="text-sm italic text-white/90 bg-black/20 p-4 rounded-2xl">
                            {aiInsights.suggestion}
                          </p>
                          
                          <button
                            id="btn-apply-ai-sug"
                            onClick={handleApplySuggestion}
                            className="w-full bg-white text-primary font-bold px-4 py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95 cursor-pointer hover:bg-white/95 flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Aplicar Sugerencia de IA</span>
                          </button>
                        </div>

                      </section>

                    </div>

                  </div>
                )}

                {/* TAB 2: TREATMENT & MEDS */}
                {caregiverTab === 'meds' && (
                  <div className="space-y-6 fade-in">
                    
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface p-4 rounded-2xl border border-outline-variant">
                      <div>
                        <h3 className="font-bold text-lg">Tratamientos Médicos Sincronizados</h3>
                        <p className="text-xs text-gray-400">Gestiones de pastillas, cargas físicas del pastillero e intervalos de alarma recomendados.</p>
                      </div>
                      
                      <button
                        id="btn-open-add-form"
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="bg-[#0058be] text-white px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide active-press transition-all flex items-center gap-1.5 cursor-pointer hover:bg-[#004ca5]"
                      >
                        {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>{isFormOpen ? 'Cerrar Formulario' : 'Nuevo Medicamento'}</span>
                      </button>
                    </div>

                    {/* NEW MEDICATION EXPANDABLE FORM */}
                    {isFormOpen && (
                      <form onSubmit={handleAddNewMedication} className="bg-white p-6 rounded-3xl border-2 border-primary/30 shadow-lg space-y-4 max-w-2xl mx-auto fade-in">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <span className="font-bold text-primary flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            <span>Configurar Nueva Carga en Alarma del Compartimento</span>
                          </span>
                          <span className="text-xs uppercase bg-primary-container text-white px-2 py-0.5 rounded-full font-bold">Slot Libre</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Name */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre Comercial del Fármaco</label>
                            <input 
                              type="text" 
                              placeholder="Ej: Metformina, Lisinopril, Ibuprofeno..." 
                              value={newMedName}
                              onChange={(e) => setNewMedName(e.target.value)}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {/* MG Strength */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Dosificación (Gramos o Miligramos)</label>
                            <input 
                              type="text" 
                              placeholder="Ej: 500mg, 10mg, 1g..." 
                              value={newMedMg}
                              onChange={(e) => setNewMedMg(e.target.value)}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* Dose Volume */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Volumen por Alarma</label>
                            <select 
                              value={newMedDose}
                              onChange={(e) => setNewMedDose(e.target.value)}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white"
                            >
                              <option value="1 Tableta">1 Tableta</option>
                              <option value="2 Tabletas">2 Tabletas</option>
                              <option value="Media Tableta">Media Tableta</option>
                              <option value="1 Cápsula">1 Cápsula</option>
                            </select>
                          </div>

                          {/* Schedule interval */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Intervalo del Sensor (Slot del Pastillero)</label>
                            <select 
                              value={newMedSchedule}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setNewMedSchedule(val);
                                // Auto suggested timing
                                if (val === 'Mañana') setNewMedTime('08:30 AM');
                                else if (val === 'Mediodía') setNewMedTime('01:00 PM');
                                else if (val === 'Tarde') setNewMedTime('05:30 PM');
                                else if (val === 'Noche') setNewMedTime('09:00 PM');
                              }}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white"
                            >
                              <option value="Mañana">Mañana (Compartimento 1)</option>
                              <option value="Mediodía">Mediodía (Compartimento 2)</option>
                              <option value="Tarde">Tarde (Compartimento 3)</option>
                              <option value="Noche">Noche (Compartimento 4)</option>
                            </select>
                          </div>

                          {/* Time picker */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Hora recomendada exacta</label>
                            <input 
                              type="text" 
                              value={newMedTime}
                              onChange={(e) => setNewMedTime(e.target.value)}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* Physician / Doctor */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Firma del Médico</label>
                            <input 
                              type="text" 
                              placeholder="Ej: Dr. Solís" 
                              value={newMedDoctor}
                              onChange={(e) => setNewMedDoctor(e.target.value)}
                              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                            />
                          </div>

                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsFormOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 active-press cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="bg-secondary text-white px-6 py-2.5 rounded-xl text-sm font-bold active-press cursor-pointer hover:bg-secondary/95"
                          >
                            Guardar Tratamiento
                          </button>
                        </div>
                      </form>
                    )}

                    {/* MEDS LIST */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {medications.map(med => (
                        <div key={med.id} className="bg-white rounded-3xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col justify-between">
                          <div className="mb-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full uppercase">
                                Compartimento: {med.schedule}
                              </span>
                              <span className="text-xs text-gray-400 font-bold bg-neutral-100 px-2 py-0.5 rounded">
                                Activo
                              </span>
                            </div>
                            <h4 className="text-xl font-bold tracking-tight text-on-background">{med.name}</h4>
                            <p className="font-semibold text-primary">{med.dose}</p>
                            
                            <div className="mt-4 space-y-2 text-xs font-bold text-gray-500 uppercase pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>HORA ALARMA: {med.timeStr}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span>MÉDICO: {med.doctor}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-gray-400" />
                                <span>STOCK RESTANTE: {med.remaining} Pastillas</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <button 
                              onClick={() => {
                                // Simulate refilling stock
                                setMedications(prev => prev.map(m => m.id === med.id ? { ...m, remaining: 30 } : m));
                                triggerToast(`Compartimento de ${med.name} recargado: 30 nuevas dosis listas.`);
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 font-bold px-3 py-2 rounded-xl text-gray-700 flex-1 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Recargar Stock</span>
                            </button>

                            <button 
                              onClick={() => {
                                // Find if there exists an active dose representing this slot
                                const target = activeDoses.find(d => d.medId === med.id);
                                if (target) {
                                  forceTriggerAlarm(target);
                                } else {
                                  triggerToast(`Instanciando alarma para ${med.name}`);
                                  forceTriggerAlarm({
                                    id: `temp-${Date.now()}`,
                                    medId: med.id,
                                    name: med.name,
                                    dose: med.dose,
                                    slot: med.schedule,
                                    scheduledTimeStr: med.timeStr,
                                    status: 'pendiente',
                                    dayOfWeek: 'LUNES',
                                    dateStr: '13 Jun'
                                  });
                                }
                              }}
                              className="text-xs bg-red-100 border border-red-200 text-red-600 hover:bg-red-200 font-bold px-3 py-2 rounded-xl flex-1 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3 text-red-600" />
                              <span>Forzar Alarma</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* TAB 3: ACTIVITY HISTORY */}
                {caregiverTab === 'alerts' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant space-y-6 fade-in">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-lg">Historial de Eventos del Pastillero</h3>
                        <p className="text-xs text-gray-400">Auditoría en tiempo real para médicos, familiares y cuidadores.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setHistoryLog(INITIAL_ACTIVITY_LOG);
                          setActiveDoses(INITIAL_ACTIVE_DOSES);
                          setIotState(prev => ({ ...prev, consecutiveStreak: 5 }));
                          triggerToast("Historial restablecido a los valores por defecto.");
                        }}
                        className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer Demo</span>
                      </button>
                    </div>

                    <div className="space-y-6">
                      {historyLog.map((act) => {
                        // Badge icon styling based on action type
                        let icon = <CheckCircle className="w-4 h-4 text-white" />;
                        let colorBg = 'bg-secondary';
                        
                        if (act.type === 'miss') {
                          icon = <AlertTriangle className="w-4 h-4 text-white" />;
                          colorBg = 'bg-error';
                        } else if (act.type === 'delay') {
                          icon = <Clock className="w-4 h-4 text-white" />;
                          colorBg = 'bg-amber-500';
                        } else if (act.type === 'system') {
                          icon = <Info className="w-4 h-4 text-white" />;
                          colorBg = 'bg-primary';
                        } else if (act.type === 'treatment_added') {
                          icon = <Plus className="w-4 h-4 text-white" />;
                          colorBg = 'bg-purple-600';
                        }

                        return (
                          <div key={act.id} className="flex gap-4 items-start relative border-l-2 border-gray-100 pl-6 ml-4">
                            {/* Dot circle absolute placement */}
                            <div className={`absolute -left-[14px] top-1 z-10 w-6 h-6 rounded-full ${colorBg} flex items-center justify-center shadow-md`}>
                              {icon}
                            </div>

                            <div className="flex-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 shadow-sm">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                <h4 className="font-bold text-sm text-gray-800">{act.title}</h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{act.timeLabel}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-2 font-medium">{act.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* TAB 4: CONTACT FAMILY */}
                {caregiverTab === 'family' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
                    
                    {/* Contacts block */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant space-y-4">
                      <h3 className="font-bold text-lg">Contactos de Emergencia Preferentes</h3>
                      <p className="text-xs text-gray-400">Si el pastillero detecta 2 dosis omitidas consecutivas, emitirá alertas SMS/Voz inmediatas a estos miembros.</p>

                      <div className="space-y-4">
                        
                        {/* Member 1 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              RS
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">Rogelio Solís (Hijo)</h4>
                              <p className="text-xs text-gray-400">Llamadas críticas habilitadas • SMS</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-secondary bg-green-50 border border-green-100 px-3 py-1 rounded-full uppercase">
                            Admin General
                          </span>
                        </div>

                        {/* Member 2 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              AS
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">Alicia Solís (Hija)</h4>
                              <p className="text-xs text-gray-400">Alertas de stock bajo • Email</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-400 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full uppercase">
                            Visualizador
                          </span>
                        </div>

                      </div>

                      <button 
                        onClick={() => triggerToast("Función demo: Configurar nuevo familiar requiere integración con base de datos del Hospital.")}
                        className="w-full text-xs font-bold bg-[#0058be] hover:bg-[#004ca5] text-white py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active-press cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Contacto Familiar</span>
                      </button>
                    </div>

                    {/* Escalamiento Protocol block */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant space-y-4">
                      <h3 className="font-bold text-lg">Protocolo Automático de Escalamiento IoT</h3>
                      <p className="text-xs text-gray-400">Reglas configuradas para el pastillero inteligente con inteligencia preventiva.</p>

                      <div className="space-y-3">
                        
                        <div className="flex gap-3 items-start p-3 bg-red-50 rounded-2xl border border-red-100">
                          <Bell className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-red-800 uppercase">Fase 1: Alarma de Luz & Sonido</h4>
                            <p className="text-xs text-gray-600 mt-1">El pastillero parpadea y genera alertas de voz de forma local el primer minuto de retraso.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-amber-50 rounded-2xl border border-amber-100">
                          <MessageSquare className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-amber-800 uppercase">Fase 2: Mensaje de Texto (Hijo)</h4>
                            <p className="text-xs text-gray-600 mt-1">Si transcurren 30 minutos sin apertura física del compartimento, se envía un aviso SMS al cuidador.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                          <Heart className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-neutral-800 uppercase">Fase 3: Reporte al Centro de Salud</h4>
                            <p className="text-xs text-gray-600 mt-1">Envió automático del reporte clínico consolidation al doctor de cabecera al finalizar el mes.</p>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* ======================================================= */}
        {/* FLOATING DETAILED TELEMETRY SIMULATOR (HARDWARE MOCK)  */}
        {/* ======================================================= */}
        <aside className="w-full md:w-[350px] bg-neutral-900 text-white p-6 border-t md:border-t-0 md:border-l-4 border-amber-500 flex flex-col gap-6 z-40 relative md:sticky md:top-20 h-auto md:h-[calc(100vh-120px)] overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-8 h-8 text-amber-500 animate-pulse flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg tracking-tight text-white uppercase">IoT Testing Tool</h3>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Simulador del Pastillero</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
              Simulator Online
            </div>
          </div>

          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
            Esta barra representa el panel de control físico o interno del dispositivo inteligente <strong>MediGuard Pro</strong>. Use los botones para forzar eventos que el paciente experimenta físicamente.
          </p>

          <div className="space-y-5">
            
            {/* Buttons Group */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Simulación Física</span>
              
              <button
                id="btn-sim-opendoor"
                onClick={simulateManualApertura}
                className="w-full bg-[#0058be] hover:bg-[#004be4] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-[#003882]"
              >
                <Layers className="w-4 h-4 text-blue-200" />
                <span>Simular Apertura de Puerta</span>
              </button>

              <button
                id="btn-sim-miss"
                onClick={simulateOlvido}
                className="w-full bg-red-800 hover:bg-red-700 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-red-950"
              >
                <AlertTriangle className="w-4 h-4 text-red-300" />
                <span>Simular Olvido / Dosis Omitida</span>
              </button>

              <button
                id="btn-sim-alarm"
                onClick={() => forceTriggerAlarm()}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-amber-850"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>Forzar Trigger Alerta Activa</span>
              </button>
            </div>

            {/* Dropdown 1: Battery */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex justify-between">
                <span>Estado de Batería</span>
                <span className="text-amber-500 font-bold font-mono">{iotState.batteryStatus}%</span>
              </label>
              <select
                value={iotState.batteryStatus}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setIotState(prev => ({
                    ...prev,
                    batteryStatus: val
                  }));
                  
                  if (val === 15) {
                    triggerToast("Batería Crítica: Pastillero inteligente ahora marca 15%. Escuchará avisos de bajo consumo.");
                    speakReminders("Atención: Batería baja de su pastillero inteligente. Por favor conecte el cargador.");
                  } else {
                    triggerToast(`Nivel de batería ajustado a ${val}%`);
                  }
                }}
                className="w-full bg-neutral-800 text-white text-xs font-bold rounded-xl px-3 py-3 border border-neutral-700 cursor-pointer text-left focus:outline-none focus:border-amber-500"
              >
                <option value={100}>🔋 100% (Modo Óptimo)</option>
                <option value={50}>🔋 50% (Modo Normal)</option>
                <option value={15}>⚠️ 15% (Batería Crítica)</option>
              </select>
            </div>

            {/* Dropdown 2: Connectivity */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex justify-between">
                <span>Conexión de Señal</span>
                <span className="text-amber-500 font-bold uppercase font-mono">{iotState.connection}</span>
              </label>
              <select
                value={iotState.connection}
                onChange={(e) => {
                  const val = e.target.value as ConnectionType;
                  setIotState(prev => ({
                    ...prev,
                    connection: val
                  }));
                  
                  if (val === 'disconnected') {
                    triggerToast("Conexión Desconectada. No se subirán datos de adherencia hasta reconectar.");
                    speakReminders("Dispositivo desconectado.");
                  } else {
                    triggerToast(`Canal de comunicación cambiado a ${val.toUpperCase()}`);
                  }
                }}
                className="w-full bg-neutral-800 text-white text-xs font-bold rounded-xl px-3 py-3 border border-neutral-700 cursor-pointer text-left focus:outline-none focus:border-amber-500"
              >
                <option value="wifi">🟢 Wi-Fi Activo</option>
                <option value="bluetooth">🔵 Bluetooth Sincronizado</option>
                <option value="disconnected">🔴 Desconectado (Desasociado)</option>
              </select>
            </div>

            {/* Dropdown 3: Reset App Demo State */}
            <div className="pt-4 border-t border-neutral-800">
              <button
                onClick={() => {
                  setMedications(INITIAL_MEDICATIONS);
                  setActiveDoses(INITIAL_ACTIVE_DOSES);
                  setHistoryLog(INITIAL_ACTIVITY_LOG);
                  setIotState({
                    batteryStatus: 100,
                    connection: 'wifi',
                    doorsOpen: false,
                    consecutiveStreak: 5
                  });
                  setIsAlarmTriggered(false);
                  triggerToast("Sistema de simulación inicializado por completo.");
                }}
                className="w-full text-center text-xs text-neutral-400 font-bold hover:text-neutral-100 flex items-center justify-center gap-1.5 py-2 hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Todo a Valores de Demo</span>
              </button>
            </div>

          </div>

          {/* Miniature Sensory Display */}
          <div className="mt-auto bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-xs">
            <h4 className="font-bold text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">Sensor de Presencia de Pastillas</h4>
            <div className="flex gap-2 justify-between">
              <div>
                <span className="text-gray-400 block text-[9px]">Compt 1</span>
                <span className="text-green-400 font-bold font-mono">Presente</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px]">Compt 2</span>
                <span className="text-red-400 font-bold font-mono">{iotState.doorsOpen ? 'Extrayendo' : 'Vacío'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px]">Compt 3</span>
                <span className="text-green-400 font-bold font-mono">Presente</span>
              </div>
            </div>
            <p className="text-[10px] mt-3 text-neutral-500">
              *El sistema emite impulsos electromagnéticos cada 10 segundos para corroborar peso residual.
            </p>
          </div>

        </aside>

      </div>

      {/* ======================================================= */}
      {/* EXPORT REPORT CLINICAL MODAL OVERLAY */}
      {/* ======================================================= */}
      {isExportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-[32px] border border-outline shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-6 fade-in print:p-0">
            
            {/* Header Dialog */}
            <div className="flex justify-between items-center bg-primary-container text-white p-5 rounded-2xl border border-primary-container shadow-inner">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-white" />
                <span className="font-bold text-lg">Reporte Clínico de Adherencia en PDF (Demo de Impresión)</span>
              </div>
              <button 
                onClick={() => setIsExportOpen(false)}
                className="p-1 px-3 bg-white/20 rounded-lg hover:bg-white/30 text-white font-bold"
              >
                Cerrar
              </button>
            </div>

            {/* Printable Report Design Layout */}
            <div id="printable-report" className="border-4 border-gray-100 p-8 rounded-3xl space-y-8 bg-[#fdfdfd]">
              
              {/* Clinical letterhead */}
              <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#0058be] uppercase tracking-tight font-senior">MEDIGUARD SMART SYSTEMS</h1>
                  <p className="text-xs text-gray-400 font-bold">Reporte Consolidado Automatizado de Cumplimiento Terapéutico</p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Paciente: Sr. Arturo Solís (Senior Core ID: #9833)</p>
                  <p className="text-xs text-gray-500 font-medium font-mono">Fecha del reporte: 13 de Junio de 2026</p>
                </div>
                
                <div className="text-right">
                  <span className="inline-block bg-neutral-100 text-gray-700 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200">
                    Sincronización: Nube Activa
                  </span>
                  <p className="text-xs text-gray-400 font-semibold mt-2">Médico de cabecera: Dr. Roger Solís</p>
                </div>
              </div>

              {/* Graphic metrics rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="p-4 rounded-2xl border border-gray-200 bg-neutral-50">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Porcentaje de Adherencia</h4>
                  <p className="text-3xl font-black text-[#006e2f] mt-1">{adherencePct}%</p>
                  <p className="text-[10px] text-gray-500 mt-1">Óptimo cumplimiento sobre tratamiento marcado.</p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-neutral-50">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Dosis Tomadas</h4>
                  <p className="text-3xl font-black text-primary mt-1">{takenCount} Tomas</p>
                  <p className="text-[10px] text-gray-500 mt-1">Registros corroborados por compuerta magnética.</p>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-neutral-50">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Días Consecutivos (Streak)</h4>
                  <p className="text-3xl font-black text-amber-600 mt-1">{iotState.consecutiveStreak} Días</p>
                  <p className="text-[10px] text-gray-500 mt-1">Racha continua de tomas en intervalos adecuados.</p>
                </div>

              </div>

              {/* Patient Insight Evaluation */}
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <h3 className="font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Análisis Clínico Realizado por Asistente de IA Preventiva</span>
                </h3>
                <p className="text-sm font-semibold text-gray-800">
                  Resumen de comportamiento: {aiInsights.summary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-gray-600 pt-2 border-t border-primary/10">
                  <div>
                    <span className="font-bold text-gray-400 uppercase block mb-1">Inconsistencias Detectadas:</span>
                    {aiInsights.pattern}
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 uppercase block mb-1">Medidas de Sugerencia Preventivas:</span>
                    {aiInsights.suggestion}
                  </div>
                </div>
              </div>

              {/* Meds schedule list */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Plan de Tratamiento Farmacológico</h3>
                <table className="w-full text-xs text-left text-gray-500 border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 font-bold text-gray-700 border-b border-gray-200">
                      <th className="p-3">Medicamento</th>
                      <th className="p-3">Compartimento</th>
                      <th className="p-3">Dosis</th>
                      <th className="p-3">Frecuencia / Hora</th>
                      <th className="p-3 text-right">Médico Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map(med => (
                      <tr key={med.id} className="border-b border-gray-100 hover:bg-neutral-50/50">
                        <td className="p-3 font-semibold text-gray-800">{med.name}</td>
                        <td className="p-3 uppercase font-semibold text-primary">{med.schedule}</td>
                        <td className="p-3 font-medium">{med.dose}</td>
                        <td className="p-3 font-mono font-bold text-amber-600">{med.timeStr}</td>
                        <td className="p-3 text-right font-medium">{med.doctor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footnotes clinical stamp */}
              <div className="border-t border-gray-300 pt-6 flex justify-between items-center text-[10px] text-gray-400 font-medium">
                <p>© 2026 MediGuard Labs Inc. • Producto con fines demostrativos certificados por AI Studio.</p>
                <p>Estampa criptográfica del dispensador IoT: <span className="font-mono text-gray-500">MGD-94827-X1</span></p>
              </div>

            </div>

            <div className="flex justify-end gap-3 pb-2">
              <button 
                onClick={() => setIsExportOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 active-press cursor-pointer"
              >
                Cerrar Reporte
              </button>
              
              <button 
                onClick={() => {
                  window.print();
                  triggerToast("Abriendo el cuadro de diálogo de impresión de su navegador web...");
                }}
                className="bg-secondary text-white px-6 py-2.5 rounded-xl text-sm font-bold active-press cursor-pointer hover:bg-secondary/95 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir / Descargar Reporte</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER GENERAL GREETINGS */}
      <footer className="py-4 bg-neutral-100 border-t border-gray-200 text-center text-xs text-gray-500 font-medium">
        MediGuard Smart Pillbox Companion App • Prototipo de Alta Fidelidad en Operación para Cuidador y Paciente.
      </footer>

    </div>
  );
}
