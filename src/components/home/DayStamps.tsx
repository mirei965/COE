import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEventLogs } from '@/hooks/useEventLogs';
import { Zap, Pill, AlertTriangle, Coffee, Settings2, Plus, X, Check, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSetting } from '@/hooks/useSettings';
import { Input } from '@/components/ui/Input';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalISOString } from '@/lib/date';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
      // Important: Stop propagation of pointer events to prevent Dnd activation while typing
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={() => {
        if (value !== initialValue) onSave(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.currentTarget.blur();
        }
      }}
    />
  );
};

// Sortable Item Component
function SortableItem({
  id,
  children,
  isEditing,
  className
}: {
  id: string,
  children: React.ReactNode,
  isEditing: boolean,
  className?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled: !isEditing,
    animateLayoutChanges: () => false // Disable default layout animation to prevent weird jumps
  });

  const style = {
    // CSS.Translate prevents scaling artifacts which can cause positioning mismatch
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.3 : 1, // Make original item semi-transparent while dragging
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(className, isDragging && "touch-none")}
    >
      {children}
    </div>
  );
}

export function DayStamps() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = getLocalISOString();
  const medicines = useLiveQuery(() => db.medicines.toArray());
  const { eventLogs, addEventLog, updateEventLog } = useEventLogs(today);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newStampInputs, setNewStampInputs] = useState<Record<string, string>>({});

  // State for custom dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // For drag overlay

  // Track last logged info for each item
  const [lastLoggedMap, setLastLoggedMap] = useState<Record<string, { id: number, timestamp: number, severity: number }>>({});
  const lastLoggedRef = useRef<Record<string, { id: number, timestamp: number, severity: number }>>({});
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Sync recent logs from DB to state/ref to allow "continuation" of combos after reload
  useEffect(() => {
    if (!eventLogs) return;
    const now = Date.now();
    const map: Record<string, { id: number, timestamp: number, severity: number }> = {};

    eventLogs.forEach(log => {
      // Only consider logs from the last 5 minutes for potential "combo-ing" (visual) 
      // or actually checking specific threshold logic (5 seconds) happen in handleStamp.
      // We just map the LATEST log for each name.
      // Since eventLogs are sorted by timestamp (asc), iterate valid logs and overwrite.
      if (log.id && log.timestamp && log.name) {
        // Normalized key logic should match handleStamp
        const nameKey = log.name; // Logic in handleStamp uses formatted name w/ dosage
        map[nameKey] = { id: log.id, timestamp: log.timestamp, severity: log.severity };
      }
    });

    // Only update if we have new info that is newer than what we have (or we are initializing)
    // Actually, simple sync is fine because DB is source of truth.
    // We merge with current ref to not lose milliseconds-fresh optimistic updates if any.
    // But optimistic updates are immediately written to DB, so DB eventually reflects them.
    // To be safe against race conditions where DB update hasn't come back yet but we have local ref:
    // We can rely on the fact that if it's in DB, it's saved.

    // We mainly want to catch: "Page loaded, is there a recent log I can increment?"
    // So we iterate and populate.
    Object.entries(map).forEach(([key, val]) => {
      const current = lastLoggedRef.current[key];
      if (!current || val.timestamp > current.timestamp) {
        lastLoggedRef.current[key] = val;
      }
    });
    setLastLoggedMap(prev => ({ ...prev, ...map }));
  }, [eventLogs]);

  // Settings for each category
  const { value: symptoms, setValue: setSymptoms } = useSetting<string[]>('stamps_symptom', DEFAULT_STAMPS.symptom);
  const { value: meds, setValue: setMeds } = useSetting<string[]>('stamps_medicine', DEFAULT_STAMPS.medicine);
  const { value: triggers, setValue: setTriggers } = useSetting<string[]>('stamps_trigger', DEFAULT_STAMPS.trigger);
  const { value: foods, setValue: setFoods } = useSetting<string[]>('stamps_food', DEFAULT_STAMPS.food);

  // Detailed settings for items
  type ItemDetail = { status?: 'none' | 'decrease' | 'increase' | 'new' | 'stop'; dosage: string; unit?: string };
  const { value: itemDetails, setValue: setItemDetails } = useSetting<Record<string, ItemDetail>>('stamp_details', {});

  const getItemDetail = (name: string) => (itemDetails || {})[name];

  const categories = [
    { key: 'symptom', label: '症状', items: symptoms, setter: setSymptoms, color: 'red', icon: Zap },
    { key: 'medicine', label: '薬（頓服など）', items: meds, setter: setMeds, color: 'blue', icon: Pill },
    { key: 'trigger', label: '考えられる原因', items: triggers, setter: setTriggers, color: 'amber', icon: AlertTriangle },
    { key: 'food', label: '食べ物や飲み物', items: foods, setter: setFoods, color: 'emerald', icon: Coffee },
  ] as const;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync medicines from DB to Quick Log stamps
  useEffect(() => {
    if (!medicines || !meds) return;

    const registeredNames = medicines.map(m => m.name);
    if (registeredNames.length === 0) return;

    const defaultPlaceholders = ['薬A', '薬B', '薬C'];
    const customItems = meds.filter(m => !defaultPlaceholders.includes(m) && !registeredNames.includes(m));
    const newMedsList = [...registeredNames, ...customItems];

    if (JSON.stringify(newMedsList) !== JSON.stringify(meds)) {
      setMeds(newMedsList);
    }
  }, [medicines, meds, setMeds]);

  // Sync state with ref on mount/updates if necessary, though mainly we drive from ref to state in handleStamp
  // Actually we don't need effect sync provided we always write to both in handleStamp.

  if (!mounted) {
    return (
      <Card className="border-brand-100 dark:border-slate-800 relative min-h-[400px]">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 text-slate-700 dark:text-slate-200">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const itemsStr = active.id as string;
    const category = categories.find(cat => cat.items?.includes(itemsStr));

    if (category && category.items) {
      const oldIndex = category.items.indexOf(itemsStr);
      const newIndex = category.items.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        category.setter(arrayMove(category.items, oldIndex, newIndex));
      }
    }
  };

  const handleStamp = (type: string, name: string) => {
    if (isEditing) return;
    processingQueueRef.current = processingQueueRef.current.then(async () => {
      try {
        const detail = getItemDetail(name);
        const logName = detail?.dosage ? `${name} (${detail.dosage})` : name;
        const now = Date.now();

        // Use Ref for immediate logic check to prevent race conditions
        const last = lastLoggedRef.current[logName];

        if (last && (now - last.timestamp < 5000)) {
          const isQuantityType = type === 'medicine' || type === 'food';
          const maxLevel = isQuantityType ? 5 : 3; // Use 5 for max severity as per updated schema
          const newSeverity = (last.severity % maxLevel) + 1;

          await updateEventLog(last.id, { severity: newSeverity });

          const updatedEntry = { ...last, severity: newSeverity, timestamp: now };

          // Update Ref immediately
          lastLoggedRef.current[logName] = updatedEntry;
          // Update State for UI
          setLastLoggedMap(prev => ({ ...prev, [logName]: updatedEntry }));

          let feedbackMsg = '';
          if (isQuantityType) {
            feedbackMsg = `${logName} x${newSeverity}`;
          } else {
            const severityLabel = newSeverity === 1 ? '弱' : newSeverity === 2 ? '中' : '強';
            feedbackMsg = `${logName} の強度を【${severityLabel}】に変更しました`;
          }
          setFeedback(feedbackMsg);
        } else {
          const id = await addEventLog({
            type: type as 'symptom' | 'medicine' | 'trigger' | 'food',
            name: logName,
            severity: 1,
          });

          if (id) {
            const newEntry = { id, timestamp: now, severity: 1 };
            // Update Ref immediately
            lastLoggedRef.current[logName] = newEntry;
            // Update State for UI
            setLastLoggedMap(prev => ({ ...prev, [logName]: newEntry }));
          }

          const isQuantityType = type === 'medicine' || type === 'food';
          setFeedback(`${logName} を記録しました ${isQuantityType ? '(タップで量を追加)' : '(タップで強度変更)'}`);
        }

        setTimeout(() => setFeedback(null), 3000);
      } catch (error) {
        console.error('Failed to handle stamp:', error);
      }
    }).catch(err => {
      console.error('DayStamps Queue Error:', err);
    });
  };

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
    return <div className="absolute -top-2.5 -right-1.5 z-30 pointer-events-none scale-90">{content}</div>;
  };

  const getSeverityIndicator = (name: string, type: string) => {
    const detail = getItemDetail(name);
    const logName = detail?.dosage ? `${name} (${detail.dosage})` : name;
    const last = lastLoggedMap[logName];
    // 表示用インジケーターは操作が終わったら消えるように5秒間に戻す
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
          <span key={i} className={cn("w-1 h-3 rounded-full transition-all", i <= last.severity ? "bg-brand-400 dark:bg-brand-500" : "bg-slate-200 dark:bg-slate-700")} />
        ))}
      </span>
    );
  };

  // Helper to render card content (shared between main list and drag overlay)
  const renderCardContent = (item: string, catKey: string, catColor: string, isOverlay = false) => {
    const detail = getItemDetail(item);
    const isMedicine = catKey === 'medicine';
    const medInfo = medicines?.find(m => m.name === item);
    const isPrn = medInfo?.type === 'prn' || detail?.dosage === '頓服';
    const editingAppearance = isEditing || isOverlay;

    // Common Content (Label, Badges, Dosage info)
    const cardBody = (
      <>
        <div className="flex items-center gap-0.5 flex-wrap justify-center font-bold relative z-10 pointer-events-none">
          {item}
          {!editingAppearance && isPrn && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-800 shrink-0 ml-1">
              頓
            </span>
          )}
          {!editingAppearance && getSeverityIndicator(item, catKey)}
        </div>

        {!editingAppearance && detail?.dosage && detail.dosage !== '頓服' && (
          <span className="text-[10px] opacity-70 mt-0.5 font-mono pointer-events-none">{detail.dosage}</span>
        )}
      </>
    );

    // EDIT MODE / DRAG OVERLAY
    if (editingAppearance) {
      return (
        <div className="relative group h-full">
          <div
            className={cn(
              "rounded-md text-sm shadow-sm flex flex-col items-center justify-start px-3 py-3 w-auto min-w-[140px] h-full cursor-default ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900",
              isOverlay && "ring-2 ring-brand-500 shadow-xl opacity-90 scale-105"
            )}
          >
            {isOverlay && (
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 opacity-30 text-slate-400">
                <GripVertical className="w-3 h-3" />
              </div>
            )}

            {cardBody}

            {(isMedicine || catKey === 'food') && (
              <div className="mt-2 flex flex-col gap-1 w-full min-w-[120px]">
                {/* Only show inputs if NOT overlay, or non-interactive fake inputs */}
                {isOverlay ? (
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                ) : (
                  <>
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
                            <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-[70] overflow-hidden py-1 animate-in slide-in-from-top-1 duration-200">
                              {['none', 'decrease', 'increase', 'new', 'stop'].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSelectOption(item, opt); }}
                                  className={cn(
                                    "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between",
                                    (detail?.status || 'none') === opt ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400" : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
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
                  </>
                )}
              </div>
            )}
          </div>

          {!isOverlay && (
            <div className="absolute -top-1 -right-1 z-10">
              {/* Separate click target for delete button inside edit mode */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStamp(catKey, item, categories.find(c => c.key === catKey)?.items || [], categories.find(c => c.key === catKey)?.setter as any);
                }}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-500 rounded-full p-0.5 w-5 h-5 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // NORMAL VIEW MODE (Clickable Button)
    return (
      <div className="relative group h-full">
        {getStatusIcon(detail?.status)}
        <button
          type="button"
          onClick={(e) => {
            // Explicitly stop propagation to avoid triggering Dnd listeners if any
            e.stopPropagation();
            handleStamp(catKey, item);
          }}
          className={cn(
            "rounded-md text-sm shadow-sm flex flex-col items-center transition-all active:scale-95 justify-center px-1 py-1.5 sm:px-3 min-w-0 sm:min-w-[3rem] w-full h-full relative overflow-hidden",
            (detail?.dosage && detail.dosage !== '頓服') && "py-2 leading-none",
            catColor === 'red' && "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
            catColor === 'blue' && "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
            catColor === 'amber' && "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
            catColor === 'emerald' && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
          )}
        >
          {/* Ripple effect or active state is handled by CSS */}
          {cardBody}
        </button>
      </div>
    );
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                  <SortableContext
                    items={cat.items || []}
                    strategy={rectSortingStrategy}
                  >
                    {cat.items?.map(item => (
                      <SortableItem
                        key={item}
                        id={item}
                        isEditing={isEditing}
                        className={cn(!isEditing && "col-span-1")}
                      >
                        {renderCardContent(item, cat.key, cat.color)}
                      </SortableItem>
                    ))}
                  </SortableContext>

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

          {isEditing && (
            <div className="sticky bottom-24 flex justify-end pb-2 pr-2 z-30 pointer-events-none">
              <Button
                className="rounded-full w-12 h-12 shadow-xl pointer-events-auto bg-brand-500 hover:bg-brand-600 text-white animate-in zoom-in duration-200"
                onClick={() => setIsEditing(false)}
              >
                <Check className="h-6 w-6" />
              </Button>
            </div>
          )}

          {feedback && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className="bg-slate-800/90 dark:bg-white/90 text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-200 whitespace-nowrap">
                <Check className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                {feedback}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {mounted && createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (() => {
            const category = categories.find(cat => cat.items?.includes(activeId));
            if (!category) return null;
            return renderCardContent(activeId, category.key, category.color, true);
          })() : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
