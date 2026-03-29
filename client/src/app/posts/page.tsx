"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Facebook, ExternalLink, RefreshCw, Check, X, FileText } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

// --- Types ---
interface Post {
  id: number;
  external_id: string;
  source_name: string;
  original_title: string;
  original_url: string;
  restructured_content: string;
  restructured_content_en: string;
  restructured_content_unicode: string;
  category: string;
  severity: string;
  status: 'pending' | 'approved' | 'posted' | 'failed' | 'duplicate' | 'skipped';
  fb_post_id: string;
  error_message: string;
  post_language: 'nepali' | 'english' | 'unicode';
  published_at: string;
  created_at: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/posts`, {
        params: { page: currentPage, limit: 12, status: statusFilter, search: searchQuery }
      });
      setPosts(res.data.posts);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [currentPage, statusFilter]);

  // Handle Search exactly on Enter
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      fetchPosts();
    }
  };

  const handleAction = async (postId: number, action: 'publish' | 'retry', language?: string) => {
    try {
      await api.post(`/posts/${postId}/${action}`, { language });
      fetchPosts();
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null);
      }
    } catch (error) {
      alert(`Action failed`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Post History</h1>
          <p className="text-slate-400 mt-1">Review, approve, and manage automated Facebook posts.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search original titles or content... (Press Enter)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'posted', 'duplicate', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                statusFilter === status 
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" 
                  : "bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Status & Source</th>
                <th className="px-6 py-4">Original Title</th>
                <th className="px-6 py-4">Language</th>
                <th className="px-6 py-4">Date processed</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No posts found</td></tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => setSelectedPost(post)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={post.status} />
                        <span className="text-slate-300 font-medium">{post.source_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[300px] truncate text-slate-200">
                      {post.original_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300 text-xs">
                        {post.post_language}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                         onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                       >
                         <FileText className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Info */}
        {!loading && posts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900/40 border-t border-slate-700/50 text-sm text-slate-400">
             <span>Page {currentPage} of {totalPages}</span>
             <div className="flex gap-2">
               <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-800"
               >Prev</button>
               <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-800"
               >Next</button>
             </div>
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900 z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={selectedPost.status} />
                    <span className="text-slate-400 text-sm">{selectedPost.source_name} • {formatDate(selectedPost.created_at)}</span>
                  </div>
                  <a href={selectedPost.original_url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-2">
                    {selectedPost.original_title} <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <button onClick={() => setSelectedPost(null)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Error Message if Failed or Duplicate Info */}
                {(selectedPost.status === 'failed' || selectedPost.status === 'duplicate') && (
                  <div className={cn("p-4 rounded-xl border text-sm", selectedPost.status === 'failed' ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-purple-500/10 border-purple-500/20 text-purple-200")}>
                    <p className="font-semibold mb-1">{selectedPost.status === 'failed' ? 'Error Details:' : 'Duplicate Reason:'}</p>
                    <p className="font-mono text-xs">{selectedPost.error_message}</p>
                  </div>
                )}

                {/* Restructured Content Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {selectedPost.restructured_content && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Nepali</span>
                        {selectedPost.status === 'pending' && (
                          <button onClick={() => handleAction(selectedPost.id, 'publish', 'nepali')} className="text-xs font-medium px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded transition-colors flex items-center gap-1">
                            <Facebook className="w-3 h-3"/> Post This
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedPost.restructured_content}</p>
                    </div>
                  )}

                  {selectedPost.restructured_content_en && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">English</span>
                        {selectedPost.status === 'pending' && (
                          <button onClick={() => handleAction(selectedPost.id, 'publish', 'english')} className="text-xs font-medium px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded transition-colors flex items-center gap-1">
                            <Facebook className="w-3 h-3"/> Post This
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedPost.restructured_content_en}</p>
                    </div>
                  )}
                  
                  {selectedPost.restructured_content_unicode && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 md:col-span-2">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Romanized (Unicode)</span>
                        {selectedPost.status === 'pending' && (
                          <button onClick={() => handleAction(selectedPost.id, 'publish', 'unicode')} className="text-xs font-medium px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded transition-colors flex items-center gap-1">
                            <Facebook className="w-3 h-3"/> Post This
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{selectedPost.restructured_content_unicode}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-800 bg-slate-900/80 sticky bottom-0 rounded-b-2xl flex justify-end gap-3">
                {selectedPost.status === 'failed' && (
                  <button onClick={() => handleAction(selectedPost.id, 'retry')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
                    <RefreshCw className="w-4 h-4"/> Retry Publish
                  </button>
                )}
                <button onClick={() => setSelectedPost(null)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors">
                  Close
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string, text: string, icon: any }> = {
    posted: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', icon: Check },
    pending: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', icon: Clock },
    failed: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: X },
    duplicate: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', icon: Copy },
    approved: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: Check },
    skipped: { bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-400', icon: X },
  };

  const config = map[status] || map.pending;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", config.bg, config.text)}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
