"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Rocket, LayoutDashboard, ListChecks, ArrowRight } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Discover', href: '/', icon: Rocket },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tracker', href: '/applications', icon: ListChecks },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'py-3' : 'py-6'
    }`}>
      <div className="container mx-auto px-6">
        <div className={`relative flex items-center justify-between px-6 py-3 transition-all duration-500 ${
          scrolled 
            ? 'bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl' 
            : 'bg-transparent border-transparent rounded-none'
        } border`}>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Rocket size={18} className="text-white" />
              </div>
            </div>
            <span className="logo-text !text-lg md:!text-xl tracking-[0.2em]">
              Zero Gravity
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group relative flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'} />
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-gradient-to-right from-cyan-400 to-blue-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
            
            <Link 
              href="/dashboard" 
              className="ml-4 flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-900 transition-transform hover:scale-105 active:scale-95"
            >
              LAUNCH DASHBOARD
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 mt-4 px-6 md:hidden"
            >
              <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-4 text-lg font-semibold transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-cyan-400/10' : 'bg-slate-800'}`}>
                        <Icon size={20} />
                      </div>
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
