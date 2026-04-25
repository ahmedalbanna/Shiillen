import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, getUserProfile, db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SendParcel from './pages/SendParcel';
import ParcelDetails from './pages/ParcelDetails';
import HubScanner from './pages/HubScanner';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);
  const knownStatusRef = useRef<Record<string, string>>({});

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        if (p) {
          setProfile(p);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time notifications for the logged-in user
  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (profile.role === 'sender') {
      q = query(collection(db, 'parcels'), where('senderId', '==', user.uid));
    }

    if (!q) return;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadRef.current) {
        snapshot.docs.forEach(doc => {
          knownStatusRef.current[doc.id] = doc.data().status;
        });
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const prevStatus = knownStatusRef.current[change.doc.id];
          if (prevStatus !== data.status) {
            knownStatusRef.current[change.doc.id] = data.status;
            
            let message = '';
            switch(data.status) {
              case 'at_hub_origin': message = `طردك #${change.doc.id.slice(-4)} وصل للموزع الأول`; break;
              case 'in_transit': message = `طردك #${change.doc.id.slice(-4)} في الطريق الآن`; break;
              case 'at_hub_destination': message = `طردك #${change.doc.id.slice(-4)} وصل مدينة التسليم. كود التسليم: ${change.doc.id.slice(-4).toUpperCase()}`; break;
              case 'delivered': message = `تم تسليم طردك #${change.doc.id.slice(-4)} بنجاح!`; break;
            }

            if (message) {
              toast(message, {
                icon: '📦',
                style: {
                  borderRadius: '0px',
                  background: '#FDFCF9',
                  color: '#1A1A1A',
                  border: '2px solid #1A1A1A',
                  boxShadow: '4px 4px 0px #1A1A1A',
                  fontWeight: '900',
                },
              });
            }
          }
        }
      });
    }, (err) => {
      console.error("Notification listener error", err);
    });

    return unsubscribe;
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF9]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5722]"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      <BrowserRouter>
        <div className="min-h-screen pb-20 max-w-md mx-auto bg-brand-background font-sans" dir="rtl">
          <Toaster position="top-center" />
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? (profile ? <Dashboard /> : <Profile setup />) : <Navigate to="/login" />} />
            <Route path="/send" element={user ? <SendParcel /> : <Navigate to="/login" />} />
            <Route path="/parcel/:id" element={user ? <ParcelDetails /> : <Navigate to="/login" />} />
            <Route path="/scan" element={user ? <HubScanner /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          </Routes>
          {user && profile && <Navigation />}
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
