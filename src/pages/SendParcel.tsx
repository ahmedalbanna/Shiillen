import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, MapPin, User, Phone, CheckCircle, Package, Mic, Square, Play, Trash2 } from 'lucide-react';

const CITIES = ["صنعاء", "تعز", "عدن", "إب", "الحديدة", "حضرموت", "مأرب", "يافع", "شبوة"];
const CATEGORIES = ["ملابس", "طعام/عسل", "وثائق", "إلكترونيات", "أخرى"];

export default function SendParcel() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPhone: '',
    description: '',
    category: '',
    originCity: '',
    destCity: '',
    voiceNoteDataUrl: '',
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, voiceNoteDataUrl: reader.result as string }));
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("يرجى السماح بالوصول إلى الميكروفون للتسجيل.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'parcels'), {
        ...formData,
        senderId: user.uid,
        status: 'pending',
        route: `${formData.originCity} ← ${formData.destCity}`,
        originHubId: 'system_default', // In reality, user would select a hub
        destinationHubId: 'system_default',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/parcel/${docRef.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'parcels');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => step > 1 ? handlePrev() : navigate(-1)} className="w-10 h-10 bg-white border-2 border-brand-secondary shadow-hard flex items-center justify-center">
          <ArrowRight className="rotate-0 text-brand-secondary" />
        </button>
        <h1 className="text-2xl font-black italic uppercase">إرسال طرد</h1>
      </div>

      <div className="mb-8 flex justify-between px-4 relative">
        <div className="absolute top-1/2 left-8 right-8 h-1 bg-brand-secondary -translate-y-1/2 -z-10" />
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`w-10 h-10 flex items-center justify-center font-black border-2 border-brand-secondary ${
              step >= s ? 'bg-brand-primary text-white shadow-hard' : 'bg-brand-light text-brand-secondary'
            }`}
          >
            {step > s ? <CheckCircle size={18} /> : s}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="glass-card space-y-4">
              <h3 className="font-black uppercase tracking-wider flex items-center gap-2 mb-4">
                <User size={18} className="text-brand-primary" />
                <span>بيانات المستلم</span>
              </h3>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">اسم المستلم</label>
                <input 
                  type="text" 
                  value={formData.recipientName}
                  onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                  className="w-full px-4 py-3 bg-brand-light border-2 border-brand-secondary rounded-none font-bold outline-none focus:bg-white"
                  placeholder="محمد أحمد علي"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">الهاتف</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary" />
                  <input 
                    type="tel" 
                    value={formData.recipientPhone}
                    onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-brand-light border-2 border-brand-secondary rounded-none font-bold outline-none focus:bg-white text-left dir-ltr"
                    placeholder="77XXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h3 className="font-black uppercase flex items-center gap-2 mb-4">
                <Package size={18} className="text-brand-primary" />
                <span>محتوى الطرد</span>
              </h3>
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">الفئة</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`px-3 py-1 border-2 border-brand-secondary text-xs font-bold ${
                         formData.category === cat ? 'bg-brand-secondary text-white shadow-hard' : 'bg-white text-brand-secondary'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">التسجيل الصوتي (اختياري)</label>
                {!formData.voiceNoteDataUrl ? (
                  <div className={`p-4 border-2 border-brand-secondary flex flex-col items-center justify-center gap-3 ${isRecording ? 'bg-red-50' : 'bg-brand-light'}`}>
                    {isRecording ? (
                      <>
                        <p className="text-red-500 font-bold animate-pulse text-sm">جاري التسجيل... 00:{recordingTime.toString().padStart(2, '0')}</p>
                        <button onClick={stopRecording} className="w-12 h-12 rounded-full border-2 border-brand-secondary bg-red-500 text-white flex items-center justify-center">
                          <Square size={16} fill="currentColor" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-center font-bold">اضغط للتسجيل الصوتي (حد أقصى 15 ثانية)</p>
                        <button onClick={startRecording} className="w-12 h-12 rounded-full border-2 border-brand-secondary bg-brand-accent text-brand-secondary flex items-center justify-center">
                          <Mic size={20} />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-brand-accent p-3 border-2 border-brand-secondary">
                    <button 
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.play();
                        }
                      }}
                      className="w-10 h-10 bg-brand-primary flex items-center justify-center text-white border-2 border-brand-secondary"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                    <div className="flex-1 font-bold text-sm">تم التسجيل بنجاح</div>
                    <button onClick={() => setFormData({...formData, voiceNoteDataUrl: ''})} className="text-red-500 p-2">
                      <Trash2 size={20} />
                    </button>
                    <audio ref={audioPlayerRef} src={formData.voiceNoteDataUrl} className="hidden" />
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleNext} className="w-full btn-primary flex items-center justify-center gap-2">
              <span>التالي: المسار</span>
              <ChevronLeft size={20} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="glass-card space-y-4">
              <h3 className="font-black uppercase flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-brand-primary" />
                <span>خط السير (المدن)</span>
              </h3>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">مدينة الإرسال</label>
                <select 
                  value={formData.originCity}
                  onChange={(e) => setFormData({...formData, originCity: e.target.value})}
                  className="w-full px-4 py-3 bg-brand-light border-2 border-brand-secondary rounded-none font-bold outline-none"
                >
                  <option value="">اختر المدينة...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-center py-2 h-8 relative">
                <div className="w-[2px] h-full bg-brand-secondary absolute left-1/2 -translate-x-1/2" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">مدينة الوصول</label>
                <select 
                  value={formData.destCity}
                  onChange={(e) => setFormData({...formData, destCity: e.target.value})}
                  className="w-full px-4 py-3 bg-brand-light border-2 border-brand-secondary rounded-none font-bold outline-none"
                >
                  <option value="">اختر المدينة...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleNext} className="w-full btn-primary flex items-center justify-center gap-2">
              <span>التالي: المراجعة</span>
              <ChevronLeft size={20} />
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass-card space-y-4">
              <h3 className="font-black uppercase flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-green-600" />
                <span>المراجعة</span>
              </h3>
              <div className="space-y-3 font-bold text-sm">
                <div className="flex justify-between border-b-2 border-brand-light pb-2">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">من:</span>
                  <span>{formData.originCity}</span>
                </div>
                <div className="flex justify-between border-b-2 border-brand-light pb-2">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">إلى:</span>
                  <span>{formData.destCity}</span>
                </div>
                <div className="flex justify-between border-b-2 border-brand-light pb-2">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">المستلم:</span>
                  <span>{formData.recipientName}</span>
                </div>
                <div className="flex justify-between border-b-2 border-brand-light pb-2">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">الفئة:</span>
                  <span>{formData.category || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">التكلفة:</span>
                  <span className="text-brand-primary text-xl">2,500 <span className="text-xs">ريال</span></span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>تأكيد الإرسال</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
