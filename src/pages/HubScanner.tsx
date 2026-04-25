import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, QrCode, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HubScanner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    function onScanError(err: any) {
      // Quiet scan errors
    }

    return () => {
      scanner.clear().catch(e => console.warn(e));
    };
  }, []);

  const handleScan = async (parcelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'parcels', parcelId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("الطرد غير موجود في النظام");
      }

      const parcel = docSnap.data();
      let nextStatus = parcel.status;

      // Logic based on role and current status
      if (profile?.role === 'hub') {
        if (parcel.status === 'pending') nextStatus = 'at_hub_origin';
        else if (parcel.status === 'in_transit') nextStatus = 'at_hub_destination';
        else if (parcel.status === 'at_hub_destination') nextStatus = 'delivered';
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
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowRight />
        </button>
        <h1 className="text-2xl font-bold">ماسح الأكواد</h1>
      </div>

      <AnimatePresence mode="wait">
        {!scanResult && !error && (
          <motion.div 
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div id="reader" className="overflow-hidden rounded-3xl border-4 border-brand-primary/20 shadow-2xl mb-8" />
            <div className="text-center p-6 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
              <QrCode size={32} className="mx-auto text-brand-primary mb-3" />
              <p className="text-brand-secondary font-bold mb-1">وجه الكاميرا نحو الكود</p>
              <p className="text-zinc-500 text-xs">سيتم تحديث حالة الطرد بمجرد قراءة الكود بنجاح</p>
            </div>
          </motion.div>
        )}

        {scanResult && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم التحديث بنجاح!</h2>
            <p className="text-zinc-500 mb-6">تم تغيير حالة الطرد من {getStatusLabel(scanResult.oldStatus)} إلى {getStatusLabel(scanResult.newStatus)}</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => setScanResult(null)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCcw size={20} />
                <span>مسح كود آخر</span>
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full btn-secondary"
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
            className="glass-card p-8 text-center border-red-100"
          >
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">خطأ في المسح</h2>
            <p className="text-zinc-500 mb-8">{error}</p>
            
            <button 
              onClick={() => {setError(null); setScanResult(null);}}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCcw size={20} />
              <span>إعادة المحاولة</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      )}
    </div>
  );
}
