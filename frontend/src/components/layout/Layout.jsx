import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardTopbar from './DashboardTopbar';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: '#F8FAFC' }}>
        <DashboardTopbar />
        <div className="px-6 py-5 lg:px-10 lg:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
