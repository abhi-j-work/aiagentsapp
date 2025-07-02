// import React from 'react';
import { Rocket, Zap, Building2, Check, Minus } from 'lucide-react';
import ShaderBackground from '../components/shared/ShaderBackground';

// Reusable Feature Item Component
const FeatureItem = ({ text, included }: { text: string, included: boolean }) => (
  <li className="flex items-center text-sm">
    {included ? (
      <Check className="text-blue-400 mr-3 w-4 h-4 flex-shrink-0" />
    ) : (
      <Minus className="text-white/30 mr-3 w-4 h-4 flex-shrink-0" />
    )}
    <span className={included ? 'text-white/80' : 'text-white/50'}>{text}</span>
  </li>
);

// Main Pricing Card Component
const PricingCard = ({ plan }: { plan: any }) => (
  <div className={`glass-effect bg-gradient-to-br from-white/10 to-white/5 border rounded-2xl shadow-xl p-6 flex flex-col h-full relative ${plan.isPopular ? 'border-blue-500/30 transform md:scale-105 z-10' : 'border-white/10'}`}>
    {plan.isPopular && (
      <div className="absolute top-[-2px] right-[30px] px-[10px] py-1 bg-blue-600 text-white text-xs font-medium rounded-b-md shadow-lg shadow-blue-500/40">
        MOST POPULAR
      </div>
    )}

    <div className="flex items-center mb-4">
      <div className={`icon-circle ${plan.isPopular ? 'bg-blue-500/20 border-blue-400/30' : ''}`}>
        {plan.icon}
      </div>
      <h3 className="ml-3 text-xl text-white font-manrope font-light tracking-tight">{plan.name}</h3>
    </div>

    <div className="mt-2 mb-6">
      <div className="flex items-baseline">
        <span className="text-4xl font-manrope font-light text-white">${plan.price}</span>
        <span className="text-sm text-white/60 ml-2">/month</span>
      </div>
      <p className="text-white/60 text-sm mt-1">{plan.description}</p>
    </div>

    <div className="card-divider w-full mb-6"></div>

    <ul className="space-y-3 mb-8">
      {plan.features.map((feature: any, index: number) => (
        <FeatureItem key={index} text={feature.text} included={feature.included} />
      ))}
    </ul>

    <div className="grid grid-cols-2 gap-4 my-6">
      <div className={`${plan.isPopular ? 'bg-blue-500/10' : 'bg-white/5'} rounded-lg p-3 text-center`}>
        <div className="text-2xl font-manrope font-normal text-white">{plan.stats.uptime}</div>
        <div className="text-xs text-white/60 mt-1">Uptime</div>
      </div>
      <div className={`${plan.isPopular ? 'bg-blue-500/10' : 'bg-white/5'} rounded-lg p-3 text-center`}>
        <div className="text-2xl font-manrope font-normal text-white">{plan.stats.latency}</div>
        <div className="text-xs text-white/60 mt-1">Latency</div>
      </div>
    </div>

    <div className="mt-auto pt-4">
      <button className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 ${plan.isPopular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}>
        {plan.cta.text}
      </button>
      <p className="text-white/50 text-xs text-center mt-3">{plan.cta.subtext}</p>
    </div>
  </div>
);

// Pricing Page Data
const pricingPlans = [
  {
    name: 'Starter',
    icon: <Rocket className="text-blue-400 text-xs" />,
    price: 19,
    description: 'Perfect for individuals and small projects',
    isPopular: false,
    features: [
      { text: '1 million tokens/month', included: true },
      { text: '5 custom AI models', included: true },
      { text: 'Basic API access', included: true },
      { text: 'Email support', included: true },
      { text: 'No custom training', included: false },
      { text: 'No dedicated resources', included: false },
    ],
    stats: { uptime: '99.9%', latency: '120ms' },
    cta: { text: 'Start Free Trial', subtext: 'No credit card required' },
  },
  {
    name: 'Professional',
    icon: <Zap className="text-blue-400 text-xs" />,
    price: 49,
    description: 'For teams with advanced AI needs',
    isPopular: true,
    features: [
      { text: '10 million tokens/month', included: true },
      { text: '20 custom AI models', included: true },
      { text: 'Advanced API access', included: true },
      { text: 'Priority support', included: true },
      { text: 'Basic custom training', included: true },
      { text: 'No dedicated resources', included: false },
    ],
    stats: { uptime: '99.95%', latency: '80ms' },
    cta: { text: 'Get Started', subtext: '14-day free trial included' },
  },
  {
    name: 'Enterprise',
    icon: <Building2 className="text-indigo-400 text-xs" />,
    price: 199,
    description: 'For organizations with advanced requirements',
    isPopular: false,
    features: [
      { text: 'Unlimited tokens', included: true },
      { text: 'Unlimited custom AI models', included: true },
      { text: 'Full API ecosystem', included: true },
      { text: '24/7 dedicated support', included: true },
      { text: 'Advanced custom training', included: true },
      { text: 'Dedicated resources', included: true },
    ],
    stats: { uptime: '99.99%', latency: '50ms' },
    cta: { text: 'Contact Sales', subtext: 'Custom pricing available' },
  },
];


// Main Component
const PricingPage = () => {
  return (
    <>
      <ShaderBackground />
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-y-auto font-inter">
        <div className="w-full max-w-5xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-manrope font-extralight leading-tight tracking-tighter bg-gradient-to-r from-white via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            Flexible AI Solutions
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/70 max-w-2xl mx-auto">
            Choose the plan that works for your workflow. All plans include core features with flexible scaling options.
          </p>
        </div>

        <div className="mb-10 flex items-center justify-center gap-4">
          <span className="text-white/70 text-sm">Monthly</span>
          <div className="relative inline-block w-14 h-7 bg-white/10 rounded-full cursor-pointer p-1">
            <div className="w-5 h-5 bg-blue-500 rounded-full transition-transform"></div>
          </div>
          <span className="text-white text-sm">Annual <span className="text-blue-400 text-xs">Save 20%</span></span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {pricingPlans.map(plan => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div className="mt-16 text-center max-w-2xl">
          <p className="text-white/50 text-sm">
            All plans include core features: Standard AI models, REST API, 99.9% uptime SLA, Standard encryption, and Community access.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <span className="text-[12px] text-white/70 px-3 py-1 rounded-full bg-white/5 border border-white/10">GDPR COMPLIANT</span>
            <span className="text-[12px] text-white/70 px-3 py-1 rounded-full bg-white/5 border border-white/10">SOC 2 CERTIFIED</span>
            <span className="text-[12px] text-white/70 px-3 py-1 rounded-full bg-white/5 border border-white/10">HIPAA READY</span>
            <span className="text-[12px] text-white/70 px-3 py-1 rounded-full bg-white/5 border border-white/10">ISO 27001</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingPage;