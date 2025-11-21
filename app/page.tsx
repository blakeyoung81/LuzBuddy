'use client';

import { useEffect, useState } from 'react';
import { UnifiedDevice } from '../types';
import DeviceCard from '../components/DeviceCard';
import { Loader2, Zap } from 'lucide-react';

import ActivityTicker from '../components/ActivityTicker';

export default function Home() {
  const [devices, setDevices] = useState<UnifiedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setError('Failed to load devices. Please check your API key.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 pb-12">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 mb-4">
            <Zap className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            LuzBuddy
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            Control your space with light.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[400px] text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}

        <ActivityTicker />
      </div>
    </main >
  );
}
