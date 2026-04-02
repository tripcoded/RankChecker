import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (rollNo: string) => void;
  onOpenRankList: () => void;
}

const BATCH_PREFIXES = [
  { name: 'IT', prefix: '2514670010' },
  { name: 'CSE', prefix: '2514750010' },
  { name: 'ECE', prefix: '2514830010' },
  { name: 'Mechanical', prefix: '2514910010' },
];

export default function Login({ onLogin, onOpenRankList }: LoginProps) {
  const [rollNo, setRollNo] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, dob }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(rollNo);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Result Portal</h1>
          <p className="text-gray-500 mt-2 text-center">Enter roll number and DOB to fetch your semester 3 result.</p>
          <button
            type="button"
            onClick={onOpenRankList}
            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            View Rank List
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Roll Number</label>
            <input
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="e.g. IT2021001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Date of Birth</label>
            <input
              type="text"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="DD-MM-YYYY"
              required
            />
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 ml-1">Quick batch prefix</p>
              <div className="flex flex-wrap gap-2">
                {BATCH_PREFIXES.map((batch) => (
                  <button
                    key={batch.prefix}
                    type="button"
                    onClick={() => setRollNo(batch.prefix)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      rollNo.startsWith(batch.prefix)
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-700'
                    }`}
                  >
                    {batch.name} ({batch.prefix})
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 ml-1">Click one, then add remaining roll digits if needed.</p>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70"
          >
            {loading ? 'Verifying...' : (
              <>
                <LogIn className="w-5 h-5" />
                Access Dashboard
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
