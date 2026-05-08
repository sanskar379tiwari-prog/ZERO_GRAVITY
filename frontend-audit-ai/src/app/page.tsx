"use client";

import confetti from "canvas-confetti";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion, useMotionValue, useAnimationFrame } from "framer-motion";
import { 
  ArrowRight, 
  Search, 
  Briefcase, 
  FileText, 
  Target, 
  Activity, 
  CheckCircle2, 
  LayoutDashboard,
  Cpu,
  Trophy,
  Zap,
  ShieldCheck,
  ChevronRight,
  Filter,
  MapPin,
  Clock,
  Building,
  Upload,
  Link as LinkIcon,
  Code,
  User,
  Mail,
  Play
} from "lucide-react";

import { HeroVideoDialog } from "@/registry/magicui/hero-video-dialog";

export function InlineVideoFrame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoSrc = "https://www.youtube.com/embed/L110osBj5Kk?autoplay=1";

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer bg-black/20 backdrop-blur-sm">
      {!isPlaying ? (
        <div 
          className="relative w-full h-full"
          onClick={() => setIsPlaying(true)}
        >
          <img
            src="https://startup-template-sage.vercel.app/hero-dark.png"
            alt="Video Thumbnail"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300">
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl transform transition-transform duration-300 group-hover:scale-110">
              <Play className="w-8 h-8 fill-white text-white ml-1" />
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={videoSrc}
          title="Video player"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      )}
    </div>
  );
}

// --- Custom Logo ---
const Logo = ({ className = "h-7 w-7" }: { className?: string }) => (
  <motion.svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  >
    {/* Head */}
    <circle cx="45" cy="18" r="9" fill="#a78bfa" />
    
    {/* Torso (Leaning back slightly in mid-air) */}
    <line 
      x1="45" y1="32" x2="42" y2="58" 
      stroke="url(#logo-body-grad)" 
      strokeWidth="14" 
      strokeLinecap="round" 
    />
    
    {/* Back Leg (Pushing off / Trailing) */}
    <path 
      d="M 42 58 L 32 75 L 25 88" 
      stroke="#7c5cfc" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill="none" 
    />
    
    {/* Front Leg (High joyful knee kick) */}
    <path 
      d="M 42 58 L 60 50 L 60 72" 
      stroke="#8b5cf6" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill="none" 
    />

    {/* Arm punching upward in victory */}
    <line x1="45" y1="35" x2="70" y2="20" stroke="#c084fc" strokeWidth="10" strokeLinecap="round" />

    {/* The Glowing Briefcase (Held high!) */}
    <g className="drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
      {/* Bag Body */}
      <rect x="60" y="24" width="22" height="15" rx="3" fill="#22d3ee" />
      {/* Handle */}
      <path d="M 66 24 V 20 C 66 19 67 18 68 18 H 74 C 75 18 76 19 76 20 V 24" stroke="#22d3ee" strokeWidth="2.5" fill="none" />
    </g>

    <defs>
      <linearGradient id="logo-body-grad" x1="45" y1="32" x2="42" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EC4899" />
        <stop offset="1" stopColor="#7c5cfc" />
      </linearGradient>
    </defs>
  </motion.svg>
);

// --- Custom Cursor ---
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, [role='button']")) setIsHovering(true);
      else setIsHovering(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none hidden md:block"
      animate={{
        x: position.x - (isHovering ? 20 : 10),
        y: position.y - (isHovering ? 20 : 10),
        scale: isHovering ? 2 : 1,
      }}
      transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
    >
      <div className={`rounded-full transition-all duration-300 ${isHovering ? "h-10 w-10 bg-purple-500/20 border border-purple-500/40" : "h-5 w-5 border border-purple-500/50 bg-purple-500/10 shadow-[0_0_15px_rgba(139,92,246,0.3)]"}`} />
    </motion.div>
  );
};

// --- 3D Hover Card Component ---
const Hover3DCard = ({ label, value, desc }: { label: string, value: string, desc: string }) => {
  return (
    <div className="td-container">
      <div className="td-canvas">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className={`td-tracker tr-${i + 1}`}></div>
        ))}
        <div className="td-card p-6 md:p-8">
          <div className="relative z-10 flex flex-col items-center justify-center text-center h-full w-full">
            <div className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2 drop-shadow-sm">{label}</div>
            <div className="text-xl md:text-2xl font-extrabold text-white mb-2 drop-shadow-md">{value}</div>
            <div className="text-xs text-[#94a3b8] font-bold">{desc}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Shine Border Component ---
interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

const ShineBorder = ({
  borderWidth = 1.5,
  duration = 10,
  shineColor = ["#7c5cfc", "#EC4899", "#22d3ee"],
  className,
  style,
  ...props
}: ShineBorderProps) => {
  return (
    <div
      style={{
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        backgroundImage: `radial-gradient(transparent,transparent, ${
          Array.isArray(shineColor) ? shineColor.join(",") : shineColor
        },transparent,transparent)`,
        backgroundSize: "300% 300%",
        mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: "var(--border-width)",
        ...style,
      } as React.CSSProperties}
      className={`pointer-events-none absolute inset-0 w-full h-full rounded-[inherit] will-change-[background-position] animate-[shine_var(--duration)_infinite_linear] ${className || ""}`}
      {...props}
    />
  );
};

// --- Gradient Text Component ---
interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  pauseOnHover?: boolean;
  yoyo?: boolean;
}

function GradientText({
  children,
  className = '',
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  animationSpeed = 8,
  showBorder = false,
  direction = 'horizontal',
  pauseOnHover = false,
  yoyo = true
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const animationDuration = animationSpeed * 1000;

  useAnimationFrame(time => {
    if (isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        progress.set((cycleTime / animationDuration) * 100);
      } else {
        progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
      }
    } else {
      progress.set((elapsedRef.current / animationDuration) * 100);
    }
  });

  useEffect(() => {
    elapsedRef.current = 0;
    progress.set(0);
  }, [animationSpeed, yoyo]);

  const backgroundPosition = useTransform(progress, p => {
    if (direction === 'horizontal') {
      return `${p}% 50%`;
    } else if (direction === 'vertical') {
      return `50% ${p}%`;
    } else {
      return `${p}% 50%`;
    }
  });

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  const gradientAngle =
    direction === 'horizontal' ? 'to right' : direction === 'vertical' ? 'to bottom' : 'to bottom right';
  const gradientColors = [...colors, colors[0]].join(', ');

  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize: direction === 'horizontal' ? '300% 100%' : direction === 'vertical' ? '100% 300%' : '300% 300%',
    backgroundRepeat: 'repeat'
  };

  return (
    <motion.span
      className={`relative inline-block transition-shadow duration-500 ${showBorder ? 'overflow-hidden py-1 px-2 rounded-[1.25rem]' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder && (
        <motion.span
          className="absolute inset-0 z-0 pointer-events-none rounded-[1.25rem]"
          style={{ ...gradientStyle, backgroundPosition }}
        >
          <span
            className="absolute bg-black rounded-[1.25rem] z-[-1]"
            style={{
              width: 'calc(100% - 2px)',
              height: 'calc(100% - 2px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </motion.span>
      )}
      <motion.span
        className="inline-block relative z-2 text-transparent bg-clip-text"
        style={{ ...gradientStyle, backgroundPosition, WebkitBackgroundClip: 'text' }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

// --- Aurora Text Component ---
function AuroraText({ children, className = "" }: { children: ReactNode, className?: string }) {
  return (
    <motion.span
      className={`inline-block text-transparent bg-clip-text ${className}`}
      style={{
        backgroundImage: 'linear-gradient(to right, #d8b4fe, #ec4899, #8b5cf6, #ec4899, #d8b4fe)',
        backgroundSize: '200% auto',
      }}
      animate={{
        backgroundPosition: ["0% center", "-200% center"],
      }}
      transition={{
        duration: 8,
        ease: "linear",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.span>
  );
}

// --- Navbar ---
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? "py-3 px-6" : "py-6 px-6 lg:px-12"}`}>
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/[0.07] bg-[#07090f]/80 px-6 py-3.5 backdrop-blur-xl transition-all flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-heading text-xl font-extrabold tracking-tight drop-shadow-md">
          <Logo className="h-8 w-8" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Zero Gravity AI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-[#94a3b8]">
          <a href="#workflow" className="hover:text-white transition-colors duration-200">Workflow</a>
          <a href="#dashboard" className="hover:text-white transition-colors duration-200">Dashboard</a>
          <a href="#capabilities" className="hover:text-white transition-colors duration-200">Capabilities</a>
        </div>

        <button 
          onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
          className="primary-cta rounded-full bg-[#7c5cfc] px-8 py-2.5 text-sm font-bold text-white hover:bg-[#9b7eff] transition-all shadow-[0_2px_12px_rgba(124,92,252,0.35)] active:scale-95"
        >
          Launch App
        </button>
      </div>
    </nav>
  );
};

// --- Component: ZeroGravityForm ---
const ZeroGravityForm = () => {
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [availability, setAvailability] = useState("Flexible");
  const [aboutText, setAboutText] = useState("");
  const [previewData, setPreviewData] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isMatching) {
      const timer = setTimeout(() => {
        setIsMatching(false);
        setHasResults(true);
        // Trigger celebratory confetti when results are "found"
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7c5cfc', '#EC4899', '#22d3ee'],
          disableForReducedMotion: true
        });
        
        // Auto-scroll to dashboard to show results
        setTimeout(() => {
          document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
        }, 800);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isMatching]);

  const handleCollectLinks = () => {
    setPreviewData(`Target: ${targetRole || 'Any'} in ${location || 'Any'}\nGitHub: ${githubUrl || 'None'}\nLinkedIn: ${linkedinUrl || 'None'}\nAvailability: ${availability}\nAbout: ${aboutText}`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  const inputStyle = "w-full bg-[#161b27] border border-[rgba(255,255,255,0.1)] rounded-xl px-5 py-4 text-base text-[#f8fafc] font-medium placeholder-[#64748b] focus:outline-none focus:border-[rgba(124,92,252,0.8)] focus:ring-[3px] focus:ring-[rgba(124,92,252,0.15)] transition-all";
  const labelStyle = "block text-[0.7rem] font-semibold text-[#94a3b8] uppercase tracking-[0.06em] mb-1.5";

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className="card-spotlight bg-[#0d1117] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-8 md:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-4xl mx-auto text-left relative overflow-hidden">
      <div className="relative z-10 space-y-6">
        {/* Dropzone */}
        <div className="upload-zone w-full rounded-xl border border-dashed border-[rgba(124,92,252,0.4)] bg-[rgba(124,92,252,0.04)] p-9 text-center cursor-pointer">
          <div className="mb-3 flex justify-center">
            <Upload className="h-8 w-8 text-[#a78bfa]" />
          </div>
          <p className="text-[#94a3b8] font-medium text-sm">
            Drop resume PDF or click to upload <span className="text-[#4b5670] text-xs">(optional)</span>
          </p>
        </div>

        {/* Fix 6: Form Labels + Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Target Role</label>
            <input 
              type="text" 
              placeholder="e.g. Frontend Developer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>Preferred Location</label>
            <input 
              type="text" 
              placeholder="e.g. Remote, NYC"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>GitHub URL</label>
            <input 
              type="text" 
              placeholder="github.com/yourusername"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>LinkedIn Profile URL</label>
            <input 
              type="text" 
              placeholder="linkedin.com/in/yourusername"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Availability</label>
            <div className="relative">
              <select 
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className={`${inputStyle} appearance-none bg-[#1a2035] text-white`}
              >
                <option value="Flexible">Flexible</option>
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="h-4 w-4 text-[#e8ecf4] rotate-90" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelStyle}>LinkedIn About</label>
            <textarea 
              placeholder="Paste your LinkedIn summary..."
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className={`${inputStyle} h-[58px] resize-none overflow-hidden py-4`}
            />
          </div>
        </div>

        {/* Fix 3: Preview Box */}
        <div className={`rounded-xl bg-[#141928] border ${previewData ? 'border-[rgba(52,211,153,0.35)]' : 'border-[rgba(255,255,255,0.08)]'} p-6 transition-all`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[0.72rem] font-bold text-[#94a3b8] uppercase tracking-[0.1em]">Collected Info Preview</span>
            <button 
              onClick={handleCollectLinks}
              className="px-4 py-2 bg-[#1e2848] text-[#f8fafc] text-xs font-bold rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(124,92,252,0.2)] hover:border-[rgba(124,92,252,0.6)] transition-all"
            >
              Collect From Links
            </button>
          </div>
          <div className="text-sm text-[#cbd5e1] font-medium min-h-[60px] whitespace-pre-wrap">
            {previewData || "Data extracted from links will appear here..."}
          </div>
        </div>

        {/* Fix 5: CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <button 
            onClick={() => {
              if (hasResults) {
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 },
                  colors: ['#7c5cfc', '#EC4899', '#22d3ee'],
                  disableForReducedMotion: true
                });
                document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setIsMatching(true);
              }
            }}
            className={`min-w-[160px] text-white text-[0.9rem] font-bold px-9 py-3 rounded-full hover:-translate-y-0.5 transition-all active:scale-95 ${
              hasResults 
                ? "bg-[#EC4899] shadow-[0_2px_16px_rgba(236,72,153,0.45)] hover:bg-[#f472b6] hover:shadow-[0_4px_28px_rgba(236,72,153,0.6)]" 
                : "bg-[#7c5cfc] shadow-[0_2px_16px_rgba(124,92,252,0.45)] hover:bg-[#9b7eff] hover:shadow-[0_4px_28px_rgba(124,92,252,0.6)]"
            }`}
          >
            {isMatching ? "Finding Matches..." : hasResults ? "View Results 🎉" : "Start Matching"}
          </button>
          <button 
            onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
            className="min-w-[160px] bg-transparent text-white text-[0.9rem] font-bold px-9 py-3 rounded-full border-[1.5px] border-white/20 hover:bg-white/5 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all active:scale-95"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Fix 4: Showcase Section ---
const ShowcaseSection = () => (
  <section className="pt-[clamp(4.5rem,7vw,8rem)] pb-[clamp(4rem,6vw,7rem)] px-[clamp(1.5rem,5vw,4rem)] relative bg-[#080a12] border-t border-white/5 overflow-hidden">
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[rgba(124,92,252,0.15)] blur-[120px] rounded-full pointer-events-none" />
    <div className="max-w-[900px] mx-auto text-center relative z-10">
      <h2 className="font-heading font-extrabold tracking-[-0.03em] leading-[1.0] mb-0">
        <span className="text-white block text-[clamp(2.6rem,4.5vw+1rem,5.5rem)]">Generic resumes</span>
        <div className="flex items-center justify-center gap-[0.35em] mt-2 text-[clamp(2.6rem,4.5vw+1rem,5.5rem)]">
          <div className="w-[0.35em] h-[0.35em] bg-[#7c5cfc] rounded-full animate-pulse-dot shadow-[0_0_10px_rgba(124,92,252,0.8)] relative -top-[0.06em]" />
          <span className="text-white opacity-[0.7] italic">don't </span>
          <GradientText className="inline-block" colors={['#d8b4fe', '#8b5cf6', '#c084fc']}>convert.</GradientText>
        </div>
      </h2>
      <p className="text-[#94a3b8] text-[clamp(0.88rem,1.4vw,1rem)] font-medium leading-[1.7] max-w-[44ch] mx-auto mt-6">
        Stop sending the same resume to 50 jobs. Start winning with one.
      </p>
    </div>
  </section>
);

// --- Framer Motion variants ---
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } }
};
const heroWord = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
};
const revealUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
};
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};
const listItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }
};

// --- 1. Hero Section ---
const HeroSection = () => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 350], [1, 0]);
  const shouldReduceMotion = useReducedMotion();

  const words1 = ["Find", "Matches."];
  const words2 = ["Score,", "Tailor,"];
  const words3 = ["Apply"];

  return (
    <section id="hero" className="relative flex flex-col items-center pt-[clamp(7rem,11vw,11rem)] pb-[clamp(4rem,6vw,6rem)] px-6 overflow-visible bg-[#07090f] border-b border-white/[0.05]">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(124,92,252,0.12),transparent_70%)]" />
      </div>

      <motion.div style={{ opacity }} className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow-pill mb-10 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2 backdrop-blur-xl"
        >
          <Activity className="h-3 w-3 text-[#7c5cfc]" />
          <span className="text-[0.68rem] font-semibold text-[#94a3b8] uppercase tracking-[0.12em]">Intelligent Job Orchestration</span>
        </motion.div>

        <motion.h1
          variants={shouldReduceMotion ? {} : heroContainer}
          initial="hidden"
          animate="show"
          className="font-heading font-extrabold tracking-[-0.03em] leading-[1.05] text-white mb-6 max-w-[820px] mx-auto text-[clamp(3rem,5.5vw+1rem,5.5rem)]"
        >
          <span className="block">
            {words1.map((w) => (
              <motion.span key={w} variants={heroWord} className="inline-block mr-[0.25em]">{w}</motion.span>
            ))}
          </span>
          <span className="block">
            {words2.map((w) => (
              <motion.span key={w} variants={heroWord} className="inline-block mr-[0.25em]">{w}</motion.span>
            ))}
          </span>
          <span className="block">
            {words3.map((w) => (
              <motion.span key={w} variants={heroWord} className="inline-block mr-[0.25em]">{w}</motion.span>
            ))}
            <motion.span variants={heroWord} className="inline-block">
              <GradientText colors={['#a78bfa', '#EC4899', '#7c5cfc']}>Faster.</GradientText>
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-[#64748b] font-normal leading-[1.75] max-w-[44ch] mx-auto text-[clamp(0.88rem,1.4vw,1.02rem)]"
        >
          Upload your resume. Connect your profiles.<br />Let AI do the scoring, tailoring, and matching.
        </motion.p>
      </motion.div>
    </section>
  );
};

// --- 2. Problem Section ---
const ProblemSection = () => (
  <section className="py-40 px-6 bg-[#050507] relative overflow-hidden border-b border-white/5">
    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[800px] h-[800px] spotlight-purple opacity-5 pointer-events-none" />
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-24 items-center relative z-10">
      <div>
        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-8">
          The traditional job search is fundamentally broken.
        </h2>
        <p className="text-xl text-gray-200 leading-relaxed mb-12 max-w-lg font-semibold">
          Disconnected platforms, generic applications, and lack of clarity. We've replaced the noise with a unified orchestration engine designed for high-potential candidates.
        </p>
        <ul className="space-y-6">
          {[
            "Eliminate context switching between boards",
            "Automatic resume tailoring for every role",
            "Data-driven matching and precision scoring"
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-4 text-white font-bold text-lg">
              <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative w-full max-w-[680px] mx-auto lg:ml-auto">
        <InlineVideoFrame />
      </div>
    </div>
  </section>
);



// --- 3. Resume Forge Section (Proof of Value) ---
const ResumeForgeSection = () => {
  const [activeTab, setActiveTab] = useState("after");

  return (
    <section className="py-40 px-6 bg-[#050507] relative overflow-hidden border-b border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] spotlight-magenta opacity-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-magenta-500/20 bg-magenta-500/5 px-4 py-1.5 text-xs font-black tracking-widest text-magenta-400 uppercase shadow-lg shadow-magenta-500/10"
            >
              <Zap className="h-4 w-4 text-magenta-500" />
              The Resume Forge
            </motion.div>
            <h2 className="font-heading text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-8 drop-shadow-lg">
              Generic resumes <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-purple-400 drop-shadow-2xl">don't convert.</span>
            </h2>
            <p className="text-xl text-white font-bold leading-relaxed mb-12 max-w-lg drop-shadow-md">
              Our engine doesn't just reword your experience. It re-architects your profile to match the exact high-signal keywords and technical nuances recruiters are looking for.
            </p>
            
            <div className="space-y-6">
              {[
                { title: "Dynamic Keyword Alignment", desc: "Injects missing technical signals found in the job description." },
                { title: "Impact Quantization", desc: "Transforms vague bullets into data-driven achievement statements." },
                { title: "ATS Optimization", desc: "Ensures your resume passes through filters with a 95%+ score." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-magenta-500/30 hover:bg-white/10 transition-all cursor-default group shadow-xl">
                  <div className="h-10 w-10 rounded-xl bg-magenta-600/20 flex items-center justify-center shrink-0 border border-magenta-500/30 group-hover:bg-magenta-500 transition-colors">
                    <Zap className="h-5 w-5 text-magenta-400 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold mb-1 drop-shadow-sm">{item.title}</h4>
                    <p className="text-gray-300 text-sm font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="flex gap-2 mb-8 bg-black/60 p-2 rounded-full border border-white/20 w-fit mx-auto lg:mx-0 shadow-2xl backdrop-blur-xl">
              <button 
                onClick={() => setActiveTab("before")}
                className={`px-8 py-2.5 rounded-full text-xs font-black tracking-widest transition-all ${activeTab === "before" ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
              >
                STANDARD
              </button>
              <button 
                onClick={() => setActiveTab("after")}
                className={`px-8 py-2.5 rounded-full text-xs font-black tracking-widest transition-all ${activeTab === "after" ? "bg-magenta-600 text-white shadow-xl shadow-magenta-600/40" : "text-gray-400 hover:text-white"}`}
              >
                FORGED
              </button>
            </div>

            <div className="aspect-[4/5] rounded-[3rem] bg-black/60 border border-white/20 p-12 backdrop-blur-3xl relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 spotlight-magenta opacity-20 pointer-events-none" />
              <div className="relative z-10 space-y-10">
                <div className="flex justify-between items-center border-b border-white/10 pb-8">
                  <div className="space-y-3">
                    <div className="h-7 w-56 bg-white/20 rounded-lg shadow-sm" />
                    <div className="h-3 w-36 bg-white/10 rounded-lg" />
                  </div>
                  <div className={`h-16 w-16 rounded-full border-2 flex flex-col items-center justify-center shadow-xl transition-all duration-500 ${activeTab === "after" ? "border-magenta-500 bg-magenta-500/10" : "border-white/10 bg-white/5"}`}>
                    <span className={`text-[10px] font-black uppercase ${activeTab === "after" ? "text-magenta-400" : "text-gray-500"}`}>Score</span>
                    <span className={`text-xl font-black ${activeTab === "after" ? "text-white" : "text-gray-500"}`}>{activeTab === "after" ? "98" : "62"}</span>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="h-4 w-36 bg-white/20 rounded-md" />
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-white/5 rounded-md" />
                      <div className="h-3 w-11/12 bg-white/5 rounded-md" />
                      <div className={`h-3 w-4/5 rounded-md transition-all duration-700 ${activeTab === "after" ? "bg-magenta-500/40 border border-magenta-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]" : "bg-white/5"}`} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="h-4 w-44 bg-white/20 rounded-md" />
                    <div className="space-y-3">
                      <div className={`h-3 w-full rounded-md transition-all duration-700 ${activeTab === "after" ? "bg-purple-500/40 border border-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]" : "bg-white/5"}`} />
                      <div className="h-3 w-full bg-white/5 rounded-md" />
                      <div className="h-3 w-5/6 bg-white/5 rounded-md" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <div className={`h-10 w-full rounded-xl flex items-center justify-center gap-3 transition-all ${activeTab === "after" ? "bg-magenta-600/20 border border-magenta-500/30" : "bg-white/5 border border-white/10 opacity-30"}`}>
                      <CheckCircle2 className={`h-4 w-4 ${activeTab === "after" ? "text-magenta-400" : "text-gray-500"}`} />
                      <span className={`text-[10px] font-black tracking-widest uppercase ${activeTab === "after" ? "text-magenta-300" : "text-gray-500"}`}>
                        Tailored for Senior Frontend Role
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
const HowItWorksSection = () => (
  <section id="workflow" className="py-40 px-6 bg-[#050507] border-y border-white/5 overflow-hidden">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-24">
        <p className="text-[10px] font-extrabold tracking-[0.3em] text-purple-300 uppercase mb-4 drop-shadow-md">The Orchestration Engine</p>
        <h2 className="font-heading text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] drop-shadow-2xl">Data to Dashboard in seconds.</h2>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent -translate-y-1/2" />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative z-10">
          {[
            { step: "01", icon: Upload, title: "Connect Profile", desc: "Upload resume and paste links." },
            { step: "02", icon: Cpu, title: "AI Processing", desc: "Models extract and structure identity." },
            { step: "03", icon: Target, title: "Match & Rank", desc: "Score profile against live opportunities." },
            { step: "04", icon: LayoutDashboard, title: "Dashboard", desc: "Execute from a tailored interface." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-black/60 border-2 border-white/20 shadow-[0_0_50px_rgba(139,92,246,0.1)] flex items-center justify-center mb-6 relative z-10 group hover:border-purple-500 transition-all backdrop-blur-xl">
                <item.icon className="h-8 w-8 text-gray-200 group-hover:text-purple-400 transition-colors" />
                <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black border-2 border-[#050507] shadow-lg">
                  {item.step}
                </div>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-white mb-3 drop-shadow-md">{item.title}</h3>
              <p className="text-sm text-white font-bold max-w-[200px] leading-relaxed drop-shadow-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// --- 5. Product Dashboard Showcase ---
const DashboardShowcase = () => {
  const [activeJob, setActiveJob] = useState(0);
  const [tailoring, setTailoring] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const jobs = [
    { company: "Stripe", role: "Senior Frontend Engineer", score: "94%" },
    { company: "Linear", role: "Product Engineer", score: "88%" },
    { company: "Vercel", role: "DX Engineer", score: "82%" }
  ];

  const handleTailor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTailoring(true);
    setTimeout(() => setTailoring(false), 2000);
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDrafting(true);
    setTimeout(() => setDrafting(false), 2000);
  };

  return (
    <section id="dashboard" className="py-40 px-6 bg-[#050507] relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[1000px] h-[1000px] spotlight-purple opacity-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="font-heading text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-8 drop-shadow-2xl">
            A command center for <GradientText className="inline-block drop-shadow-2xl" colors={['#d8b4fe', '#EC4899', '#c084fc']}>your career.</GradientText>
          </h2>
          <p className="text-xl text-white max-w-2xl mx-auto leading-relaxed font-bold drop-shadow-xl">Precision matching meets elegant design. Track, analyze, and execute your job search from a single, high-performance interface.</p>
        </div>

        <div className="rounded-[3rem] border border-white/20 bg-black/60 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col lg:flex-row h-auto lg:h-[750px] backdrop-blur-3xl relative group">
          {/* Mock Sidebar */}
          <div className="w-full lg:w-72 border-r border-white/10 p-8 flex flex-col relative z-10 bg-black/60">
            <div className="flex items-center gap-3 mb-12">
              <Logo className="h-7 w-7" />
              <span className="font-heading font-extrabold text-white text-lg tracking-tight">Zero Gravity</span>
            </div>
            
            <div className="space-y-3">
              {["Matches", "Applications", "Resumes", "Settings"].map((item, idx) => (
                <div key={idx} className={`px-5 py-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all cursor-pointer ${idx === 0 ? "bg-purple-600 text-white shadow-xl shadow-purple-600/30" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Mock Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            {/* Header */}
            <div className="h-24 border-b border-white/10 flex items-center justify-between px-10 bg-black/40">
              <h2 className="font-heading text-xl font-bold text-white">Precision Feed</h2>
              <button className="h-11 px-6 rounded-full bg-white text-black text-sm font-extrabold hover:bg-gray-100 transition-all shadow-xl active:scale-95">
                REFRESH FEED
              </button>
            </div>

            {/* List Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-[#07090f] custom-scrollbar">
              <motion.div
                variants={listVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="max-w-4xl mx-auto space-y-4"
              >
                {jobs.map((job, idx) => (
                  <motion.div
                    variants={listItem}
                    key={idx}
                    onClick={() => setActiveJob(idx)}
                    className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden group/card ${
                      activeJob === idx
                        ? "bg-[rgba(124,92,252,0.08)] border-[rgba(124,92,252,0.35)] shadow-lg"
                        : "bg-[#0d1117] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-0.5"
                    }`}
                  >
                    {activeJob === idx && (
                      <ShineBorder shineColor={["#7c5cfc", "#EC4899"]} borderWidth={1.5} duration={8} />
                    )}

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <h3 className="font-heading text-base font-bold text-white">{job.role}</h3>
                        <p className="text-[#64748b] text-sm mt-0.5">{job.company} · Remote</p>
                      </div>
                      <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                        activeJob === idx ? "bg-[rgba(124,92,252,0.2)] text-[#a78bfa]" : "bg-white/5 text-[#64748b]"
                      }`}>
                        {job.score} fit
                      </div>
                    </div>
                    <div className="flex gap-3 relative z-10">
                      <button
                        onClick={handleTailor}
                        className="h-9 px-4 rounded-lg bg-[#7c5cfc] text-white text-xs font-semibold hover:bg-[#9b7eff] transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        {tailoring && activeJob === idx ? <Activity className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        {tailoring && activeJob === idx ? "Tailoring..." : "Tailor Resume"}
                      </button>
                      <button
                        onClick={handleDraft}
                        className="h-9 px-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#94a3b8] text-xs font-semibold hover:bg-white/10 transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        {drafting && activeJob === idx ? <Activity className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                        {drafting && activeJob === idx ? "Drafting..." : "Draft Email"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- 7. Key Capabilities & 8. What Users Get ---
const CapabilitiesSection = () => (
  <section id="capabilities" className="py-40 px-6 bg-[#050507]">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-32">
        <h2 className="font-heading text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-8 drop-shadow-2xl">Core Capabilities.</h2>
        <p className="text-xl text-white max-w-2xl mx-auto leading-relaxed font-bold drop-shadow-xl">From raw signals to high-fidelity application artifacts.</p>
      </div>

      <motion.div
        variants={listVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          {
            title: "Fit Scoring",
            desc: "Mathematical alignment between your profile and job vectors.",
            visual: (
              <div className="relative flex items-center justify-center mb-6">
                <svg viewBox="0 0 80 80" className="w-20 h-20">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#7c5cfc" strokeWidth="6"
                    strokeDasharray={`${0.87 * 201} ${201}`} strokeLinecap="round"
                    transform="rotate(-90 40 40)" />
                </svg>
                <span className="absolute text-base font-bold text-white">87%</span>
              </div>
            )
          },
          {
            title: "Dynamic Tailoring",
            desc: "Real-time resume adjustment for every opportunity.",
            visual: (
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#64748b]" />
                  <div className="h-2 flex-1 rounded bg-[rgba(255,255,255,0.06)]" />
                  <div className="h-2 w-10 rounded bg-[rgba(255,255,255,0.06)]" />
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(124,92,252,0.08)] border border-[rgba(124,92,252,0.2)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7c5cfc]" />
                  <div className="h-2 flex-1 rounded bg-[rgba(124,92,252,0.3)]" />
                  <div className="h-2 w-10 rounded bg-[rgba(124,92,252,0.2)]" />
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#64748b]" />
                  <div className="h-2 flex-1 rounded bg-[rgba(255,255,255,0.06)]" />
                  <div className="h-2 w-12 rounded bg-[rgba(255,255,255,0.06)]" />
                </div>
              </div>
            )
          },
          {
            title: "Signal Extraction",
            desc: "Deep inference from GitHub, LinkedIn, and PDFs.",
            visual: (
              <div className="flex gap-2 justify-center mb-6">
                {["GitHub", "LinkedIn", "PDF"].map((s) => (
                  <div key={s} className="px-2.5 py-1.5 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[0.65rem] text-[#64748b] font-medium">{s}</div>
                ))}
              </div>
            )
          }
        ].map((item, i) => (
          <motion.div variants={listItem} key={i} className="feature-card relative overflow-hidden p-8 rounded-2xl bg-[#0d1117] border border-[rgba(255,255,255,0.05)] cursor-default">
            <ShineBorder />
            <div className="relative z-10">
              {item.visual}
              <div className="h-px w-8 bg-[rgba(255,255,255,0.1)] mb-4" />
              <h3 className="font-heading font-bold text-lg text-white tracking-tight mb-2">{item.title}</h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);


const DifferentiationSection = () => (
  <section className="py-40 px-6 bg-[#050507] border-t border-white/5 overflow-hidden">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
      <div>
        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-10 drop-shadow-lg leading-tight">Built for the<br />modern builder.</h2>
        <div className="space-y-8">
          {[
            { title: "Beyond Job Boards", text: "Job boards are static lists. Zero Gravity is an active engine that pulls jobs, scores them against you, and prepares your application." },
            { title: "Beyond Generic Chatbots", text: "Instead of chatting with an LLM to rewrite your resume, the orchestration engine does it programmatically for every matched role." },
            { title: "End-to-End Control", text: "From discovery to outreach drafting to status tracking, it's a unified command center." }
          ].map((item, i) => (
            <div key={i} className="pb-8 border-b border-white/10 group">
              <h4 className="font-heading font-extrabold text-xl mb-3 text-white group-hover:text-purple-400 transition-colors drop-shadow-sm">{item.title}</h4>
              <p className="text-gray-200 font-semibold leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white/5 rounded-[3rem] p-12 text-white border border-white/20 relative overflow-hidden flex flex-col justify-center shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
        <div className="absolute top-0 right-0 w-80 h-80 spotlight-purple opacity-30" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-extrabold mb-8 text-purple-300 shadow-xl">
            <Trophy className="h-4 w-4 text-purple-400" /> Hackathon Build Quality
          </div>
          <h3 className="font-heading text-4xl font-extrabold mb-6 drop-shadow-lg">Shippable Reality.</h3>
          <p className="text-gray-100 text-xl font-bold leading-relaxed mb-10 drop-shadow-md">
            Built with production-grade architecture. FastAPI backend, semantic vector matching, real-time APIs, and a high-performance Next.js interface.
          </p>
        <div className="grid grid-cols-2 gap-4">
            <div className="metric-card bg-[#0d1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
              <div className="text-2xl font-bold text-white mb-1">~200ms</div>
              <div className="text-[0.68rem] font-medium text-[#7c5cfc] uppercase tracking-widest">Vector Latency</div>
            </div>
            <div className="metric-card bg-[#0d1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
              <div className="text-2xl font-bold text-white mb-1">100%</div>
              <div className="text-[0.68rem] font-medium text-[#7c5cfc] uppercase tracking-widest">Automation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const HackathonImpactSection = () => (
  <section className="py-40 px-6 bg-black relative overflow-hidden border-t border-white/5">
    <div className="absolute top-0 left-0 w-full h-full spotlight-purple opacity-5 pointer-events-none" />
    <div className="max-w-4xl mx-auto text-center relative z-10">
      <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-8 drop-shadow-lg">Engineering Credibility.</h2>
      <p className="text-xl text-gray-200 font-semibold leading-relaxed mb-16">
        Zero Gravity AI isn't just a UI concept. It’s a production-ready orchestration engine leveraging high-dimensional vector embeddings and semantic search to bridge the gap between human potential and market demand.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {[
          { label: "Architecture", value: "FastAPI / Next.js", desc: "Low-latency async pipeline" },
          { label: "Matching", value: "Cosine Similarity", desc: "High-signal vector search" },
          { label: "Deployment", value: "Cloud Native", desc: "Scalable containerized builds" }
        ].map((item, i) => (
          <Hover3DCard key={i} label={item.label} value={item.value} desc={item.desc} />
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA = () => (
  <section className="py-40 px-6 relative bg-[#050507] overflow-hidden border-t border-white/5">
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] spotlight-purple opacity-30" />
    </div>
    
    <div className="max-w-4xl mx-auto text-center relative z-10">
      <h2 className="font-heading text-5xl md:text-7xl font-extrabold text-white mb-10 leading-[1.1] tracking-tight drop-shadow-2xl">
        Your potential deserves<br />
        <AuroraText>absolute clarity.</AuroraText>
      </h2>
      <button
        onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
        className="primary-cta rounded-full bg-[#7c5cfc] px-12 py-5 text-base font-bold text-white hover:bg-[#9b7eff] transition-all shadow-[0_4px_20px_rgba(124,92,252,0.4)] active:scale-95"
      >
        Launch Your Dashboard
      </button>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-20 border-t border-white/5 bg-[#050507] px-6 relative z-10">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
      <div className="flex items-center gap-3 font-heading font-extrabold text-2xl tracking-tight drop-shadow-md">
        <Logo className="h-8 w-8" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Zero Gravity AI</span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-bold uppercase tracking-widest text-[#94a3b8]">
        <a href="#" className="hover:text-white transition-colors duration-200">Product</a>
        <a href="#" className="hover:text-white transition-colors duration-200">Workflow</a>
        <a href="#" className="hover:text-white transition-colors duration-200">GitHub</a>
      </div>
    </div>
  </footer>
);

export default function LandingPage() {
  return (
    <main className="relative text-white selection:bg-purple-600/30 font-body bg-[#050507]">
      <div className="fixed inset-0 bg-grid-subtle pointer-events-none opacity-40" />
      <CustomCursor />
      <Navbar />
      
      <div className="relative z-10">
        <HeroSection />
        <ShowcaseSection />
        <div className="relative -mt-20 pb-40 z-20 px-6">
          <ZeroGravityForm />
        </div>
        <ProblemSection />
        <ResumeForgeSection />
        <HowItWorksSection />
        <DashboardShowcase />
        <CapabilitiesSection />
        <DifferentiationSection />
        <HackathonImpactSection />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}
