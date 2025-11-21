import { NextResponse } from 'next/server';

const GOVEE_CONTROL_URL = 'https://developer-api.govee.com/v1/devices/control';
const GOVEE_API_KEY = process.env.GOVEE_API_KEY;

export async function POST(request: Request) {
    if (!GOVEE_API_KEY) {
        return NextResponse.json({ error: 'Govee API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { device, model, cmd } = body;

        if (!device || !model || !cmd) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const response = await fetch(GOVEE_CONTROL_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Govee-API-Key': GOVEE_API_KEY,
            },
            body: JSON.stringify({
                device,
                model,
                cmd,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Govee API error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error controlling device:', error);
        return NextResponse.json({ error: 'Failed to control device' }, { status: 500 });
    }
}
