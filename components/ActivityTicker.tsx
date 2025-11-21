'use client';

import { useEffect, useState } from 'react';
import { ActivityItem } from '../app/api/activity/route';

export default function ActivityTicker() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/activity');
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (error) {
                console.error('Failed to fetch activity', error);
            }
        };

        fetchActivity();
        const interval = setInterval(fetchActivity, 5000);
        return () => clearInterval(interval);
    }, []);

    if (activities.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mx-auto mt-12">
            <div className="flex items-center gap-2 mb-4 px-2">
                <div className="p-1.5 bg-indigo-500/10 rounded-full text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Live Activity</h3>
            </div>

            {/* Container for the list with scroll */}
            <div className="relative max-h-[400px] overflow-y-auto custom-scrollbar mask-gradient-bottom bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex flex-col gap-3 pb-8">
                    {activities.map((item, index) => (
                        <div
                            key={item.id}
                            className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/50 p-3 rounded-xl shadow-xl animate-in slide-in-from-left-5 fade-in duration-500"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 bg-indigo-500/10 rounded-full text-indigo-400 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-400">
                                        <span className="font-semibold text-zinc-200">{item.name}</span> {item.action} <span className="text-indigo-400">{item.deviceName}</span>
                                    </div>
                                    {item.message && (
                                        <p className="text-xs text-zinc-500 mt-1 italic">"{item.message}"</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual cue for scrolling - Gradient fade at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none rounded-b-xl" />

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
}
