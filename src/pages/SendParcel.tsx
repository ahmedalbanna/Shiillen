import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, MapPin, User, Phone, CheckCircle, Package } from 'lucide-react';

const CITIES = ["صنعاء", "تعز", "عدن", "إب", "الحديدة", "حضرموت", "مأرب", "يافع", "شبوة"];

export default function SendParcel() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPhone: '',
    description: '',
    originCity: '',
    destCity: '',
  });

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
        <button onClick={() => step > 1 ? handlePrev() : navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowRight className="rotate-0" />
        </button>
        <h1 className="text-2xl font-bold">إرسال طرد جديد</h1>
      </div>

      <div className="mb-8 flex justify-between px-4">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step >= s ? 'bg-brand-primary text-white scale-110' : 'bg-zinc-100 text-zinc-400'
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
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <User size={18} className="text-brand-primary" />
                <span>بيانات المستلم</span>
              </h3>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">اسم المستلم</label>
                <input 
                  type="text" 
                  value={formData.recipientName}
                  onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="محمد أحمد علي"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">رقم هاتف المستلم</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="tel" 
                    value={formData.recipientPhone}
                    onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="77XXXXXXX"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Package size={18} className="text-brand-primary" />
                  <span>عن ماذا يحتوي الطرد؟</span>
                </h3>
                <button 
                  type="button" 
                  className="p-2 bg-red-50 text-red-500 rounded-full animate-pulse flex items-center gap-1 text-[10px] font-bold px-3"
                  onClick={() => alert("سيتم تفعيل ميزة التسجيل الصوتي قريباً في التحديث القادم!")}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>تسجيل وصف صوتي</span>
                </button>
              </div>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary min-h-[100px]"
                placeholder="مثلاً: كيس قهوة يمانية، شنطة ملابس..."
              />
            </div>

            <button onClick={handleNext} className="w-full btn-primary flex items-center justify-center gap-2">
              <span>التالي: اختيار المسار</span>
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
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-brand-primary" />
                <span>خط السير (المدن)</span>
              </h3>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">مدينة الإرسال</label>
                <select 
                  value={formData.originCity}
                  onChange={(e) => setFormData({...formData, originCity: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none"
                >
                  <option value="">اختر المدينة...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-center py-2">
                <div className="w-px h-8 bg-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">مدينة الوصول</label>
                <select 
                  value={formData.destCity}
                  onChange={(e) => setFormData({...formData, destCity: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none"
                >
                  <option value="">اختر المدينة...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleNext} className="w-full btn-primary flex items-center justify-center gap-2">
              <span>التالي: المراجعة والدفع</span>
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
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-green-500" />
                <span>ملخص الشحنة</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-zinc-500">من:</span>
                  <span className="font-bold">{formData.originCity}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-zinc-500">إلى:</span>
                  <span className="font-bold">{formData.destCity}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-zinc-500">المستلم:</span>
                  <span className="font-bold">{formData.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">التكلفة المتوقعة:</span>
                  <span className="font-bold text-brand-primary">2,500 ريال</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-primary/10 p-4 rounded-xl text-xs text-brand-primary border border-brand-primary/20 leading-relaxed">
              * عند الضغط على "تأكيد والذهاب للنقطة"، سيتم إنشاء كود للشحنة. عليك الذهاب لأقرب نقطة "شِلّن" لتسليم الطرد ودفع الرسوم.
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>تأكيد والذهاب للنقطة</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
