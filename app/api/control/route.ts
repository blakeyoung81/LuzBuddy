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
                // Tuya V2 brightness is usually 0-1000
                commands.push({ code: 'bright_value_v2', value: Number(cmd.value) * 10 });
            } else if (cmd.name === 'color') {
                // Tuya color is complex, skipping for this iteration or implementing basic if possible
                // For now, let's just log it as not fully implemented
                console.log("Tuya color control simplified/skipped for now");
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
