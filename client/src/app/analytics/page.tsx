"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "@/lib/api";

const COLORS = ['#6366f1', '#10b981', '#ef4444', '#a855f7', '#f59e0b'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(res => setStats(res.data)).catch(console.error);
  }, []);

  if (!stats) return <div className="animate-pulse h-96 bg-slate-800/20 rounded-xl" />;

  const pieData = [
    { name: 'Posted', value: stats.postedCount },
    { name: 'Duplicate', value: stats.duplicateCount },
    { name: 'Failed', value: stats.failedCount },
    { name: 'Pending', value: stats.pendingCount },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-400 mt-1">Deep dive into automation metrics and performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-white font-semibold mb-6">Status Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-sm mt-4">
             {pieData.map((d, i) => (
               <div key={d.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                 <span className="text-slate-300">{d.name}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-white font-semibold mb-6">Automation Efficiency</h3>
          <div className="flex flex-col gap-6 items-center justify-center h-full pb-8">
            
            <div className="text-center">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Success Rate</p>
              <h2 className="text-5xl font-black bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mt-2">
                {stats.successRate}%
              </h2>
            </div>
            
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${stats.successRate}%` }} />
            </div>
            <p className="text-slate-500 text-sm text-center max-w-xs leading-relaxed">
              Calculated automatically based on the ratio of successfully posted news relative to API fetch attempts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
