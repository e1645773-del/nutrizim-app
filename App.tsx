import { Component, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  activateSubscription,
  auth,
  ensureUserProfile,
  getOrCreateLocalProfile,
  isFirebaseConfigured,
  isLocalUid,
  signInWithGoogle,
  signOutUser,
  subscribeToAppStats,
  subscribeToUserProfile,
  testFirestoreConnection,
  type AppStats,
  type UserProfile,
} from './lib/firebase';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B110E] text-[#EDF4EF]">
          <div className="max-w-md rounded-2xl border border-[#E5B84B]/25 bg-[#121C17] p-6 space-y-3">
            <h1 className="font-display text-2xl font-black uppercase text-[#E5B84B]">
              Application State Notice
            </h1>
            <p className="text-xs text-slate-300 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#135D3B] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#E5B84B]"
            >
              Reload NutriZim
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLocalSession, setIsLocalSession] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AppStats>({ totalRegisteredUsers: 0, alphaCap: 10 });
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    testFirestoreConnection();
    const unsubStats = subscribeToAppStats(setStats);

    if (!auth || !isFirebaseConfigured) {
      return () => {
        unsubStats();
      };
    }

    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!nextUser) {
        setProfile((prev) => (prev && isLocalUid(prev.uid) ? prev : null));
        return;
      }

      setIsLocalSession(false);
      try {
        const ensured = await ensureUserProfile(nextUser);
        setProfile(ensured);

        // Handle Stripe success return URL if present
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success' && ensured.tier === 'pending_payment') {
          await activateSubscription(nextUser.uid, 'stripe', 'stripe_checkout_completed');
          window.history.replaceState({}, '', window.location.pathname);
        }

        unsubProfile = subscribeToUserProfile(nextUser.uid, (liveProfile) => {
          if (liveProfile) setProfile(liveProfile);
        });
      } catch (err) {
        console.warn('Firestore profile error, switching to local browser storage:', err);
        const localProfile = getOrCreateLocalProfile();
        setProfile(localProfile);
        setIsLocalSession(true);
        setAuthNotice(
          'Cloud database unavailable — running in Local Browser Storage mode so your meals still save.'
        );
      }
    });

    return () => {
      unsubStats();
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  useEffect(() => {
    if (!isLocalSession) return;
    return subscribeToUserProfile(getOrCreateLocalProfile().uid, (liveLocal) => {
      if (liveLocal) setProfile(liveLocal);
    });
  }, [isLocalSession]);

  const enterLocalMode = (reason?: string) => {
    const localProfile = getOrCreateLocalProfile();
    setProfile(localProfile);
    setIsLocalSession(true);
    setViewMode('app');
    if (reason) {
      setAuthNotice(reason);
    } else {
      setAuthNotice(null);
    }
  };

  const handleSignInAndOpen = async () => {
    if ((user || isLocalSession) && profile) {
      setViewMode('app');
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      enterLocalMode(
        'Firebase keys are not configured — running in Local Browser Storage mode.'
      );
      return;
    }

    setIsSigningIn(true);
    setAuthNotice(null);
    try {
      await signInWithGoogle();
      setViewMode('app');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isUserCancelled = msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request');
      if (isUserCancelled) {
        setAuthNotice('Google Sign-In closed — sign in again or continue with Local Browser Storage.');
      } else {
        enterLocalMode(
          'Firebase Auth unavailable on this host — switched automatically to Local Browser Storage.'
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setIsLocalSession(false);
    setProfile(null);
    setAuthNotice(null);
    setViewMode('landing');
  };

  const isActiveUser = Boolean((user || isLocalSession) && profile);

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-[#FAF4EA] dark:bg-[#0B110E] text-[#112018] dark:text-[#EDF4EF] transition-colors">
        <Navbar
          isSignedIn={isActiveUser}
          viewMode={viewMode}
          onNavigateView={setViewMode}
          onSignIn={handleSignInAndOpen}
          isSigningIn={isSigningIn}
        />

        {authNotice && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
            <div className="rounded-xl border border-[#D99B26]/40 bg-[#F2DFAA]/60 dark:bg-[#2F2512] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#112018] dark:text-[#F2DFAA]">
              <span>{authNotice}</span>
              {!isActiveUser && (
                <button
                  type="button"
                  onClick={() => enterLocalMode()}
                  className="rounded-full bg-[#135D3B] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E5B84B] hover:bg-[#0E482D]"
                >
                  Continue with Local Storage
                </button>
              )}
            </div>
          </div>
        )}

        {viewMode === 'app' && profile ? (
          <Dashboard
            profile={profile}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onSignOut={handleSignOut}
          />
        ) : (
          <LandingPage
            stats={stats}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onStartTracking={handleSignInAndOpen}
            isSigningIn={isSigningIn}
            isAuthenticated={isActiveUser}
          />
        )}
      </div>
    </AppErrorBoundary>
  );
}
