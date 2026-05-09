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
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
      scrolled ? 'py-2' : 'py-4'
    }`}>
      <div className="container mx-auto px-6">
        <div className={`relative flex items-center justify-between px-6 py-3 transition-all duration-300 ${
          scrolled 
            ? 'bg-white border-2 border-[#323232] shadow-[4px_4px_#323232] rounded-[5px]' 
            : 'bg-transparent border-2 border-transparent'
        }`}>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group no-underline">
            <div className="h-8 w-8 rounded-[5px] bg-[#323232] flex items-center justify-center border-2 border-[#323232]">
              <Rocket size={16} className="text-white" />
            </div>
            <span className="logo-text !text-base tracking-[0.15em]">
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
                  className={`group relative flex items-center gap-2 text-sm font-bold no-underline transition-colors ${
                    isActive ? 'text-[#323232]' : 'text-[#999] hover:text-[#323232]'
                  }`}
                >
                  <Icon size={16} />
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-[#323232]"
                    />
                  )}
                </Link>
              );
            })}
            
            <Link 
              href="/dashboard" 
              className="ml-2 flex items-center gap-2 rounded-[5px] bg-[#323232] border-2 border-[#323232] px-5 py-2 text-xs font-bold text-white no-underline shadow-[2px_2px_#000] transition-all hover:shadow-[0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              LAUNCH
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-[#323232]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 px-6 md:hidden"
            >
              <div className="bg-white border-2 border-[#323232] rounded-[5px] p-4 shadow-[4px_4px_#323232] flex flex-col gap-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 text-base font-bold no-underline transition-colors px-3 py-2 rounded-[5px] ${
                        isActive 
                          ? 'text-[#323232] bg-[lightgrey]' 
                          : 'text-[#666] hover:bg-[#f0f0f0]'
                      }`}
                    >
                      <Icon size={18} />
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
