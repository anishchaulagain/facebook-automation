"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Facebook } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [fbStatus, setFbStatus] = useState<{ connected: boolean; pageName?: string; error?: string }>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      setSettings(res.data.settings);
      setFbStatus(res.data.facebook);
    } catch (error) {
      console.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings", settings);
      setSaveMessage("Settings saved successfully!");
      // clear message after 3s
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="animate-pulse h-96 bg-slate-800/20 rounded-xl" />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configuration</h1>
        <p className="text-slate-400 mt-1">Manage Facebook connections, automation rules, and UI preferences.</p>
      </div>

      {/* Facebook Connection Status Card */}
      <div className={cn(
        "p-6 rounded-2xl border flex items-center gap-6",
        fbStatus.connected ? "bg-indigo-500/10 border-indigo-500/20" : "bg-red-500/10 border-red-500/20"
      )}>
        <div className={cn("p-4 rounded-full", fbStatus.connected ? "bg-indigo-500/20 text-indigo-400" : "bg-red-500/20 text-red-400")}>
          <Facebook className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Facebook Graph API</h2>
          {fbStatus.connected ? (
            <p className="text-indigo-200">Connected to page: <span className="font-semibold text-white">{fbStatus.pageName}</span></p>
          ) : (
            <div className="text-red-200">
              <p className="font-semibold text-red-400 mb-1">Not Connected / Invalid Token</p>
              <p className="text-sm">{fbStatus.error || 'Check .env file keys'}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Section: Automation Rules */}
          <section>
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-6">Automation Pipeline</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Cron Schedule</label>
                <input 
                  type="text" 
                  value={settings.cron_schedule || ''}
                  onChange={(e) => handleChange('cron_schedule', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-mono text-sm"
                  placeholder="*/30 * * * *"
                />
                <p className="text-xs text-slate-500">Standard cron expression (e.g., */30 * * * * for every 30 mins)</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Default Post Language</label>
                <select 
                  value={settings.post_language || 'nepali'}
                  onChange={(e) => handleChange('post_language', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                >
                  <option value="nepali">Nepali (नेपाली)</option>
                  <option value="english">English</option>
                  <option value="unicode">Romanized / Unicode</option>
                </select>
                <p className="text-xs text-slate-500">Content language chosen when auto-posting.</p>
              </div>
            </div>
          </section>

          {/* Section: Publishing Mode */}
          <section>
             <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-6">Publishing Mode</h3>
             
             <div className="flex items-start gap-4 p-4 bg-slate-900/30 rounded-xl border border-slate-800">
               <div className="pt-1">
                 <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      id="toggle" 
                      checked={settings.auto_post === 'true'}
                      onChange={(e) => handleChange('auto_post', e.target.checked ? 'true' : 'false')}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer disabled:opacity-50 checked:right-0 checked:border-indigo-500 transition-all duration-300 z-10"
                      style={{ right: settings.auto_post === 'true' ? '0' : '1.5rem', borderColor: settings.auto_post === 'true' ? '#6366f1' : '#334155' }}
                    />
                    <label 
                      htmlFor="toggle" 
                      className={cn(
                        "toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300",
                        settings.auto_post === 'true' ? "bg-indigo-400" : "bg-slate-700"
                      )}
                    ></label>
                 </div>
               </div>
               <div>
                 <h4 className="text-slate-200 font-medium">Automatic Publishing (Auto-Post)</h4>
                 <p className="text-slate-400 text-sm mt-1">
                   When enabled, restructured news is published to Facebook immediately. When disabled, news is queued in 'Pending' status and requires manual approval from the dashboard.
                 </p>
               </div>
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-green-400">
            {saveMessage && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{saveMessage}</motion.span>}
          </span>
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
