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

    return await res.json();
}

export async function getTuyaDevices() {
    // Get devices from the project
    // Note: This endpoint gets a list of devices under the user's account/project
    // We might need to use a different endpoint depending on how the user is set up, 
    // but /v1.0/devices is standard for user-linked devices. 
    // However, for IoT Core projects, we often use /v1.0/devices with page params.
    // Let's try fetching devices associated with the project.
    // Actually, getting all devices for a project usually requires knowing the user_id or using the asset management API.
    // For simplicity in this context, we'll assume we can fetch a list of devices if we have the right permissions.
    // A common way is GET /v1.0/iot-03/devices (IoT Core)

    // Let's try the standard IoT Core device list
    const res = await makeRequest('GET', '/v1.0/iot-03/devices');

    if (res.success) {
        return res.result.devices || [];
    }
    console.error('Tuya fetch failed:', res);
    return [];
}

export async function controlTuyaDevice(deviceId: string, commands: any[]) {
    // POST /v1.0/iot-03/devices/{device_id}/commands
    const res = await makeRequest('POST', `/v1.0/iot-03/devices/${deviceId}/commands`, {
        commands
    });
    return res.success;
}
