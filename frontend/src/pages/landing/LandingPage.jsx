import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban, CheckSquare, Zap, CalendarDays, Megaphone, BarChart3,
  ArrowRight, Users, Shield, Clock, TrendingUp, Star, Quote
} from 'lucide-react';

const FEATURES = [
  { icon: FolderKanban, title: 'Project Management', desc: 'Create, track, and manage projects with your team in real-time.' },
  { icon: CheckSquare, title: 'Task Boards', desc: 'Kanban-style boards to visualize work and move tasks across stages.' },
  { icon: Zap, title: 'Sprint Planning', desc: 'Plan sprints, track velocity, and ship faster with agile workflows.' },
  { icon: CalendarDays, title: 'Leave Management', desc: 'Apply, approve, and track leave balances effortlessly.' },
  { icon: Megaphone, title: 'Announcements', desc: 'Pin updates so your entire team stays on the same page.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Real-time dashboards with charts for projects and productivity.' },
];

const QUOTES = [
  { text: 'The strength of the team is each individual member. The strength of each member is the team.', author: 'Phil Jackson' },
  { text: 'Coming together is a beginning, staying together is progress, and working together is success.', author: 'Henry Ford' },
  { text: 'Great things in business are never done by one person. They\'re done by a team of people.', author: 'Steve Jobs' },
];

const STATS = [
  { value: '10x', label: 'Faster Delivery' },
  { value: '99%', label: 'Uptime' },
  { value: '50+', label: 'Features' },
  { value: '24/7', label: 'Support' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ──── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-extrabold">IF</span>
            </div>
            <span className="text-slate-900 font-bold text-sm tracking-tight">IFOA</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard"
                className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Sign in
                </Link>
                <Link to="/register"
                  className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero (white bg) ──── */}
      <section className="pt-32 pb-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-8"
            style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
            <Star className="w-3.5 h-3.5" />
            Internal Operations Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.05] tracking-tight mb-6"
            style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}>
            Manage your team<br />
            <span className="text-blue-700">with clarity</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-10"
            style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>
            Project tracking, task boards, sprints, leave management, and analytics — all in one powerful workspace built for modern teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
            <Link to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-lg
                hover:bg-slate-800 transition-all duration-200 shadow-sm">
              {user ? 'Open Dashboard' : 'Start for Free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-slate-700 text-sm font-semibold rounded-lg
                border border-slate-200 hover:bg-slate-50 transition-all duration-200">
              Sign in
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6"
          style={{ animation: 'fadeInUp 0.5s ease-out 0.5s both' }}>
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-slate-900">{value}</p>
              <p className="text-sm text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Image Cards (Unsplash) ──── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Why IFOA</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Built for high-performing teams</h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">From project kickoff to delivery, IFOA keeps your team aligned and productive.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop',
                title: 'Seamless Collaboration',
                desc: 'Bring your team together with shared projects, real-time task boards, and instant notifications.',
              },
              {
                img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop',
                title: 'Track & Grow',
                desc: 'Monitor productivity with rich analytics, sprint velocity tracking, and performance reports.',
              },
              {
                img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=500&fit=crop',
                title: 'Streamlined Workflows',
                desc: 'Automate repetitive processes with smart sprints, role-based access, and structured leave management.',
              },
            ].map(({ img, title, desc }, i) => (
              <div key={i} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden
                hover:shadow-xl hover:border-slate-300 transition-all duration-300 hover:-translate-y-1"
                style={{ animation: `fadeInUp 0.5s ease-out ${0.1 + i * 0.1}s both` }}>
                <div className="h-52 overflow-hidden">
                  <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl font-bold text-slate-900">Everything your team needs</h2>
            <p className="text-slate-500 mt-3 max-w-md mx-auto">
              From project planning to leave management — all in one unified workspace.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={i}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-4
                  group-hover:bg-blue-700 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-blue-700 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quotes Section ──── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Inspiration</p>
            <h2 className="text-3xl font-bold text-slate-900">Words that drive us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QUOTES.map(({ text, author }, i) => (
              <div key={i}
                className="relative bg-slate-50 rounded-2xl p-8 border border-slate-100 group
                  hover:shadow-lg hover:border-slate-200 transition-all duration-300">
                <Quote className="w-8 h-8 text-slate-200 mb-4 group-hover:text-blue-200 transition-colors" />
                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{author[0]}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ──── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl font-bold text-slate-900">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with your work email and set up your team profile in seconds.' },
              { step: '02', title: 'Set Up Projects', desc: 'Create projects, invite team members, and define your workflow stages.' },
              { step: '03', title: 'Start Delivering', desc: 'Assign tasks, plan sprints, and watch your team\'s productivity soar.' },
            ].map(({ step, title, desc }, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-5
                  text-lg font-extrabold">
                  {step}
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (dark slate, no blue) ──── */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to transform your workflow?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Join teams who use IFOA to ship faster, collaborate better, and work smarter.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-900 text-sm font-bold rounded-lg
                hover:bg-slate-100 transition-colors">
              {user ? 'Go to Dashboard' : 'Get Started — It\'s Free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer (black bg) ──── */}
      <footer className="py-10 bg-black">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-700 rounded-md flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">IF</span>
            </div>
            <span className="text-sm font-semibold text-slate-400">IFOA Management</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} IFOA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
