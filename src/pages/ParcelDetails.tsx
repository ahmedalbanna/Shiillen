import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowRight, MapPin, Package, Phone, Calendar, CheckCircle2, Star, Play, Square, Truck, Store, Mic } from 'lucide-react';
import QRCode from "react-qr-code";
import { useAuth } from '../App';
import toast from 'react-hot-toast';
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

export default function ParcelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [parcel, setParcel] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [ratingDriver, setRatingDriver] = useState(0);
  const [ratingHub, setRatingHub] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'parcels', id), async (snapshot) => {
      if (snapshot.exists()) {
        const p = { id: snapshot.id, ...snapshot.data() };
        setParcel(p);

        if (p.driverId && !driver) {
          const dRef = await getDoc(doc(db, 'users', p.driverId));
          if (dRef.exists()) setDriver(dRef.data());
        }

        if (p.driverRating || p.hubRating) setHasRated(true);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `parcels/${id}`);
    });
    return unsubscribe;
  }, [id]);

  const submitRating = async () => {
    if (!id || (ratingDriver === 0 && ratingHub === 0)) return;
    try {
      await updateDoc(doc(db, 'parcels', id), {
        driverRating: ratingDriver,
        hubRating: ratingHub,
        updatedAt: new Date(),
      });
      toast.success("تم إرسال التقييم بنجاح!");
      setHasRated(true);
    } catch (err) {
      toast.error("خطأ أثناء إرسال التقييم");
    }
  };

  if (loading) return <div className="p-6 text-center">جاري التحميل...</div>;
  if (!parcel) return <div className="p-6 text-center text-red-500">الطرد غير موجود</div>;

  const steps = [
    { id: 'pending', label: 'تم التسجيل', icon: CheckCircle2 },
    { id: 'at_hub_origin', label: 'في الموزع الأول', icon: Store },
    { id: 'in_transit', label: 'على الطريق', icon: Truck },
    { id: 'at_hub_destination', label: 'في الموزع الأخير', icon: Store },
    { id: 'delivered', label: 'تم الاستلام', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === parcel.status);

  // Default coordinate if parcel location is not available
  const defaultPosition: [number, number] = parcel.location ? [parcel.location.lat, parcel.location.lng] : [15.3694, 44.1910]; // Sana'a

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border-2 border-brand-secondary shadow-hard flex justify-center items-center">
          <ArrowRight className="rotate-0 text-brand-secondary" />
        </button>
        <h1 className="text-2xl font-black italic uppercase">تتبع الشحنة</h1>
      </div>

      <div className="glass-card text-center p-6 bg-brand-light">
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">رقم التتبع</p>
        <h2 className="text-2xl font-black tracking-widest text-brand-secondary">
          {parcel.id.slice(-8).toUpperCase()}
        </h2>
        
        <button 
          onClick={() => setShowQR(!showQR)}
          className="mx-auto flex justify-center mt-4 border-2 border-brand-secondary p-2 bg-white hover:bg-gray-50 transition-colors"
        >
          <QRCode value={parcel.id} size={150} />
        </button>
        
        {parcel.status === 'at_hub_destination' && user?.uid === parcel.senderId && (
          <div className="mt-6 p-4 bg-brand-primary text-white border-2 border-brand-secondary shadow-hard">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">كود التسليم للمستلم</p>
            <p className="text-3xl font-black tracking-widest">{parcel.id.slice(-4).toUpperCase()}</p>
          </div>
        )}
      </div>

      <div className="glass-card">
        <h3 className="font-black uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-primary" />
          مرحلة الشحن
        </h3>
        
        <div className="space-y-6 relative ml-4 dir-ltr text-left">
          <div className="absolute top-2 bottom-2 left-4 w-1 bg-brand-secondary/20" />
          {steps.map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            
            return (
              <div key={step.id} className="flex gap-4 items-start relative z-10" dir="rtl">
                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-brand-secondary ${
                  isCompleted ? 'bg-brand-primary text-white shadow-hard' : 'bg-brand-light text-gray-400'
                }`}>
                  <step.icon size={16} />
                </div>
                <div className="flex-1 mt-1">
                  <p className={`font-black text-sm uppercase tracking-wider ${isCompleted ? 'text-brand-secondary' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] font-bold text-brand-primary mt-1 animate-pulse">يتم المعالجة حالياً...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {['in_transit', 'delivered'].includes(parcel.status) && (
        <div className="glass-card h-[250px] relative z-0">
           <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={defaultPosition} icon={customIcon}>
              <Popup>
                {parcel.status === 'in_transit' ? 'موقع الباص الحالي' : 'موقع التسليم'}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      {driver && (
         <div className="glass-card bg-brand-green text-white p-4 flex gap-4">
          <div className="w-16 h-16 bg-white border-2 border-brand-secondary overflow-hidden flex items-center justify-center text-brand-secondary">
             <Truck size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">السائق المكلف</p>
            <h4 className="font-black text-lg">{driver.displayName || 'غير معروف'}</h4>
            <div className="flex text-brand-accent mt-1 items-center gap-1">
              {[1,2,3,4,5].map(v => <Star key={v} size={14} fill={v <= (driver.rating || 4) ? "currentColor" : "none"} />)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">المستلم</p>
          <p className="font-bold text-sm">{parcel.recipientName}</p>
          <div className="flex items-center gap-2 text-brand-primary text-xs mt-2 dir-ltr w-fit">
            <Phone size={12} />
            <span className="font-bold">{parcel.recipientPhone}</span>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">المحتوى</p>
          <p className="font-bold text-sm">{parcel.category || 'غير محدد'}</p>
          <p className="text-xs text-gray-600 mt-1">{parcel.description}</p>
        </div>
      </div>

      {parcel.voiceNoteDataUrl && (
        <div className="glass-card bg-brand-accent flex items-center gap-3">
          <button 
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.play();
            }}
            className="w-10 h-10 bg-brand-primary flex flex-shrink-0 items-center justify-center text-white border-2 border-brand-secondary shadow-hard hover:-translate-y-1 hover:shadow-hard-lg transition-all"
          >
            <Play size={16} fill="currentColor" />
          </button>
          <div className="flex-1 font-bold text-sm tracking-widest">رسالة صوتية</div>
          <audio ref={audioPlayerRef} src={parcel.voiceNoteDataUrl} className="hidden" />
          <div className="w-8 h-8 rounded-full border-2 border-brand-secondary flex items-center justify-center bg-white">
            <Mic size={14} className="text-brand-primary" />
          </div>
        </div>
      )}

      {parcel.status === 'delivered' && user?.uid === parcel.senderId && !hasRated && (
        <div className="glass-card bg-brand-primary text-white border-brand-secondary p-6">
          <h3 className="font-black uppercase tracking-wider mb-4">قيم تجربتك</h3>
          
          <div className="mb-4">
            <p className="text-[10px] font-black tracking-widest mb-2 opacity-80 uppercase">تقييم السائق</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button key={num} onClick={() => setRatingDriver(num)} className="p-1">
                  <Star size={24} fill={num <= ratingDriver ? "currentColor" : "none"} className={num <= ratingDriver ? "text-brand-accent" : "text-white/30"} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-black tracking-widest mb-2 opacity-80 uppercase">تقييم النقطة</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button key={num} onClick={() => setRatingHub(num)} className="p-1">
                  <Star size={24} fill={num <= ratingHub ? "currentColor" : "none"} className={num <= ratingHub ? "text-brand-accent" : "text-white/30"} />
                </button>
              ))}
            </div>
          </div>

          <button onClick={submitRating} className="w-full bg-white text-brand-primary font-black uppercase tracking-wider border-2 border-brand-secondary py-3 shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none">
            تأكيد التقييم
          </button>
        </div>
      )}

    </div>
  );
}
