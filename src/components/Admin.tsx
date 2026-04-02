import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, 
  Play, 
  Settings, 
  Database, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  RefreshCcw
} from 'lucide-react';

interface AdminProps {
  onBack: () => void;
}

export default function Admin({ onBack }: AdminProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState({ total: 0, scraped: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-credentials', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Successfully uploaded ${data.count} credentials`);
        fetchStats();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeAll = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/scrape-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        // Poll for stats update
        const interval = setInterval(async () => {
          await fetchStats();
        }, 2000);
        setTimeout(() => clearInterval(interval), 10000);
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </button>

        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin Control</h1>
            <p className="text-gray-500 mt-2 font-medium">Manage student credentials and automated scraping tasks.</p>
          </div>
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl">
            <Settings className="text-white w-8 h-8" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <Database className="text-indigo-600 w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Credentials</div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-600 w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.scraped}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Scraped Results</div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <RefreshCcw className="text-amber-600 w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.total - stats.scraped}</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pending Tasks</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <FileSpreadsheet className="text-indigo-600 w-6 h-6" />
              Import Data
            </h3>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer relative group">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-300 group-hover:text-indigo-600 transition-colors mb-4" />
                  <p className="text-gray-500 font-bold">{file ? file.name : 'Drop Excel file here'}</p>
                  <p className="text-gray-400 text-xs mt-1">Columns: Roll No, DOB</p>
                </div>
              </div>
              <button 
                type="submit"
                disabled={!file || loading}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50"
              >
                Upload Credentials
              </button>
            </form>
          </motion.div>

          {/* Scraper Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Play className="text-emerald-600 w-6 h-6" />
                Automation
              </h3>
              <p className="text-gray-500 font-medium mb-8">
                Trigger the automated scraper to fetch results for all pending student credentials. This process runs in the background.
              </p>
            </div>
            <button 
              onClick={handleScrapeAll}
              disabled={loading || stats.total === stats.scraped}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              Start Batch Scraping
            </button>
          </motion.div>
        </div>

        {/* Feedback Messages */}
        {(message || error) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-8 p-6 rounded-3xl flex items-center gap-4 ${message ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
          >
            {message ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-bold">{message || error}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
