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
      <Text style={{ marginBottom:4, fontWeight:'500' }}>Start Date:</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
        <TouchableOpacity style={{ flex:1, padding:10, backgroundColor:'#eee', borderRadius:6 }} onPress={()=>{ setShowStartPicker(v=>!v); setShowEndPicker(false); }}>
          <Text>{startDate? startDate.toDateString() : 'Select start date'}</Text>
        </TouchableOpacity>
        {startDate && <TouchableOpacity style={{ marginLeft:8, paddingVertical:8, paddingHorizontal:12, backgroundColor:'#f0f0f0', borderRadius:6 }} onPress={()=>{ setStartDate(null); setDuration(null); }}><Text style={{ fontWeight:'600' }}>Clear</Text></TouchableOpacity>}
      </View>
      <DatePickerModal visible={showStartPicker} initialDate={startDate ?? getNextMonday(new Date())} onCancel={()=>setShowStartPicker(false)} onConfirm={(iso)=>{ setShowStartPicker(false); const d=new Date(`${iso}T00:00:00`); setStartDate(d); if(duration!==null && duration!==-1){ const days = split.mode==='rotation'? duration*rotationLen -1 : duration*7 -1; setEndDate(addDaysFloat(d, days)); } }} />
      <Text style={{ marginBottom:4, fontWeight:'500' }}>End Date:</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
        <TouchableOpacity style={{ flex:1, padding:10, backgroundColor:'#eee', borderRadius:6 }} onPress={()=>{ setShowEndPicker(v=>!v); setShowStartPicker(false); }}>
          <Text>{endDate? endDate.toDateString() : 'Select end date'}</Text>
        </TouchableOpacity>
        {endDate && <TouchableOpacity style={{ marginLeft:8, paddingVertical:8, paddingHorizontal:12, backgroundColor:'#f0f0f0', borderRadius:6 }} onPress={()=>{ setEndDate(null); setDuration(null); }}><Text style={{ fontWeight:'600' }}>Clear</Text></TouchableOpacity>}
      </View>
      <DatePickerModal visible={showEndPicker} initialDate={endDate ?? startDate ?? getNextMonday(new Date())} onCancel={()=>setShowEndPicker(false)} onConfirm={(iso)=>{ setShowEndPicker(false); const d=new Date(`${iso}T00:00:00`); setEndDate(d); if(startDate){ const ms=24*60*60*1000; const s=new Date(startDate); s.setHours(0,0,0,0); const e=new Date(d); e.setHours(0,0,0,0); const diff=Math.floor((e.getTime()-s.getTime())/ms); const inclusive=Math.max(0,diff)+1; if(split.mode==='rotation'){ setDuration(Math.max(0.5, roundToHalf(inclusive/rotationLen))); } else { setDuration(Math.max(0.5, roundToHalf(diff/7))); } } }} />
      <Text style={{ fontWeight:'bold', marginBottom:4 }}>{split.mode==='rotation' ? 'Duration (Rotations):' : 'Duration (Weeks):'}</Text>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
        <TextInput style={[styles.input,{ flex:1, marginRight:8 }]} placeholder={split.mode==='rotation' ? 'e.g. 3' : 'e.g. 4 or 4.5'} value={duration===null||duration===-1? '' : String(duration)} keyboardType='numeric' onChangeText={(t)=>{ if(!t.trim()){ setDuration(null); return; } const v=parseFloat(t); if(!isNaN(v)){ setDuration(v); const base=startDate ?? getNextMonday(new Date()); const days = split.mode==='rotation'? v*rotationLen -1 : v*7 -1; setEndDate(addDaysFloat(base, days)); if(!startDate) setStartDate(base); } }} />
        <Text style={{ marginHorizontal:6, color:'#666', fontWeight:'600' }}>or</Text>
        <TouchableOpacity style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, backgroundColor: duration===-1? colors.primary : colors.backgroundMuted }} onPress={()=>{ if(duration===-1){ setDuration(null); } else { setDuration(-1); setEndDate(null); if(!startDate) setStartDate(getNextMonday(new Date())); } }}>
          <Text style={{ color: duration===-1? '#fff':'#333', fontWeight:'700' }}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const dayPicker = (
    <Modal visible={showPicker} transparent animationType="slide" onRequestClose={()=>{ setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor:'#fff', padding:24, borderRadius:12, width:'90%', maxWidth:420, maxHeight:'90%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom:12 }}>
            <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:12 }}>
              {assignWeekday!==null ? `Assign Day to ${WEEKDAYS[assignWeekday]}` : assignIndex!==null ? `Assign Day to Day ${assignIndex+1}` : 'Assign Day'}
            </Text>
            {days.length===0 && <Text>No days created yet.</Text>}
            {days.map(d => (
              <TouchableOpacity key={d.id} style={{ padding:10, marginVertical:2, backgroundColor:'#eee', borderRadius:6 }} onPress={()=>{ if(assignWeekday!==null){ setWeekdays(prev=>{ const a=[...prev]; a[assignWeekday]=d.id; return a; }); } else if(assignIndex!==null){ setRotationDays(prev=>{ const a=[...prev]; a[assignIndex]=d.id; return a; }); } setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}>
                <Text>{d.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ padding:10, marginVertical:2, backgroundColor:'#eee', borderRadius:6 }} onPress={()=>{ if(assignWeekday!==null){ setWeekdays(prev=>{ const a=[...prev]; a[assignWeekday]=null; return a; }); } else if(assignIndex!==null){ setRotationDays(prev=>{ const a=[...prev]; a[assignIndex]=null; return a; }); } setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }}>
              <Text>Set to Rest</Text>
            </TouchableOpacity>
            <View style={{ marginTop:8 }}>
              <ModalButtons leftLabel="Cancel" rightLabel="Set" onLeftPress={()=>{ setShowPicker(false); setAssignWeekday(null); setAssignIndex(null); }} onRightPress={()=>{ /* handled inline */ }} leftColor="colors.backgroundMuted" rightColor={colors.primary} leftTextColor="#333" rightTextColor="#fff" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>{ reset(); onClose(); }}>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:420, maxHeight:'90%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom:16 }}>
            <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16, textAlign:'center' }}>Add New Split</Text>
            <View style={{ flexDirection:'row', marginBottom:20, backgroundColor:'#f0f0f0', borderRadius:8, padding:4 }}>
              <TouchableOpacity style={[styles.tabButton,{ backgroundColor: tab===0? colors.primary:'transparent' }]} onPress={()=>setTab(0)}><Text style={{ color: tab===0?'#fff':'#333', fontWeight:'bold', fontSize:12 }}>1. Basic</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton,{ backgroundColor: tab===1? colors.primary:'transparent' }]} onPress={()=>setTab(1)}><Text style={{ color: tab===1?'#fff':'#333', fontWeight:'bold', fontSize:12 }}>2. Days</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton,{ backgroundColor: tab===2? colors.primary:'transparent' }]} onPress={()=>setTab(2)}><Text style={{ color: tab===2?'#fff':'#333', fontWeight:'bold', fontSize:12 }}>3. Schedule</Text></TouchableOpacity>
            </View>
            {tab===0 && (
              <View>
                <Text style={{ marginBottom:4, fontWeight:'500' }}>Split Name:</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  placeholder="e.g. PPL, Upper/Lower"
                  value={split.name}
                  onChangeText={v => setSplit(s => ({ ...s, name: v }))}
                  returnKeyType='done'
                  onSubmitEditing={() => Keyboard.dismiss()}
                  placeholderTextColor={colors.textMuted}
                  allowFontScaling={false}
                />
                <Text style={{ marginBottom:4, fontWeight:'500' }}>Mode:</Text>
                <View style={{ flexDirection:'row', marginBottom:16 }}>
                  <TouchableOpacity style={[styles.modeButton,{ backgroundColor: split.mode==='week'? colors.primary:colors.backgroundMuted }]} onPress={()=>setSplit(s=>({...s, mode:'week'}))}><Text style={{ color: split.mode==='week'? '#fff':'#333', fontWeight:'bold' }}>Weekly</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modeButton,{ backgroundColor: split.mode==='rotation'? colors.primary:colors.backgroundMuted, marginLeft:8 }]} onPress={()=>setSplit(s=>({...s, mode:'rotation'}))}><Text style={{ color: split.mode==='rotation'? '#fff':'#333', fontWeight:'bold' }}>Rotation</Text></TouchableOpacity>
                </View>
              </View>
            )}
            {tab===1 && (
              <View>
                {split.mode==='week' ? (
                  <>
                    <Text style={{ marginBottom:8, fontWeight:'500' }}>Week Schedule:</Text>
                    {WEEKDAYS.map((wd,i)=>{ const assigned = weekdays[i]? days.find(d=>d.id===weekdays[i]) : null; return (
                      <View key={wd} style={styles.splitDayBox}>
                        <Text style={{ width:60, fontWeight:'500' }}>{wd}:</Text>
                        <TouchableOpacity style={styles.assignBtn} onPress={()=>{ setAssignWeekday(i); setAssignIndex(null); setShowPicker(true); }}>
                          <Text style={styles.assignBtnText}>{assigned? assigned.name:'Rest'}</Text>
                        </TouchableOpacity>
                      </View>
                    ); })}
                  </>
                ) : (
                  <>
                    <Text style={{ marginBottom:8, fontWeight:'500' }}>Rotation Length (days):</Text>
                    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
                      <TextInput ref={rotationRef} style={[styles.input,{ width:120, marginRight:8 }]} keyboardType='numeric' value={rotationInput} onChangeText={v=>{ setRotationInput(v); const n=parseInt(v,10); if(!isNaN(n)&&n>0){ setRotationLen(n); setRotationDays(prev=>{ const a=[...prev]; a.length=n; return a.map(x=>x??null); }); } }} onBlur={()=>{ const n=parseInt(rotationInput,10); if(isNaN(n)||n<=0) setRotationInput(String(rotationLen)); }} />
                      <Text style={{ color:'#666' }}>days in rotation</Text>
                    </View>
                    <Text style={{ marginBottom:8, fontWeight:'500' }}>Assign Days To Rotation Slots:</Text>
                    {Array.from({ length: rotationLen }).map((_,i)=>{ const assigned=rotationDays[i]? days.find(d=>d.id===rotationDays[i]):null; return (
                      <View key={`rot-${i}`} style={styles.splitDayBox}>
                        <Text style={{ width:60, fontWeight:'500' }}>{`Day ${i+1}:`}</Text>
                        <TouchableOpacity style={styles.assignBtn} onPress={()=>{ setAssignIndex(i); setAssignWeekday(null); setShowPicker(true); }}>
                          <Text style={styles.assignBtnText}>{assigned? assigned.name:'Rest'}</Text>
                        </TouchableOpacity>
                      </View>
                    ); })}
                  </>
                )}
              </View>
            )}
            {tab===2 && renderSchedule()}
            <View style={{ marginTop:20 }}>
              {tab<2 ? (
                <ModalButtons leftLabel='Cancel' rightLabel='Next' onLeftPress={()=>{ reset(); onClose(); }} onRightPress={()=>setTab(tab+1)} leftColor={colors.backgroundMuted} rightColor={colors.primary} leftTextColor='#333' rightTextColor='#fff' />
              ) : (
                <ModalButtons leftLabel='Cancel' rightLabel={adding? 'Creating...':'Create'} onLeftPress={()=>{ reset(); onClose(); }} onRightPress={handleCreate} leftColor= {colors.backgroundMuted} rightColor={colors.primary} leftTextColor='#333' rightTextColor='#fff' rightDisabled={adding} />
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
