import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure activity file exists
if (!fs.existsSync(ACTIVITY_FILE)) {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify([]));
}

export interface ActivityItem {
    id: string;
    timestamp: number;
    name: string;
    message: string;
    action: string;
    deviceName: string;
    ip?: string;
    userAgent?: string;
}

export async function GET() {
    try {
        const fileContent = fs.readFileSync(ACTIVITY_FILE, 'utf-8');
        const activities: ActivityItem[] = JSON.parse(fileContent);
        // Return last 50 items, reversed (newest first)
        // Filter out sensitive info like IP before sending to frontend if desired, 
        // but for now we'll send it or just not display it in UI.
        // Let's sanitize for frontend to be safe.
        const sanitizedActivities = activities.map(({ ip, userAgent, ...rest }) => rest);
        return NextResponse.json(sanitizedActivities.slice(-50).reverse());
    } catch (error) {
        console.error('Error reading activity file:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, message, action, deviceName } = body;

        if (!action || !deviceName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const newItem: ActivityItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            name: name || 'Anonymous',
            message: message || '',
            action,
            deviceName,
            ip,
            userAgent
        };

        const fileContent = fs.readFileSync(ACTIVITY_FILE, 'utf-8');
        const activities: ActivityItem[] = JSON.parse(fileContent);

        activities.push(newItem);

        // Keep file size manageable (last 100 items)
        if (activities.length > 100) {
            activities.splice(0, activities.length - 100);
        }

        fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));

        return NextResponse.json(newItem);
    } catch (error) {
        console.error('Error saving activity:', error);
        return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 });
    }
}
