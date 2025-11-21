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
}

export interface ControlCommand {
    device: string;
    model: string;
    cmd: {
        name: string;
        value: string | number | { r: number; g: number; b: number };
    };
}
