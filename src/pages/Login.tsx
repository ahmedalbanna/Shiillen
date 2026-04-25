import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { signIn } from '../lib/firebase';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <div className="w-24 h-24 bg-brand-primary rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
            <span className="text-4xl text-white font-bold -rotate-3">ش</span>
          </div>
          <h1 className="text-4xl font-bold text-brand-secondary mb-2">شِلّن</h1>
          <p className="text-zinc-500 italic">شِلّنها مع الباص… توصلك للغايب</p>
        </div>

        <div className="glass-card p-8 mb-6">
          <p className="text-zinc-600 mb-8">
            أول منصة يمنية تشاركية لشحن الطرود عبر الباصات والمحلات التجارية.
          </p>
          
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} />
                <span>دخول عبر جوجل</span>
              </>
            )}
          </button>
          
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </div>

        <p className="text-xs text-zinc-400">
          بالاستمرار، فأنت توافق على شروط الخدمة وسياسة الخصوصية
        </p>
      </motion.div>
    </div>
  );
}
