import { useState } from 'react';
import { CreditCard, Lock, Smartphone } from 'lucide-react';
import { activateSubscription, type UserProfile } from '../lib/firebase';

interface SubscriptionGateProps {
  profile: UserProfile;
}

export function SubscriptionGate({ profile }: SubscriptionGateProps) {
  const [method, setMethod] = useState<'stripe' | 'ecocash'>('stripe');
  const [ecoPhone, setEcoPhone] = useState('');
  const [ecoRef, setEcoRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, uid: profile.uid }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not initiate Stripe checkout.');
      }
      if (data.mode === 'stripe_live' && data.url) {
        window.location.assign(data.url);
        return;
      }
      await activateSubscription(profile.uid, 'stripe', data.sessionId);
      setStatusMsg('Stripe subscription confirmed. Unlocking your NutriZim Pro dashboard...');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Stripe checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEcocashVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/ecocash-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ecoPhone, reference: ecoRef }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.verified) {
        throw new Error(data.error || 'Verification failed.');
      }
      await activateSubscription(profile.uid, 'ecocash', data.reference);
      setStatusMsg('EcoCash payment verified against 0789159982. Unlocking your dashboard...');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'EcoCash verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-[2rem] border border-[#135D3B]/15 dark:border-white/10 bg-[#F2E9D8] dark:bg-[#121C17] p-6 sm:p-8">
        <div className="flex items-center gap-3 text-[#B7791F] dark:text-[#E5B84B]">
          <Lock className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Registered Account #{profile.userNumber} · Alpha Cohort (1–10) Claimed
          </span>
        </div>

        <h1 className="mt-3 font-display text-4xl font-black uppercase text-[#135D3B] dark:text-white">
          Activate NutriZim Pro ($25 / month)
        </h1>
        <p className="mt-2 text-sm text-[#385043] dark:text-slate-300">
          All 10 free early-bird alpha slots have been claimed. Complete your $25/month subscription
          via Stripe or EcoCash (<span className="font-mono font-bold text-[#135D3B] dark:text-[#E5B84B]">0789159982</span>) to
          unlock AI plate scanning, voice coaching, and rolling analytics.
        </p>

        {/* Payment Method Segmented Selector */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-white dark:bg-[#18251E] p-1.5 border border-[#135D3B]/10">
          <button
            type="button"
            onClick={() => setMethod('stripe')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              method === 'stripe'
                ? 'bg-[#135D3B] text-[#E5B84B]'
                : 'text-[#385043] dark:text-slate-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Stripe Card ($25/mo)
          </button>
          <button
            type="button"
            onClick={() => setMethod('ecocash')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              method === 'ecocash'
                ? 'bg-[#135D3B] text-[#E5B84B]'
                : 'text-[#385043] dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            EcoCash (0789159982)
          </button>
        </div>

        {method === 'stripe' ? (
          <div className="mt-6 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#0B110E] p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-lg font-extrabold uppercase text-[#135D3B] dark:text-white">
                Stripe Subscription Portal
              </p>
              <p className="font-mono text-xl font-bold text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                $25.00 USD / mo
              </p>
            </div>
            <p className="mt-2 text-xs text-[#587264] dark:text-slate-400">
              Billed monthly to {profile.email}. Includes unrestricted gpt-4o vision scanning,
              gpt-4o-mini trilingual coaching, and 100g/100ml ledger sync.
            </p>
            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={loading}
              className="mt-5 w-full min-h-[48px] rounded-full bg-[#D99B26] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Processing Stripe Checkout...' : 'Pay $25/mo via Stripe Portal'}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleEcocashVerify}
            className="mt-6 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#0B110E] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#135D3B]/10 dark:border-white/10 pb-3">
              <div>
                <p className="text-xs text-[#587264] dark:text-slate-400">Send $25 USD via EcoCash to</p>
                <p className="font-mono text-xl font-bold text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                  0789159982
                </p>
              </div>
              <p className="text-xs text-[#587264] dark:text-slate-400">
                Support: +263 78 383 3106
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#385043] dark:text-slate-300 mb-1">
                Your EcoCash Mobile Number
              </label>
              <input
                type="tel"
                required
                value={ecoPhone}
                onChange={(e) => setEcoPhone(e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full min-h-[44px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 text-sm text-[#112018] dark:text-white focus:outline-none focus:border-[#D99B26]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#385043] dark:text-slate-300 mb-1">
                EcoCash Transaction Reference ID
              </label>
              <input
                type="text"
                required
                value={ecoRef}
                onChange={(e) => setEcoRef(e.target.value)}
                placeholder="e.g. MP261116.1422.B09123"
                className="w-full min-h-[44px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 font-mono text-sm text-[#112018] dark:text-white focus:outline-none focus:border-[#D99B26]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-full bg-[#135D3B] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Verifying EcoCash Payment...' : 'Verify EcoCash Payment & Activate'}
            </button>
          </form>
        )}

        {errorMsg && (
          <p className="mt-4 text-xs font-medium text-rose-500">{errorMsg}</p>
        )}
        {statusMsg && (
          <p className="mt-4 text-xs font-medium text-[#135D3B] dark:text-[#34D399]">{statusMsg}</p>
        )}
      </div>
    </div>
  );
}
