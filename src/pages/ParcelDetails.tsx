import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowRight, MapPin, Package, Phone, Calendar, CheckCircle2, Star, Play, Square, Truck, Store, Mic, AlertCircle, RefreshCcw } from 'lucide-react';
import QRCode from "react-qr-code";
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// Component to handle map clicks for drivers updating location
function DriverLocationUpdater({ isDriver, onLocationUpdate }: { isDriver: boolean, onLocationUpdate: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (isDriver) {
        onLocationUpdate(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

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
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isDriverUpdatingLocation, setIsDriverUpdatingLocation] = useState(false);

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
      } else {
        setParcel(null);
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

  const handleCancelParcel = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'parcels', id), {
        status: 'cancelled',
        updatedAt: new Date(),
      });
      toast.success("تم إلغاء الشحنة");
      setShowCancelConfirm(false);
    } catch (err) {
      toast.error("لا يمكن إلغاء الشحنة. ربما تغيرت حالتها.");
      setShowCancelConfirm(false);
    }
  };

  const handleDriverLocationUpdate = async (lat: number, lng: number) => {
    if (!id || parcel.status !== 'in_transit') return;
    setIsDriverUpdatingLocation(true);
    try {
      await updateDoc(doc(db, 'parcels', id), {
        location: { lat, lng },
        updatedAt: new Date(),
      });
      toast.success("تم التحديث! (التتبع يعتمد على اتصالك بالإنترنت)");
    } catch (err) {
      toast.error("خطأ في تحديث الموقع");
    } finally {
      setIsDriverUpdatingLocation(false);
    }
  };

  if (loading) return <div className="p-6 text-center">جاري التحميل...</div>;
  if (!parcel) return <div className="p-6 text-center text-red-500 font-bold glass-card">الطرد غير موجود أو محذوف</div>;

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
  const isDriver = profile?.role === 'driver' && user?.uid === parcel.driverId;

  return (
    <div className="p-6 pb-24 space-y-6 relative overflow-visible">
      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#FDFCF9]/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white border-4 border-brand-secondary p-6 shadow-hard-lg max-w-sm w-full text-center"
            >
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-black uppercase tracking-wider mb-2">تأكيد الإلغاء</h2>
              <p className="text-sm font-bold text-gray-500 mb-6">هل أنت متأكد من رغبتك بإلغاء هذه الشحنة؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 btn-secondary text-sm px-2 py-3">
                  تراجع
                </button>
                <button onClick={handleCancelParcel} className="flex-1 bg-red-500 text-white font-black uppercase border-2 border-brand-secondary shadow-hard hover:bg-red-600 transition-colors">
                  نعم، إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border-2 border-brand-secondary shadow-hard flex justify-center items-center">
            <ArrowRight className="rotate-0 text-brand-secondary" />
          </button>
          <h1 className="text-2xl font-black italic uppercase">تتبع الشحنة</h1>
        </div>
        {parcel.status === 'pending' && user?.uid === parcel.senderId && (
          <button onClick={() => setShowCancelConfirm(true)} className="text-[10px] font-black text-red-500 border-2 border-red-500 bg-red-50 px-3 py-1 shadow-[2px_2px_0px_#EF4444] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all uppercase tracking-widest whitespace-nowrap">
            إلغاء الشحنة
          </button>
        )}
      </div>

      <div className="glass-card text-center p-6 bg-brand-light">
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">رقم التتبع</p>
        <h2 className="text-2xl font-black tracking-widest text-brand-secondary">
          {parcel.id.slice(-8).toUpperCase()}
        </h2>
        
        <div className="flex flex-col items-center justify-center mt-4 border-2 border-brand-secondary bg-white overflow-hidden p-2">
          {parcel.photoDataUrl ? (
            <img src={parcel.photoDataUrl} alt="Parcel" className="w-full max-w-[200px] h-32 object-cover border-2 border-brand-secondary" />
          ) : (
             <button 
              onClick={() => setShowQR(!showQR)}
              className="bg-white hover:bg-gray-50 transition-colors p-2"
            >
              <QRCode value={parcel.id} size={120} />
            </button>
          )}
        </div>
        
        {parcel.status === 'at_hub_destination' && user?.uid === parcel.senderId && (
          <div className="mt-6 p-4 bg-brand-primary text-white border-2 border-brand-secondary shadow-hard relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 -rotate-45 translate-x-8 -translate-y-8" />
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
        
        {parcel.status === 'cancelled' ? (
          <div className="text-center p-4 bg-red-50 border-2 border-red-200">
            <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
            <p className="font-black text-red-500 uppercase tracking-wider text-sm">تم إلغاء هذه الشحنة</p>
          </div>
        ) : (
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
        )}
      </div>

      {['in_transit', 'delivered'].includes(parcel.status) && (
        <div className="glass-card p-0 h-[250px] relative z-0 border-2 border-brand-secondary shadow-hard overflow-hidden">
           <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DriverLocationUpdater isDriver={isDriver} onLocationUpdate={handleDriverLocationUpdate} />
            <Marker position={defaultPosition} icon={customIcon}>
              <Popup>
                {parcel.status === 'in_transit' ? 'موقع الباص' : 'موقع التسليم'}
              </Popup>
            </Marker>
          </MapContainer>
          {isDriver && (
            <div className="absolute top-2 right-2 z-[400] bg-white border-2 border-brand-secondary p-2 shadow-solid text-[10px] font-black tracking-widest uppercase w-48 text-center leading-tight">
              أنقر الخريطة لتحديث موقعك للعملاء أو استخدم الزر أدناه
            </div>
          )}
        </div>
      )}

      {isDriver && parcel.status === 'in_transit' && (
        <button 
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => handleDriverLocationUpdate(pos.coords.latitude, pos.coords.longitude),
              () => toast.error("لا يمكن الوصول للموقع")
            );
          }}
          disabled={isDriverUpdatingLocation}
          className="w-full btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} className={isDriverUpdatingLocation ? "animate-spin" : ""} />
          <span>تحديث موقعك الحالي (GPS)</span>
        </button>
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
