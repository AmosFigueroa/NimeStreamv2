import React, { useState, useEffect } from 'react';
import { Search, MonitorPlay, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-dark/90 backdrop-blur-xl border-b border-slate-800' : 'bg-transparent bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div 
            className="flex-shrink-0 flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                <MonitorPlay className="w-6 h-6 text-primary" />
            </div>
            <span className="font-black text-xl tracking-wider text-white">NIME<span className="text-primary">STREAM</span></span>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-lg mx-12">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-slate-200 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:bg-slate-800 transition-all placeholder:text-slate-500"
              />
              <Search className="absolute left-4 top-3 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
            </form>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-bold text-white hover:text-primary transition-colors">Home</button>
            <button className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Season</button>
            <button className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Popular</button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-white p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-dark border-b border-slate-800 animate-fade-in">
          <div className="px-4 pt-4 pb-6 space-y-4">
             <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4"
              />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            </form>
            <div className="flex flex-col space-y-2">
              <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className="text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-white font-medium">Home</button>
              <button className="text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 font-medium">New Season</button>
              <button className="text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 font-medium">Popular</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;