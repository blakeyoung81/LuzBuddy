'use client';

import { useState } from 'react';
import { GoveeDevice } from '../types';
import { Power, Sun, Palette, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DeviceCardProps {
    device: GoveeDevice;
}

export default function DeviceCard({ device }: DeviceCardProps) {
    const [loading, setLoading] = useState(false);
    const [isOn, setIsOn] = useState(false); // Optimistic state
    const [brightness, setBrightness] = useState(100);

    const controlDevice = async (cmd: { name: string; value: string | number | { r: number; g: number; b: number } }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: device.device,
                    model: device.model,
                    cmd,
                }),
            });

            if (!res.ok) throw new Error('Failed to control device');

            // Update local state based on command
            if (cmd.name === 'turn') {
                setIsOn(cmd.value === 'on');
            } else if (cmd.name === 'brightness') {
                setBrightness(cmd.value as number);
            }

        } catch (error) {
            console.error(error);
            alert('Failed to control device');
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

    return (
        <div className="relative group overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 backdrop-blur-xl transition-all hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-zinc-100 text-lg tracking-tight">{device.deviceName}</h3>
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

                <div className="space-y-4 mt-2">
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
            </div>
        </div>
    );
}
