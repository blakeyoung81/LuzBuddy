import { NextResponse } from 'next/server';
import { UnifiedDevice, GoveeDevice } from '@/types';
import { getTuyaDevices } from '@/lib/tuya';

const GOVEE_API_KEY = process.env.GOVEE_API_KEY;
const GOVEE_API_URL = 'https://developer-api.govee.com/v1/devices';

export async function GET() {
    try {
        // 1. Fetch Govee Devices
        let goveeDevices: UnifiedDevice[] = [];
        if (GOVEE_API_KEY) {
            try {
                const res = await fetch(GOVEE_API_URL, {
                    headers: {
                        'Govee-API-Key': GOVEE_API_KEY || '',
                        'Content-Type': 'application/json',
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    const rawDevices: GoveeDevice[] = data.data?.devices || [];

                    // Map to UnifiedDevice
                    goveeDevices = rawDevices.map(d => ({
                        id: d.device,
                        name: d.deviceName,
                        model: d.model,
                        vendor: 'govee',
                        isOn: false, // Govee V1 doesn't give state in list, would need separate call or V2
                        brightness: 0,
                        color: { r: 255, g: 255, b: 255 },
                        capabilities: {
                            modes: true,
                            scenes: true,
                            music: true
                        },
                        originalData: d
                    }));
                }
            } catch (e) {
                console.error("Govee fetch error:", e);
            }
        }

        // 2. Fetch Tuya Devices
        let tuyaDevices: UnifiedDevice[] = [];
        if (process.env.TUYA_CLIENT_ID) {
            try {
                const rawTuya = await getTuyaDevices();
                tuyaDevices = rawTuya.map((d: any) => {
                    // Extract status
                    const switchStatus = d.status?.find((s: any) => s.code === 'switch_led' || s.code === 'switch_1')?.value;
                    const brightStatus = d.status?.find((s: any) => s.code === 'bright_value_v2' || s.code === 'bright_value')?.value;

                    return {
                        id: d.id,
                        name: d.name,
                        model: d.product_name || 'Tuya Device',
                        vendor: 'tuya',
                        isOn: !!switchStatus,
                        brightness: typeof brightStatus === 'number' ? Math.round(brightStatus / 10) : 100, // Tuya usually 0-1000
                        color: { r: 255, g: 255, b: 255 }, // Parsing Tuya color data is complex (HSV/Hex), default for now
                        capabilities: {
                            modes: true, // Assume supported
                            scenes: true,
                            music: false
                        },
                        originalData: d
                    };
                });
            } catch (e) {
                console.error("Tuya fetch error:", e);
            }
        }

        // 3. Combine
        const allDevices = [...goveeDevices, ...tuyaDevices];

        return NextResponse.json({ data: { devices: allDevices } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
}
