import crypto from 'crypto';

const CLIENT_ID = process.env.TUYA_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';
const BASE_URL = 'https://openapi.tuyaus.com'; // US Data Center

let accessToken = '';
let tokenExpireTime = 0;

function sign(str: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

async function getAccessToken() {
    const now = Date.now();
    if (accessToken && now < tokenExpireTime) {
        return accessToken;
    }

    const timestamp = now.toString();
    const signUrl = '/v1.0/token?grant_type=1';
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const stringToSign = [
        'GET',
        contentHash,
        '',
        signUrl,
    ].join('\n');

    const signStr = CLIENT_ID + timestamp + stringToSign;
    const signature = sign(signStr, CLIENT_SECRET);

    const res = await fetch(`${BASE_URL}${signUrl}`, {
        headers: {
            'client_id': CLIENT_ID,
            'sign': signature,
            't': timestamp,
            'sign_method': 'HMAC-SHA256',
        },
    });

    const data = await res.json();
    if (data.success) {
        accessToken = data.result.access_token;
        tokenExpireTime = now + (data.result.expire_time * 1000) - 60000; // Refresh 1 min early
        return accessToken;
    } else {
        throw new Error(`Tuya Auth Failed: ${data.msg}`);
    }
}

async function makeRequest(method: string, path: string, body: any = null) {
    try {
        const token = await getAccessToken();
        const now = Date.now().toString();

        const contentHash = crypto.createHash('sha256').update(body ? JSON.stringify(body) : '').digest('hex');
        const stringToSign = [
            method,
            contentHash,
            '',
            path,
        ].join('\n');

        const signStr = CLIENT_ID + token + now + stringToSign;
        const signature = sign(signStr, CLIENT_SECRET);

        const headers: any = {
            'client_id': CLIENT_ID,
            'access_token': token,
            'sign': signature,
            't': now,
            'sign_method': 'HMAC-SHA256',
            'Content-Type': 'application/json',
        };

        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();
        return data;
    } catch (e) {
        console.error('[Tuya] Request Error:', e);
        return { success: false, msg: 'Request failed' };
    }
}

export async function getTuyaDevices() {
    // Try IoT Core endpoint first
    console.log('[Tuya] Fetching devices from /v1.0/iot-03/devices...');
    let res = await makeRequest('GET', '/v1.0/iot-03/devices');

    if (res.success && res.result?.devices) {
        console.log(`[Tuya] Found ${res.result.devices.length} devices via IoT Core`);
        return res.result.devices;
    }

    // Fallback to standard user-linked devices endpoint
    console.log('[Tuya] IoT Core failed or empty, trying /v1.0/devices...');
    res = await makeRequest('GET', '/v1.0/devices');

    if (res.success && res.result) {
        // The structure might differ here, usually result is the array or result.devices
        const devices = Array.isArray(res.result) ? res.result : res.result.devices || [];
        console.log(`[Tuya] Found ${devices.length} devices via Standard API`);
        return devices;
    }

    console.error('[Tuya] All fetch attempts failed:', res);
    return [];
}

export async function getTuyaDevice(deviceId: string) {
    console.log(`[Tuya] Fetching device ${deviceId}...`);
    const res = await makeRequest('GET', `/v1.0/iot-03/devices/${deviceId}`);
    if (res.success) {
        console.log(`[Tuya] Found device ${deviceId}`);
        return res.result;
    }
    console.error(`[Tuya] Failed to fetch device ${deviceId}:`, res);
    return null;
}

export async function controlTuyaDevice(deviceId: string, commands: any[]) {
    // POST /v1.0/iot-03/devices/{device_id}/commands
    const res = await makeRequest('POST', `/v1.0/iot-03/devices/${deviceId}/commands`, {
        commands
    });
    return { success: res.success, msg: res.msg || (res.success ? 'Success' : 'Unknown error') };
}
