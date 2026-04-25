import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile } from './lib/firebase';
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
          // If no profile, they will be redirected to profile setup or handled in Login
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      <BrowserRouter>
        <div className="min-h-screen pb-20 max-w-md mx-auto bg-brand-background font-sans" dir="rtl">
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
