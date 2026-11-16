import { Component, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  activateSubscription,
  auth,
  ensureUserProfile,
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AppStats>({ totalRegisteredUsers: 0, alphaCap: 10 });
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    testFirestoreConnection();
    const unsubStats = subscribeToAppStats(setStats);

    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!nextUser) {
        setProfile(null);
        return;
      }

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
        setAuthError(err instanceof Error ? err.message : 'Unable to initialize profile.');
      }
    });

    return () => {
      unsubStats();
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const handleSignInAndOpen = async () => {
    if (user) {
      setViewMode('app');
      return;
    }
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setViewMode('app');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setViewMode('landing');
  };

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-[#FAF4EA] dark:bg-[#0B110E] text-[#112018] dark:text-[#EDF4EF] transition-colors">
        <Navbar
          user={user}
          viewMode={viewMode}
          onNavigateView={setViewMode}
          onSignIn={handleSignInAndOpen}
          isSigningIn={isSigningIn}
        />

        {authError && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-400">
              {authError}
            </div>
          </div>
        )}

        {viewMode === 'app' && user && profile ? (
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
            isAuthenticated={Boolean(user && profile)}
          />
        )}
      </div>
    </AppErrorBoundary>
  );
}
