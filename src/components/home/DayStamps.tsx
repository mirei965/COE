'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEventLogs } from '@/hooks/useEventLogs';
import { Zap, Pill, AlertTriangle, Coffee, Settings2, Plus, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSetting } from '@/hooks/useSettings';
import { Input } from '@/components/ui/Input';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';

const DEFAULT_STAMPS = {
  symptom: ['頭痛', 'めまい', '耳鳴り', '気分の落ち込み', '不安感'],
  medicine: ['薬A', '薬B', '薬C'],
  trigger: ['低気圧', '睡眠不足', 'ストレス', '人混み', '音', '光'],
  food: ['水', 'カフェイン', 'アルコール'],
};

// Component to handle local input state for IME compatibility
const DetailInput = ({ initialValue, onSave, placeholder }: { initialValue: string, onSave: (val: string) => void, placeholder: string }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      type="text"
      placeholder={placeholder}
      className="text-base p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-brand-500 focus:outline-none w-full"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) onSave(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
};

export function DayStamps() {
  const today = new Date().toISOString().split('T')[0];
  const medicines = useLiveQuery(() => db.medicines.toArray());
  const { addEventLog, updateEventLog } = useEventLogs(today);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newStampInputs, setNewStampInputs] = useState<Record<string, string>>({});

  // State for custom dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Track last logged info for each item: { [itemName]: { id: logId, timestamp: number, severity: number } }
  const [lastLoggedMap, setLastLoggedMap] = useState<Record<string, { id: number, timestamp: number, severity: number }>>({});

  // Settings for each category
  const { value: symptoms, setValue: setSymptoms } = useSetting<string[]>('stamps_symptom', DEFAULT_STAMPS.symptom);
  const { value: meds, setValue: setMeds } = useSetting<string[]>('stamps_medicine', DEFAULT_STAMPS.medicine);
  const { value: triggers, setValue: setTriggers } = useSetting<string[]>('stamps_trigger', DEFAULT_STAMPS.trigger);
  const { value: foods, setValue: setFoods } = useSetting<string[]>('stamps_food', DEFAULT_STAMPS.food);

  // Detailed settings for items (medication dosage, food amount, etc.)
  type ItemDetail = { status?: 'none' | 'decrease' | 'increase' | 'new' | 'stop'; dosage: string; unit?: string };
  const { value: itemDetails, setValue: setItemDetails } = useSetting<Record<string, ItemDetail>>('stamp_details', {});

  // Safe access helper
  const getItemDetail = (name: string) => (itemDetails || {})[name];

  const categories = [
    { key: 'symptom', label: '症状', items: symptoms, setter: setSymptoms, color: 'red', icon: Zap },
    { key: 'medicine', label: '薬（頓服など）', items: meds, setter: setMeds, color: 'blue', icon: Pill },
    { key: 'trigger', label: '考えられる原因', items: triggers, setter: setTriggers, color: 'amber', icon: AlertTriangle },
    { key: 'food', label: '食べ物や飲み物', items: foods, setter: setFoods, color: 'emerald', icon: Coffee },
  ] as const;

  /**
   * Handles recording a stamp (symptom, medicine, etc.)
   * If tapped again within 5 seconds, it increments the severity/quantity.
   */
  const handleStamp = async (type: string, name: string) => {
    if (isEditing) return;
    try {
      const detail = getItemDetail(name);
      const logName = detail?.dosage ? `${name} (${detail.dosage})` : name;
      const now = Date.now();

      const last = lastLoggedMap[logName];
      if (last && (now - last.timestamp < 5000)) {
        // Increment severity (1-4 for quantity types, 1-3 for quality types)
        const isQuantityType = type === 'medicine' || type === 'food';
        const maxLevel = isQuantityType ? 4 : 3;
        const newSeverity = (last.severity % maxLevel) + 1;

        await updateEventLog(last.id, { severity: newSeverity as 1 | 2 | 3 });

        setLastLoggedMap(prev => ({
          ...prev,
          [logName]: { ...last, severity: newSeverity, timestamp: now }
        }));

        let feedbackMsg = '';
        if (isQuantityType) {
          feedbackMsg = `${logName} x${newSeverity}`;
        } else {
          const severityLabel = newSeverity === 1 ? '弱' : newSeverity === 2 ? '中' : '強';
          feedbackMsg = `${logName} の強度を【${severityLabel}】に変更しました`;
        }
        setFeedback(feedbackMsg);
      } else {
        // Create a new log entry
        const id = await addEventLog({
          type: type as 'symptom' | 'medicine' | 'trigger' | 'food',
          name: logName,
          severity: 1,
        });

        if (id) {
          setLastLoggedMap(prev => ({
            ...prev,
            [logName]: { id, timestamp: now, severity: 1 }
          }));
        }

        const isQuantityType = type === 'medicine' || type === 'food';
        setFeedback(`${logName} を記録しました ${isQuantityType ? '(タップで量を追加)' : '(タップで強度変更)'}`);
      }

      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error('Failed to handle stamp:', error);
    }
  };

  /**
   * Updates specific detail fields for an item (dosage, status)
   */
  const updateItemDetail = (name: string, field: keyof ItemDetail, value: unknown) => {
    const currentDetails = itemDetails || {};
    setItemDetails({
      ...currentDetails,
      [name]: {
        ...(currentDetails[name] || { dosage: '' }),
        [field]: value
      }
    });
  };

  const handleSelectOption = (item: string, value: string) => {
    updateItemDetail(item, 'status', value as 'none' | 'decrease' | 'increase' | 'new' | 'stop');
    setOpenDropdown(null);
  };

  const getStatusLabel = (value: string) => {
    switch (value) {
      case 'decrease': return '↓ 減薬';
      case 'increase': return '↑ 増薬';
      case 'new': return '🔰 新規';
      case 'stop': return '🚫 中止';
      default: return '変化なし';
    }
  };

  const handleAddStamp = (key: string, currentItems: string[], setter: (val: string[]) => void) => {
    const newVal = newStampInputs[key]?.trim();
    if (!newVal || currentItems.includes(newVal)) return;
    if (currentItems.length >= 12) {
      alert('登録できるのは最大12個までです');
      return;
    }

    setter([...currentItems, newVal]);
    setNewStampInputs({ ...newStampInputs, [key]: '' });
  };

  const handleDeleteStamp = (key: string, itemToDelete: string, currentItems: string[], setter: (val: string[]) => void) => {
    setter(currentItems.filter(item => item !== itemToDelete));
  };

  const getStatusIcon = (status?: string) => {
    if (!status || status === 'none') return null;

    let content = null;
    switch (status) {
      case 'decrease': content = <span className="text-blue-500 font-bold text-sm drop-shadow-sm">↓</span>; break;
      case 'increase': content = <span className="text-red-500 font-bold text-sm drop-shadow-sm">↑</span>; break;
      case 'new': content = <span className="text-emerald-500 text-[8px] font-black leading-none uppercase drop-shadow-sm">New</span>; break;
      case 'stop': content = <span className="text-slate-500 text-[8px] font-black leading-none uppercase drop-shadow-sm">Stop</span>; break;
    }

    return (
      <div className="absolute -top-2.5 -right-1.5 z-30 pointer-events-none scale-90">
        {content}
      </div>
    );
  };

  const getSeverityIndicator = (name: string, type: string) => {
    const detail = getItemDetail(name);
    const logName = detail?.dosage ? `${name} (${detail.dosage})` : name;
    const last = lastLoggedMap[logName];
    // Only show if recent
    if (!last || (Date.now() - last.timestamp > 5000)) return null;

    if (type === 'medicine' || type === 'food') {
      return (
        <span className={cn(
          "ml-1.5 flex items-center justify-center text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px]",
          type === 'medicine' ? "bg-brand-500" : "bg-emerald-500"
        )}>
          x{last.severity}
        </span>
      );
    }

    return (
      <span className="ml-1.5 flex gap-0.5">
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={cn(
              "w-1 h-3 rounded-full transition-all",
              i <= last.severity ? "bg-brand-400 dark:bg-brand-500" : "bg-slate-200 dark:bg-slate-700"
            )}
          />
        ))}
      </span>
    );
  };

  return (
    <Card className="border-brand-100 dark:border-slate-800 relative">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 text-slate-700 dark:text-slate-200">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="h-5 w-5 text-brand-400" />
          <span>Quick Log</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className={cn("h-8 w-8 p-0 rounded-full", isEditing && "bg-slate-100 dark:bg-slate-800 text-brand-500")}
        >
          {isEditing ? <Check className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing && (
          <Button
            className="fixed bottom-24 right-6 z-[70] rounded-full w-12 h-12 shadow-xl bg-brand-500 hover:bg-brand-600 text-white animate-in zoom-in duration-200"
            onClick={() => setIsEditing(false)}
          >
            <Check className="h-6 w-6" />
          </Button>
        )}
        {feedback && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-brand-500/90 text-white px-6 py-2 rounded-full text-sm shadow-2xl animate-fade-in-up z-50 backdrop-blur-md">
            {feedback}
          </div>
        )}

        <div className="grid gap-6">
          {categories.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 pt-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  cat.color === 'red' && "bg-red-400",
                  cat.color === 'blue' && "bg-blue-400",
                  cat.color === 'amber' && "bg-amber-400",
                  cat.color === 'emerald' && "bg-emerald-400"
                )}></span>
                {cat.label}
              </h3>

              <div className={cn(
                "gap-2",
                isEditing ? "flex flex-wrap" : "grid grid-cols-3 sm:flex sm:flex-wrap"
              )}>
                {cat.items?.map(item => {
                  const detail = getItemDetail(item);
                  const isMedicine = cat.key === 'medicine';
                  const Wrapper = isEditing ? 'div' : 'button';
                  const medInfo = medicines?.find(m => m.name === item);
                  const isPrn = medInfo?.type === 'prn' || detail?.dosage === '頓服';

                  return (
                    <div key={item} className={cn("relative group", !isEditing && "col-span-1")}>
                      {!isEditing && getStatusIcon(detail?.status)}
                      <Wrapper
                        onClick={!isEditing ? () => handleStamp(cat.key, item) : undefined}
                        className={cn(
                          "rounded-md text-sm shadow-sm flex flex-col items-center",
                          !isEditing && "transition-all active:scale-95 justify-center px-1 py-1.5 sm:px-3 min-w-0 sm:min-w-[3rem] w-full h-full",
                          !isEditing && detail?.dosage && detail.dosage !== '頓服' && "py-2 leading-none",
                          isEditing && "justify-start px-3 py-3 w-auto min-w-[140px] h-full cursor-default ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900",
                          !isEditing && cat.color === 'red' && "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
                          !isEditing && cat.color === 'blue' && "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
                          !isEditing && cat.color === 'amber' && "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
                          !isEditing && cat.color === 'emerald' && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        )}
                      >
                        <div className="flex items-center gap-0.5 flex-wrap justify-center font-bold">
                          {item}
                          {!isEditing && isPrn && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-800 shrink-0 ml-1">
                              頓
                            </span>
                          )}
                          {!isEditing && getSeverityIndicator(item, cat.key)}
                        </div>

                        {!isEditing && detail?.dosage && detail.dosage !== '頓服' && (
                          <span className="text-[10px] opacity-70 mt-0.5 font-mono">{detail.dosage}</span>
                        )}

                        {isEditing && (isMedicine || cat.key === 'food') && (
                          <div className="mt-2 flex flex-col gap-1 w-full min-w-[120px]" onClick={e => e.stopPropagation()}>
                            <DetailInput
                              initialValue={detail?.dosage || ''}
                              placeholder={isMedicine ? "1回量 (例: 0.5mg)" : "1回分 (例: 200ml)"}
                              onSave={(val) => updateItemDetail(item, 'dosage', val)}
                            />
                            {isMedicine && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === item ? null : item);
                                  }}
                                  className="text-base p-1.5 w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 text-left flex items-center justify-between text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                                >
                                  <span className={cn((detail?.status || 'none') === 'none' && "text-slate-500")}>
                                    {getStatusLabel(detail?.status || 'none')}
                                  </span>
                                  <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", openDropdown === item && "rotate-180")} />
                                </button>

                                {openDropdown === item && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[60]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(null);
                                      }}
                                    />
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-[70] overflow-hidden py-1 animate-in slide-in-from-top-1 duration-200">
                                      {['none', 'decrease', 'increase', 'new', 'stop'].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectOption(item, opt);
                                          }}
                                          className={cn(
                                            "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between",
                                            (detail?.status || 'none') === opt
                                              ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
                                              : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                          )}
                                        >
                                          {getStatusLabel(opt)}
                                          {(detail?.status || 'none') === opt && <Check className="h-4 w-4" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Wrapper>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStamp(cat.key, item, cat.items || [], cat.setter);
                          }}
                          className="absolute -top-1 -right-1 bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-500 rounded-full p-0.5 w-4 h-4 flex items-center justify-center transition-colors shadow-sm z-10"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {isEditing && (cat.items?.length || 0) < 12 && (
                  <div className="flex items-center gap-1 animate-fade-in ml-1 text-slate-400">
                    <Input
                      className="h-8 w-24 text-xs px-2 py-1"
                      placeholder="追加..."
                      value={newStampInputs[cat.key] || ''}
                      onChange={(e) => setNewStampInputs({ ...newStampInputs, [cat.key]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          handleAddStamp(cat.key, cat.items || [], cat.setter);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800"
                      onClick={() => handleAddStamp(cat.key, cat.items || [], cat.setter)}
                    >
                      <Plus className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
