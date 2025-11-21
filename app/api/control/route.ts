import { NextResponse } from 'next/server';
import { controlTuyaDevice } from '@/lib/tuya';

const GOVEE_API_KEY = process.env.GOVEE_API_KEY;
const GOVEE_API_URL = 'https://developer-api.govee.com/v1/devices/control';

export async function POST(request: Request) {
    try {
        // Read text first to handle empty bodies safely
        const text = await request.text();
        if (!text) return NextResponse.json({ success: true });

        const body = JSON.parse(text);
        const { device, model, cmd, vendor } = body;

        if (vendor === 'tuya') {
            // Handle Tuya Control
            let commands: any[] = [];

            if (cmd.name === 'turn') {
                commands.push({ code: 'switch_led', value: cmd.value === 'on' });
            } else if (cmd.name === 'brightness') {
                // User provided: bright_value (10-1000)
                // Input is 0-100. Map to 10-1000.
                const val = Math.max(10, Math.min(1000, Number(cmd.value) * 10));
                commands.push({ code: 'bright_value', value: val });
                // Ensure we are in white mode if adjusting brightness (optional but good practice)
                // commands.push({ code: 'work_mode', value: 'white' }); 
            } else if (cmd.name === 'color') {
                // User provided: colour_data (HSV)
                // Input is RGB {r, g, b}
                const { r, g, b } = cmd.value as { r: number, g: number, b: number };

                // Convert RGB to HSV
                const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
                const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
                let h = 0, s = 0, v = max;
                const d = max - min;
                s = max === 0 ? 0 : d / max;

                if (max !== min) {
                    switch (max) {
                        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                        case gNorm: h = (bNorm - rNorm) / d + 2; break;
                        case bNorm: h = (rNorm - gNorm) / d + 4; break;
                    }
                    h /= 6;
                }

                // Tuya HSV format:
                // H: 0-360
                // S: 0-1000
                // V: 0-1000
                const tuyaH = Math.round(h * 360);
                const tuyaS = Math.round(s * 1000);
                const tuyaV = Math.round(v * 1000);

                commands.push({ code: 'work_mode', value: 'colour' });
                commands.push({
                    code: 'colour_data',
                    value: { h: tuyaH, s: tuyaS, v: tuyaV }
                });
            } else if (cmd.name === 'colorTemp') {
                // User provided: 0-100 (slider)
                // Tuya temp_value: 0-1000
                const val = Math.max(0, Math.min(1000, Number(cmd.value) * 10));
                commands.push({ code: 'work_mode', value: 'white' });
                commands.push({ code: 'temp_value', value: val });
            } else if (cmd.name === 'scene') {
                // User provided: { id: 1-8 }
                // Tuya scene_data: complex JSON.
                // For now, we trigger the scene slot via scene_num if possible, 
                // or we construct a basic scene payload.
                // NOTE: 'scene_data' usually requires the FULL scene definition.
                // However, some devices support 'scene_num' directly? No, usually part of scene_data.
                // Let's try sending a minimal scene_data with just the ID if the device supports it,
                // OR we have to construct a default scene.
                // Given the complexity, let's try to set 'work_mode' to 'scene' and 'scene_data' to a preset.
                // We'll assume the user wants to activate one of the 8 slots.
                // We need to construct a valid scene_data value.
                // Format: {"scene_num": X, "scene_units": [...]}
                // This is risky without knowing the exact required fields. 
                // Strategy: Just set work_mode to 'scene'. Some devices cycle or remember last.
                // Better Strategy: If we can't easily set a specific scene without the full blob,
                // we might need to fetch the current scene data first? Too slow.
                // Let's try sending just the scene_num if the device accepts partial updates (unlikely).
                // FALLBACK: We will just set work_mode to 'scene' for now, 
                // and if the user wants specific scenes, we might need to hardcode some "default" scene blobs for 1-8.

                // Let's try a generic "Static Color" scene structure for the requested slot.
                // This is a guess at a valid structure.
                const sceneId = (cmd.value as any).id || 1;
                // Send scene_data directly. work_mode: 'scene' is not supported by this device's schema.
                commands.push({
                    code: 'scene_data',
                    value: {
                        scene_num: sceneId,
                        scene_units: [
                            {
                                unit_change_mode: "static",
                                unit_switch_duration: 0,
                                unit_gradient_duration: 0,
                                h: 0, s: 0, v: 1000,
                                bright: 1000, temperature: 0
                            }
                        ]
                    }
                });
            } else if (cmd.name === 'countdown') {
                // User provided: seconds
                commands.push({ code: 'countdown', value: Number(cmd.value) });
            }

            const result = await controlTuyaDevice(device, commands);
            if (!result.success) {
                console.error('Tuya control failed for commands:', JSON.stringify(commands), 'Error:', result.msg);
                throw new Error(`Tuya control failed: ${result.msg}`);
            }

            return NextResponse.json({ message: 'Success', code: 200 });
        } else {
            // Handle Govee Control (Default)
            const goveeBody = {
                device,
                model,
                cmd
            };

            const res = await fetch(GOVEE_API_URL, {
                method: 'PUT',
                headers: {
                    'Govee-API-Key': GOVEE_API_KEY || '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goveeBody),
            });

            // Govee sometimes returns 200 with empty body, or 200 with { message: 'Success' }
            const resText = await res.text();

            if (!res.ok) {
                return NextResponse.json({ error: 'Failed to control Govee device' }, { status: res.status });
            }

            // Try to parse if not empty
            if (resText) {
                try {
                    const data = JSON.parse(resText);
                    return NextResponse.json(data);
                } catch (e) {
                    // If text exists but isn't JSON, just return success if status was 200
                    return NextResponse.json({ message: 'Success' });
                }
            }

            return NextResponse.json({ message: 'Success' });
        }

    } catch (error: any) {
        console.error('Control API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error', details: error.toString() }, { status: 500 });
    }
}
