import React, { useState } from 'react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import RankList from './components/RankList.tsx';

type View = 'login' | 'dashboard' | 'rankings';
type RankingContext = {
  scope: 'department' | 'batch';
  batchCode?: string | null;
};

export default function App() {
  const [view, setView] = useState<View>('login');
  const [rollNo, setRollNo] = useState<string | null>(null);
  const [rankingContext, setRankingContext] = useState<RankingContext>({ scope: 'department' });

  const handleLogin = (roll: string) => {
    setRollNo(roll);
    setView('dashboard');
  };

  const handleLogout = () => {
    setRollNo(null);
    setView('login');
  };

  const openRankings = (context?: RankingContext) => {
    setRankingContext(context || { scope: 'department' });
    setView('rankings');
  };

  const closeRankings = () => {
    setView(rollNo ? 'dashboard' : 'login');
  };

  return (
    <div className="font-sans text-gray-900 bg-[#f8f9fa] min-h-screen selection:bg-indigo-100 selection:text-indigo-600">
      {view === 'login' && (
        <Login onLogin={handleLogin} onOpenRankList={() => openRankings({ scope: 'department' })} />
      )}
      
      {view === 'dashboard' && rollNo && (
        <Dashboard 
          rollNo={rollNo} 
          onLogout={handleLogout} 
          onOpenRankList={(batchCode) => openRankings({ scope: 'batch', batchCode: batchCode || null })}
        />
      )}

      {view === 'rankings' && (
        <RankList
          onBack={closeRankings}
          defaultScope={rankingContext.scope}
          defaultBatchCode={rankingContext.batchCode || null}
        />
      )}
    </div>
  );
}
