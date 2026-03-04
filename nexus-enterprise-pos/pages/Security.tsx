import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { AuditLog } from '../types';
import { Shield, Lock, AlertTriangle, Terminal, Key, Fingerprint } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Security: React.FC = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await Api.security.getAuditLogs();
      setLogs(data);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="relative pl-4 border-l-4 border-red-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('securityProtocols')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('auditCompliance')} // {t('monitoring')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <span className="text-xs font-bold text-red-700 dark:text-red-400 font-mono">{t('threatLevel')} {t('threatLevelLow')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Shield className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('systemIntegrity')}</p>
               <h3 className="text-2xl font-bold text-neutral-800 dark:text-white">{t('secure')}</h3>
               <div className="mt-2 text-xs text-emerald-500 flex items-center gap-1 font-mono">
                  <CheckCircleIcon className="w-3 h-3" /> {t('allSystemsNominal')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Lock className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('authPolicy')}</p>
               <h3 className="text-2xl font-bold text-neutral-800 dark:text-white">{t('twoFAActive')}</h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                   <Key className="w-3 h-3" /> {t('enforcedForAdmin')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500"></div>
         </div>

         <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 relative overflow-hidden group shadow-sm">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <AlertTriangle className="w-16 h-16 text-neutral-400" />
            </div>
            <div className="relative z-10">
               <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{t('intrusionAttempts')}</p>
               <h3 className="text-2xl font-bold text-neutral-800 dark:text-white">2 <span className="text-sm font-normal text-neutral-400">{t('events')}</span></h3>
               <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                   {t('last24Hours')}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
         </div>
      </div>

      <Card className="!p-0 overflow-visible border-t-4 border-t-red-500">
         <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
            <h3 className="font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-500" /> {t('accessLogs')}
            </h3>
            <div className="flex gap-2">
                <span className="flex items-center gap-2 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-mono text-neutral-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {t('liveFeed')}
                </span>
            </div>
         </div>
         <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-100 dark:bg-neutral-950 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 font-mono">
              <tr>
                <th className="px-6 py-4">{t('timestamp')}</th>
                <th className="px-6 py-4">{t('userIdentity')}</th>
                <th className="px-6 py-4">{t('module')}</th>
                <th className="px-6 py-4">{t('action')}</th>
                <th className="px-6 py-4">{t('details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-neutral-500">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-neutral-400 group-hover:text-sky-500 transition-colors" />
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-mono">
                        {log.module}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-300">{log.action}</td>
                  <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400 font-mono text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export default Security;