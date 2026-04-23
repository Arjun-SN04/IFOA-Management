/* eslint-disable no-unused-vars */
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import {
  FolderKanban, CheckSquare, Zap, CalendarDays, Megaphone, BarChart3,
  ArrowRight, Users, Shield, Clock, TrendingUp, Layers, Activity,
  Bell, GitBranch, Star, Plane, Globe, MapPin, ChevronRight, Quote,
} from 'lucide-react';
import IFOAIndia from '../../assets/IFOA_INDIA.png';
import HeroSectionImg from '../../assets/herosection_img.png';

/* ─── DATA ─────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FolderKanban, title: 'Project Management', desc: 'Create and manage projects with full visibility across your entire team.', color: '#1B4FD8', bg: '#EFF6FF' },
  { icon: CheckSquare, title: 'Task Boards', desc: 'Kanban-style boards to move tasks seamlessly across every stage.', color: '#2563EB', bg: '#EFF6FF' },
  { icon: Zap, title: 'Sprint Planning', desc: 'Agile sprints with velocity tracking to ship work consistently faster.', color: '#1D4ED8', bg: '#EFF6FF' },
  { icon: CalendarDays, title: 'Leave Management', desc: 'Apply, approve and track leave balances in one unified place.', color: '#0EA5E9', bg: '#F0F9FF' },
  { icon: Megaphone, title: 'Announcements', desc: 'Keep every member informed with pinned, real-time team updates.', color: '#3B82F6', bg: '#EFF6FF' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Real-time dashboards and charts for complete operational visibility.', color: '#1B4FD8', bg: '#EFF6FF' },
];

const WORKFLOW_STEPS = [
  { num: '01', icon: Users, title: 'Set Up Your Team', desc: 'Create an account, invite members and define roles — all in minutes.' },
  { num: '02', icon: Layers, title: 'Organise Projects', desc: 'Structure projects, assign tasks, set priorities, and define sprint goals.' },
  { num: '03', icon: TrendingUp, title: 'Track & Deliver', desc: 'Monitor progress with live dashboards and ship on schedule, every time.' },
];

const STATS = [
  { val: '100%', label: 'Internal & Private' },
  { val: '6+', label: 'Core Modules' },
  { val: 'Live', label: 'Real-Time Updates' },
  { val: '∞', label: 'Team Scalability' },
];

const ABOUT_ITEMS = [
  { icon: Shield, text: 'Role-based access for admins, managers and members' },
  { icon: Bell, text: 'Real-time socket notifications for every update' },
  { icon: Users, text: 'Unlimited team members across all departments' },
  { icon: Plane, text: 'Aviation-focused operations and compliance tracking' },
];

const TESTIMONIALS = [
  {
    name: 'Antoine de Saint-Exupéry',
    role: 'Aviator & Author',
    quote: 'A goal without a plan is just a wish. Build the systems, and the mission will follow.',
  },
  {
    name: 'Amelia Earhart',
    role: 'Pioneer Aviator',
    quote: 'The most difficult thing is the decision to act — the rest is merely tenacity.',
  },
  {
    name: 'Howard Hughes',
    role: 'Aviation Visionary',
    quote: 'I am not a man who can be pushed around or forced into doing something against my better judgment.',
  },
];

/* ─── ANIMATION HELPERS ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function RevealSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');
        * { box-sizing: border-box; }
        .serif { font-family: 'Playfair Display', serif; }
        .card-glass {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
        }
        .feature-card {
          transition: transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 60px rgba(27,79,216,0.12);
          border-color: #93C5FD;
        }
        .workflow-card-new {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          transition: transform 0.3s cubic-bezier(.22,1,.36,1), background 0.3s ease, border-color 0.3s ease;
        }
        .workflow-card-new:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.20);
        }
        .glow-btn {
          box-shadow: 0 0 0 0 rgba(37,99,235,0.5);
          transition: box-shadow 0.3s ease, transform 0.2s ease, background 0.2s ease;
        }
        .glow-btn:hover {
          box-shadow: 0 8px 40px rgba(37,99,235,0.45);
          transform: translateY(-2px);
        }
        .nav-link {
          position: relative;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: #2563EB;
          transition: width 0.3s ease;
        }
        .nav-link:hover::after { width: 100%; }
      `}</style>

      {/* ─── NAVBAR ─────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 bg-white/98 border-b border-gray-100 shadow-sm backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-5 sm:px-10 lg:px-16 xl:px-24 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-3 no-underline">
            <img src={IFOAIndia} alt="IFOA" className="h-8 w-auto object-contain" />
            <div className="flex items-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 leading-none">Management Platform</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[['Features', '#features'], ['How it Works', '#how-it-works'], ['About', '#about']].map(([label, href]) => (
              <a key={label} href={href} className="nav-link text-sm font-medium text-gray-600 transition-colors hover:text-blue-700">
                {label}
              </a>
            ))}
          </div>

          <div className="ml-2 flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="glow-btn inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white">
                {user.name} <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300">
                  Login
                </Link>
                <Link to="/register" className="glow-btn inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white">
                  Sign up <ChevronRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-start overflow-hidden pt-16">
        <motion.div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://i.pinimg.com/1200x/33/af/c2/33afc28f3f95140295a67622f9020d40.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            filter: 'brightness(1.06) contrast(1.08) saturate(1.06)',
            y: heroY,
          }}
        />
        {/* Lightweight overlay — no blue tint */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.24) 55%, rgba(0,0,0,0.34) 100%)',
        }} />

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 w-full max-w-none px-5 sm:px-10 lg:px-16 xl:px-24 pb-32 pt-20 text-left"
        >
          <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-1.5 text-xs font-medium uppercase tracking-widest text-white/80 backdrop-blur"
          >
           
            Internal Operations Platform · IFOA Aviation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="serif mb-5 text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl"
          >
            Your team's work,<br /> cleared for <br />
            <em className="text-white not-italic"> takeoff.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mb-9 max-w-lg text-base font-light leading-relaxed text-white/75 md:text-lg"
          >
            Projects, tasks, sprints, leave management and analytics — a unified command centre built exclusively for IFOA members.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="flex flex-wrap items-center justify-start gap-4"
          >
            {user ? (
              <Link
                to="/dashboard"
                className="glow-btn inline-flex items-center gap-2 rounded-full bg-blue-600 px-9 py-4 text-[15px] font-bold text-white"
              >
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="glow-btn inline-flex items-center gap-2 rounded-full bg-blue-600 px-9 py-4 text-[15px] font-bold text-white"
                >
                  Sign up <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-[15px] font-medium text-white/90 backdrop-blur transition-all hover:bg-white/20"
                >
                  Login
                </Link>
              </>
            )}
          </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="h-10 w-px bg-linear-to-b from-white/60 to-transparent"
          />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Scroll</span>
        </motion.div>
      </section>

      {/* ─── STATS STRIP — compact height ────────────────────────────────── */}
      <section className="bg-[#050F2D] px-8 py-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4"
        >
          {STATS.map(({ val, label }, idx) => (
            <motion.div
              key={label}
              variants={fadeUp}
              custom={idx}
              className={`group text-center py-3 ${idx < 3 ? 'md:border-r md:border-white/10' : ''}`}
            >
              <div className="serif mb-0.5 text-4xl font-bold leading-none text-white transition-colors group-hover:text-blue-300">{val}</div>
              <div className="text-xs tracking-wide text-white/50 transition-colors group-hover:text-white/75">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[#F8FAFF] px-8 py-28">
        <div className="mx-auto max-w-7xl">
          <RevealSection>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Platform Capabilities</div>
            <h2 className="serif mb-4 text-5xl font-bold leading-tight text-slate-900">
              Everything IFOA needs,<br />in one place.
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-slate-500">Six integrated modules, one cohesive workspace. No external tools required.</p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <motion.article
                key={title}
                variants={fadeUp}
                custom={i}
                className="feature-card cursor-default rounded-2xl border border-blue-100 bg-white p-8"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300" style={{ backgroundColor: bg }}>
                  <Icon size={20} color={color} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── WORKFLOW / HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="relative overflow-hidden px-8 py-24">
        {/* Airport tarmac background — no blue tint, neutral dark scrim only */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=1800&q=80')" }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(5,10,22,0.72)' }} />

        <div className="relative mx-auto max-w-6xl">
          <RevealSection className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Workflow</div>
            <h2 className="serif text-5xl font-bold leading-tight text-white">
              Up and running<br /><em className="text-blue-300 not-italic">in minutes</em>
            </h2>
            <p className="mt-4 text-lg font-light text-white/55">Three simple steps to transform how your team operates.</p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-5 md:grid-cols-3"
          >
            {WORKFLOW_STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <motion.article
                key={title}
                variants={fadeUp}
                custom={i}
                className="workflow-card-new group cursor-default rounded-2xl p-8 text-center"
              >
                {/* Step number — small, top right corner style */}
                <div className="mb-4 flex items-center justify-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{num}</span>
                </div>
                {/* Icon block — solid dark pill, no blue bg */}
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-all duration-300 group-hover:bg-white/16 group-hover:scale-110">
                  <Icon size={22} color="#ffffff" strokeWidth={1.6} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{desc}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── ABOUT / BUILT FOR YOUR ORG ──────────────────────────────────── */}
      <section id="about" className="overflow-hidden bg-white px-8 py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-2">
          {/* Left text */}
          <div>
            <RevealSection>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">For IFOA Members Only</div>
              <h2 className="serif mb-5 text-5xl font-bold leading-tight text-slate-900">
                Built for your<br />organisation.
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-slate-500">
                This platform is exclusively for IFOA staff, instructors and trainees. Every feature is designed around how your aviation team works.
              </p>
            </RevealSection>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="space-y-4"
            >
              {ABOUT_ITEMS.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={text}
                  variants={fadeUp}
                  custom={i}
                  className="group flex items-start gap-4 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-blue-100 hover:bg-blue-50/50"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110">
                    <Icon size={16} color="#1B4FD8" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right: mosaic visual panel */}
          <RevealSection delay={2}>
            <div className="relative h-130 w-full overflow-hidden rounded-3xl bg-[#050F2D]">
              <img
                src="https://images.unsplash.com/photo-1488998527040-85054a85150e?w=900&q=80"
                alt="Aviation control"
                className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#050F2D] via-transparent to-transparent" />

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="absolute left-6 top-8 card-glass rounded-2xl px-5 py-4"
              >
                <div className="serif text-3xl font-bold text-white">6+</div>
                <div className="text-xs text-white/60">Integrated Modules</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
                className="absolute right-6 top-16 card-glass rounded-2xl px-5 py-4"
              >
                <div className="serif text-3xl font-bold text-blue-300">Live</div>
                <div className="text-xs text-white/60">Real-time updates</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-24 left-6 card-glass rounded-2xl px-5 py-4"
              >
                <div className="serif text-3xl font-bold text-white">∞</div>
                <div className="text-xs text-white/60">Team Scalability</div>
              </motion.div>

              <div className="absolute bottom-6 inset-x-0 px-6">
                <div className="serif text-xl font-bold text-white">IFOA Aviation</div>
                <div className="text-xs text-white/50 mt-1">Unified Operations Platform</div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── QUOTES ──────────────────────────────────────────────────────── */}
      <section className="bg-[#F0F4FF] px-8 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <RevealSection>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Good Words</div>
            <h2 className="serif mb-14 text-5xl font-bold text-slate-900">Words worth flying by</h2>
          </RevealSection>

          <div className="relative min-h-55">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-2xl"
              >
                {/* Large open-quote icon */}
                <div className="mb-6 flex justify-center">
                  <Quote size={36} strokeWidth={1.4} className="text-blue-300 rotate-180" />
                </div>
                <blockquote className="serif mb-8 text-2xl font-bold leading-snug text-slate-800 italic">
                  "{TESTIMONIALS[activeTestimonial].quote}"
                </blockquote>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-px w-10 bg-blue-300 mb-3" />
                  <div className="text-sm font-semibold text-slate-900">{TESTIMONIALS[activeTestimonial].name}</div>
                  <div className="text-xs text-slate-400 tracking-wide">{TESTIMONIALS[activeTestimonial].role}</div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="mt-10 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-7 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-8 py-32 text-center">
        {/* Different image: cockpit / runway approach — distinct from hero */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80')" }}
        />
        {/* Neutral dark scrim only — no blue tint */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.40)' }} />

        <div className="relative mx-auto max-w-3xl">
          <RevealSection>
            <h2 className="serif mb-4 text-5xl font-bold leading-tight text-white md:text-6xl">
              Ready to get<br /><em className="text-white not-italic">organised?</em>
            </h2>
            <p className="mb-10 text-lg font-light text-white/75">Sign in with your IFOA credentials and take control of your team's work today.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="glow-btn inline-flex items-center gap-2 rounded-full bg-blue-600 px-10 py-4 text-[15px] font-bold text-white"
              >
                {user ? 'Go to Dashboard' : 'Access Platform'} <ArrowRight size={16} />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-[15px] font-medium text-white/80 transition-all hover:bg-white/10"
                >
                  Sign in
                </Link>
              )}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#02060F] px-8 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={IFOAIndia} alt="IFOA" className="h-8 w-auto opacity-50" />
            <span className="text-sm text-white/30">IFOA Management Platform</span>
          </div>
          <div className="flex gap-6">
            {[['Features', '#features'], ['How it Works', '#how-it-works'], ['About', '#about']].map(([l, h]) => (
              <a key={l} href={h} className="text-sm text-white/35 transition-colors hover:text-blue-300">{l}</a>
            ))}
            <Link to="/login" className="text-sm text-white/35 transition-colors hover:text-blue-300">Sign In</Link>
          </div>
          <p className="text-sm text-white/25">© {new Date().getFullYear()} IFOA. Internal use only.</p>
        </div>
      </footer>
    </div>
  );
}
