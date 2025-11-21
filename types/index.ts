export interface UnifiedDevice {
    id: string;
    name: string;
    model: string;
    vendor: 'govee' | 'tuya';
    isOn: boolean;
    brightness: number;
    color: { r: number; g: number; b: number };
    capabilities: {
        modes: boolean;
        scenes: boolean;
        music: boolean;
    };
    // Vendor specific data can be stored here if needed
    originalData?: any;
}

export interface GoveeDevice {
    device: string;
    model: string;
    deviceName: string;
    controllable: boolean;
    retrievable: boolean;
    supportCmds: string[];
    properties?: {
        color?: { r: number; g: number; b: number };
        brightness?: number;
        powerState?: 'on' | 'off';
        online?: boolean;
    };
    capabilities?: {
        modes: string[];
        scenes: string[];
    };
}

export interface GoveeScene {
    sceneId: number;
    sceneName: string;
}

export interface GoveeDiyEffect {
    effectId: number;
    effectName: string;
}

export interface ControlCommand {
    device: string;
    model: string;
    cmd: {
        name: string;
        value: string | number | { r: number; g: number; b: number } | { id: number };
    };
}
