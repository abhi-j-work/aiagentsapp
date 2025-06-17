import { Link } from 'react-router-dom';
import { Database, ArrowRight } from 'lucide-react';

const TableCard = ({ title, color, delayClass }: { title: string; color: string; delayClass: string }) => (
  <div className={`table-float ${delayClass}`}>
    <div className="w-16 h-12 glass rounded-lg gradient-border shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${color} text-white text-[7px] px-1.5 py-0.5 font-medium border-b border-white/10`}>
        {title}
      </div>
      <div className="px-1.5 py-0.5 space-y-0.5">
        <div className="flex items-center space-x-0.5">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
          <div className="h-0.5 w-6 bg-white/30 rounded"></div>
        </div>
        <div className="h-0.5 w-4 bg-white/20 rounded"></div>
        <div className="h-0.5 w-7 bg-white/20 rounded"></div>
      </div>
    </div>
  </div>
);

const DataGovernancePage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full relative max-w-xs">
        <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-float">
          
          <div className="p-4 flex justify-center relative">
            <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative">
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
              </div>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
                <defs>
                  <linearGradient id="connectionGradientReact" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:'#4f46e5', stopOpacity:0.8}} />
                    <stop offset="50%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#8b5cf6', stopOpacity:0.8}} />
                  </linearGradient>
                </defs>
                <g stroke="url(#connectionGradientReact)" strokeWidth="1.5" fill="none">
                  <path className="connector" d="M80,60 L140,60 L140,90 L200,90" />
                  <path className="connector" d="M200,90 L240,90 L240,60 L280,60" />
                  <path className="connector" d="M140,90 L140,120 L200,120" />
                  <path className="connector" d="M200,120 L240,120 L240,150 L200,150" />
                  <circle cx="80" cy="60" r="3" fill="#4f46e5"/>
                  <circle cx="200" cy="90" r="3" fill="#3b82f6"/>
                  <circle cx="280" cy="60" r="3" fill="#8b5cf6"/>
                  <circle cx="200" cy="120" r="3" fill="#f59e0b"/>
                  <circle cx="200"cy="150" r="3" fill="#ef4444"/>
                </g>
              </svg>
              
              <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 animate-schema-pulse">
                  <div className="w-8 h-8 glass rounded-xl flex items-center justify-center border border-indigo-400/30 inner-glow">
                    <Database className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                
                <div className="absolute left-3 top-12"><TableCard title="users" color="from-indigo-500/20 to-blue-500/20" delayClass="" /></div>
                <div className="absolute right-3 top-12"><TableCard title="orders" color="from-blue-500/20 to-purple-500/20" delayClass="delay-1" /></div>
                <div className="absolute left-1/2 -translate-x-1/2 top-24"><TableCard title="products" color="from-purple-500/20 to-pink-500/20" delayClass="delay-2" /></div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-3"><TableCard title="analytics" color="from-orange-500/20 to-red-500/20" delayClass="delay-3" /></div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          
          <div className="p-4">
            <span className="inline-block px-3 py-1 glass text-indigo-300 rounded-full text-xs font-medium mb-3 border border-indigo-400/30">Database</span>
            <h3 className="text-lg font-medium text-white mb-2">Data Governance Agent</h3>
            <p className="text-white/70 mb-4 leading-relaxed text-xs">
              Design, optimize and maintain your database structure with powerful schema tools.
            </p>
            <div className="flex justify-between items-center">
              <Link to="#" className="text-indigo-400 hover:text-indigo-300 transition flex items-center text-xs font-medium glass px-3 py-1.5 rounded-lg border border-indigo-400/30">
                Manage
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
              <span className="text-white/50 text-xs glass px-2 py-1 rounded-full border border-white/10">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataGovernancePage;