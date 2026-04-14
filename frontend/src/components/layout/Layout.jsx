import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
