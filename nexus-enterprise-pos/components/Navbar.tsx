
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings, LogOut,
  Menu, X, Briefcase, FileText, ShoppingBag, Shield, Truck,
  ClipboardList, Warehouse, Factory, ArrowLeftRight, BarChart3,
  ChevronLeft, Grid3X3, DollarSign, Cog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Role } from '../types';

// ─── Types ───
interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: Role[];
}

interface NavSection {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;    // tailwind color token e.g. "sky"
  roles: Role[];    // section visible if user has any of these roles
  items: NavItem[];
}

interface NavbarProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

// ─── Section color mappings ───
const sectionColors: Record<string, { bg: string; bgDark: string; text: string; ring: string; activeBg: string; activeBgDark: string }> = {
  sky:     { bg: 'bg-sky-100',     bgDark: 'dark:bg-sky-900/25',     text: 'text-sky-600',     ring: 'ring-sky-500',     activeBg: 'bg-sky-50',     activeBgDark: 'dark:bg-sky-900/15' },
  emerald: { bg: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/25', text: 'text-emerald-600', ring: 'ring-emerald-500', activeBg: 'bg-emerald-50', activeBgDark: 'dark:bg-emerald-900/15' },
  amber:   { bg: 'bg-amber-100',   bgDark: 'dark:bg-amber-900/25',   text: 'text-amber-600',   ring: 'ring-amber-500',   activeBg: 'bg-amber-50',   activeBgDark: 'dark:bg-amber-900/15' },
  violet:  { bg: 'bg-violet-100',  bgDark: 'dark:bg-violet-900/25',  text: 'text-violet-600',  ring: 'ring-violet-500',  activeBg: 'bg-violet-50',  activeBgDark: 'dark:bg-violet-900/15' },
  rose:    { bg: 'bg-rose-100',    bgDark: 'dark:bg-rose-900/25',    text: 'text-rose-600',    ring: 'ring-rose-500',    activeBg: 'bg-rose-50',    activeBgDark: 'dark:bg-rose-900/15' },
  neutral: { bg: 'bg-neutral-200', bgDark: 'dark:bg-neutral-800',    text: 'text-neutral-600', ring: 'ring-neutral-500', activeBg: 'bg-neutral-100', activeBgDark: 'dark:bg-neutral-800/50' },
  blue:    { bg: 'bg-blue-100',    bgDark: 'dark:bg-blue-900/25',    text: 'text-blue-600',    ring: 'ring-blue-500',    activeBg: 'bg-blue-50',    activeBgDark: 'dark:bg-blue-900/15' },
};

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // ─── Section definitions ───
  const sections: NavSection[] = useMemo(() => [
    {
      id: 'sales',
      icon: ShoppingCart,
      label: t('pos') || 'Sales',
      color: 'sky',
      roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER],
      items: [
        { icon: ShoppingCart, label: t('pos'), path: '/pos', roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
        { icon: Users, label: t('customers'), path: '/customers', roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
      ],
    },
    {
      id: 'inventory',
      icon: Package,
      label: t('inventory') || 'Inventory',
      color: 'emerald',
      roles: [Role.ADMIN, Role.MANAGER],
      items: [
        { icon: Package, label: t('inventory'), path: '/inventory', roles: [Role.ADMIN, Role.MANAGER] },
        { icon: ClipboardList, label: t('stockReport'), path: '/stock-report', roles: [Role.ADMIN, Role.MANAGER] },
        { icon: Warehouse, label: 'Warehouses', path: '/warehouses', roles: [Role.ADMIN, Role.MANAGER] },
        { icon: ArrowLeftRight, label: 'Stock Moves', path: '/stock-movements', roles: [Role.ADMIN, Role.MANAGER] },
        { icon: BarChart3, label: 'WH Reports', path: '/warehouse-reports', roles: [Role.ADMIN, Role.MANAGER] },
      ],
    },
    {
      id: 'production',
      icon: Factory,
      label: 'Production',
      color: 'amber',
      roles: [Role.ADMIN, Role.MANAGER],
      items: [
        { icon: Factory, label: 'Production', path: '/production', roles: [Role.ADMIN, Role.MANAGER] },
      ],
    },
    {
      id: 'purchasing',
      icon: ShoppingBag,
      label: t('purchasing') || 'Purchasing',
      color: 'violet',
      roles: [Role.ADMIN, Role.MANAGER],
      items: [
        { icon: ShoppingBag, label: t('purchasing'), path: '/purchasing', roles: [Role.ADMIN, Role.MANAGER] },
        { icon: Truck, label: t('suppliers'), path: '/suppliers', roles: [Role.ADMIN, Role.MANAGER] },
      ],
    },
    {
      id: 'finance',
      icon: DollarSign,
      label: t('accounting') || 'Finance',
      color: 'rose',
      roles: [Role.ADMIN, Role.MANAGER],
      items: [
        { icon: FileText, label: t('accounting'), path: '/accounting', roles: [Role.ADMIN] },
        { icon: BarChart3, label: t('reports'), path: '/reports', roles: [Role.ADMIN, Role.MANAGER] },
      ],
    },
    {
      id: 'admin',
      icon: Cog,
      label: 'Admin',
      color: 'neutral',
      roles: [Role.ADMIN],
      items: [
        { icon: Briefcase, label: t('hr'), path: '/hr', roles: [Role.ADMIN] },
        { icon: Shield, label: t('security'), path: '/security', roles: [Role.ADMIN] },
        { icon: Settings, label: t('settings'), path: '/settings', roles: [Role.ADMIN] },
      ],
    },
  ], [t]);

  // Filter sections & their items by user role
  const visibleSections = useMemo(() => {
    if (!user) return [];
    return sections
      .filter(s => s.roles.includes(user.role))
      .map(s => ({ ...s, items: s.items.filter(i => i.roles.includes(user.role)) }))
      .filter(s => s.items.length > 0);
  }, [sections, user]);

  // Auto-detect which section the current route belongs to
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      setActiveSection(null);
      return;
    }
    const match = visibleSections.find(s => s.items.some(i => i.path === location.pathname));
    if (match) setActiveSection(match.id);
  }, [location.pathname, visibleSections]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) &&
        mobileToggleRef.current && !mobileToggleRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const currentSection = visibleSections.find(s => s.id === activeSection);
  const currentColor = currentSection ? sectionColors[currentSection.color] : null;

  // ─── Desktop: active section sub-items ───
  const renderDesktopSubNav = () => {
    if (!currentSection || !currentColor) return null;
    return (
      <div className="flex items-center gap-1">
        {/* Back button */}
        <button
          onClick={() => setActiveSection(null)}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 mr-1"
          title="Back to sections"
        >
          <ChevronLeft className="w-4 h-4" />
          <Grid3X3 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

        {/* Section label */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${currentColor.bg} ${currentColor.bgDark} ${currentColor.text}`}>
          <currentSection.icon className="w-3.5 h-3.5" />
          {currentSection.label}
        </div>

        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

        {/* Sub-items */}
        {currentSection.items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? `${currentColor.text} ${currentColor.activeBg} ${currentColor.activeBgDark} ring-1 ${currentColor.ring}`
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden xl:inline">{item.label}</span>

            {/* Tooltip for icon-only on lg */}
            <div className="xl:hidden absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] font-medium uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg z-50">
              {item.label}
            </div>
          </NavLink>
        ))}
      </div>
    );
  };

  // ─── Desktop: main section selector ───
  const renderDesktopSections = () => (
    <div className="flex items-center gap-1">
      {/* Dashboard link – always visible */}
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
            isActive
              ? 'text-sky-500 bg-sky-50 dark:bg-sky-900/15 ring-1 ring-sky-500'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`
        }
      >
        <LayoutDashboard className="w-4.5 h-4.5" />
        <span className="hidden xl:inline">{t('dashboard')}</span>
      </NavLink>

      <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {visibleSections.map((section) => {
        const sc = sectionColors[section.color];
        const hasActiveRoute = section.items.some(i => i.path === location.pathname);
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
              hasActiveRoute
                ? `${sc.text} ${sc.activeBg} ${sc.activeBgDark} ring-1 ${sc.ring}`
                : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <section.icon className="w-4.5 h-4.5" />
            <span className="hidden xl:inline">{section.label}</span>

            {/* Active dot indicator */}
            {hasActiveRoute && (
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${sc.bg} ${sc.bgDark} ring-2 ring-white dark:ring-neutral-950`} />
            )}

            {/* Tooltip for icon-only on lg */}
            <div className="xl:hidden absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] font-medium uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg z-50">
              {section.label}
            </div>
          </button>
        );
      })}
    </div>
  );

  // ─── Mobile: section-based menu ───
  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    const mobileActiveSection = activeSection ? visibleSections.find(s => s.id === activeSection) : null;
    const mobileColor = mobileActiveSection ? sectionColors[mobileActiveSection.color] : null;

    return (
      <div
        ref={mobileMenuRef}
        className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shadow-lg animate-dropdown-open max-h-[80vh] overflow-y-auto z-50"
      >
        {/* Sub-nav view */}
        {mobileActiveSection && mobileColor ? (
          <div className="p-3 space-y-1">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Sections
            </button>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${mobileColor.bg} ${mobileColor.bgDark} ${mobileColor.text}`}>
              <mobileActiveSection.icon className="w-4 h-4" />
              {mobileActiveSection.label}
            </div>

            {mobileActiveSection.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${
                    isActive
                      ? `${mobileColor.activeBg} ${mobileColor.activeBgDark} ${mobileColor.text}`
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : (
          /* Main sections view */
          <div className="p-3 space-y-1">
            <NavLink
              to="/dashboard"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/15 text-sky-600'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              {t('dashboard')}
            </NavLink>

            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-2" />

            {visibleSections.map((section) => {
              const sc = sectionColors[section.color];
              const hasActiveRoute = section.items.some(i => i.path === location.pathname);
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${
                    hasActiveRoute
                      ? `${sc.activeBg} ${sc.activeBgDark} ${sc.text}`
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${sc.bg} ${sc.bgDark}`}>
                      <section.icon className={`w-4 h-4 ${sc.text}`} />
                    </div>
                    {section.label}
                  </div>
                  <span className="text-xs text-neutral-400">{section.items.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 left-0 right-0 h-16 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-50 transition-all duration-200 print:hidden flex-none shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2">

        {/* Logo & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            ref={mobileToggleRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-1 text-slate-500 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer flex-shrink-0">
            <img src="/brand/light_emblem.png" alt="one1pos" className="h-6 sm:h-7 w-auto dark:hidden" />
            <img src="/brand/dark_emblem.png" alt="one1pos" className="h-6 sm:h-7 w-auto hidden dark:block" />
          </div>
        </div>

        {/* Desktop Navigation – contextual */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-4">
          <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            {activeSection ? renderDesktopSubNav() : renderDesktopSections()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {user && (
            <div className="hidden md:flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg cursor-default">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-neutral-900 text-xs font-semibold">
                {user.avatar}
              </div>
              <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden lg:inline">{user.name}</span>
            </div>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 text-xs sm:text-sm font-medium"
            title={t('logout')}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {renderMobileMenu()}
    </nav>
  );
};

export default Navbar;
