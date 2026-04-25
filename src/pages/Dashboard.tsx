import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Package, Truck, Store, ArrowLeftRight, Clock, CheckCircle2, ChevronLeft, User, ScanQrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let q;
    if (profile?.role === 'sender') {
      q = query(collection(db, 'parcels'), where('senderId', '==', user.uid), orderBy('updatedAt', 'desc'));
    } else if (profile?.role === 'driver') {
      q = query(collection(db, 'parcels'), where('driverId', '==', user.uid), orderBy('updatedAt', 'desc'));
    } else if (profile?.role === 'hub') {
      // For hubs, we'd ideally filter by hubId, but for MVP we match ownerId to hub origin/destination
      // Simplified: hubs see parcels where they are origin or destination
      q = query(collection(db, 'parcels'), where('originHubId', '==', user.uid), orderBy('updatedAt', 'desc'));
    }

    if (!q) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParcels(p);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'parcels');
    });

    return unsubscribe;
  }, [user, profile]);

  const stats = [
    { label: 'نشطة', value: parcels.filter(p => !['delivered', 'cancelled'].includes(p.status)).length, icon: Package, color: 'text-brand-primary' },
    { label: 'تم تسليمها', value: parcels.filter(p => p.status === 'delivered').length, icon: CheckCircle2, color: 'text-green-500' },
  ];

  const getStatusLabel = (status: string) => {
    const statuses: any = {
      pending: 'بانتظار التسليم للنقطة',
      at_hub_origin: 'في نقطة الانطلاق',
      in_transit: 'مع السائق (في الطريق)',
      at_hub_destination: 'وصلت نقطة الوصول',
      delivered: 'تم التسليم للمستلم',
      cancelled: 'ملغي',
    };
    return statuses[status] || status;
  };

  return (
    <div className="p-6 pb-24">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm text-zinc-500">أهلاً بك،</h2>
            <h1 className="text-2xl font-bold">{profile?.displayName}</h1>
          </div>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-zinc-100">
            {profile?.role === 'sender' && <User className="text-brand-primary" />}
            {profile?.role === 'driver' && <Truck className="text-brand-primary" />}
            {profile?.role === 'hub' && <Store className="text-brand-primary" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-4 rounded-2xl shadow-warm border border-white"
            >
              <stat.icon className={`${stat.color} mb-2`} size={20} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">الطرود الأخيرة</h3>
          <Link to="/send" className="text-brand-primary text-sm font-semibold flex items-center gap-1">
            <span>إرسال طرد</span>
            <ChevronLeft size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-zinc-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : parcels.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Package size={48} className="mx-auto text-zinc-200 mb-4" />
            <p className="text-zinc-500 text-sm">لا توجد طرود حالياً</p>
            <Link to="/send" className="mt-4 inline-block text-brand-primary font-bold">ابدأ أول شحنة الآن</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {parcels.map((parcel) => (
              <motion.div 
                key={parcel.id}
                layoutId={parcel.id}
                className="bg-white p-4 rounded-2xl shadow-warm border border-transparent hover:border-brand-primary/20 transition-all cursor-pointer"
              >
                <Link to={`/parcel/${parcel.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">#{parcel.id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-zinc-500">{parcel.route}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      parcel.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-brand-primary/10 text-brand-primary'
                    }`}>
                      {getStatusLabel(parcel.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-50 text-xs text-zinc-400">
                    <Clock size={12} />
                    <span>{parcel.updatedAt?.toDate().toLocaleDateString('ar-YE')}</span>
                    <span className="mx-1">•</span>
                    <span>{parcel.recipientName}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {profile?.role !== 'sender' && (
        <section className="mt-8">
          <div className="bg-brand-secondary text-white p-6 rounded-3xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-2">جاهز للمسح؟</h3>
              <p className="text-white/80 text-sm mb-4">استخدم الكاميرا لمسح أكواد الطرود وتحديث حالتها فوراً.</p>
              <Link to="/scan" className="inline-block bg-white text-brand-secondary px-6 py-2 rounded-xl font-bold shadow-lg">
                افتح الماسح
              </Link>
            </div>
            <ScanQrCode size={120} className="absolute -bottom-4 -left-4 text-white/10" />
          </div>
        </section>
      )}
    </div>
  );
}
