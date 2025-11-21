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
            }

            const success = await controlTuyaDevice(device, commands);
            if (!success) throw new Error('Tuya control failed');

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

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
