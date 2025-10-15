import React, { useState, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Keyboard, Platform, Alert, ToastAndroid } from 'react-native';
import DatePickerModal from './DatePickerModal';
import ModalButtons from './ModalButtons';
import { supabase } from '../lib/supabase';
import styles from '../styles/splitsStyles';
import { colors } from '../styles/theme';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const roundToHalf = (n:number)=> Math.round(n*2)/2;
const addDaysFloat = (date:Date, days:number) => new Date(date.getTime() + Math.round(days*24*60*60*1000));
const getNextMonday = (from:Date) => { const d=new Date(from); const day=d.getDay(); const delta=((8-day)%7)||7; d.setDate(d.getDate()+delta); return d; };
const toDateOnly = (d:Date|null) => { if(!d) return null; const dd=new Date(d); dd.setHours(0,0,0,0); const pad=(x:number)=>String(x).padStart(2,'0'); return `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`; };

const safeStorage = { setItem: async (k:string,v:string)=>{ try{ // @ts-ignore
  if(typeof localStorage!=='undefined'&&localStorage?.setItem) localStorage.setItem(k,v);}catch{} } };

interface AddSplitModalProps {
  visible: boolean;
  onClose: () => void;
  days: any[];
  activeRuns: any[];
  profile: any;
  fetchActiveRun: () => Promise<void>;
  fetchSplits: () => Promise<void>;
}

const AddSplitModal: React.FC<AddSplitModalProps> = ({ visible, onClose, days, activeRuns, profile, fetchActiveRun, fetchSplits }) => {
  const [split, setSplit] = useState<{ name:string; mode:'week'|'rotation' }>({ name:'', mode:'week' });
  const [tab, setTab] = useState(0);
  const [adding, setAdding] = useState(false);
  const [weekdays, setWeekdays] = useState<(string|null)[]>(new Array(7).fill(null));
  const [rotationLen, setRotationLen] = useState(3);
  const [rotationInput, setRotationInput] = useState('3');
  const [rotationDays, setRotationDays] = useState<(string|null)[]>(Array.from({length:3}).map(()=>null));
  const rotationRef = useRef<TextInput|null>(null);
  const [assignWeekday, setAssignWeekday] = useState<number|null>(null);
  const [assignIndex, setAssignIndex] = useState<number|null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date|null>(null);
  const [endDate, setEndDate] = useState<Date|null>(null);
  const [duration, setDuration] = useState<number|null>(null); // weeks or rotations
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toast = (m:string)=>{ if(Platform.OS==='android' && ToastAndroid?.show) ToastAndroid.show(m, ToastAndroid.SHORT); else Alert.alert('Validation', m); };
  const rangesOverlap = (s1:string|null,e1:string|null,s2:string|null,e2:string|null)=>{ const parse=(d:string|null)=>{ if(!d) return null; const p=d.split('-').map(n=>parseInt(n,10)); if(p.length<3||p.some(isNaN)) return null; return Date.UTC(p[0],p[1]-1,p[2]); }; if(!s1||!s2) return false; const a1=parse(s1), b1=parse(e1), a2=parse(s2), b2=parse(e2); if(a1==null||a2==null) return false; if(b1!=null && b2!=null) return !(b1 < a2 || b2 < a1); if(b1==null && b2==null) return true; if(b1==null && b2!=null) return !(b2 < a1); if(b1!=null && b2==null) return !(b1 < a2); return false; };

  const reset = ()=>{ setSplit({name:'',mode:'week'}); setTab(0); setWeekdays(new Array(7).fill(null)); setRotationLen(3); setRotationInput('3'); setRotationDays(Array.from({length:3}).map(()=>null)); setAssignWeekday(null); setAssignIndex(null); setShowPicker(false); setStartDate(null); setEndDate(null); setDuration(null); setShowStartPicker(false); setShowEndPicker(false); };

  const handleCreate = async () => {
    if(!profile?.id){ toast('Must be signed in'); return; }
    if(!split.name.trim()){ toast('Split name is required'); return; }
    setAdding(true);
    try {
      const { data: created, error } = await supabase.from('splits').insert([{ name: split.name.trim(), mode: split.mode, user_id: profile.id }]).select();
      if(error){ Alert.alert('Error', error.message); return; }
      const splitId = created![0].id;
      if(split.mode==='week') {
        const inserts = weekdays.map((d,weekday)=> d ? { split_id: splitId, day_id: d, weekday, order_index: null } : null).filter(Boolean) as any[];
        if(inserts.length){ const { error: dErr } = await supabase.from('split_days').insert(inserts); if(dErr){ Alert.alert('Error', dErr.message); return; } }
      } else {
        const inserts = rotationDays.map((d,i)=> ({ split_id: splitId, day_id: d ?? null, weekday: null, order_index: i }));
        if(inserts.length){ const { error: dErr } = await supabase.from('split_days').insert(inserts); if(dErr){ Alert.alert('Error', dErr.message); return; } }
      }
      if(startDate) {
        if(split.mode==='week') {
          const ms=24*60*60*1000; let weeks='0'; if(endDate){ const s=new Date(startDate); s.setHours(0,0,0,0); const e=new Date(endDate); e.setHours(0,0,0,0); const diff=Math.floor((e.getTime()-s.getTime())/ms); weeks=String(Math.max(0.5, roundToHalf(diff/7))); } else { weeks='999'; }
          const st=toDateOnly(startDate); const en=endDate?toDateOnly(endDate):null; if(activeRuns.some(r=>rangesOverlap(r.start_date,r.end_date,st,en))) { toast('Scheduling would overlap an existing split run.'); } else { await supabase.from('split_runs').insert({ split_id: splitId, user_id: profile.id, start_date: st, end_date: en, num_weeks: endDate? parseFloat(weeks)||1:null, num_rotations: null, active: true }); await fetchActiveRun(); }
        } else {
          let rotations=1; if(startDate && endDate && rotationLen>0){ const ms=24*60*60*1000; const s=new Date(startDate); s.setHours(0,0,0,0); const e=new Date(endDate); e.setHours(0,0,0,0); const diff=Math.floor((e.getTime()-s.getTime())/ms); const inclusive=Math.max(0,diff)+1; const uiRot=Math.max(0.5, roundToHalf(inclusive/rotationLen)); rotations=Math.max(1, Math.ceil(inclusive/rotationLen)); await safeStorage.setItem('splitNumRotations', String(uiRot)); } else { await safeStorage.setItem('splitNumRotations', String(rotations)); }
          const st=toDateOnly(startDate); const en=endDate?toDateOnly(endDate):null; if(activeRuns.some(r=>rangesOverlap(r.start_date,r.end_date,st,en))) { toast('Scheduling would overlap an existing split run.'); } else { await supabase.from('split_runs').insert({ split_id: splitId, user_id: profile.id, start_date: st, end_date: en, num_weeks: null, num_rotations: rotations, active: true }); await fetchActiveRun(); }
        }
      }
      await fetchSplits();
      reset();
      onClose();
    } catch(e){ Alert.alert('Error','Failed to create split'); } finally { setAdding(false); }
  };

  const renderSchedule = () => (
    <View>
      <Text style={{ 
        marginBottom:12, 
        fontWeight:'600',
        fontSize: 15,
        color: colors.text,
        letterSpacing: 0.2,
      }}>Start Date</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
        <TouchableOpacity 
          style={{ 
            flex:1, 
            padding:14, 
            backgroundColor:'#FAFAFA', 
            borderRadius:12,
            borderWidth: 2,
            borderColor: startDate ? colors.primary : colors.border,
            shadowColor: startDate ? colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: startDate ? 2 : 0,
          }} 
          onPress={()=>{ setShowStartPicker(v=>!v); setShowEndPicker(false); }}
        >
          <Text style={{
            color: startDate ? colors.text : colors.textMuted,
            fontWeight: startDate ? '600' : '500',
            fontSize: 15,
          }}>{startDate? startDate.toDateString() : 'Select start date'}</Text>
        </TouchableOpacity>
        {startDate && 
          <TouchableOpacity 
            style={{ 
              marginLeft:10, 
              paddingVertical:10, 
              paddingHorizontal:14, 
              backgroundColor:'#F5F5F5', 
              borderRadius:10,
              borderWidth: 1,
              borderColor: colors.border,
            }} 
            onPress={()=>{ setStartDate(null); setDuration(null); }}
          >
            <Text style={{ fontWeight:'600', color: colors.text }}>✕</Text>
          </TouchableOpacity>
        }
      </View>
      <DatePickerModal visible={showStartPicker} initialDate={startDate ?? getNextMonday(new Date())} onCancel={()=>setShowStartPicker(false)} onConfirm={(iso)=>{ setShowStartPicker(false); const d=new Date(`${iso}T00:00:00`); setStartDate(d); if(duration!==null && duration!==-1){ const days = split.mode==='rotation'? duration*rotationLen -1 : duration*7 -1; setEndDate(addDaysFloat(d, days)); } }} />
      
      <Text style={{ 
        marginBottom:12, 
        fontWeight:'600',
        fontSize: 15,
        color: colors.text,
        letterSpacing: 0.2,
      }}>End Date</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
        <TouchableOpacity 
          style={{ 
            flex:1, 
            padding:14, 
            backgroundColor:'#FAFAFA', 
            borderRadius:12,
            borderWidth: 2,
            borderColor: endDate ? colors.primary : colors.border,
            shadowColor: endDate ? colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: endDate ? 2 : 0,
          }} 
          onPress={()=>{ setShowEndPicker(v=>!v); setShowStartPicker(false); }}
        >
          <Text style={{
            color: endDate ? colors.text : colors.textMuted,
            fontWeight: endDate ? '600' : '500',
            fontSize: 15,
          }}>{endDate? endDate.toDateString() : 'Select end date'}</Text>
        </TouchableOpacity>
        {endDate && 
          <TouchableOpacity 
            style={{ 
              marginLeft:10, 
              paddingVertical:10, 
              paddingHorizontal:14, 
              backgroundColor:'#F5F5F5', 
              borderRadius:10,
              borderWidth: 1,
              borderColor: colors.border,
            }} 
            onPress={()=>{ setEndDate(null); setDuration(null); }}
          >
            <Text style={{ fontWeight:'600', color: colors.text }}>✕</Text>
          </TouchableOpacity>
        }
      </View>
      <DatePickerModal visible={showEndPicker} initialDate={endDate ?? startDate ?? getNextMonday(new Date())} onCancel={()=>setShowEndPicker(false)} onConfirm={(iso)=>{ setShowEndPicker(false); const d=new Date(`${iso}T00:00:00`); setEndDate(d); if(startDate){ const ms=24*60*60*1000; const s=new Date(startDate); s.setHours(0,0,0,0); const e=new Date(d); e.setHours(0,0,0,0); const diff=Math.floor((e.getTime()-s.getTime())/ms); const inclusive=Math.max(0,diff)+1; if(split.mode==='rotation'){ setDuration(Math.max(0.5, roundToHalf(inclusive/rotationLen))); } else { setDuration(Math.max(0.5, roundToHalf(diff/7))); } } }} />
      
      <Text style={{ 
        fontWeight:'600', 
        marginBottom:12,
        fontSize: 15,
        color: colors.text,
        letterSpacing: 0.2,
      }}>{split.mode==='rotation' ? 'Duration (Rotations)' : 'Duration (Weeks)'}</Text>
      <View style={{ 
        flexDirection:'row', 
        alignItems:'center', 
        marginBottom:8,
        backgroundColor: '#FAFAFA',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}>
        <TextInput 
          style={[styles.input,{ 
            flex:1, 
            marginRight:12,
            fontSize: 16,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 2,
            backgroundColor: '#fff',
          }]} 
          placeholder={split.mode==='rotation' ? 'e.g. 3' : 'e.g. 4 or 4.5'} 
          value={duration===null||duration===-1? '' : String(duration)} 
          keyboardType='numeric' 
          onChangeText={(t)=>{ if(!t.trim()){ setDuration(null); return; } const v=parseFloat(t); if(!isNaN(v)){ setDuration(v); const base=startDate ?? getNextMonday(new Date()); const days = split.mode==='rotation'? v*rotationLen -1 : v*7 -1; setEndDate(addDaysFloat(base, days)); if(!startDate) setStartDate(base); } }} 
        />
        <Text style={{ 
          marginHorizontal:10, 
          color: colors.textMuted, 
          fontWeight:'600',
          fontSize: 14,
        }}>or</Text>
        <TouchableOpacity 
          style={{ 
            paddingVertical:12, 
            paddingHorizontal:16, 
            borderRadius:10, 
            backgroundColor: duration===-1? colors.primary : '#fff',
            borderWidth: 2,
            borderColor: duration===-1? colors.primary : colors.border,
            shadowColor: duration===-1 ? colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: duration===-1 ? 2 : 0,
          }} 
          onPress={()=>{ if(duration===-1){ setDuration(null); } else { setDuration(-1); setEndDate(null); if(!startDate) setStartDate(getNextMonday(new Date())); } }}
        >
          <Text style={{ 
            color: duration===-1? '#fff':colors.text, 
            fontWeight:'700',
            fontSize: 14,
          }}>♾️ Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const dayPicker = (
    <Modal visible={showPicker} transparent animationType="slide" onRequestClose={()=>{ setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' }}>
        <View style={{ 
          backgroundColor:'#fff', 
          padding:24, 
          borderRadius:20, 
          width:'90%', 
          maxWidth:420, 
          maxHeight:'90%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <ScrollView contentContainerStyle={{ paddingBottom:12 }} showsVerticalScrollIndicator={false}>
            <Text style={{ 
              fontWeight:'700', 
              fontSize:20, 
              marginBottom:8,
              color: colors.text,
              letterSpacing: -0.3,
            }}>
              {assignWeekday!==null ? `Assign Day to ${WEEKDAYS[assignWeekday]}` : assignIndex!==null ? `Assign Day to Day ${assignIndex+1}` : 'Assign Day'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textMuted,
              marginBottom: 20,
            }}>Choose a workout day or set as rest</Text>
            
            {days.length===0 && 
              <Text style={{
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: 15,
                marginVertical: 20,
              }}>No days created yet.</Text>
            }
            {days.map(d => (
              <TouchableOpacity 
                key={d.id} 
                style={{ 
                  padding:16, 
                  marginVertical:6, 
                  backgroundColor:'#FAFAFA', 
                  borderRadius:12,
                  borderWidth: 2,
                  borderColor: colors.border,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }} 
                onPress={()=>{ if(assignWeekday!==null){ setWeekdays(prev=>{ const a=[...prev]; a[assignWeekday]=d.id; return a; }); } else if(assignIndex!==null){ setRotationDays(prev=>{ const a=[...prev]; a[assignIndex]=d.id; return a; }); } setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}
              >
                <Text style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 15,
                }}>{d.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={{ 
                padding:16, 
                marginVertical:6, 
                marginTop: 12,
                backgroundColor:'#F5F5F5', 
                borderRadius:12,
                borderWidth: 2,
                borderColor: colors.textMuted,
                borderStyle: 'dashed',
              }} 
              onPress={()=>{ if(assignWeekday!==null){ setWeekdays(prev=>{ const a=[...prev]; a[assignWeekday]=null; return a; }); } else if(assignIndex!==null){ setRotationDays(prev=>{ const a=[...prev]; a[assignIndex]=null; return a; }); } setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}
            >
              <Text style={{
                color: colors.textMuted,
                fontWeight: '600',
                fontSize: 15,
                textAlign: 'center',
              }}>🛌 Set to Rest</Text>
            </TouchableOpacity>
            <View style={{ marginTop:20 }}>
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: colors.backgroundMuted,
                  alignItems: 'center',
                }}
                onPress={()=>{ setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}
              >
                <Text style={{
                  color: colors.text,
                  fontWeight: '700',
                  fontSize: 15,
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>{ reset(); onClose(); }}>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' }}>
        <View style={{ 
          backgroundColor:'#fff', 
          padding:24, 
          borderRadius:20, 
          width:'90%', 
          maxWidth:420, 
          maxHeight:'90%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                padding: 8,
                zIndex: 10,
              }}
              onPress={() => { reset(); onClose(); }}
            >
              <Text style={{
                fontSize: 24,
                color: colors.textMuted,
                fontWeight: '600',
              }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom:16 }} showsVerticalScrollIndicator={false}>
            <Text style={{ 
              fontWeight:'700', 
              fontSize:24, 
              marginBottom:8, 
              color: colors.text,
              letterSpacing: -0.5,
            }}>Add New Split</Text>
            <Text style={{
              fontSize: 14,
              color: colors.textMuted,
              marginBottom: 24,
            }}>Create your custom workout split</Text>
            
            <View style={{ 
              flexDirection:'row', 
              marginBottom:28, 
              backgroundColor:'#F8F8F8', 
              borderRadius:12, 
              padding:6,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}>
              <TouchableOpacity 
                style={[styles.tabButton,{ 
                  backgroundColor: tab===0? colors.primary:'transparent',
                  shadowColor: tab===0 ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: tab===0 ? 3 : 0,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }]} 
                onPress={()=>setTab(0)}
              >
                <Text style={{ 
                  color: tab===0?'#fff':colors.textMuted, 
                  fontWeight: tab===0 ? '700' : '600', 
                  fontSize:13,
                  letterSpacing: 0.2,
                }}>1. Basic</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton,{ 
                  backgroundColor: tab===1? colors.primary:'transparent',
                  shadowColor: tab===1 ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: tab===1 ? 3 : 0,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }]} 
                onPress={()=>setTab(1)}
              >
                <Text style={{ 
                  color: tab===1?'#fff':colors.textMuted, 
                  fontWeight: tab===1 ? '700' : '600', 
                  fontSize:13,
                  letterSpacing: 0.2,
                }}>2. Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton,{ 
                  backgroundColor: tab===2? colors.primary:'transparent',
                  shadowColor: tab===2 ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: tab===2 ? 3 : 0,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }]} 
                onPress={()=>setTab(2)}
              >
                <Text 
                  numberOfLines={1}
                  style={{ 
                    color: tab===2?'#fff':colors.textMuted, 
                    fontWeight: tab===2 ? '700' : '600', 
                    fontSize:13,
                    letterSpacing: 0.2,
                  }}
                >3. Schedule</Text>
              </TouchableOpacity>
            </View>
            {tab===0 && (
              <View>
                <Text style={{ 
                  marginBottom:8, 
                  fontWeight:'600',
                  fontSize: 15,
                  color: colors.text,
                  letterSpacing: 0.2,
                }}>Split Name</Text>
                <TextInput
                  style={{ 
                    marginBottom: 20,
                    fontSize: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.border,
                    backgroundColor: '#FAFAFA',
                    height: 50,
                    color: colors.text,
                  }}
                  placeholder="e.g. PPL, Upper/Lower"
                  value={split.name}
                  onChangeText={v => setSplit(s => ({ ...s, name: v }))}
                  returnKeyType='done'
                  onSubmitEditing={() => Keyboard.dismiss()}
                  placeholderTextColor={colors.textMuted}
                  allowFontScaling={false}
                />
                <Text style={{ 
                  marginBottom:12, 
                  fontWeight:'600',
                  fontSize: 15,
                  color: colors.text,
                  letterSpacing: 0.2,
                }}>Split Mode</Text>
                <View style={{ flexDirection:'row', gap: 12, marginBottom:16 }}>
                  <TouchableOpacity 
                    style={[styles.modeButton,{ 
                      backgroundColor: split.mode==='week'? colors.primary:'#F5F5F5',
                      borderWidth: 2,
                      borderColor: split.mode==='week'? colors.primary:colors.border,
                      paddingVertical: 16,
                      borderRadius: 12,
                      shadowColor: split.mode==='week' ? colors.primary : 'transparent',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 5,
                      elevation: split.mode==='week' ? 3 : 0,
                    }]} 
                    onPress={()=>setSplit(s=>({...s, mode:'week'}))}
                  >
                    <Text style={{ 
                      color: split.mode==='week'? '#fff':colors.text, 
                      fontWeight:'700',
                      fontSize: 15,
                      letterSpacing: 0.3,
                      textAlign: 'center',
                    }}>Weekly</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modeButton,{ 
                      backgroundColor: split.mode==='rotation'? colors.primary:'#F5F5F5',
                      borderWidth: 2,
                      borderColor: split.mode==='rotation'? colors.primary:colors.border,
                      paddingVertical: 16,
                      borderRadius: 12,
                      shadowColor: split.mode==='rotation' ? colors.primary : 'transparent',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 5,
                      elevation: split.mode==='rotation' ? 3 : 0,
                    }]} 
                    onPress={()=>setSplit(s=>({...s, mode:'rotation'}))}
                  >
                    <Text style={{ 
                      color: split.mode==='rotation'? '#fff':colors.text, 
                      fontWeight:'700',
                      fontSize: 15,
                      letterSpacing: 0.3,
                      textAlign: 'center',
                    }}>Rotation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {tab===1 && (
              <View>
                {split.mode==='week' ? (
                  <>
                    <Text style={{ 
                      marginBottom:16, 
                      fontWeight:'600',
                      fontSize: 15,
                      color: colors.text,
                      letterSpacing: 0.2,
                    }}>Week Schedule</Text>
                    {WEEKDAYS.map((wd,i)=>{ const assigned = weekdays[i]? days.find(d=>d.id===weekdays[i]) : null; const isRest = weekdays[i] === null; return (
                      <View key={wd} style={[styles.splitDayBox, { 
                        marginBottom: 12,
                        backgroundColor: '#FAFAFA',
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.borderLight,
                      }]}>
                        <Text style={{ 
                          width:70, 
                          fontWeight:'600',
                          fontSize: 15,
                          color: colors.text,
                        }}>{wd}</Text>
                        <TouchableOpacity 
                          style={[styles.assignBtn, {
                            backgroundColor: assigned ? colors.primaryLight : isRest ? '#F5F5F5' : '#fff',
                            borderWidth: 2,
                            borderColor: assigned ? colors.primary : isRest ? colors.textMuted : colors.border,
                            borderRadius: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            flex: 1,
                            shadowColor: assigned ? colors.primary : 'transparent',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: assigned ? 2 : 0,
                          }]} 
                          onPress={()=>{ setAssignWeekday(i); setAssignIndex(null); setShowPicker(true); }}
                        >
                          <Text style={[styles.assignBtnText, {
                            color: assigned ? '#fff' : isRest ? colors.textMuted : colors.textMuted,
                            fontWeight: '600',
                            fontSize: 14,
                          }]}>{assigned ? assigned.name : isRest ? '🛌 Rest' : 'Tap to assign'}</Text>
                        </TouchableOpacity>
                      </View>
                    ); })}
                  </>
                ) : (
                  <>
                    <Text style={{ 
                      marginBottom:12, 
                      fontWeight:'600',
                      fontSize: 15,
                      color: colors.text,
                      letterSpacing: 0.2,
                    }}>Rotation Length</Text>
                    <View style={{ 
                      flexDirection:'row', 
                      alignItems:'center', 
                      marginBottom:20,
                      backgroundColor: '#FAFAFA',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}>
                      <TextInput 
                        ref={rotationRef} 
                        style={[styles.input,{ 
                          width:80, 
                          marginRight:12,
                          textAlign: 'center',
                          fontSize: 16,
                          fontWeight: '600',
                          borderRadius: 10,
                          borderWidth: 2,
                          backgroundColor: '#fff',
                        }]} 
                        keyboardType='numeric' 
                        value={rotationInput} 
                        onChangeText={v=>{ setRotationInput(v); const n=parseInt(v,10); if(!isNaN(n)&&n>0){ setRotationLen(n); setRotationDays(prev=>{ const a=[...prev]; a.length=n; return a.map(x=>x??null); }); } }} 
                        onBlur={()=>{ const n=parseInt(rotationInput,10); if(isNaN(n)||n<=0) setRotationInput(String(rotationLen)); }} 
                      />
                      <Text style={{ 
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '500',
                      }}>days in rotation</Text>
                    </View>
                    <Text style={{ 
                      marginBottom:16, 
                      fontWeight:'600',
                      fontSize: 15,
                      color: colors.text,
                      letterSpacing: 0.2,
                    }}>Assign Days to Slots</Text>
                    {Array.from({ length: rotationLen }).map((_,i)=>{ const assigned=rotationDays[i]? days.find(d=>d.id===rotationDays[i]):null; const isRest = rotationDays[i] === null; return (
                      <View key={`rot-${i}`} style={[styles.splitDayBox, {
                        marginBottom: 12,
                        backgroundColor: '#FAFAFA',
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.borderLight,
                      }]}>
                        <Text style={{ 
                          width:70, 
                          fontWeight:'600',
                          fontSize: 15,
                          color: colors.text,
                        }}>{`Day ${i+1}`}</Text>
                        <TouchableOpacity 
                          style={[styles.assignBtn, {
                            backgroundColor: assigned ? colors.primaryLight : isRest ? '#F5F5F5' : '#fff',
                            borderWidth: 2,
                            borderColor: assigned ? colors.primary : isRest ? colors.textMuted : colors.border,
                            borderRadius: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            flex: 1,
                            shadowColor: assigned ? colors.primary : 'transparent',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: assigned ? 2 : 0,
                          }]} 
                          onPress={()=>{ setAssignIndex(i); setAssignWeekday(null); setShowPicker(true); }}
                        >
                          <Text style={[styles.assignBtnText, {
                            color: assigned ? '#fff' : isRest ? colors.textMuted : colors.textMuted,
                            fontWeight: '600',
                            fontSize: 14,
                          }]}>{assigned ? assigned.name : isRest ? '🛌 Rest' : 'Tap to assign'}</Text>
                        </TouchableOpacity>
                      </View>
                    ); })}
                  </>
                )}
              </View>
            )}
            {tab===2 && renderSchedule()}
            <View style={{ marginTop:28 }}>
              {tab<2 ? (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                  onPress={()=>setTab(tab+1)}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: adding ? colors.backgroundMuted : colors.primary,
                    alignItems: 'center',
                    shadowColor: adding ? 'transparent' : colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: adding ? 0 : 4,
                    opacity: adding ? 0.7 : 1,
                  }}
                  onPress={handleCreate}
                  disabled={adding}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}>{adding? '⏳ Creating...':'✓ Create Split'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
      {dayPicker}
    </Modal>
  );
};

export default AddSplitModal;
