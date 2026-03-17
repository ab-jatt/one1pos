import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Package, 
  TrendingUp, 
  Shield, 
  Clock, 
  Zap,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Globe,
  Database,
  Activity
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { formatCurrency, currency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) &&
        mobileToggleRef.current && !mobileToggleRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setShowLanguageMenu(false);
  };

  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: 'Advanced POS System',
      description: 'Lightning-fast checkout with barcode scanning, multiple payment methods, and real-time inventory updates.'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Comprehensive Analytics',
      description: 'Real-time dashboards, sales reports, and business insights to drive data-driven decisions.'
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: 'Inventory Management',
      description: 'Track stock levels, manage suppliers, automate reordering, and prevent stockouts.'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Customer Management',
      description: 'Build customer relationships with profiles, purchase history, and loyalty programs.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Enterprise Security',
      description: 'Role-based access control, audit logs, and enterprise-grade data protection.'
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: 'Cloud-Based',
      description: 'Access your business data anywhere, anytime with secure cloud infrastructure.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 49,
      period: '/month',
      description: 'Perfect for small businesses',
      features: [
        '1 Terminal',
        'Up to 1,000 products',
        'Basic reporting',
        'Email support',
        '5 user accounts'
      ]
    },
    {
      name: 'Professional',
      price: 149,
      period: '/month',
      description: 'For growing businesses',
      features: [
        '5 Terminals',
        'Unlimited products',
        'Advanced analytics',
        'Priority support',
        'Unlimited users',
        'Custom integrations'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: null,
      period: '',
      description: 'For large organizations',
      features: [
        'Unlimited terminals',
        'Unlimited products',
        'Custom features',
        'Dedicated support',
        'Advanced security',
        'API access'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/brand/light_logo.png" alt="one1pos" className="h-8 w-auto dark:hidden" />
              <img src="/brand/dark_logo.png" alt="one1pos" className="h-8 w-auto hidden dark:block" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</a>
              
              {/* Language Selector */}
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all ${showLanguageMenu ? 'border-sky-500 ring-2 ring-sky-500/20' : ''}`}
                >
                  <Globe className="w-4 h-4" />
                  {language.toUpperCase()}
                </button>
                
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50 animate-dropdown-open">
                    <div className="py-1">
                    {(['en', 'es', 'ru', 'de', 'ur', 'ar'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                          language === lang
                            ? 'bg-sky-900/30 text-sky-300'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'ru' ? 'Русский' : 'Deutsch'}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-sky-600 rounded-lg font-semibold hover:bg-sky-500 transition-all shadow-sm"
              >
                Sign In / Sign Up
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              ref={mobileToggleRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div ref={mobileMenuRef} className="md:hidden py-4 border-t border-neutral-200 dark:border-neutral-800 animate-dropdown-open">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</a>
                <a href="#contact" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</a>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-sky-600 rounded-lg font-semibold hover:bg-sky-500 transition-all text-center"
                >
                  Sign In / Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-sm font-medium">
                <Activity className="w-4 h-4" />
                Enterprise-Grade POS Solution
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Modernize Your
                <span className="block text-sky-500">
                  Retail Business
                </span>
              </h1>
              
              <p className="text-xl text-neutral-500 dark:text-neutral-400 leading-relaxed">
                one1pos is a cutting-edge point-of-sale system designed for modern retailers.
                Streamline operations, boost sales, and gain valuable insights with our all-in-one solution.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="group px-8 py-4 bg-sky-600 rounded-lg font-semibold hover:bg-sky-500 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                >
                  Learn More
                </button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">14-day free trial</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-sky-600/10 rounded-lg blur-3xl opacity-20"></div>
              <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 shadow-sm">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Today's Revenue</span>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-4xl font-bold">{formatCurrency(12847.5)}</div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">Transactions</div>
                      <div className="text-2xl font-bold">247</div>
                    </div>
                    <div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">Items Sold</div>
                      <div className="text-2xl font-bold">1,432</div>
                    </div>
                  </div>
                  <div className="h-24 bg-sky-600/10 rounded-lg flex items-end gap-1 p-2">
                    {[40, 60, 45, 80, 55, 90, 70, 85].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-sky-600 rounded"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-100 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powerful Features for Modern Retail
            </h2>
            <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
              Everything you need to run your business efficiently, all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-sky-500/50 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-sky-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <div className="text-sky-500">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-500 dark:text-neutral-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: '10K+', label: 'Active Users' },
              { number: '50M+', label: 'Transactions Processed' },
              { number: '99.9%', label: 'Uptime' },
              { number: '24/7', label: 'Support' }
            ].map((stat, index) => (
              <div key={index} className="p-6">
                <div className="text-5xl font-bold text-sky-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-neutral-500 dark:text-neutral-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-100 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-neutral-500 dark:text-neutral-400">Choose the perfect plan for your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-lg transition-all duration-300 ${
                  plan.popular
                    ? 'bg-white dark:bg-neutral-900 border-2 border-sky-500 shadow-sm scale-105'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-sky-500/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-600 text-white text-sm font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm mb-4 ${plan.popular ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">
                      {typeof plan.price === 'number' ? formatCurrency(plan.price) : 'Custom'}
                    </span>
                    <span className={plan.popular ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.popular ? 'text-sky-500' : 'text-sky-500'
                      }`} />
                      <span className={plan.popular ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-sky-600 text-white hover:bg-sky-500'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-neutral-500 dark:text-neutral-400 mb-8">
            Join thousands of businesses already using one1pos to streamline their operations.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="group px-8 py-4 bg-sky-600 rounded-lg font-semibold hover:bg-sky-500 transition-all shadow-sm flex items-center justify-center gap-2 mx-auto"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 sm:px-6 lg:px-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/brand/light_logo.png" alt="one1pos" className="h-7 w-auto dark:hidden" />
                <img src="/brand/dark_logo.png" alt="one1pos" className="h-7 w-auto hidden dark:block" />
              </div>
              <p className="text-neutral-500">
                Enterprise-grade point of sale solution for modern retailers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-500">
                <li><a href="#features" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-500">
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Blog</a></li>
                <li><a href="#contact" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-neutral-500">
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center text-neutral-500">
            <p>&copy; 2026 one1pos. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
