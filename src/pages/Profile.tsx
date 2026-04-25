import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { createUserProfile, logout } from '../lib/firebase';
import { User, Phone, MapPin, Truck, Store, UserCheck, LogOut, Camera, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const CITIES = ["صنعاء", "تعز", "عدن", "إب", "الحديدة", "حضرموت", "مأرب", "يافع", "شبوة"];

export default function Profile({ setup }: { setup?: boolean }) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: '',
    role: 'sender',
    city: '',
    idDocUrl: '',
  });

  const idDocRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phoneNumber: profile.phoneNumber || '',
        role: profile.role || 'sender',
        city: profile.city || '',
        idDocUrl: profile.idDocUrl || '',
      });
    }
  }, [profile]);

  const handleIdCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, idDocUrl: reader.result as string }));
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (['driver', 'hub'].includes(formData.role) && !formData.idDocUrl) {
      toast.error('يجب إرفاق صورة الهوية لتفعيل الحساب كـ ' + (formData.role === 'driver' ? 'سائق' : 'نقطة'));
      return;
    }

    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        ...formData,
        email: user.email,
        photoURL: user.photoURL,
        isVerified: false,
      });
      await refreshProfile();
      toast.success(setup ? "تم إعداد الحساب بنجاح!" : "تم حفظ البيانات");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'sender', label: 'مرسل / مستقبل', icon: User, desc: 'أريد إرسال أو استلام الطرود' },
    { id: 'driver', label: 'سائق باص / أجرة', icon: Truck, desc: 'أريد نقل الطرود في طريقي' },
    { id: 'hub', label: 'نقطة شِلّن (محل)', icon: Store, desc: 'محلي هو مركز تجميع وتوزيع طرود' },
  ];

  return (
    <div className="p-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-black italic uppercase mb-1">
          {setup ? 'أهلاً بك في شِلّن' : 'الملف الشخصي'}
        </h1>
        <p className="font-bold text-gray-500 mb-8 text-sm">
          {setup ? 'أكمل بياناتك لتبدأ استخدام الخدمة' : 'إدارة بيانات حسابك'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-6 space-y-6 bg-brand-light border-2 border-brand-secondary shadow-hard">
            <div className="flex items-center gap-4 border-b-2 border-brand-secondary/20 pb-4">
              <img src={user?.photoURL || ''} alt="" className="w-16 h-16 border-2 border-brand-secondary" />
              <div>
                <p className="font-black text-lg">{user?.email}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">حساب جوجل متصل</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full pr-10 pl-4 py-3 bg-white border-2 border-brand-secondary rounded-none font-bold outline-none text-brand-secondary"
                  placeholder="أدخل اسمك كما في الهوية"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="tel" 
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-brand-secondary rounded-none font-bold outline-none text-brand-secondary text-left dir-ltr"
                  placeholder="77XXXXXXX"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
               <label className="block text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-1">المدينة</label>
               <select 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-2 border-brand-secondary rounded-none font-bold outline-none text-brand-secondary"
                  required
                >
                  <option value="">اختر مدينتك...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-secondary mb-3">نوع الحساب</label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setFormData({...formData, role: role.id})}
                    className={`flex items-center gap-4 p-4 border-2 transition-all text-right ${
                      formData.role === role.id ? 'border-brand-secondary bg-brand-primary text-white shadow-hard' : 'border-brand-secondary bg-white text-brand-secondary hover:-translate-y-0.5'
                    }`}
                  >
                    <div className={`p-2 border-2 ${formData.role === role.id ? 'border-brand-secondary bg-white text-brand-primary' : 'border-transparent text-gray-400'}`}>
                      <role.icon size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm uppercase tracking-wider">{role.label}</p>
                      <p className={`text-[10px] font-bold ${formData.role === role.id ? 'text-white/80' : 'text-gray-500'}`}>{role.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {['driver', 'hub'].includes(formData.role) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white p-4 border-2 border-brand-secondary mt-2">
                     <label className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-secondary tracking-widest mb-2">
                        <ShieldCheck size={14} className="text-brand-primary" />
                        صورة الهوية / وثيقة التحقق
                     </label>
                     <p className="text-xs text-gray-500 mb-3 font-bold">يرجى رفع صورة واضحة ومقروءة للمستند لاعتماد حسابك.</p>
                     
                     <input type="file" accept="image/*" capture="environment" className="hidden" ref={idDocRef} onChange={handleIdCapture} />
                     
                     {!formData.idDocUrl ? (
                        <button 
                          type="button"
                          onClick={() => idDocRef.current?.click()}
                          className="w-full p-4 border-2 border-dashed border-brand-secondary bg-brand-light flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                          <Camera size={24} className="text-brand-secondary opacity-50" />
                          <span className="text-xs font-bold text-gray-500">انقر لالتقاط صورة</span>
                        </button>
                     ) : (
                        <div className="relative">
                          <img src={formData.idDocUrl} alt="ID Document" className="w-full h-32 object-cover border-2 border-brand-secondary" />
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, idDocUrl: ''})}
                            className="absolute top-2 right-2 bg-white text-red-500 p-1 border-2 border-brand-secondary text-[10px] font-black uppercase shadow-solid"
                          >
                            تغيير الصورة
                          </button>
                        </div>
                     )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>{setup ? 'الانطلاق الآن' : 'حفظ التعديلات'}</span>}
          </button>

          {!setup && (
            <button 
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-600 font-black p-4 border-2 border-brand-secondary shadow-hard hover:-translate-y-0.5 transition-all"
            >
              <LogOut size={20} />
              <span className="uppercase tracking-widest text-sm">تسجيل الخروج</span>
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
