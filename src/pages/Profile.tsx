import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { createUserProfile, logout } from '../lib/firebase';
import { User, Phone, MapPin, Truck, Store, UserCheck, LogOut } from 'lucide-react';

export default function Profile({ setup }: { setup?: boolean }) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: '',
    role: 'sender',
    city: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phoneNumber: profile.phoneNumber || '',
        role: profile.role || 'sender',
        city: profile.city || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        ...formData,
        email: user.email,
        photoURL: user.photoURL,
        isVerified: false,
      });
      await refreshProfile();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ البيانات");
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
        <h1 className="text-2xl font-bold mb-2">
          {setup ? 'أهلاً بك في شِلّن' : 'الملف الشخصي'}
        </h1>
        <p className="text-zinc-500 mb-8">
          {setup ? 'أكمل بياناتك لتبدأ استخدام الخدمة' : 'إدارة بيانات حسابك'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <img src={user?.photoURL || ''} alt="" className="w-16 h-16 rounded-full border-2 border-brand-primary" />
              <div>
                <p className="font-semibold">{user?.email}</p>
                <p className="text-xs text-zinc-500">حساب جوجل متصل</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                  placeholder="أدخل اسمك كما في الهوية"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="tel" 
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                  placeholder="77XXXXXXX"
                />
              </div>
            </div>

            {setup && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">نوع الحساب</label>
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({...formData, role: role.id})}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right ${
                        formData.role === role.id ? 'border-brand-primary bg-brand-primary/5' : 'border-zinc-100 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${formData.role === role.id ? 'bg-brand-primary text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                        <role.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{role.label}</p>
                        <p className="text-[10px] text-zinc-500">{role.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>حفظ البيانات</span>}
          </button>

          {!setup && (
            <button 
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold p-4"
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
