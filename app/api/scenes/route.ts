import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const GOVEE_API_KEY = process.env.GOVEE_API_KEY;
const GOVEE_API_URL = 'https://openapi.api.govee.com/router/api/v1/device/queryDynamicScene';

export async function POST(request: Request) {
    if (!GOVEE_API_KEY) {
        return NextResponse.json({ error: 'Govee API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { device, model } = body;

        if (!device || !model) {
            return NextResponse.json({ error: 'Missing device or model' }, { status: 400 });
        }

        const requestId = uuidv4();

        const response = await fetch(GOVEE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Govee-API-Key': GOVEE_API_KEY,
            },
            body: JSON.stringify({
                requestId,
                payload: {
                    sku: model,
                    device: device,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Govee API Error:', response.status, errorText);
            // If 404 or similar, it might mean the device doesn't support dynamic scenes via this endpoint
            return NextResponse.json({ scenes: [] });
        }

        const data = await response.json();
        // The API returns { payload: { capabilities: [ { parameters: { dynamicScene: [...] } } ] } }
        // We need to parse this structure carefully.

        let scenes = [];
        if (data.payload && data.payload.capabilities) {
            const sceneCap = data.payload.capabilities.find((cap: any) => cap.parameters && cap.parameters.dynamicScene);
            if (sceneCap) {
                scenes = sceneCap.parameters.dynamicScene;
            }
        }

        return NextResponse.json({ scenes });
    } catch (error) {
        console.error('Error fetching scenes:', error);
        return NextResponse.json({ error: 'Failed to fetch scenes' }, { status: 500 });
    }
}
