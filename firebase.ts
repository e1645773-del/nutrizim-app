import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import {
  LOCAL_GUEST_UID,
  activateLocalSubscription,
  addLocalFoodLogsBatch,
  deleteLocalFoodLog,
  isLocalUid,
  saveLocalCoachMessage,
  saveLocalDailyCheckIn,
  saveLocalHydrationLog,
  saveLocalMealReminderSettings,
  saveLocalWeightLog,
  subscribeLocalAppStats,
  subscribeLocalCoachMessages,
  subscribeLocalDailyCheckIns,
  subscribeLocalFoodLogs,
  subscribeLocalHydrationLog,
  subscribeLocalMealReminderSettings,
  subscribeLocalUserProfile,
  subscribeLocalWeightLogs,
  syncLocalUserStreakSummary,
  updateLocalFoodLogPortion,
  updateLocalUserTargets,
} from './localStorageStore';

export { LOCAL_GUEST_UID, getOrCreateLocalProfile, isLocalUid } from './localStorageStore';

interface RawFirebaseConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const configModules = import.meta.glob('../../firebase-applet-config.json', {
  eager: true,
}) as Record<string, { default?: RawFirebaseConfig } | RawFirebaseConfig>;

const rawJsonConfig = Object.values(configModules)[0];
const fileConfig: RawFirebaseConfig =
  rawJsonConfig && 'default' in rawJsonConfig && rawJsonConfig.default
    ? rawJsonConfig.default
    : (rawJsonConfig as RawFirebaseConfig) || {};

const resolvedConfig: RawFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || fileConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || fileConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || fileConfig.projectId,
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || fileConfig.storageBucket,
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ||
    fileConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || fileConfig.appId,
  firestoreDatabaseId:
    (import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined) ||
    fileConfig.firestoreDatabaseId,
};

function hasValidConfigValue(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.length > 0 &&
    trimmed !== 'remixed-project-id' &&
    !trimmed.startsWith('MY_')
  );
}

export const isFirebaseConfigured = Boolean(
  hasValidConfigValue(resolvedConfig.apiKey) &&
    hasValidConfigValue(resolvedConfig.projectId) &&
    hasValidConfigValue(resolvedConfig.appId)
);

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(resolvedConfig as Record<string, string>);
    firestoreInstance = resolvedConfig.firestoreDatabaseId
      ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
      : getFirestore(app);
    authInstance = getAuth(app);
  } catch (err) {
    console.warn(
      'Firebase initialization skipped; falling back to localStorage persistence:',
      err instanceof Error ? err.message : err
    );
    app = null;
    firestoreInstance = null;
    authInstance = null;
  }
}

export const db = firestoreInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'app_stats', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline — local browser storage remains active.');
    }
  }
}

export interface AppStats {
  totalRegisteredUsers: number;
  alphaCap: number;
}

export type UserTier = 'alpha_free' | 'pending_payment' | 'premium_paid';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userNumber: number;
  tier: UserTier;
  paymentMethod: 'alpha' | 'stripe' | 'ecocash' | 'none';
  ecocashRef?: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFibre: number;
  currentStreak?: number;
  longestStreak?: number;
  lastCheckInDate?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FoodLogEntry {
  id: string;
  userId: string;
  dateKey: string;
  mealGroup: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  foodId: number;
  foodName: string;
  unit: 'g' | 'ml';
  portionAmount: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  vitamins: string;
  source: 'camera' | 'chat' | 'barcode' | 'manual' | 'voice';
  createdAt?: Timestamp;
}

export interface WeightLogEntry {
  id: string;
  userId: string;
  dateKey: string;
  weightKg: number;
  note: string;
}

export interface CoachMessageEntry {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Timestamp;
}

export interface DailyCheckInEntry {
  id: string;
  userId: string;
  dateKey: string;
  source: 'meal' | 'manual';
  createdAt?: Timestamp;
}

export interface HydrationLogEntry {
  id: string;
  userId: string;
  dateKey: string;
  glasses: number;
  goalGlasses: number;
  glassMl: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MealReminderSettings {
  id: string;
  userId: string;
  enabled: boolean;
  smartSkipLogged: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  snackTime: string;
  snackEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export function subscribeToAppStats(callback: (stats: AppStats) => void): Unsubscribe {
  if (!db) {
    return subscribeLocalAppStats(callback);
  }
  const ref = doc(db, 'app_stats', 'global');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          totalRegisteredUsers: Number(data.totalRegisteredUsers ?? 0),
          alphaCap: Number(data.alphaCap ?? 10),
        });
      } else {
        callback({ totalRegisteredUsers: 0, alphaCap: 10 });
      }
    },
    (error) => {
      console.warn('App stats read warning:', error.message);
      callback({ totalRegisteredUsers: 0, alphaCap: 10 });
    }
  );
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth is not configured.');
  }
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  if (!db || isLocalUid(user.uid)) {
    throw new Error('Firestore database unavailable.');
  }
  const userRef = doc(db, 'users', user.uid);
  const statsRef = doc(db, 'app_stats', 'global');

  try {
    return await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }

      const statsSnap = await tx.get(statsRef);
      const currentCount = statsSnap.exists()
        ? Number(statsSnap.data().totalRegisteredUsers ?? 0)
        : 0;
      const nextNumber = currentCount + 1;
      const isAlpha = nextNumber <= 10;

      tx.set(statsRef, {
        totalRegisteredUsers: nextNumber,
        alphaCap: 10,
        updatedAt: serverTimestamp(),
      });

      const profilePayload = {
        uid: user.uid,
        email: (user.email || `${user.uid}@nutrizim.app`).slice(0, 254),
        displayName: (user.displayName || user.email?.split('@')[0] || 'NutriZim Member').slice(0, 100),
        userNumber: nextNumber,
        tier: isAlpha ? 'alpha_free' : 'pending_payment',
        paymentMethod: isAlpha ? 'alpha' : 'none',
        targetKcal: 2200,
        targetProtein: 150,
        targetCarbs: 235,
        targetFat: 70,
        targetFibre: 32,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(userRef, profilePayload);

      return {
        ...profilePayload,
        createdAt: undefined,
        updatedAt: undefined,
      } as UserProfile;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalUserProfile(callback);
  }
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function activateSubscription(
  uid: string,
  method: 'stripe' | 'ecocash',
  ecocashRef?: string
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    activateLocalSubscription(method, ecocashRef);
    return;
  }
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      tier: 'premium_paid',
      paymentMethod: method,
      updatedAt: serverTimestamp(),
    };
    if (ecocashRef) {
      payload.ecocashRef = ecocashRef.slice(0, 80);
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserTargets(
  uid: string,
  targets: {
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetFibre: number;
  }
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    updateLocalUserTargets(targets);
    return;
  }
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      targetKcal: Math.max(800, Math.min(8000, Math.round(targets.targetKcal))),
      targetProtein: Math.max(20, Math.min(600, Math.round(targets.targetProtein))),
      targetCarbs: Math.max(0, Math.min(1200, Math.round(targets.targetCarbs))),
      targetFat: Math.max(10, Math.min(400, Math.round(targets.targetFat))),
      targetFibre: Math.max(0, Math.min(150, Math.round(targets.targetFibre))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToFoodLogs(
  uid: string,
  callback: (logs: FoodLogEntry[]) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalFoodLogs(callback);
  }
  const path = `users/${uid}/food_logs`;
  const q = query(
    collection(db, 'users', uid, 'food_logs'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(500)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: FoodLogEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FoodLogEntry, 'id'>),
      }));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function addFoodLogsBatch(
  uid: string,
  entries: Array<Omit<FoodLogEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    addLocalFoodLogsBatch(entries);
    return;
  }
  const path = `users/${uid}/food_logs`;
  try {
    const batch = writeBatch(db);
    for (const entry of entries) {
      const newRef = doc(collection(db, 'users', uid, 'food_logs'));
      batch.set(newRef, {
        userId: uid,
        dateKey: entry.dateKey,
        mealGroup: entry.mealGroup,
        foodId: Math.max(0, Math.round(entry.foodId)),
        foodName: entry.foodName.slice(0, 140),
        unit: entry.unit === 'ml' ? 'ml' : 'g',
        portionAmount: Math.max(1, Math.min(10000, Math.round(entry.portionAmount))),
        kcalPer100: Math.max(0, Math.min(1200, Number(entry.kcalPer100))),
        proteinPer100: Math.max(0, Math.min(120, Number(entry.proteinPer100))),
        carbsPer100: Math.max(0, Math.min(120, Number(entry.carbsPer100))),
        fatPer100: Math.max(0, Math.min(120, Number(entry.fatPer100))),
        fibrePer100: Math.max(0, Math.min(120, Number(entry.fibrePer100))),
        vitamins: (entry.vitamins || 'Balanced').slice(0, 120),
        source: entry.source,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFoodLogPortion(
  uid: string,
  logId: string,
  portionAmount: number,
  mealGroup: FoodLogEntry['mealGroup']
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    updateLocalFoodLogPortion(logId, portionAmount, mealGroup);
    return;
  }
  const path = `users/${uid}/food_logs/${logId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'food_logs', logId), {
      portionAmount: Math.max(1, Math.min(10000, Math.round(portionAmount))),
      mealGroup,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFoodLog(uid: string, logId: string): Promise<void> {
  if (!db || isLocalUid(uid)) {
    deleteLocalFoodLog(logId);
    return;
  }
  const path = `users/${uid}/food_logs/${logId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'food_logs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToWeightLogs(
  uid: string,
  callback: (logs: WeightLogEntry[]) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalWeightLogs(callback);
  }
  const path = `users/${uid}/weight_logs`;
  const q = query(
    collection(db, 'users', uid, 'weight_logs'),
    where('userId', '==', uid),
    orderBy('dateKey', 'asc'),
    limit(90)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: WeightLogEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WeightLogEntry, 'id'>),
      }));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveWeightLog(
  uid: string,
  dateKey: string,
  weightKg: number,
  note: string,
  existingId?: string
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    saveLocalWeightLog(dateKey, weightKg, note, existingId);
    return;
  }
  const docId = existingId || dateKey;
  const path = `users/${uid}/weight_logs/${docId}`;
  try {
    const ref = doc(db, 'users', uid, 'weight_logs', docId);
    if (existingId) {
      await updateDoc(ref, {
        weightKg: Math.max(20, Math.min(400, Math.round(weightKg * 10) / 10)),
        note: note.slice(0, 240),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        dateKey,
        weightKg: Math.max(20, Math.min(400, Math.round(weightKg * 10) / 10)),
        note: note.slice(0, 240),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToCoachMessages(
  uid: string,
  callback: (msgs: CoachMessageEntry[]) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalCoachMessages(callback);
  }
  const path = `users/${uid}/coach_messages`;
  const q = query(
    collection(db, 'users', uid, 'coach_messages'),
    where('userId', '==', uid),
    orderBy('createdAt', 'asc'),
    limit(60)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: CoachMessageEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CoachMessageEntry, 'id'>),
      }));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveCoachMessage(
  uid: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    saveLocalCoachMessage(role, content);
    return;
  }
  const path = `users/${uid}/coach_messages`;
  try {
    await addDoc(collection(db, 'users', uid, 'coach_messages'), {
      userId: uid,
      role,
      content: content.slice(0, 4000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToDailyCheckIns(
  uid: string,
  callback: (checkIns: DailyCheckInEntry[]) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalDailyCheckIns(callback);
  }
  const path = `users/${uid}/daily_checkins`;
  const q = query(
    collection(db, 'users', uid, 'daily_checkins'),
    where('userId', '==', uid),
    orderBy('dateKey', 'desc'),
    limit(180)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: DailyCheckInEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DailyCheckInEntry, 'id'>),
      }));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveDailyCheckIn(
  uid: string,
  dateKey: string,
  source: 'meal' | 'manual' = 'manual'
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    saveLocalDailyCheckIn(dateKey, source);
    return;
  }
  const path = `users/${uid}/daily_checkins/${dateKey}`;
  try {
    const ref = doc(db, 'users', uid, 'daily_checkins', dateKey);
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    await setDoc(ref, {
      userId: uid,
      dateKey,
      source,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncUserStreakSummary(
  uid: string,
  currentStreak: number,
  longestStreak: number,
  lastCheckInDate: string
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    syncLocalUserStreakSummary(currentStreak, longestStreak, lastCheckInDate);
    return;
  }
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      currentStreak: Math.max(0, Math.min(10000, Math.round(currentStreak))),
      longestStreak: Math.max(0, Math.min(10000, Math.round(longestStreak))),
      lastCheckInDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToHydrationLog(
  uid: string,
  dateKey: string,
  callback: (entry: HydrationLogEntry | null) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalHydrationLog(dateKey, callback);
  }
  const path = `users/${uid}/hydration_logs/${dateKey}`;
  return onSnapshot(
    doc(db, 'users', uid, 'hydration_logs', dateKey),
    (snap) => {
      if (snap.exists()) {
        callback({
          id: snap.id,
          ...(snap.data() as Omit<HydrationLogEntry, 'id'>),
        });
      } else {
        callback(null);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function saveHydrationLog(
  uid: string,
  dateKey: string,
  glasses: number,
  goalGlasses: number,
  glassMl = 250
): Promise<void> {
  if (!db || isLocalUid(uid)) {
    saveLocalHydrationLog(dateKey, glasses, goalGlasses, glassMl);
    return;
  }
  const path = `users/${uid}/hydration_logs/${dateKey}`;
  const cleanGlasses = Math.max(0, Math.min(40, Math.round(glasses)));
  const cleanGoal = Math.max(1, Math.min(30, Math.round(goalGlasses)));
  const cleanGlassMl = Math.max(50, Math.min(1000, Math.round(glassMl)));

  try {
    const ref = doc(db, 'users', uid, 'hydration_logs', dateKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        glasses: cleanGlasses,
        goalGlasses: cleanGoal,
        glassMl: cleanGlassMl,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        dateKey,
        glasses: cleanGlasses,
        goalGlasses: cleanGoal,
        glassMl: cleanGlassMl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function sanitizeTimeHHMM(value: string, fallback: string): string {
  const trimmed = (value || '').trim();
  return HHMM_REGEX.test(trimmed) ? trimmed : fallback;
}

export function subscribeToMealReminderSettings(
  uid: string,
  callback: (settings: MealReminderSettings | null) => void
): Unsubscribe {
  if (!db || isLocalUid(uid)) {
    return subscribeLocalMealReminderSettings(callback);
  }
  const path = `users/${uid}/reminder_settings/meal_reminders`;
  return onSnapshot(
    doc(db, 'users', uid, 'reminder_settings', 'meal_reminders'),
    (snap) => {
      if (snap.exists()) {
        callback({
          id: snap.id,
          ...(snap.data() as Omit<MealReminderSettings, 'id'>),
        });
      } else {
        callback(null);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function saveMealReminderSettings(
  uid: string,
  settings: {
    enabled: boolean;
    smartSkipLogged: boolean;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
    snackTime: string;
    snackEnabled: boolean;
  }
): Promise<void> {
  const payload = {
    enabled: Boolean(settings.enabled),
    smartSkipLogged: Boolean(settings.smartSkipLogged),
    breakfastTime: sanitizeTimeHHMM(settings.breakfastTime, '08:00'),
    lunchTime: sanitizeTimeHHMM(settings.lunchTime, '13:00'),
    dinnerTime: sanitizeTimeHHMM(settings.dinnerTime, '19:00'),
    snackTime: sanitizeTimeHHMM(settings.snackTime, '16:00'),
    snackEnabled: Boolean(settings.snackEnabled),
  };

  if (!db || isLocalUid(uid)) {
    saveLocalMealReminderSettings(payload);
    return;
  }

  const path = `users/${uid}/reminder_settings/meal_reminders`;

  try {
    const ref = doc(db, 'users', uid, 'reminder_settings', 'meal_reminders');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
