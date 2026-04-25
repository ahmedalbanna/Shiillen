import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, QrCode, CheckCircle, AlertCircle, RefreshCcw, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function HubScanner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pendingDeliveryParcel, setPendingDeliveryParcel] = useState<any>(null);
  const [deliveryCode, setDeliveryCode] = useState('');

  useEffect(() => {
    if (pendingDeliveryParcel || scanResult || error) return;
    
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanError);

    function onScanSuccess(decodedText: string) {
      handleScan(decodedText);
      scanner.clear();
    }

    function onScanError(err: any) {}

    return () => {
      scanner.clear().catch(e => console.warn(e));
    };
  }, [pendingDeliveryParcel, scanResult, error]);

  const handleScan = async (parcelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'parcels', parcelId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("الطرد غير موجود في النظام");
      }

      const parcel = { id: docSnap.id, ...docSnap.data() };
      
      if (profile?.role === 'hub' && parcel.status === 'at_hub_destination') {
        setPendingDeliveryParcel(parcel);
        setLoading(false);
        return;
      }

      let nextStatus = parcel.status;

      if (profile?.role === 'hub') {
        if (parcel.status === 'pending') nextStatus = 'at_hub_origin';
        else if (parcel.status === 'in_transit') nextStatus = 'at_hub_destination';
      } else if (profile?.role === 'driver') {
        if (parcel.status === 'at_hub_origin') nextStatus = 'in_transit';
      }

      if (nextStatus === parcel.status) {
        throw new Error(`لا يمكن تحديث حالة هذا الطرد حالياً من قبل ${profile?.role === 'hub' ? 'الموزع' : 'السائق'}`);
      }

      const updateData: any = {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };

      if (nextStatus === 'in_transit') {
        updateData.driverId = user?.uid;
      }

      await updateDoc(docRef, updateData);
      setScanResult({ id: parcelId, oldStatus: parcel.status, newStatus: nextStatus });
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحديث الطرد");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
    if (!pendingDeliveryParcel) return;
    const expectedCode = pendingDeliveryParcel.id.slice(-4).toUpperCase();
    
    if (deliveryCode.toUpperCase() !== expectedCode) {
      toast.error('كود التسليم غير صحيح');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'parcels', pendingDeliveryParcel.id), {
        status: 'delivered',
        updatedAt: serverTimestamp(),
      });
      setScanResult({ id: pendingDeliveryParcel.id, oldStatus: 'at_hub_destination', newStatus: 'delivered' });
      setPendingDeliveryParcel(null);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التأكيد');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      pending: 'مسجل جديد',
      at_hub_origin: 'في الموزع الأول',
      in_transit: 'مع السائق',
      at_hub_destination: 'في موزع الوصول',
      delivered: 'تم الاستلام',
    };
    return labels[status] || status;
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border-2 border-brand-secondary shadow-hard flex justify-center items-center">
          <ArrowRight className="text-brand-secondary" />
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-wider">ماسح الأكواد</h1>
      </div>

      <AnimatePresence mode="wait">
        {!scanResult && !error && !pendingDeliveryParcel && (
          <motion.div 
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div id="reader" className="overflow-hidden border-2 border-brand-secondary shadow-hard mb-8 bg-white" />
            <div className="text-center p-6 bg-brand-accent border-2 border-brand-secondary shadow-hard">
              <QrCode size={32} className="mx-auto text-brand-secondary mb-3" />
              <p className="text-brand-secondary font-black uppercase tracking-wider mb-1">وجه الكاميرا نحو الكود</p>
              <p className="font-bold text-[10px] uppercase text-gray-500">سيتم تحديث حالة الطرد تلقائياً</p>
            </div>
          </motion.div>
        )}

        {pendingDeliveryParcel && (
          <motion.div 
            key="confirm_delivery"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center bg-brand-primary text-white border-brand-secondary shadow-hard"
          >
            <div className="w-16 h-16 bg-white text-brand-primary border-2 border-brand-secondary flex items-center justify-center mx-auto mb-6 shadow-hard">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">تأكيد التسليم</h2>
            <p className="text-sm font-bold mb-6 text-white/90">أدخل كود التسليم الموجود لدى المستلم (المرسل) لإكمال العملية.</p>
            
            <input 
              type="text" 
              maxLength={4}
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value)}
              placeholder="XXXX"
              className="w-full bg-white text-brand-secondary text-center text-3xl font-black tracking-[0.5em] p-4 border-2 border-brand-secondary shadow-hard mb-6 outline-none uppercase"
            />
            
            <button 
              onClick={confirmDelivery}
              className="w-full bg-brand-secondary text-white font-black uppercase tracking-wider p-4 border-2 border-transparent shadow-hard active:translate-y-1 active:translate-x-1 active:shadow-none transition-all mb-4"
            >
              التأكيد بنجاح
            </button>
            <button 
              onClick={() => { setPendingDeliveryParcel(null); setDeliveryCode(''); }}
              className="font-bold underline text-sm opacity-80"
            >
              إلغاء وإعادة المسح
            </button>
          </motion.div>
        )}

        {scanResult && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center bg-brand-green text-white border-brand-secondary shadow-hard"
          >
            <div className="w-16 h-16 bg-white text-brand-green border-2 border-brand-secondary flex items-center justify-center mx-auto mb-6 shadow-hard">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">تم التحديث بنجاح!</h2>
            <p className="font-bold text-xs opacity-90 mb-6">
              تم تغيير حالة الطرد من <br/>
              <span className="text-brand-accent">{getStatusLabel(scanResult.oldStatus)}</span> إلى <span className="text-brand-accent">{getStatusLabel(scanResult.newStatus)}</span>
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setScanResult(null)}
                className="w-full bg-white text-brand-secondary font-black uppercase tracking-wider p-4 border-2 border-transparent shadow-[4px_4px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all flex items-center gap-2 justify-center"
              >
                <RefreshCcw size={20} />
                <span>مسح كود آخر</span>
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full underline font-bold uppercase tracking-wider"
              >
                الرجوع للرئيسية
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center bg-red-500 text-white border-brand-secondary shadow-hard"
          >
            <div className="w-16 h-16 bg-white text-red-500 border-2 border-brand-secondary flex items-center justify-center mx-auto mb-6 shadow-hard">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">خطأ في المسح</h2>
            <p className="font-bold text-sm mb-8 opacity-90">{error}</p>
            
            <button 
              onClick={() => {setError(null); setScanResult(null);}}
              className="w-full bg-white text-brand-secondary font-black uppercase tracking-wider p-4 border-2 border-transparent shadow-[4px_4px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw size={20} />
              <span>إعادة المحاولة</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 bg-[#FDFCF9]/80 flex items-center justify-center z-[100]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      )}
    </div>
  );
}
