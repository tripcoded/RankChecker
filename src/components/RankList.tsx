import React, { useEffect, useState } from 'react';
import { ArrowLeft, ListOrdered } from 'lucide-react';

type Scope = 'department' | 'batch';

type RankingEntry = {
  rank: number;
  rollNo: string;
  name: string;
  value: number;
  batchCode: string;
  batchName: string;
};

type RankingPayload = {
  success: boolean;
  scope: Scope;
  batchCode: string | null;
  batchName: string | null;
  totalStudents: number;
  sgpa: RankingEntry[];
  cgpa: RankingEntry[];
};

const BATCH_PREFIXES = [
  { name: 'IT', prefix: '2514670010' },
  { name: 'CSE', prefix: '2514750010' },
  { name: 'ECE', prefix: '2514830010' },
  { name: 'Mechanical', prefix: '2514910010' },
];

interface RankListProps {
  onBack: () => void;
  defaultScope?: Scope;
  defaultBatchCode?: string | null;
}

function RankSection({ title, rows, valueLabel }: { title: string; rows: RankingEntry[]; valueLabel: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <div className="max-h-[460px] overflow-auto border border-gray-100 rounded-2xl">
        <div className="grid grid-cols-[72px_1fr_140px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
          <span>Rank</span>
          <span>Name</span>
          <span>{valueLabel}</span>
        </div>
        {rows.map((row) => (
          <div key={`${title}-${row.rollNo}`} className="grid grid-cols-[72px_1fr_140px] px-4 py-3 border-b border-gray-50 last:border-b-0">
            <span className="text-indigo-600 font-bold">#{row.rank}</span>
            <div>
              <div className="font-semibold text-gray-900">{row.name}</div>
              <div className="text-xs text-gray-500">{row.rollNo} • {row.batchName}</div>
            </div>
            <span className="font-bold text-gray-800 text-right">{row.value.toFixed(2)}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No ranking data available for this selection.</div>
        )}
      </div>
    </div>
  );
}

export default function RankList({ onBack, defaultScope = 'department', defaultBatchCode = null }: RankListProps) {
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [batchCode, setBatchCode] = useState(defaultBatchCode || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<RankingPayload | null>(null);

  useEffect(() => {
    let active = true;
    const fetchRankings = async () => {
      if (scope === 'batch' && !batchCode.trim()) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ scope });
        if (scope === 'batch') {
          params.set('batchCode', batchCode.trim());
        }
        const res = await fetch(`/api/rankings?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to fetch rankings.');
        }
        if (active) {
          setData(payload);
        }
      } catch (fetchError) {
        if (active) {
          setData(null);
          setError((fetchError as Error).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchRankings();
    return () => {
      active = false;
    };
  }, [scope, batchCode]);

  const title = scope === 'batch'
    ? `Batch Rankings${data?.batchName ? ` • ${data.batchName}` : ''}`
    : 'Department Rankings';

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-200"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                <ListOrdered className="w-7 h-7 text-indigo-600" />
                {title}
              </h1>
              <p className="text-gray-500 font-medium">
                {data ? `${data.totalStudents} students in current ranking view.` : 'Choose scope and view ranked list.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setScope('department')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                scope === 'department'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-700'
              }`}
            >
              Department
            </button>
            <button
              onClick={() => setScope('batch')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                scope === 'batch'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-700'
              }`}
            >
              Batch
            </button>
          </div>

          {scope === 'batch' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {BATCH_PREFIXES.map((batch) => (
                  <button
                    key={batch.prefix}
                    onClick={() => setBatchCode(batch.prefix)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                      batchCode === batch.prefix
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:text-indigo-700'
                    }`}
                  >
                    {batch.name} ({batch.prefix})
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={batchCode}
                onChange={(event) => setBatchCode(event.target.value)}
                placeholder="Enter batch prefix (e.g. 2514670010)"
                className="w-full max-w-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-gray-500">Loading ranks...</div>
        )}

        {!loading && error && (
          <div className="bg-red-50 rounded-3xl border border-red-100 p-5 text-red-700 font-medium">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankSection title="SGPA Rank List" rows={data?.sgpa || []} valueLabel="SGPA" />
            <RankSection title="CGPA Rank List" rows={data?.cgpa || []} valueLabel="CGPA" />
          </div>
        )}
      </div>
    </div>
  );
}

