'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
    CheckCircle2,
    Circle,
    Camera,
    Fuel,
    Gauge,
    AlertTriangle,
    Save,
    Loader2,
    Car,
    FileText,
    Radio,
    Disc,
    Wrench,
    Lightbulb,
    Shield,
    Unlock,
    Lock
} from 'lucide-react';
import { guardarChecklist, subirImagenChecklist, obtenerChecklist } from '@/lib/storage-adapter';
import { supabase } from '@/lib/supabase'; // Direct import for auth check if needed
import { useAuth } from '@/contexts/auth-context';

// Mock toast since sonner is not installed
const toast = {
    success: (msg: string) => alert(`✅ ${msg}`),
    error: (msg: string) => alert(`❌ ${msg}`),
    promise: (promise: Promise<any>, { loading, success, error }: any) => {
        // Simple promise logic
        promise.then(() => alert(`✅ ${success}`))
            .catch(() => alert(`❌ ${error}`));
        return promise;
    }
};

// -- CUSTOM SWITCH COMPONENT (If standard not available or for specific styling) --
const CustomSwitch = ({ checked, onCheckedChange, label, icon: Icon }: any) => (
    <div
        onClick={() => onCheckedChange(!checked)}
        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-95 ${checked
            ? 'bg-blue-600/10 border-blue-500/50'
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${checked ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {Icon && <Icon className="w-5 h-5" />}
            </div>
            <span className={`font-medium ${checked ? 'text-blue-100' : 'text-slate-300'}`}>{label}</span>
        </div>
        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    </div>
);

// -- CHECKBOX CARD COMPONENT --
const CheckboxCard = ({ checked, onChange, label, sublabel }: any) => (
    <div
        onClick={() => onChange(!checked)}
        className={`relative p-4 rounded-xl border cursor-pointer transition-all ${checked
            ? 'bg-emerald-500/10 border-emerald-500/50'
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            }`}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className={`font-medium ${checked ? 'text-emerald-100' : 'text-slate-200'}`}>{label}</p>
                {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
            </div>
            {checked ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
                <Circle className="w-6 h-6 text-slate-600" />
            )}
        </div>
    </div>
);

interface ChecklistFormProps {
    orderId: string;
    onClose?: () => void;
    initialData?: any;
}

export default function ChecklistForm({ orderId, onClose, initialData }: ChecklistFormProps) {
    // -- STATE --
    const [items, setItems] = useState({
        gata: false,
        rueda_repuesto: false,
        radio: false,
        documentos: false,
        combustible: 50,
        testigos_encendidos: false,
        luces_altas: false,
        luces_bajas: false,
        luces_freno: false,
        neumaticos: '',
        bypass_checklist: false, // New Field
    });

    // Bypass State
    const { user } = useAuth();
    const [bypassMode, setBypassMode] = useState(false);
    const [bypassPassword, setBypassPassword] = useState('');
    const [isBypassVerified, setIsBypassVerified] = useState(false);
    const [verifyingPassword, setVerifyingPassword] = useState(false);

    const [photos, setPhotos] = useState<{ [key: string]: string }>({
        combustible_url: '',
        kilometraje_url: ''
    });

    const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});
    const [isSaving, setIsSaving] = useState(false);

    // Load initial data if exists
    useEffect(() => {
        const load = async () => {
            if (initialData) {
                // ... assign
            } else {
                const existing = await obtenerChecklist(orderId);
                if (existing) {
                    setItems(existing.items || items);
                    setPhotos(existing.photos || photos);
                    if (existing.items?.bypass_checklist) {
                        setBypassMode(true);
                        setIsBypassVerified(true);
                    }
                }
            }
        };
        load();
    }, [orderId]);

    // -- HANDLERS --

    // Updates
    const updateItem = (key: string, value: any) => setItems(prev => ({ ...prev, [key]: value }));

    // Verify Password Handler
    const handleVerifyPassword = async () => {
        if (!bypassPassword) return;
        setVerifyingPassword(true);
        try {
            // Verify against current user logic or a master pin
            // For now, let's assume we re-authenticate with the current user's email if possible
            if (user?.email) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: bypassPassword
                });

                if (!error) {
                    setIsBypassVerified(true);
                    updateItem('bypass_checklist', true);
                    alert('✅ Identidad verificada. Puedes guardar sin fotos.');
                } else {
                    alert('❌ Contraseña incorrecta.');
                }
            } else {
                // Fallback for dev purposes if no user email in context (e.g. mock mode)
                // Remove this in production if strict security needed
                if (bypassPassword === '1234') {
                    setIsBypassVerified(true);
                    updateItem('bypass_checklist', true);
                    alert('✅ Bypass activado (Modo Desarrollo)');
                } else {
                    alert('❌ Error: No se puede verificar usuario.');
                }
            }
        } catch (e) {
            console.error(e);
            alert('Error al verificar');
        } finally {
            setVerifyingPassword(false);
        }
    };

    // Async Upload (The "Antigravity" Logic)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Feedback inmediate: Spinner
        setIsUploading(prev => ({ ...prev, [key]: true }));

        try {
            // Start upload immediately
            const url = await subirImagenChecklist(file, orderId, key === 'combustible_url' ? 'combustible' : 'kilometraje');
            if (url) {
                setPhotos(prev => ({ ...prev, [key]: url }));
                toast.success('Foto subida correctamente');
            } else {
                toast.error('Error al subir la foto');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setIsUploading(prev => ({ ...prev, [key]: false }));
        }
    };

    // Optimistic Save
    const handleSave = () => {
        // 1. Immediate Feedback
        toast.promise(
            // 2. Background Process
            guardarChecklist({
                order_id: orderId,
                items,
                photos
            }),
            {
                loading: 'Guardando...',
                success: 'Checklist guardado correctamente',
                error: (err: any) => {
                    console.error('❌ Error detallado al guardar checklist:', err);
                    return `Error al guardar: ${err.message || 'Error desconocido'}`;
                }
            }
        );

        // 3. UI Update / Close (Don't wait for promise)
        if (onClose) onClose();
    };

    // Validation
    const isFormValid = isBypassVerified || (!!photos.combustible_url && !!photos.kilometraje_url);

    // Fuel Color Logic
    const getFuelColor = (val: number) => {
        if (val < 20) return 'text-red-500';
        if (val < 50) return 'text-yellow-500';
        return 'text-emerald-500';
    };

    return (
        <div className="space-y-8 pb-20"> {/* pb-20 for bottom safe area */}

            {/* -- RECEPCIÓN Y PERTENENCIAS -- */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Recepción y Pertenencias
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CustomSwitch
                        label="Gata"
                        icon={Wrench}
                        checked={items.gata}
                        onCheckedChange={(v: boolean) => updateItem('gata', v)}
                    />
                    <CustomSwitch
                        label="Rueda de Repuesto"
                        icon={Disc}
                        checked={items.rueda_repuesto}
                        onCheckedChange={(v: boolean) => updateItem('rueda_repuesto', v)}
                    />
                    <CustomSwitch
                        label="Radio / Panel"
                        icon={Radio}
                        checked={items.radio}
                        onCheckedChange={(v: boolean) => updateItem('radio', v)}
                    />
                    <CustomSwitch
                        label="Documentos"
                        icon={FileText}
                        checked={items.documentos}
                        onCheckedChange={(v: boolean) => updateItem('documentos', v)}
                    />
                </div>
            </section>

            {/* -- COMBUSTIBLE -- */}
            <section className={`space-y-4 transition-opacity ${bypassMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Fuel className="w-4 h-4" /> Nivel de Combustible
                </h3>

                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                    <div className="flex justify-between items-end">
                        <span className="text-slate-400 text-sm">Nivel actual</span>
                        <span className={`text-2xl font-bold font-mono ${getFuelColor(items.combustible)}`}>
                            {items.combustible}%
                        </span>
                    </div>

                    {/* Custom Slider */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={items.combustible}
                        onChange={(e) => updateItem('combustible', parseInt(e.target.value))}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />

                    {/* MANDATORY PHOTO */}
                    <div className="pt-2">
                        <label className={`block w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors group ${photos.combustible_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800'
                            }`}>
                            <div className="flex items-center justify-center gap-3">
                                {isUploading['combustible_url'] ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                ) : photos.combustible_url ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        <span className="text-emerald-400 font-medium">Foto cargada</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                                        <span className="text-slate-400 group-hover:text-blue-200">Subir foto nivel (Obligatorio)</span>
                                    </>
                                )}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'combustible_url')} />
                        </label>
                    </div>
                </div>
            </section>

            {/* -- LUCES Y TABLERO -- */}
            <section className={`space-y-4 transition-opacity ${bypassMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Luces y Tablero
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <CheckboxCard
                        label="Testigos"
                        sublabel="Encendidos en tablero"
                        checked={items.testigos_encendidos}
                        onChange={(v: boolean) => updateItem('testigos_encendidos', v)}
                    />
                    <CheckboxCard
                        label="Luces Altas"
                        checked={items.luces_altas}
                        onChange={(v: boolean) => updateItem('luces_altas', v)}
                    />
                    <CheckboxCard
                        label="Luces Bajas"
                        checked={items.luces_bajas}
                        onChange={(v: boolean) => updateItem('luces_bajas', v)}
                    />
                    <CheckboxCard
                        label="Luces Freno"
                        checked={items.luces_freno}
                        onChange={(v: boolean) => updateItem('luces_freno', v)}
                    />
                </div>
            </section>

            {/* -- KILOMETRAJE Y LLANTAS -- */}
            <section className={`bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4 transition-opacity ${bypassMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                    <Label className="text-slate-400">Estado de Neumáticos (Visual)</Label>
                    <Input
                        placeholder="Ej: Desgaste parejo, presión ok..."
                        value={items.neumaticos}
                        onChange={(e) => updateItem('neumaticos', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>

                {/* MANDATORY MILEAGE PHOTO */}
                <div className="pt-2">
                    <Label className="text-slate-400 mb-2 block">Foto Tablero / Kilometraje (Obligatorio)</Label>
                    <label className={`block w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors group flex flex-col items-center justify-center gap-2 text-center ${photos.kilometraje_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800'
                        }`}>
                        {isUploading['kilometraje_url'] ? (
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        ) : photos.kilometraje_url ? (
                            <>
                                <div className="w-full h-32 relative rounded-lg overflow-hidden mb-2">
                                    <img src={photos.kilometraje_url} alt="Kilometraje" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-medium">Imagen guardada</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <Gauge className="w-8 h-8 text-slate-500 group-hover:text-blue-400" />
                                <span className="text-slate-400 group-hover:text-blue-200">Toca para tomar foto del kilometraje</span>
                            </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'kilometraje_url')} />
                    </label>
                </div>
            </section>

            {/* -- BYPASS TOGGLE -- */}
            <section className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">No puedo hacer el checklist obligatorio</span>
                        <span className="text-xs text-slate-500">Activa esto si estás en PC o no puedes tomar fotos</span>
                    </div>
                    <CustomSwitch
                        checked={bypassMode}
                        onCheckedChange={(v: boolean) => {
                            setBypassMode(v);
                            if (!v) {
                                setIsBypassVerified(false);
                                setBypassPassword('');
                                updateItem('bypass_checklist', false);
                            }
                        }}
                        icon={Shield}
                    />
                </div>

                {bypassMode && !isBypassVerified && (
                    <div className="mt-4 p-4 bg-slate-800/50 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <Label className="text-slate-300 mb-2 block">Ingresa tu contraseña para confirmar:</Label>
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Contraseña de usuario"
                                value={bypassPassword}
                                onChange={(e) => setBypassPassword(e.target.value)}
                                className="bg-slate-900 border-slate-600 outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <Button
                                onClick={handleVerifyPassword}
                                disabled={!bypassPassword || verifyingPassword}
                                className="bg-slate-700 hover:bg-slate-600"
                            >
                                {verifyingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                {bypassMode && isBypassVerified && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                        <Lock className="w-4 h-4" />
                        <span>Bypass activado por usuario. Se omitirán las fotos.</span>
                    </div>
                )}
            </section>

            {/* -- ACTIONS -- */}
            <div className="pt-4 flex gap-4">
                <Button
                    variant="outline"
                    className="flex-1 h-12 text-slate-400 border-slate-700 hover:bg-slate-800"
                    onClick={onClose}
                >
                    Cancelar
                </Button>
                <Button
                    className={`flex-1 h-12 text-lg font-semibold shadow-xl shadow-blue-900/20 ${!isFormValid ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    disabled={!isFormValid || isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            Guardar Checklist
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
