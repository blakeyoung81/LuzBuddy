'use client';

import { useState, useEffect } from 'react';
import { UnifiedDevice } from '../types';
import { Power, Sun, Palette, Loader2, Timer, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DeviceCardProps {
    device: UnifiedDevice;
}

export default function DeviceCard({ device }: DeviceCardProps) {
    const [isOn, setIsOn] = useState(device.isOn);
    const [brightness, setBrightness] = useState(device.brightness);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'control' | 'scenes' | 'music' | 'settings'>('control');

    // Advanced State
    const [colorTemp, setColorTemp] = useState(0);
    const [countdown, setCountdown] = useState(0);

    // Scene State
    const [scenes, setScenes] = useState<{ sceneId: number, sceneName: string }[]>([]);
    const [scenesLoading, setScenesLoading] = useState(false);

    // Social / Note State
    const [showNotePopup, setShowNotePopup] = useState(false);
    const [pendingAction, setPendingAction] = useState('');
    const [userName, setUserName] = useState('');
    const [userNote, setUserNote] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const handleLogActivity = async (skip: boolean = false) => {
        if (!pendingAction) return;

        const nameToUse = skip || isAnonymous ? 'Anonymous' : (userName || 'Anonymous');
        const noteToUse = skip ? '' : userNote;

        try {
            await fetch('/api/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameToUse,
                    message: noteToUse,
                    action: pendingAction,
                    deviceName: device.name
                })
            });
        } catch (err) {
            console.error("Failed to log activity", err);
        } finally {
            // Reset and close
            setShowNotePopup(false);
            setPendingAction('');
            setUserNote('');
            // Keep userName for convenience
        }
    };

    const controlDevice = async (cmd: { name: string; value: string | number | { r: number; g: number; b: number } | { id: number } }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: device.id,
                    model: device.model,
                    vendor: device.vendor,
                    cmd,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to control device');
            }

            // Prepare activity log but wait for user input
            let actionDesc = 'controlled';
            if (cmd.name === 'turn') actionDesc = `turned ${cmd.value}`;
            else if (cmd.name === 'brightness') actionDesc = `set brightness to ${cmd.value}%`;
            else if (cmd.name === 'color') actionDesc = `changed color`;
            else if (cmd.name === 'colorTemp') actionDesc = `changed color temp`;
            else if (cmd.name === 'scene') actionDesc = `activated scene`;
            else if (cmd.name === 'countdown') actionDesc = `set timer for ${cmd.value}s`;

            setPendingAction(actionDesc);
            setShowNotePopup(true);

            // Update local state based on command
            if (cmd.name === 'turn') {
                setIsOn(cmd.value === 'on');
            } else if (cmd.name === 'brightness') {
                setBrightness(cmd.value as number);
            }

        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to control device');
        } finally {
            setLoading(false);
        }
    };

    const togglePower = () => {
        controlDevice({ name: 'turn', value: isOn ? 'off' : 'on' });
    };

    const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setBrightness(val);
        // Debounce could be added here, but for now we'll just set it on mouse up or change
        // For smoother UX, we might want to only send on mouseUp, but onChange gives immediate feedback if rate limit allows.
        // Govee rate limits are strict, so let's be careful.
        // We'll just update local state here and send command on mouseUp (implemented in the input)
    };

    const sendBrightness = () => {
        controlDevice({ name: 'brightness', value: brightness });
    };

    const changeColor = (color: { r: number; g: number; b: number }) => {
        controlDevice({ name: 'color', value: color });
    };

    const handleColorTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColorTemp(parseInt(e.target.value));
    };

    const sendColorTemp = () => {
        controlDevice({ name: 'colorTemp', value: colorTemp });
    };

    const sendCountdown = () => {
        controlDevice({ name: 'countdown', value: countdown });
    };

    const fetchScenes = async () => {
        if (scenes.length > 0) return; // Already fetched
        if (device.vendor !== 'govee') return; // Only Govee supports dynamic scenes for now

        setScenesLoading(true);
        try {
            const res = await fetch('/api/scenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: device.id,
                    model: device.model,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.scenes) {
                    setScenes(data.scenes);
                }
            }
        } catch (error) {
            console.error("Failed to fetch scenes", error);
        } finally {
            setScenesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'scenes') {
            fetchScenes();
        }
    }, [activeTab, device.id, device.model]); // Added device dependencies for completeness

    const activateScene = (sceneId: number) => {
        // For dynamic scenes, the command usually involves sending the sceneId
        // The exact command structure depends on the device, but typically:
        // cmd: { name: 'turn', value: 'on' } (if off) -> then scene command?
        // Actually, for V1/V2 control, it's often: { name: 'scene', value: { id: sceneId } } or similar.
        // We'll try a generic 'scene' command which our backend can map if needed,
        // or we send the raw structure expected by Govee.
        // Based on Govee docs, it might be: { name: 'opcode', value: ... } for some, but let's try a high-level abstraction first.
        // If we use the 'control' endpoint, we might need to send { name: 'mode', value: sceneId } or similar.
        // Let's try sending the scene ID as a 'scene' command.
        controlDevice({ name: 'scene', value: { id: sceneId } });
    };

    const activateTuyaScene = (slot: number) => {
        controlDevice({ name: 'scene', value: { id: slot } });
    };

    return (
        <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 backdrop-blur-xl transition-all hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col gap-4 flex-grow">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-zinc-100 text-lg tracking-tight">{device.name}</h3>
                            <span className={twMerge("text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider", device.vendor === 'govee' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400")}>
                                {device.vendor}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono mt-1">{device.model}</p>
                    </div>
                    <button
                        onClick={togglePower}
                        disabled={loading}
                        className={twMerge(
                            "p-3 rounded-full transition-all duration-300",
                            isOn
                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                        )}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-zinc-800 pb-2">
                    <button
                        onClick={() => setActiveTab('control')}
                        className={twMerge("text-xs font-medium px-3 py-1 rounded-full transition-colors", activeTab === 'control' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        Control
                    </button>
                    <button
                        onClick={() => setActiveTab('scenes')}
                        className={twMerge("text-xs font-medium px-3 py-1 rounded-full transition-colors", activeTab === 'scenes' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        Scenes
                    </button>
                    <button
                        onClick={() => setActiveTab('music')}
                        className={twMerge("text-xs font-medium px-3 py-1 rounded-full transition-colors", activeTab === 'music' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        Music
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={twMerge("text-xs font-medium px-3 py-1 rounded-full transition-colors", activeTab === 'settings' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        Settings
                    </button>
                </div>

                <div className="mt-2 min-h-[150px]">
                    {activeTab === 'control' && (
                        <div className="space-y-4">
                            {/* Brightness Control */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-zinc-400">
                                    <div className="flex items-center gap-1">
                                        <Sun className="w-3 h-3" />
                                        <span>Brightness</span>
                                    </div>
                                    <span>{brightness}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={brightness}
                                    onChange={handleBrightnessChange}
                                    onMouseUp={sendBrightness}
                                    onTouchEnd={sendBrightness}
                                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                                />
                            </div>

                            {/* Color Temp Control (Tuya Only for now) */}
                            {device.vendor === 'tuya' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <div className="flex items-center gap-1">
                                            <Sun className="w-3 h-3 text-orange-300" />
                                            <span>Color Temp</span>
                                        </div>
                                        <span>{colorTemp}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={colorTemp}
                                        onChange={handleColorTempChange}
                                        onMouseUp={sendColorTemp}
                                        onTouchEnd={sendColorTemp}
                                        className="w-full h-1.5 bg-gradient-to-r from-orange-400 to-blue-200 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>
                            )}

                            {/* Color Presets */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 text-xs text-zinc-400">
                                    <Palette className="w-3 h-3" />
                                    <span>Quick Colors</span>
                                </div>
                                <div className="flex gap-2">
                                    {[
                                        { r: 255, g: 255, b: 255, label: 'White' },
                                        { r: 255, g: 0, b: 0, label: 'Red' },
                                        { r: 0, g: 255, b: 0, label: 'Green' },
                                        { r: 0, g: 0, b: 255, label: 'Blue' },
                                        { r: 255, g: 0, b: 255, label: 'Purple' },
                                    ].map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => changeColor(c)}
                                            className="w-8 h-8 rounded-full border border-zinc-700/50 hover:scale-110 transition-transform focus:ring-2 focus:ring-white/20"
                                            style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}



                    {activeTab === 'scenes' && device.vendor === 'tuya' && (
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => activateTuyaScene(slot)}
                                    className="aspect-square flex items-center justify-center bg-zinc-800/50 rounded-xl hover:bg-zinc-700 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-zinc-800 hover:border-zinc-600"
                                >
                                    S{slot}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'scenes' && device.vendor === 'govee' && (
                        <div className="relative">
                            {scenesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                                </div>
                            ) : scenes.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    {scenes.map((scene) => (
                                        <button
                                            key={scene.sceneId}
                                            onClick={() => activateScene(scene.sceneId)}
                                            className="px-3 py-2 text-xs text-zinc-300 bg-zinc-800/50 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors text-left truncate"
                                            title={scene.sceneName}
                                        >
                                            {scene.sceneName}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-zinc-500 text-xs">
                                    No scenes found for this device.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'music' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-4">
                            <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            </div>
                            <p className="text-xs text-zinc-400">
                                Music mode uses your device's microphone to sync lights with sound.
                            </p>
                            <button
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-full hover:bg-indigo-500 transition-colors"
                                onClick={() => alert('Music mode activation requires specific command codes per device model.')}
                            >
                                Enable Music Mode
                            </button>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Timer className="w-4 h-4" />
                                    <span>Countdown Timer (Seconds)</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={countdown}
                                        onChange={(e) => setCountdown(parseInt(e.target.value) || 0)}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                        placeholder="Seconds"
                                    />
                                    <button
                                        onClick={sendCountdown}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-500 transition-colors"
                                    >
                                        Set
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-600">
                                    Set to 0 to cancel. Light will turn off after time expires.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slick Popup Overlay */}
            {showNotePopup && (
                <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full shadow-2xl space-y-3">
                        <div className="text-center">
                            <div className="inline-flex p-2 bg-green-500/10 rounded-full text-green-500 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h4 className="text-sm font-medium text-zinc-100">Success!</h4>
                            <p className="text-xs text-zinc-400 mt-1">Leave a note for others?</p>
                        </div>

                        <div className="space-y-2">
                            {!isAnonymous && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <input
                                        type="text"
                                        placeholder="Your Name"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 w-full focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0 w-3 h-3"
                                />
                                Hide my name
                            </label>
                            <textarea
                                placeholder="Type a message..."
                                value={userNote}
                                onChange={(e) => setUserNote(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-2 text-xs text-zinc-200 w-full focus:outline-none focus:border-indigo-500 transition-colors resize-none h-16"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => handleLogActivity(true)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                No thanks
                            </button>
                            <button
                                onClick={() => handleLogActivity(false)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
