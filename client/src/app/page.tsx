"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, RefreshCcw, CheckCircle2, XCircle, Copy, Clock, Settings2 } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

// --- Types ---
interface Stats {
  totalPosts: number;
  postedCount: number;
  failedCount: number;
  duplicateCount: number;
  pendingCount: number;
  successRate: number;
  todayPosts: number;
  todayDuplicates: number;
}

interface Run {
  id: number;
  started_at: string;
  completed_at: string;
  news_fetched: number;
  posts_created: number;
  status: string;
}

interface Status {
  active: boolean;
  running: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<Status>({ active: false, running: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, activityRes, statusRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/activity"),
        api.get("/automation/status"),
      ]);
      setStats(statsRes.data);
      setRuns(activityRes.data.runs);
      setSchedulerStatus(statusRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualTrigger = async () => {
    if (schedulerStatus.running) return;
    try {
      setSchedulerStatus(prev => ({ ...prev, running: true }));
      await api.post("/automation/trigger");
      await fetchData();
    } catch (error) {
      console.error("Failed to trigger pipeline");
      setSchedulerStatus(prev => ({ ...prev, running: false }));
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-slate-800/20 rounded-xl" />;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      
      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-1">Real-time status of your Facebook automation pipeline.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setRefreshing(true); fetchData(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm font-medium border border-slate-700"
          >
            <RefreshCcw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          <button 
            onClick={handleManualTrigger}
            disabled={schedulerStatus.running}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 text-sm font-medium disabled:cursor-not-allowed group"
          >
            {schedulerStatus.running ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
            )}
            {schedulerStatus.running ? "Pipeline Running..." : "Run Pipeline"}
          </button>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Published" value={stats?.postedCount || 0} icon={CheckCircle2} color="text-green-400" bg="bg-green-400/10" border="border-green-400/20" />
        <StatCard title="Duplicates Caught" value={stats?.duplicateCount || 0} icon={Copy} color="text-purple-400" bg="bg-purple-400/10" border="border-purple-400/20" />
        <StatCard title="Today's Posts" value={stats?.todayPosts || 0} icon={Clock} color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" />
        <StatCard title="Success Rate" value={`${stats?.successRate || 0}%`} icon={Activity} color="text-indigo-400" bg="bg-indigo-400/10" border="border-indigo-400/20" />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-slate-800/30 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden p-6 relative">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 filter blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Automation Runs</h2>
            <Settings2 className="w-5 h-5 text-slate-500" />
          </div>
          
          <div className="space-y-4 relative z-10">
            {runs.length === 0 ? (
              <p className="text-slate-400 italic">No automation runs recorded yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-10 rounded-full",
                      run.status === 'completed' ? 'bg-green-500' : run.status === 'running' ? 'bg-indigo-500 animate-pulse' : 'bg-red-500'
                    )} />
                    <div>
                      <h4 className="font-medium text-slate-200">Run #{run.id} • {formatDate(run.started_at)}</h4>
                      <p className="text-sm text-slate-400 mt-1">Fetched: {run.news_fetched} | Posted: {run.posts_created}</p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      run.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      run.status === 'running' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    )}>
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Status Widget */}
        <motion.div variants={itemVariants} className="bg-slate-800/30 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative flex flex-col items-center justify-center text-center overflow-hidden">
           <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
          
           <div className={cn(
             "p-4 rounded-2xl mb-4 border relative z-10",
             schedulerStatus.active ? "bg-indigo-500/10 border-indigo-500/20" : "bg-slate-800 border-slate-700"
           )}>
             {schedulerStatus.active ? (
               <Play className="w-8 h-8 text-indigo-400" />
             ) : (
               <Square className="w-8 h-8 text-slate-400" />
             )}
           </div>
           
           <h3 className="text-lg font-semibold text-white relative z-10">Cron Scheduler</h3>
           <p className="text-slate-400 text-sm mt-1 mb-6 relative z-10">
             {schedulerStatus.active ? "Actively checking for new stories on schedule." : "Currently suspended."}
           </p>

           <div className="flex gap-2 w-full relative z-10">
              <button 
                onClick={async () => { await api.post('/automation/start'); fetchData(); }}
                disabled={schedulerStatus.active}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Start Auto
              </button>
              <button 
                onClick={async () => { await api.post('/automation/stop'); fetchData(); }}
                disabled={!schedulerStatus.active}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium border border-slate-700"
              >
                Stop
              </button>
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Sub-components
function StatCard({ title, value, icon: Icon, color, bg, border }: { title: string, value: string | number, icon: any, color: string, bg: string, border: string }) {
  return (
    <div className={`p-5 rounded-xl border ${border} bg-slate-800/20 backdrop-blur-sm flex items-center gap-4 transition-all hover:bg-slate-800/40 relative overflow-hidden group`}>
      <div className={`absolute -right-4 -top-4 w-16 h-16 ${bg} rounded-full blur-xl group-hover:blur-2xl transition-all duration-500`} />
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-0.5">{value}</h3>
      </div>
    </div>
  );
}
