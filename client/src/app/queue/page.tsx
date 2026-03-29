"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Facebook, X, Clock, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

interface Post {
  id: number;
  original_title: string;
  source_name: string;
  post_language: string;
  created_at: string;
}

export default function QueuePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/posts`, { params: { status: 'pending', limit: 50 } });
      setPosts(res.data.posts);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: number) => {
    await api.post(`/posts/${id}/approve`);
    fetchQueue();
  };

  if (loading) return <div className="animate-pulse h-96 bg-slate-800/20 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Approval Queue</h1>
        <p className="text-slate-400 mt-1">Review pending posts before they are published to Facebook.</p>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden p-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
             <Check className="w-12 h-12 mb-4 text-slate-600 opacity-50" />
             <p>The queue is completely empty. You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-slate-700 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3"/> Pending
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{post.source_name} • {formatDate(post.created_at)}</span>
                  </div>
                  <h4 className="text-white font-medium">{post.original_title}</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase">Target Language: <span className="text-indigo-400">{post.post_language}</span></p>
                </div>
                
                <div className="flex gap-2">
                   <button onClick={() => handleApprove(post.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                     <Facebook className="w-4 h-4"/> Approve
                   </button>
                   <button onClick={async () => { await api.delete(`/posts/${post.id}`); fetchQueue(); }} className="px-4 py-2 border border-slate-700 hover:bg-red-500/10 hover:text-red-400 text-slate-300 rounded-lg text-sm font-medium transition flex items-center gap-2">
                     <X className="w-4 h-4"/> Discard
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
