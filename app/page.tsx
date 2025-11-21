'use client';

import { useEffect, useState } from 'react';
import { GoveeDevice } from '../types';
import DeviceCard from '../components/DeviceCard';
import { Loader2, Zap } from 'lucide-react';

export default function Home() {
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices');
        if (!res.ok) throw new Error('Failed to fetch devices');
        const data = await res.json();
        // The API returns { data: { devices: [...] }, message: ... }
        if (data.data && data.data.devices) {
          setDevices(data.data.devices);
        } else {
          setDevices([]);
        }
      } catch (err) {
        console.error(err);
        setError('Could not load devices. Please check your API key.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              LuzBuddy
            </h1>
            <p className="text-zinc-400 mt-2">Control your space from anywhere.</p>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-full border border-zinc-800">
            <Zap className="w-6 h-6 text-indigo-400" />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-zinc-500">Scanning for devices...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">No devices found. Make sure your Govee lights are connected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <DeviceCard key={device.device} device={device} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
