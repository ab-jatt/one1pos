
import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { Employee } from '../types';
import { Users, Briefcase, DollarSign, UserPlus, MoreVertical, Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, Filter, Download, AlertCircle, X } from 'lucide-react';
import Dropdown from '../components/ui/Dropdown';

// Local types for HR specific features
interface Shift {
  id: string;
  employeeId: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  type: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
}

interface PayrollRecord {
  id: string;
  period: string;
  payDate: string;
  employees: number;
  total: number;
  status: 'Paid' | 'Processing' | 'Pending';
}

// Helper functions for week calculation
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};

const formatWeekLabel = (weekStart: Date): string => {
  const weekNum = getWeekNumber(weekStart);
  const monthName = weekStart.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = weekStart.getFullYear();
  return `WEEK ${weekNum} // ${monthName} ${year}`;
};

const HR: React.FC = () => {
  const { t = (key: string) => key } = useLanguage() || {};
  const { formatMoney = (val: number) => `$${val.toFixed(2)}` } = useCurrency() || {};
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'shifts' | 'payroll'>('directory');
  const [isPayrollRunning, setIsPayrollRunning] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ employeeId: '', date: '', startTime: '', endTime: '', type: 'Morning' });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  
  // Employee registration modal state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: '',
    department: 'Operations',
    salary: 0,
    status: 'Active' as 'Active' | 'On Leave',
    joinDate: new Date().toISOString().split('T')[0]
  });

  // Mock Payroll History
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([
    { id: 'PR-2023-10-A', period: 'Oct 1 - Oct 15, 2023', payDate: '2023-10-15', employees: 4, total: 7250.00, status: 'Paid' },
    { id: 'PR-2023-09-B', period: 'Sep 16 - Sep 30, 2023', payDate: '2023-09-30', employees: 4, total: 7250.00, status: 'Paid' },
    { id: 'PR-2023-09-A', period: 'Sep 1 - Sep 15, 2023', payDate: '2023-09-15', employees: 4, total: 7250.00, status: 'Paid' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesData, shiftsData] = await Promise.all([
          Api.hr.getEmployees(),
          Api.hr.getShifts(),
        ]);
        setEmployees(employeesData);
        setShifts(shiftsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleRunPayroll = async () => {
    if (confirm(t('confirmPayroll'))) {
        setIsPayrollRunning(true);
        await Api.hr.runPayroll();
        
        // Mock adding new payroll record
        const newRecord: PayrollRecord = {
            id: `PR-${Date.now()}`,
            period: 'Oct 16 - Oct 31, 2023',
            payDate: new Date().toISOString().split('T')[0],
            employees: employees.length,
            total: employees.reduce((acc, emp) => acc + (emp.salary / 24), 0), // Approx half-month salary
            status: 'Paid'
        };
        
        setPayrollHistory([newRecord, ...payrollHistory]);
        setIsPayrollRunning(false);
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.employeeId || !newShift.date || !newShift.startTime || !newShift.endTime) {
      alert(t('fillAllFields'));
      return;
    }

    try {
      // Combine date and time into ISO datetime strings
      const startDateTime = new Date(`${newShift.date}T${newShift.startTime}`).toISOString();
      const endDateTime = new Date(`${newShift.date}T${newShift.endTime}`).toISOString();
      
      const shiftData = {
        employeeId: newShift.employeeId,
        startTime: startDateTime,
        endTime: endDateTime,
        type: newShift.type,
      };
      
      const createdShift = await Api.hr.createShift(shiftData);
      setShifts([...shifts, createdShift]);
      setIsShiftModalOpen(false);
      setNewShift({ employeeId: '', date: '', startTime: '', endTime: '', type: 'Morning' });
    } catch (error) {
      console.error('Error creating shift:', error);
      alert(t('failedCreateShift'));
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.role || !newEmployee.department || !newEmployee.salary) {
      alert(t('fillRequiredFields'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.email)) {
      alert(t('invalidEmail'));
      return;
    }

    try {
      setIsCreatingEmployee(true);
      const createdEmployee = await Api.hr.createEmployee(newEmployee);
      setEmployees([...employees, createdEmployee]);
      setIsEmployeeModalOpen(false);
      setNewEmployee({
        name: '',
        email: '',
        role: '',
        department: 'Operations',
        salary: 0,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      alert(t('failedCreateEmployee'));
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const daysOfWeek = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

  // Get the dates for the current week
  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const getShiftForEmployee = (empId: string, dayIndex: number) => {
    const targetDate = weekDates[dayIndex];
    const targetDateStr = targetDate.toISOString().split('T')[0];
    return shifts.find(s => s.employeeId === empId && s.date === targetDateStr);
  };

  const handleCellClick = (employeeId: string, dayIndex: number) => {
    const targetDate = weekDates[dayIndex];
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // Determine default shift type based on time of day or set a default
    setNewShift({
      employeeId,
      date: dateStr,
      startTime: '09:00',
      endTime: '17:00',
      type: 'Morning'
    });
    setIsShiftModalOpen(true);
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const filteredEmployees = employees.filter(emp => 
    departmentFilter === 'All' || emp.department === departmentFilter
  );

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department)))];

  const renderContent = () => {
    switch(activeTab) {
      case 'directory':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
                   <div className="relative z-10">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('totalStaff')}</p>
                      <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{employees.length}</h3>
                   </div>
                   <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-12 h-12 text-neutral-400" /></div>
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-400"></div>
                </div>

                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
                   <div className="relative z-10">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('activeNow')}</p>
                      <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">3</h3>
                   </div>
                   <div className="absolute top-0 right-0 p-4 opacity-5"><Briefcase className="w-12 h-12 text-neutral-400" /></div>
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
                </div>

                <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
                   <div className="relative z-10">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('onLeave')}</p>
                      <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">1</h3>
                   </div>
                   <div className="absolute top-0 right-0 p-4 opacity-5"><Calendar className="w-12 h-12 text-neutral-400" /></div>
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                </div>
                
                 <div className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative overflow-hidden group hover:shadow-md transition-shadow">
                   <div className="relative z-10">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">{t('payrollEst')}</p>
                      <h3 className="text-3xl font-bold text-neutral-800 dark:text-white">{formatMoney(employees.reduce((acc, curr) => acc + curr.salary, 0) / 12 / 1000)}k</h3>
                   </div>
                   <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign className="w-12 h-12 text-neutral-400" /></div>
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-500"></div>
                </div>
              </div>

              <Card className="!p-0 overflow-visible border-t-4 border-t-sky-500">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                   <div className="flex items-center gap-4 w-full sm:w-auto">
                        <h3 className="font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-rose-500" /> {t('employeeDatabase')}
                        </h3>
                        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-2"></div>
                        <Dropdown
                          options={departments.map(dept => ({ value: dept, label: dept }))}
                          value={departmentFilter}
                          onChange={(val) => setDepartmentFilter(val)}
                          icon={<Filter className="w-3 h-3" />}
                          className="min-w-[160px]"
                          size="sm"
                        />
                   </div>
                   
                   <button 
                     onClick={() => setIsEmployeeModalOpen(true)}
                     className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider hover:underline flex items-center gap-1"
                   >
                     <UserPlus className="w-4 h-4" /> {t('registerNew')}
                   </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
                    <thead className="bg-neutral-100/50 dark:bg-black/20 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-gray-200 dark:border-neutral-800 font-mono">
                      <tr>
                        <th className="px-6 py-4">{t('name')}</th>
                        <th className="px-6 py-4">{t('role')}</th>
                        <th className="px-6 py-4">{t('department')}</th>
                        <th className="px-6 py-4">{t('status')}</th>
                        <th className="px-6 py-4">{t('salary')}</th>
                        <th className="px-6 py-4 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                  {emp.name.split(' ').map(n => n[0]).join('')}
                               </div>
                               <div>
                                  <p className="font-bold text-neutral-900 dark:text-white group-hover:text-rose-500 transition-colors">{emp.name}</p>
                                  <p className="text-xs text-neutral-400 font-mono">{emp.id}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium">{emp.role}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] uppercase font-bold tracking-wide border border-neutral-200 dark:border-neutral-700">
                               {emp.department}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                               emp.status === 'Active' ? 'bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-100/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}>
                               <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                               {emp.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-neutral-700 dark:text-neutral-300">{formatMoney(emp.salary / 12)}<span className="text-[10px] text-neutral-400 font-normal">/mo</span></td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                               <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
          </div>
        );
      case 'shifts':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                 <div className="flex items-center gap-4">
                    <button onClick={handlePreviousWeek} className="p-2 hover:bg-white/50 dark:hover:bg-neutral-800 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                       <Calendar className="w-5 h-5 text-rose-500" />
                       {formatWeekLabel(currentWeekStart)}
                    </div>
                    <button onClick={handleNextWeek} className="p-2 hover:bg-white/50 dark:hover:bg-neutral-800 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setIsShiftModalOpen(true)}
                      className="px-3 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors flex items-center gap-2 font-bold shadow-sm">
                       <UserPlus className="w-4 h-4" /> {t('addShift')}
                    </button>
                 </div>
             </div>

             <Card className="overflow-visible !p-0">
                <div className="overflow-x-auto">
                   <table className="w-full border-collapse text-sm">
                      <thead>
                         <tr>
                            <th className="p-4 text-left border-b border-r border-gray-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 min-w-[200px] text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('employee')}</th>
                            {daysOfWeek.map((day, index) => (
                               <th key={day} className="p-4 text-center border-b border-gray-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 min-w-[120px]">
                                  <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase">{day}</div>
                                  <div className="text-[10px] text-neutral-500 font-mono mt-1">
                                    {weekDates[index]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                               </th>
                            ))}
                         </tr>
                      </thead>
                      <tbody>
                         {filteredEmployees.map(emp => (
                            <tr key={emp.id} className="border-b border-gray-100 dark:border-neutral-800 hover:bg-rose-50/10 dark:hover:bg-rose-900/5">
                               <td className="p-4 border-r border-gray-100 dark:border-neutral-800">
                                  <div className="font-bold text-neutral-900 dark:text-neutral-100">{emp.name}</div>
                                  <div className="text-xs text-neutral-500 font-mono">{emp.role}</div>
                               </td>
                               {daysOfWeek.map((day, dayIndex) => {
                                  const shift = getShiftForEmployee(emp.id, dayIndex);
                                  return (
                                     <td 
                                        key={day} 
                                        className="p-2 text-center h-24 relative group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-r border-gray-50 dark:border-neutral-800/50"
                                        onClick={() => !shift && handleCellClick(emp.id, dayIndex)}
                                     >
                                        {shift ? (
                                           <div className={`
                                              w-full h-full rounded-lg p-2 text-xs flex flex-col justify-center items-center gap-1 border shadow-sm
                                              ${shift.type === 'Morning' ? 'bg-orange-100/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30 text-orange-700 dark:text-orange-300' : 
                                                shift.type === 'Evening' ? 'bg-sky-100/50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/30 text-sky-700 dark:text-sky-300' :
                                                shift.type === 'Afternoon' ? 'bg-amber-100/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                'bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-300'}
                                           `}>
                                              <span className="font-bold font-mono">{shift.startTime} - {shift.endTime}</span>
                                              <span className="opacity-75 uppercase text-[10px] tracking-wide font-bold">{shift.type}</span>
                                           </div>
                                        ) : (
                                           <div className="w-full h-full rounded-lg border border-dashed border-transparent group-hover:border-neutral-300 dark:group-hover:border-neutral-600 flex items-center justify-center transition-all">
                                              <PlusIcon className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100" />
                                           </div>
                                        )}
                                     </td>
                                  );
                               })}
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>
          </div>
        );
      case 'payroll':
        return (
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1 space-y-6">
                    <div className="relative overflow-hidden rounded-lg bg-neutral-900 dark:bg-neutral-800 text-white shadow-sm border border-neutral-700 p-6">
                       <div className="absolute top-0 right-0 p-6 opacity-20"><DollarSign className="w-24 h-24" /></div>
                       <div className="relative z-10">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <p className="text-sky-100 font-medium mb-1 text-sm uppercase tracking-wider">{t('nextPayrollRun')}</p>
                                 <h3 className="text-3xl font-bold font-mono">Oct 31, 2023</h3>
                              </div>
                              <div className="p-2 bg-white/10 rounded-lg">
                                 <Calendar className="w-6 h-6 text-white" />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <div className="flex justify-between text-sm text-sky-100 border-b border-sky-500/30 pb-2">
                                 <span>{t('estimatedCost')}</span>
                                 <span className="font-bold text-white font-mono">{formatMoney(employees.reduce((acc, e) => acc + e.salary, 0) / 12)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-sky-100">
                                 <span>{t('employees')}</span>
                                 <span className="font-bold text-white">{employees.length} {t('active')}</span>
                              </div>
                           </div>
                           <div className="mt-6">
                              <button 
                                 onClick={handleRunPayroll}
                                 disabled={isPayrollRunning}
                                 className="w-full py-3 bg-white text-sky-600 font-bold rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-80 disabled:cursor-not-allowed uppercase tracking-wide text-xs"
                              >
                                 {isPayrollRunning ? <Clock className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                 {isPayrollRunning ? t('processing') : t('executePayroll')}
                              </button>
                           </div>
                       </div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/20 rounded-lg p-4 flex gap-3">
                       <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                       <div>
                          <h4 className="font-bold text-orange-800 dark:text-orange-300 text-sm uppercase tracking-wide">{t('actionRequired')}</h4>
                          <p className="text-sm text-orange-700 dark:text-orange-400/80 mt-1">{t('reviewTimesheets')}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex-[2]">
                    <Card title={t('payrollHistory')} className="h-full !p-0 overflow-hidden" action={<button className="text-rose-600 dark:text-rose-400 text-xs font-bold uppercase hover:underline">{t('viewAll')}</button>}>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
                             <thead className="bg-neutral-100/50 dark:bg-black/20 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold border-b border-gray-200 dark:border-neutral-800 font-mono">
                                <tr>
                                   <th className="px-6 py-4">{t('payPeriod')}</th>
                                   <th className="px-6 py-4">{t('payDate')}</th>
                                   <th className="px-6 py-4">{t('employees')}</th>
                                   <th className="px-6 py-4">{t('totalPaid')}</th>
                                   <th className="px-6 py-4">{t('status')}</th>
                                   <th className="px-6 py-4 text-right">{t('receipt')}</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                                {payrollHistory.map((record) => (
                                   <tr key={record.id} className="hover:bg-rose-50/10 dark:hover:bg-rose-900/10 transition-colors">
                                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-neutral-100">
                                         {record.period}
                                      </td>
                                      <td className="px-6 py-4 text-neutral-500 font-mono text-xs">{record.payDate}</td>
                                      <td className="px-6 py-4">{record.employees}</td>
                                      <td className="px-6 py-4 font-bold font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(record.total)}</td>
                                      <td className="px-6 py-4">
                                         <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                            <CheckCircle className="w-3 h-3" /> {record.status}
                                         </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                         <button className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors">
                                            <Download className="w-4 h-4" />
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </Card>
                 </div>
              </div>
           </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-enter">
        <div className="relative pl-4 border-l-4 border-rose-500">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight uppercase">
            {t('personnelManagement')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono text-sm tracking-wider">
            {t('humanResourcesAdmin')}
          </p>
        </div>
        
        {/* Futuristic Tab Switcher */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
           {[
              { id: 'directory', label: t('directory'), icon: Users },
              { id: 'shifts', label: t('shifts'), icon: Clock },
              { id: 'payroll', label: t('payroll'), icon: DollarSign },
           ].map((tab) => (
              <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                    ${activeTab === tab.id 
                       ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm border border-gray-200 dark:border-neutral-700' 
                       : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-white/5'}
                 `}
              >
                 <tab.icon className="w-3 h-3" />
                 {tab.label}
              </button>
           ))}
        </div>
      </div>
      
      {renderContent()}

      {/* Add Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full shadow-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-500" />
                {t('createShift')}
              </h3>
              <button 
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setNewShift({ employeeId: '', date: '', startTime: '', endTime: '', type: 'Morning' });
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Show selected employee and date info */}
            {newShift.employeeId && newShift.date && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                    {employees.find(e => e.id === newShift.employeeId)?.name.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      {employees.find(e => e.id === newShift.employeeId)?.name || 'Unknown Employee'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {new Date(newShift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Quick Shift Presets */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('quickShiftPresets')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewShift({ ...newShift, startTime: '06:00', endTime: '14:00', type: 'Morning' })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newShift.type === 'Morning' && newShift.startTime === '06:00' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">☀️ {t('morning')}</div>
                    <div className="text-xs text-neutral-500 font-mono">06:00 - 14:00</div>
                  </button>
                  <button
                    onClick={() => setNewShift({ ...newShift, startTime: '10:00', endTime: '18:00', type: 'Afternoon' })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newShift.type === 'Afternoon' && newShift.startTime === '10:00'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">🌤️ {t('afternoon')}</div>
                    <div className="text-xs text-neutral-500 font-mono">10:00 - 18:00</div>
                  </button>
                  <button
                    onClick={() => setNewShift({ ...newShift, startTime: '14:00', endTime: '22:00', type: 'Evening' })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newShift.type === 'Evening' && newShift.startTime === '14:00'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-sky-300'
                    }`}
                  >
                    <div className="font-bold text-sky-600 dark:text-sky-400 text-sm">🌆 {t('evening')}</div>
                    <div className="text-xs text-neutral-500 font-mono">14:00 - 22:00</div>
                  </button>
                  <button
                    onClick={() => setNewShift({ ...newShift, startTime: '22:00', endTime: '06:00', type: 'Night' })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newShift.type === 'Night' && newShift.startTime === '22:00'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">🌙 {t('night')}</div>
                    <div className="text-xs text-neutral-500 font-mono">22:00 - 06:00</div>
                  </button>
                </div>
              </div>

              {/* Employee selector (shown when not pre-selected) */}
              {!newShift.employeeId && (
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Employee</label>
                  <Dropdown
                    options={[
                      { value: '', label: 'Select Employee' },
                      ...employees.map(emp => ({ value: String(emp.id), label: emp.name }))
                    ]}
                    value={newShift.employeeId}
                    onChange={(val) => setNewShift({ ...newShift, employeeId: val })}
                    placeholder="Select Employee"
                    size="md"
                  />
                </div>
              )}

              {/* Date selector (shown when not pre-selected) */}
              {!newShift.date && (
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              )}

              {/* Custom Time Override */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('customTime')} <span className="text-xs font-normal text-neutral-400">({t('orOverridePreset')})</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('startTime')}</label>
                    <input 
                      type="time" 
                      value={newShift.startTime} 
                      onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('endTime')}</label>
                    <input
                      type="time"
                      value={newShift.endTime}
                      onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateShift}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-500 font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('createShift')}
                </button>
                <button
                  onClick={() => {
                    setIsShiftModalOpen(false);
                    setNewShift({ employeeId: '', date: '', startTime: '', endTime: '', type: 'Morning' });
                  }}
                  className="flex-1 px-4 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-600 font-bold transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-lg w-full shadow-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-500" />
                {t('registerNewEmployee')}
              </h3>
              <button 
                onClick={() => {
                  setIsEmployeeModalOpen(false);
                  setNewEmployee({
                    name: '',
                    email: '',
                    role: '',
                    department: 'Operations',
                    salary: 0,
                    status: 'Active',
                    joinDate: new Date().toISOString().split('T')[0]
                  });
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="Enter employee name"
                  className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="employee@company.com"
                  className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Role and Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    placeholder="e.g., Cashier"
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <Dropdown
                    options={[
                      { value: 'Operations', label: 'Operations' },
                      { value: 'Management', label: 'Management' },
                      { value: 'Sales', label: 'Sales' },
                      { value: 'Warehouse', label: 'Warehouse' },
                      { value: 'Finance', label: 'Finance' },
                      { value: 'HR', label: 'HR' },
                    ]}
                    value={newEmployee.department}
                    onChange={(val) => setNewEmployee({ ...newEmployee, department: val })}
                    size="md"
                  />
                </div>
              </div>

              {/* Salary and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Annual Salary <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">$</span>
                    <input
                      type="number"
                      value={newEmployee.salary || ''}
                      onChange={(e) => setNewEmployee({ ...newEmployee, salary: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t('status')}</label>
                  <Dropdown
                    options={[
                      { value: 'Active', label: t('active') },
                      { value: 'On Leave', label: t('onLeave') },
                    ]}
                    value={newEmployee.status}
                    onChange={(val) => setNewEmployee({ ...newEmployee, status: val as 'Active' | 'On Leave' })}
                    size="md"
                  />
                </div>
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t('joinDate')}</label>
                <input
                  type="date"
                  value={newEmployee.joinDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              {/* Salary Preview */}
              {newEmployee.salary > 0 && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 font-bold">{t('salaryBreakdown')}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-neutral-800 dark:text-white font-mono">
                        {formatMoney(newEmployee.salary / 12)}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">{t('monthly')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-neutral-800 dark:text-white font-mono">
                        {formatMoney(newEmployee.salary / 52)}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">{t('weekly')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-neutral-800 dark:text-white font-mono">
                        {formatMoney(newEmployee.salary / 24)}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">{t('biWeekly')}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateEmployee}
                  disabled={isCreatingEmployee}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-500 font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingEmployee ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Register Employee
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEmployeeModalOpen(false);
                    setNewEmployee({
                      name: '',
                      email: '',
                      role: '',
                      department: 'Operations',
                      salary: 0,
                      status: 'Active',
                      joinDate: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-600 font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for Shift Table
const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14M12 5v14" />
    </svg>
);

export default HR;
