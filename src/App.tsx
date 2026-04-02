import React, { useState } from 'react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';

type View = 'login' | 'dashboard';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [rollNo, setRollNo] = useState<string | null>(null);

  const handleLogin = (roll: string) => {
    setRollNo(roll);
    setView('dashboard');
  };

  const handleLogout = () => {
    setRollNo(null);
    setView('login');
  };

  return (
    <div className="font-sans text-gray-900 bg-[#f8f9fa] min-h-screen selection:bg-indigo-100 selection:text-indigo-600">
      {view === 'login' && (
        <Login onLogin={handleLogin} />
      )}
      
      {view === 'dashboard' && rollNo && (
        <Dashboard 
          rollNo={rollNo} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}
