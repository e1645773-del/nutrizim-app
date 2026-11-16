import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Barcode,
  Camera,
  Database,
  Download,
  Mic,
  Moon,
  Phone,
  Scale,
  Search,
  Smartphone,
  Sparkles,
  Sun,
} from 'lucide-react';
import { HeroPlate3D, type DishInspectionInfo } from './HeroPlate3D';
import {
  FOOD_CATEGORIES,
  ZIMBABWE_FOOD_DB,
  type FoodCategory,
} from '../data/zimbabweFoodDb';
import type { AppStats } from '../lib/firebase';

interface LandingPageProps {
  stats: AppStats;
  isDark: boolean;
  onToggleTheme: () => void;
  onStartTracking: () => void;
  isSigningIn: boolean;
  isAuthenticated: boolean;
}

export function LandingPage({
  stats,
  isDark,
  onToggleTheme,
  onStartTracking,
  isSigningIn,
  isAuthenticated,
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | FoodCategory>('All');
  const [activeDish, setActiveDish] = useState<DishInspectionInfo | null>(null);
  const [ecoCopied, setEcoCopied] = useState(false);

  const slotsRemaining = Math.max(0, stats.alphaCap - stats.totalRegisteredUsers);

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ZIMBABWE_FOOD_DB.filter((item) => {
      const catMatch = selectedCategory === 'All' || item.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      const inName = item.food.toLowerCase().includes(q);
      const inAlias = (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
      return inName || inAlias;
    }).slice(0, 14);
  }, [searchQuery, selectedCategory]);

  const handleCopyEcocash = () => {
    navigator.clipboard?.writeText('0789159982');
    setEcoCopied(true);
    setTimeout(() => setEcoCopied(false), 2200);
  };

  return (
    <div id="top" className="relative overflow-hidden">
      {/* Subtle Organic Background Accents (Green & Gold) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-24 h-[460px] w-[460px] rounded-full bg-[#D99B26]/20 dark:bg-[#D99B26]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[540px] -left-32 h-[380px] w-[380px] rounded-full bg-[#135D3B]/10 dark:bg-[#1E7A4C]/15 blur-3xl"
      />

      {/* SECTION 1: SPLIT HERO (Matching Reference Layout with Green & Gold) */}
      <section id="scanner-engine" className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-14 lg:pt-10 lg:pb-20">
        {/* Live Early-Bird Counter + Theme Switch */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#135D3B]/15 dark:border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
            <span className="font-semibold text-[#135D3B] dark:text-[#E5B84B]">
              {slotsRemaining > 0
                ? `Only ${slotsRemaining} of ${stats.alphaCap} free alpha access slots remaining before $25/mo billing activates`
                : `Alpha Cohort Full (${stats.totalRegisteredUsers}/${stats.alphaCap}) — $25/mo NutriZim Pro Active`}
            </span>
            <span aria-hidden="true" className="text-[#135D3B]/40 dark:text-slate-500">
              ·
            </span>
            <span className="font-mono text-xs text-[#3C5849] dark:text-slate-400 tabular-nums">
              {stats.totalRegisteredUsers} registered
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white/80 dark:bg-[#121D17] px-3.5 py-1 text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B] transition-colors whitespace-nowrap shrink-0"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? 'Cream Canvas' : 'Dark Canvas'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Column: Condensed Display + Overlapping Gold Script */}
          <div className="lg:col-span-5 relative">
            {/* Botanical Starburst Motif */}
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="hidden sm:block w-11 h-11 text-[#D99B26] mb-3"
              fill="currentColor"
            >
              <path d="M32 2l5 22 21-9-15 17 20 10-22 3 9 18-18-13-11 19-2-22-21 7 15-16L4 22l22-2-7-18 13 15z" />
            </svg>

            <h1 className="font-display text-[56px] sm:text-[72px] lg:text-[78px] font-black uppercase leading-[0.88] tracking-tight text-[#135D3B] dark:text-[#EDF4EF]">
              <span className="block">PRECISION</span>
              <span className="block">MACROS</span>
              <span className="block">
                THAT{' '}
                <span className="font-script normal-case font-bold text-[58px] sm:text-[74px] text-[#D99B26] dark:text-[#E5B84B] -ml-1 inline-block -rotate-3">
                  Nourish
                </span>
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#385043] dark:text-slate-300 max-w-md">
              NutriZim pairs AI camera food scanning with objective 100g/100ml macro tracking,
              pre-seeded with 200 Zimbabwean &amp; Southern African foods and Shona, Ndebele, and
              English voice coaching.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onStartTracking}
                disabled={isSigningIn}
                className="inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-[#135D3B] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {isAuthenticated
                  ? 'Open Tracker'
                  : slotsRemaining > 0
                  ? `Claim Free Alpha (${slotsRemaining} Left)`
                  : 'Activate Pro ($25/mo)'}
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#D99B26] text-[#112018]">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <a
                href="#food-database"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:underline whitespace-nowrap"
              >
                200 Foods Ledger
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            {/* Active 3D Dish Readout */}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#135D3B]/15 dark:border-white/10 pt-4 text-xs">
              <div>
                <span className="text-[#587264] dark:text-slate-400">3D Specimen Selected: </span>
                <strong className="text-[#112018] dark:text-white">
                  {activeDish ? activeDish.title : 'Sadza (white maize)'}
                </strong>
              </div>
              <span className="font-mono font-semibold text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                {activeDish ? activeDish.kcalPer100 : 110} kcal / 100g
              </span>
            </div>

            {/* Uploaded Reference Plate Preview -> Interactive 3D Twin */}
            <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-[#F2E9D8]/85 dark:bg-[#121C17] p-2.5">
              <img
                src="/assets/aistudio/IMG_9207_f517fc44.jpeg"
                alt="Original meal photo of sadza, braised beef stew, and sautéed covo"
                className="h-14 w-14 rounded-xl object-cover shrink-0 border border-[#D99B26]/40"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
                  Featured Meal · 3D Digital Twin
                </p>
                <p className="text-xs font-semibold text-[#112018] dark:text-white truncate">
                  Sadza jena, Braised Beef Stew &amp; Sautéed Covo
                </p>
                <p className="font-mono text-[11px] text-[#4C6357] dark:text-slate-400 tabular-nums">
                  Click any 3D layer or toggle Real Photo on plate
                </p>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Organic Gold & Sage Arch Frame with 3D Interactive Plate */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-[2.25rem] bg-[#E8D5A5] dark:bg-[#192820] p-3 sm:p-4 border border-[#D99B26]/35 dark:border-[#2A9D6F]/30">
              <HeroPlate3D onSelectDish={(dish) => setActiveDish(dish)} />

              {/* Circular Stamp Motif matching reference ("CREATIVE WITH PURPOSE") */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 h-24 w-24 rounded-full bg-[#FAF4EA] dark:bg-[#121D17] border-2 border-[#D99B26] flex-col items-center justify-center text-center p-2 shadow-sm">
                <span className="font-mono text-[10px] font-bold uppercase leading-tight text-[#135D3B] dark:text-[#E5B84B]">
                  100g / 100ml
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#385043] dark:text-slate-300 mt-0.5">
                  Verified Data
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FOUNDERS INTRO BLOCK (Matching "HI, I'M ALEX." 3-Column Card) */}
      <section id="founders" className="mx-auto max-w-7xl px-4 sm:px-6 pb-14">
        <div className="rounded-[2rem] bg-[#F2E9D8] dark:bg-[#121C17] border border-[#135D3B]/10 dark:border-white/10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Founders Editorial Photo */}
          <div className="lg:col-span-4">
            <div className="overflow-hidden rounded-2xl border border-[#D99B26]/30 bg-[#135D3B]/10">
              <img
                src="/src/assets/images/founders_nutrizim_1794787941408.jpg"
                alt="Anita Musungo and Emmanuel Musungo, founders of NutriZim"
                referrerPolicy="no-referrer"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>

          {/* Middle: Founders Statement & Script Signature */}
          <div className="lg:col-span-5">
            <h2 className="font-display text-4xl sm:text-5xl font-black uppercase leading-[0.95] text-[#135D3B] dark:text-[#E5B84B]">
              HI, WE&apos;RE ANITA &amp; EMMANUEL.
            </h2>
            <p className="mt-2 font-display text-lg font-bold uppercase tracking-wide text-[#B7791F] dark:text-[#F0CA6C]">
              NutriZim Founders &amp; Nutrition Builders
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#385043] dark:text-slate-300">
              We built NutriZim in Zimbabwe so athletes, families, and coaches never have to guess
              the macros of sadza rezviyo, muboora, kapenta, or chicken dovi. Objective 100g/100ml
              math, zero calorie shaming.
            </p>
            <p className="mt-4 font-script text-3xl font-bold text-[#135D3B] dark:text-[#E5B84B]">
              Anita &amp; Emmanuel Musungo
            </p>
          </div>

          {/* Right: 5 Clean Capability Items matching Reference Icon List */}
          <div className="lg:col-span-3 space-y-3 border-t lg:border-t-0 lg:border-l border-[#135D3B]/15 dark:border-white/10 pt-5 lg:pt-0 lg:pl-7 text-sm font-medium text-[#112018] dark:text-slate-200">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#135D3B] text-[#E5B84B] shrink-0">
                <Camera className="w-4 h-4" />
              </span>
              <span>AI Plate Vision (gpt-4o)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D99B26] text-[#112018] shrink-0">
                <Scale className="w-4 h-4" />
              </span>
              <span>100g / 100ml Precision</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#135D3B] text-[#E5B84B] shrink-0">
                <Mic className="w-4 h-4" />
              </span>
              <span>English, Shona &amp; Ndebele</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D99B26] text-[#112018] shrink-0">
                <Barcode className="w-4 h-4" />
              </span>
              <span>Local Barcode Scanner</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#135D3B] text-[#E5B84B] shrink-0">
                <Database className="w-4 h-4" />
              </span>
              <span>200 Zimbabwean Foods</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: RICH GREEN SHOWCASE STRIP ("SELECTED FEATURES", matching orange "SELECTED WORKS") */}
      <section id="selected-features" className="bg-[#135D3B] py-12 sm:py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="font-display text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
              CORE <span className="text-[#E5B84B]">CAPABILITIES</span>
            </h2>
            <button
              type="button"
              onClick={onStartTracking}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#E5B84B] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#D99B26] transition-colors whitespace-nowrap"
            >
              Launch Workspace
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: AI Vision */}
            <div className="rounded-2xl bg-[#FAF4EA] text-[#112018] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7791F]">
                  gpt-4o Vision
                </p>
                <h3 className="font-display text-2xl font-black uppercase text-[#135D3B]">
                  PLATE SCANNER
                </h3>
                <p className="text-xs text-[#4C6357] mb-3">Sadza, Beef Stew &amp; Covo</p>
              </div>
              <div className="relative h-44 rounded-xl overflow-hidden bg-[#135D3B]/10">
                <img
                  src="/assets/aistudio/IMG_9207_f517fc44.jpeg"
                  alt="Zimbabwean sadza, braised beef stew, and sautéed covo greens"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={onStartTracking}
                  aria-label="Open AI Plate Scanner"
                  className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-full bg-[#135D3B] text-[#E5B84B] flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Portion Separation */}
            <div className="rounded-2xl bg-[#FAF4EA] text-[#112018] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7791F]">
                  100g Precision
                </p>
                <h3 className="font-display text-2xl font-black uppercase text-[#135D3B]">
                  DISH ISOLATION
                </h3>
                <p className="text-xs text-[#4C6357] mb-3">Rapoko, Kapenta &amp; Muboora</p>
              </div>
              <div className="relative h-44 rounded-xl overflow-hidden bg-[#135D3B]/10">
                <img
                  src="/src/assets/images/feature_scanner_plate_1794787941258.jpg"
                  alt="Finger millet sadza, kapenta, sugar beans, and muboora greens"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={onStartTracking}
                  aria-label="Open Dish Isolation"
                  className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-full bg-[#135D3B] text-[#E5B84B] flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 3: 100g / 100ml Engine */}
            <div className="rounded-2xl bg-[#FAF4EA] text-[#112018] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7791F]">
                  Standardized
                </p>
                <h3 className="font-display text-2xl font-black uppercase text-[#135D3B]">
                  100G / 100ML
                </h3>
                <p className="text-xs text-[#4C6357] mb-3">Macros, Fibre &amp; Vitamins</p>
              </div>
              <div className="relative h-44 rounded-xl bg-[#E8D5A5]/55 p-3.5 flex flex-col justify-between font-mono text-xs tabular-nums">
                <div className="space-y-1.5 text-[#112018]">
                  <div className="flex justify-between font-semibold">
                    <span>Kapenta (dried)</span>
                    <span>290 kcal</span>
                  </div>
                  <div className="flex justify-between text-[#135D3B]">
                    <span>Protein / 100g</span>
                    <span>58.0g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mopane (cooked)</span>
                    <span>40.0g P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maheu (100ml)</span>
                    <span>60 kcal</span>
                  </div>
                </div>
                <a
                  href="#food-database"
                  aria-label="Jump to food database"
                  className="self-end h-8 w-8 rounded-full bg-[#135D3B] text-[#E5B84B] flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Card 4: Trilingual Voice Coach */}
            <div className="rounded-2xl bg-[#FAF4EA] text-[#112018] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7791F]">
                  gpt-4o-mini Voice
                </p>
                <h3 className="font-display text-2xl font-black uppercase text-[#135D3B]">
                  SHONA &amp; NDEBELE
                </h3>
                <p className="text-xs text-[#4C6357] mb-3">Conversational Logging</p>
              </div>
              <div className="relative h-44 rounded-xl bg-[#135D3B] p-3.5 text-white flex flex-col justify-between">
                <div className="rounded-lg bg-white/10 p-2.5 text-xs leading-snug">
                  &ldquo;Ndodya 250g sadza rezviyo nechicken dovi&rdquo;
                </div>
                <div className="font-mono text-[11px] text-[#E5B84B] tabular-nums">
                  Logged: 630 kcal · 39.4g P
                </div>
                <button
                  type="button"
                  onClick={onStartTracking}
                  aria-label="Open Conversational Coach"
                  className="self-end h-8 w-8 rounded-full bg-[#E5B84B] text-[#112018] flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: SERVICES 2x3 GRID + EXPERIENCE BY THE NUMBERS 2x2 TILES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Brand Services / Platform Features */}
          <div className="lg:col-span-6 rounded-3xl bg-[#F2E9D8] dark:bg-[#121C17] border border-[#135D3B]/10 dark:border-white/10 p-7">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
              NUTRIZIM ENGINE
            </h2>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              {[
                {
                  title: 'AI Plate Scanning',
                  desc: 'Isolates sadza, stews, greens, and fats automatically from one photo.',
                  icon: Camera,
                },
                {
                  title: 'Voice Dictation',
                  desc: 'Web Speech API parsing across English, Shona, and Ndebele.',
                  icon: Mic,
                },
                {
                  title: '100g / 100ml Standard',
                  desc: 'Baseline density per 100g/ml shown alongside custom portions.',
                  icon: Scale,
                },
                {
                  title: 'Barcode Recognition',
                  desc: 'Instant camera barcode lookup for local retail beverages & foods.',
                  icon: Barcode,
                },
                {
                  title: 'Expenditure Analytics',
                  desc: 'Correlates body-weight trends with rolling caloric intake.',
                  icon: Sparkles,
                },
                {
                  title: 'EcoCash & Stripe',
                  desc: 'Free for first 10 users, then $25/mo via Stripe or 0789159982.',
                  icon: Smartphone,
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#135D3B] text-[#E5B84B] shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-bold text-[#112018] dark:text-white">{feat.title}</p>
                      <p className="text-xs text-[#4C6357] dark:text-slate-400 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: 2x2 Metric Tiles (Sage Green & Harvest Gold) */}
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B] mb-5">
              PRECISION BY THE NUMBERS
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#D8EADB] dark:bg-[#162C21] p-6 text-center">
                <p className="font-display text-4xl sm:text-5xl font-black text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                  {ZIMBABWE_FOOD_DB.length}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#264635] dark:text-slate-300">
                  Local Dishes Seeded
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2DFAA] dark:bg-[#2F2512] p-6 text-center">
                <p className="font-display text-4xl sm:text-5xl font-black text-[#8F6008] dark:text-[#E5B84B] tabular-nums">
                  100g/ml
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#5A4213] dark:text-slate-300">
                  Strict Standardization
                </p>
              </div>
              <div className="rounded-2xl bg-[#F2DFAA] dark:bg-[#2F2512] p-6 text-center">
                <p className="font-display text-4xl sm:text-5xl font-black text-[#8F6008] dark:text-[#E5B84B] tabular-nums">
                  {slotsRemaining}/10
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#5A4213] dark:text-slate-300">
                  Free Alpha Slots Left
                </p>
              </div>
              <div className="rounded-2xl bg-[#135D3B] p-6 text-center text-white">
                <p className="font-display text-4xl sm:text-5xl font-black text-[#E5B84B] tabular-nums">
                  $25/mo
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/90">
                  Pro Tier (User #11+)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: INTERACTIVE 100G/100ML ZIMBABWEAN DATABASE LEDGER */}
      <section id="food-database" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 border-t border-[#135D3B]/15 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              Pre-Seeded Local Ledger
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-[#135D3B] dark:text-white">
              ZIMBABWEAN 100G / 100ML DATABASE
            </h2>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#587264] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sadza, dovi, kapenta, muboora..."
              className="w-full min-h-[44px] rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] pl-10 pr-4 text-sm text-[#112018] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#135D3B]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-[#135D3B] text-white'
                : 'bg-white dark:bg-[#121C17] border border-[#135D3B]/15 dark:border-white/10 text-[#385043] dark:text-slate-300'
            }`}
          >
            All ({ZIMBABWE_FOOD_DB.length})
          </button>
          {FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#135D3B] text-white'
                  : 'bg-white dark:bg-[#121C17] border border-[#135D3B]/15 dark:border-white/10 text-[#385043] dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#135D3B]/10 dark:border-white/10 bg-[#F2E9D8] dark:bg-[#18251E] text-xs font-bold uppercase text-[#135D3B] dark:text-[#E5B84B]">
                <tr>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-3">Basis</th>
                  <th className="py-3 px-3 text-right">Kcal</th>
                  <th className="py-3 px-3 text-right">Protein</th>
                  <th className="py-3 px-3 text-right">Carbs</th>
                  <th className="py-3 px-3 text-right">Fat</th>
                  <th className="py-3 px-3 text-right">Fibre</th>
                  <th className="py-3 px-4">Key Vitamins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#135D3B]/10 dark:divide-white/5 font-mono text-xs tabular-nums">
                {filteredFoods.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FAF4EA] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 font-sans font-semibold text-sm text-[#112018] dark:text-white">
                      {item.food}
                      <span className="ml-2 text-xs font-normal text-[#587264] dark:text-slate-400">
                        · {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#587264] dark:text-slate-400">100{item.unit}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#112018] dark:text-white">
                      {item.kcal}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#135D3B] dark:text-[#34D399]">
                      {item.protein}g
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#B7791F] dark:text-[#E5B84B]">
                      {item.carbs}g
                    </td>
                    <td className="py-3 px-3 text-right text-[#4C6357] dark:text-slate-300">
                      {item.fat}g
                    </td>
                    <td className="py-3 px-3 text-right text-[#587264] dark:text-slate-400">
                      {item.fibre}g
                    </td>
                    <td className="py-3 px-4 font-sans text-[#385043] dark:text-slate-300">
                      {item.vitamins}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 6: EARLY ADOPTER QUOTES (Matching "CLIENT LOVE" 3-Card Row) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B] mb-6">
          COMMUNITY RESULTS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              quote:
                'Scanning sadza rezviyo and chicken dovi in seconds with exact 100g breakdowns saved me 20 minutes a day.',
              name: 'Tendai M.',
              role: 'Strength Coach, Harare',
            },
            {
              quote:
                'Speaking Shona into the voice logger and seeing kapenta protein totals instantly is a complete game changer.',
              name: 'Rumbidzai K.',
              role: 'Clinical Dietitian, Bulawayo',
            },
            {
              quote:
                'No red/green calorie guilt—just clean MacroFactor-style weight trends matched to real Zimbabwean food.',
              name: 'Tatenda N.',
              role: 'Endurance Runner, Mutare',
            },
          ].map((item, i) => (
            <div
              key={item.name}
              className={`rounded-2xl p-6 border ${
                i === 1
                  ? 'bg-[#D8EADB] dark:bg-[#162C21] border-[#135D3B]/15'
                  : 'bg-[#F2E9D8] dark:bg-[#121C17] border-[#D99B26]/20'
              }`}
            >
              <p className="font-display text-3xl font-black text-[#D99B26] leading-none">&ldquo;</p>
              <p className="mt-2 text-sm leading-relaxed text-[#112018] dark:text-slate-200">
                {item.quote}
              </p>
              <div className="mt-4 pt-3 border-t border-[#135D3B]/10 dark:border-white/10">
                <p className="text-xs font-bold uppercase text-[#135D3B] dark:text-[#E5B84B]">
                  {item.name}
                </p>
                <p className="text-xs text-[#4C6357] dark:text-slate-400">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: BOTTOM BOLD CTA + SUN EMBLEM + ECOCASH & CONTACT FOOTER (Matching Reference Bottom Block) */}
      <footer id="contact-footer" className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16">
        <div className="rounded-[2rem] bg-[#F2E9D8] dark:bg-[#121C17] border border-[#135D3B]/15 dark:border-white/10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Bold Condensed CTA Headline & Founders Contact */}
          <div className="lg:col-span-5">
            <h2 className="font-display text-5xl sm:text-6xl font-black uppercase leading-[0.88] text-[#135D3B] dark:text-[#EDF4EF]">
              LET&apos;S TRACK
              <span className="block font-script normal-case font-bold text-5xl sm:text-6xl text-[#D99B26] dark:text-[#E5B84B] mt-1">
                Something Nourishing!
              </span>
            </h2>

            <div className="mt-6 space-y-2 text-xs sm:text-sm text-[#385043] dark:text-slate-300">
              <p>
                Founded by <strong className="text-[#112018] dark:text-white">Anita Musungo</strong>{' '}
                &amp; <strong className="text-[#112018] dark:text-white">Emmanuel Musungo</strong>
              </p>
              <p className="flex items-center gap-2 font-mono font-semibold text-[#135D3B] dark:text-[#E5B84B]">
                <Phone className="w-4 h-4" />
                <a href="tel:+263783833106" className="hover:underline">
                  +263 78 383 3106
                </a>
              </p>
              <div className="pt-2">
                <a
                  href="/api/export-source-zip"
                  download="nutrizim-app.zip"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#135D3B]/25 dark:border-white/15 bg-white dark:bg-[#18251E] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#D99B26]" />
                  Download App Source (.zip)
                </a>
              </div>
            </div>
          </div>

          {/* Center: Botanical Gold & Green Sun Emblem */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="h-28 w-28 rounded-full bg-[#135D3B] flex items-center justify-center border-4 border-[#E5B84B]">
              <svg viewBox="0 0 64 64" className="w-16 h-16 text-[#E5B84B]" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="32" cy="32" r="11" />
                <path d="M32 6v9M32 49v9M6 32h9M49 32h9M13.6 13.6l6.4 6.4M44 44l6.4 6.4M50.4 13.6L44 20M20 44l-6.4 6.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right: EcoCash & Subscription Card */}
          <div className="lg:col-span-5 rounded-2xl bg-[#135D3B] p-6 text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-2xl font-black uppercase text-[#E5B84B]">
                ECOCASH &amp; PRO ACCESS
              </p>
              <span className="font-mono text-sm font-bold text-white">$25 / mo</span>
            </div>
            <p className="mt-2 text-xs text-white/85">
              First 10 users get free alpha access ({slotsRemaining} remaining). User #11+ activates
              via Stripe or EcoCash (*151#):
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#E5B84B]">
                  EcoCash Payment Number
                </span>
                <span className="font-mono text-lg font-bold tracking-wider tabular-nums">
                  0789159982
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyEcocash}
                className="rounded-full bg-[#E5B84B] px-3.5 py-1.5 text-xs font-bold text-[#112018] hover:bg-[#D99B26] transition-colors"
              >
                {ecoCopied ? 'Copied' : 'Copy Number'}
              </button>
            </div>
            <button
              type="button"
              onClick={onStartTracking}
              className="mt-4 w-full min-h-[44px] rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#135D3B] hover:bg-[#FAF4EA] transition-colors"
            >
              {isAuthenticated ? 'Enter Dashboard' : 'Start Tracking Now'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
