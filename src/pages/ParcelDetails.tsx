import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowRight, MapPin, Package, Phone, Calendar, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import QRCode from "react-qr-code";

export default function ParcelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'parcels', id), (snapshot) => {
      if (snapshot.exists()) {
        setParcel({ id: snapshot.id, ...snapshot.data() });
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `parcels/${id}`);
    });
    return unsubscribe;
  }, [id]);

  if (loading) return <div className="p-6 text-center">جاري التحميل...</div>;
  if (!parcel) return <div className="p-6 text-center text-red-500">الطرد غير موجود</div>;

  const steps = [
    { id: 'pending', label: 'تم التسجيل', icon: CheckCircle2 },
    { id: 'at_hub_origin', label: 'في الموزع الأول', icon: MapPin },
    { id: 'in_transit', label: 'على الطريق', icon: Package },
    { id: 'at_hub_destination', label: 'في الموزع الأخير', icon: MapPin },
    { id: 'delivered', label: 'تم الاستلام', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === parcel.status);

  return (
    <div className="p-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowRight />
        </button>
        <h1 className="text-xl font-bold">تتبع الشحنة</h1>
      </div>

      <div className="glass-card p-6 mb-6 text-center">
        <p className="text-zinc-400 text-xs mb-2">رقم التتبع</p>
        <h2 className="text-2xl font-black mb-4 tracking-widest text-brand-secondary">
          {parcel.id.slice(-8).toUpperCase()}
        </h2>
        
        <button 
          onClick={() => setShowQR(!showQR)}
          className="mx-auto flex flex-col items-center gap-2 text-brand-primary font-bold group"
        >
          <div className="p-4 bg-white border-2 border-brand-primary/20 rounded-2xl group-hover:border-brand-primary transition-all">
            <QRCode value={parcel.id} size={150} />
          </div>
          <span className="text-sm">اضغط للتصغير/التكبير</span>
        </button>
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
          مرحلة الشحن
        </h3>
        
        <div className="space-y-6 relative">
          <div className="absolute top-2 bottom-2 right-4 w-0.5 bg-zinc-100" />
          {steps.map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            
            return (
              <div key={step.id} className="flex gap-4 items-start relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-brand-primary text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'
                }`}>
                  <step.icon size={16} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${isCompleted ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-brand-primary mt-1 animate-pulse">يتم المعالجة حالياً...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-50">
          <p className="text-xs text-zinc-400 mb-1">المستلم</p>
          <p className="font-bold text-sm">{parcel.recipientName}</p>
          <div className="flex items-center gap-2 text-brand-primary text-xs mt-2">
            <Phone size={12} />
            <span>{parcel.recipientPhone}</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-50">
          <p className="text-xs text-zinc-400 mb-1">المحتوى</p>
          <p className="text-sm">{parcel.description}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-50">
          <p className="text-xs text-zinc-400 mb-1">التاريخ والوقت</p>
          <div className="flex items-center gap-2 text-zinc-600 text-xs mt-1">
            <Calendar size={12} />
            <span>{parcel.createdAt?.toDate().toLocaleString('ar-YE')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
