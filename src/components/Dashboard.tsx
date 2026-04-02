import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Users, 
  BookOpen, 
  LogOut, 
  ChevronRight, 
  BarChart3,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  rollNo: string;
  onLogout: () => void;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Dashboard({ rollNo, onLogout }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/student/${rollNo}`);
        if (!res.ok) {
          setData(null);
          setMessage('Your result is being fetched. Please check back in a moment.');
          return;
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch result');
        setMessage('Unable to fetch result right now.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rollNo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Result Not Found</h2>
        <p className="text-gray-500 mb-8">{message || 'Your result is still being processed. Please check back later.'}</p>
        <button onClick={onLogout} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">Back to Login</button>
      </div>
    );
  }

  if (data.result_status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Record Found</h2>
        <p className="text-gray-500 mb-8">{data.scrape_error || 'No record was found for these credentials on the university portal.'}</p>
        <button onClick={onLogout} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">Back to Login</button>
      </div>
    );
  }

  if (data.result_status === 'error' || data.result_status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Result Processing</h2>
        <p className="text-gray-500 mb-8">
          {data.scrape_error || 'Result scrape is still in progress or temporarily failed. Please try again shortly.'}
        </p>
        <button onClick={onLogout} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">Back to Login</button>
      </div>
    );
  }

  const chartData = (data.subjects || []).map((s: any) => ({
    name: s.subject_name,
    marks: toNullableNumber(s.marks) ?? 0,
  }));

  const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
  const cgpaValue = toNullableNumber(data.cgpa);
  const sgpaValue = toNullableNumber(data.sgpa);
  const totalMarksValue = toNullableNumber(data.total_marks);
  const cgpa = cgpaValue !== null ? cgpaValue.toFixed(2) : 'N/A';
  const sgpa = sgpaValue !== null ? sgpaValue.toFixed(2) : 'N/A';
  const branch = data.branch && data.branch !== 'N/A' ? data.branch : 'Result Portal';
  const batchRankSgpa = toNullableNumber(data.rankInBatchBySgpa);
  const batchRankCgpa = toNullableNumber(data.rankInBatchByCgpa);
  const deptRankSgpa = toNullableNumber(data.rankInDepartmentBySgpa);
  const deptRankCgpa = toNullableNumber(data.rankInDepartmentByCgpa);
  const safeBatchRankSgpa = batchRankSgpa !== null ? `#${batchRankSgpa}` : 'N/A';
  const safeBatchRankCgpa = batchRankCgpa !== null ? `#${batchRankCgpa}` : 'N/A';
  const safeDeptRankSgpa = deptRankSgpa !== null ? `#${deptRankSgpa}` : 'N/A';
  const safeDeptRankCgpa = deptRankCgpa !== null ? `#${deptRankCgpa}` : 'N/A';
  const batchSize = toNullableNumber(data.batchSize);
  const departmentSize = toNullableNumber(data.departmentSize);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Student Portal</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600 font-semibold transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest mb-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              Academic Performance
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{data.name}</h1>
            <div className="flex flex-wrap gap-4 text-gray-500 font-medium">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {branch}</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Semester {data.semester}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {data.roll_no}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-indigo-50 px-8 py-4 rounded-3xl text-center border border-indigo-100">
              <div className="text-indigo-600 text-3xl font-black">{cgpa}</div>
              <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider">CGPA</div>
            </div>
            <div className="bg-emerald-50 px-8 py-4 rounded-3xl text-center border border-emerald-100">
              <div className="text-emerald-600 text-3xl font-black">{sgpa}</div>
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">SGPA</div>
            </div>
          </div>
        </motion.div>

        {/* Ranks Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <Trophy className="w-32 h-32 text-indigo-600" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="text-indigo-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Batch Rank</h3>
              <p className="text-gray-500 mb-6 font-medium">
                Compared within {data.batchName || 'batch'} prefix {data.batchCode || 'N/A'} ({batchSize ?? 0} students).
              </p>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-indigo-600">{safeBatchRankSgpa}</span>
                  <span className="text-gray-400 font-bold uppercase tracking-wide text-xs">By SGPA</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-indigo-500">{safeBatchRankCgpa}</span>
                  <span className="text-gray-400 font-bold uppercase tracking-wide text-xs">By CGPA</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <Users className="w-32 h-32 text-emerald-600" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <Users className="text-emerald-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Department Rank</h3>
              <p className="text-gray-500 mb-6 font-medium">
                Compared across all scraped students ({departmentSize ?? 0} students).
              </p>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-600">{safeDeptRankSgpa}</span>
                  <span className="text-gray-400 font-bold uppercase tracking-wide text-xs">By SGPA</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-500">{safeDeptRankCgpa}</span>
                  <span className="text-gray-400 font-bold uppercase tracking-wide text-xs">By CGPA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts & Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="text-indigo-600 w-6 h-6" />
                Subject Analysis
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px'
                    }}
                  />
                  <Bar dataKey="marks" radius={[8, 8, 0, 0]} barSize={40}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Scoreboard</h3>
            <div className="space-y-6">
              {(data.subjects || []).map((sub: any, i: number) => (
                <div key={i} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{sub.subject_name}</div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        {sub.course_code || 'Theory + Lab'} {sub.grade_awarded ? ` • ${sub.grade_awarded}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{toNullableNumber(sub.marks) ?? 'N/A'}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Marks</div>
                  </div>
                </div>
              ))}
              {(!data.subjects || data.subjects.length === 0) && (
                <div className="text-sm text-gray-500">No subject-wise marks were detected on the source result page.</div>
              )}
            </div>
            {totalMarksValue !== null && (
              <button className="w-full mt-8 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                Total Marks: {totalMarksValue}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
