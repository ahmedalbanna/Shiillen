import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Package, Truck, Store, ArrowLeftRight, Clock, CheckCircle2, ChevronLeft, User, ScanQrCode, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

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

  const activeParcels = parcels.filter(p => !['delivered', 'cancelled'].includes(p.status));
  const stats = [
    { label: 'شحنات نشطة', value: activeParcels.length, icon: Package, color: 'text-brand-primary' },
    { label: 'تم الاستلام', value: parcels.filter(p => p.status === 'delivered').length, icon: CheckCircle2, color: 'text-brand-green' },
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

  const defaultPosition: [number, number] = [15.3694, 44.1910];

  return (
    <div className="p-6 pb-24 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">مرحباً بك،</h2>
          <h1 className="text-2xl font-black tracking-wider uppercase">{profile?.displayName}</h1>
        </div>
        <div className="w-12 h-12 bg-white flex items-center justify-center border-2 border-brand-secondary shadow-hard">
          {profile?.role === 'sender' && <User className="text-brand-primary" />}
          {profile?.role === 'driver' && <Truck className="text-brand-primary" />}
          {profile?.role === 'hub' && <Store className="text-brand-primary" />}
        </div>
      </header>

      <div className="glass-card h-[200px] p-0 relative z-0 overflow-hidden border-2 border-brand-secondary shadow-hard">
        <MapContainer center={defaultPosition} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeParcels.map(p => (
            <Marker key={p.id} position={p.location ? [p.location.lat, p.location.lng] : defaultPosition} icon={customIcon}>
              <Popup>
                <div className="text-right dir-rtl font-sans">
                  <strong>#{p.id.slice(-6).toUpperCase()}</strong><br/>{getStatusLabel(p.status)}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute top-2 right-2 bg-white border-2 border-brand-secondary px-3 py-1 font-black text-[10px] tracking-widest uppercase z-[400] shadow-solid">الخريطة المباشرة</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 border-2 border-brand-secondary shadow-hard flex flex-col items-center justify-center text-center"
          >
            <stat.icon className={`${stat.color} mb-2`} size={24} />
            <p className="text-3xl font-black">{stat.value}</p>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2 border-b-2 border-brand-secondary pb-2">
          <h3 className="font-black text-lg uppercase tracking-wider">الطرود الأخيرة</h3>
          {profile?.role === 'sender' && (
            <Link to="/send" className="bg-brand-primary text-white text-[10px] uppercase font-black px-3 py-1 border-2 border-brand-secondary shadow-[2px_2px_0px_#1A1A1A] hover:bg-brand-primary/90 flex items-center gap-1 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
              <span>إرسال طرد</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-brand-light border-2 border-brand-secondary animate-pulse" />)}
          </div>
        ) : parcels.length === 0 ? (
          <div className="glass-card p-12 text-center bg-brand-light">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400 font-bold text-sm">لا توجد طرود حالياً</p>
            {profile?.role === 'sender' && (
              <Link to="/send" className="mt-4 inline-block text-brand-primary font-black uppercase tracking-wider underline">ابدأ أول شحنة الآن</Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {parcels.map((parcel) => (
              <Link to={`/parcel/${parcel.id}`} key={parcel.id}>
                <motion.div 
                  layoutId={parcel.id}
                  className="bg-white p-4 border-2 border-brand-secondary shadow-hard hover:-translate-y-1 hover:-translate-x-1 hover:shadow-hard-lg transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-brand-secondary bg-brand-accent flex items-center justify-center text-brand-secondary flex-shrink-0">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="font-black text-sm tracking-widest uppercase">#{parcel.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-gray-500 max-w-[150px] truncate">{parcel.route}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 border-2 border-brand-secondary text-[10px] font-black uppercase tracking-widest ${
                      parcel.status === 'delivered' ? 'bg-brand-green text-white' : 'bg-brand-light text-brand-secondary'
                    }`}>
                      {getStatusLabel(parcel.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-brand-light text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{parcel.updatedAt?.toDate().toLocaleDateString('ar-YE')}</span>
                    <span className="mx-1">•</span>
                    <User size={12} />
                    <span>{parcel.recipientName}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {profile?.role !== 'sender' && (
        <section className="mt-8">
          <div className="bg-brand-secondary text-white p-6 border-2 border-brand-secondary shadow-hard relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-black text-xl uppercase tracking-wider mb-2">جاهز للمسح؟</h3>
              <p className="text-white/80 font-bold text-xs mb-6">استخدم الكاميرا لمسح أكواد الطرود وتحديث حالتها فوراً.</p>
              <Link to="/scan" className="inline-block bg-white text-brand-secondary border-2 border-transparent px-6 py-3 font-black uppercase tracking-wider shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                افتح الماسح
              </Link>
            </div>
            <ScanQrCode size={160} className="absolute -bottom-8 -left-8 text-white/5" />
          </div>
        </section>
      )}
    </div>
  );
}
