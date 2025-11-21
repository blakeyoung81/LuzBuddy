import { NextResponse } from 'next/server';

const GOVEE_API_URL = 'https://developer-api.govee.com/v1/devices';
const GOVEE_API_KEY = process.env.GOVEE_API_KEY;

export async function GET() {
    if (!GOVEE_API_KEY) {
        return NextResponse.json({ error: 'Govee API Key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(GOVEE_API_URL, {
            headers: {
                'Govee-API-Key': GOVEE_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Govee API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching devices:', error);
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
}
