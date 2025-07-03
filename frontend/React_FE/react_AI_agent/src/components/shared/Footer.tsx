import React from 'react';
import { ShieldCheck } from 'lucide-react';

const complianceItems = [
    { name: 'GDPR Compliant' },
    { name: 'SOC 2 Certified' },
    { name: 'HIPAA Ready' },
    { name: 'ISO 27001' }
];

const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 w-full bg-black/30 border-t border-white/10 mt-20 py-8 text-white/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          
          {/* Copyright Info */}
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-sm">
              © {new Date().getFullYear()} <strong className="text-white"></strong>All Rights Reserved.
            </p>
            <p className="text-xs mt-1">
              Your Trusted Partner in Data Intelligence & Operations.
            </p>
          </div>

          {/* Compliance Badges */}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
            {complianceItems.map(item => (
              <div key={item.name} className="flex items-center text-xs">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-green-400/60" />
                {/* Changed this line to make the name bold and full white */}
                <span className="font-semibold text-white">{item.name}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;