'use server'

import dbConnect from '@/lib/db/mongoose';
import { User } from '@/lib/db/schema';
import { setSession, hashPassword, comparePassword } from '@/lib/auth';

const ADMIN_EMAIL = 'admin@admin';
const LEGACY_ADMIN_EMAIL = 'admin';
const ADMIN_PASSWORD = 'yaycat123';

function normalizeLoginEmail(rawEmail: string) {
  return rawEmail.trim().toLowerCase();
}

function normalizeUsername(rawUsername: string) {
  return rawUsername.trim().toLowerCase();
}

async function ensureAdminUser() {
  let adminUser = await User.findOne({ email: ADMIN_EMAIL });

  if (!adminUser) {
    const legacyAdmin = await User.findOne({ email: LEGACY_ADMIN_EMAIL });

    if (legacyAdmin) {
      legacyAdmin.email = ADMIN_EMAIL;
      legacyAdmin.name = 'Admin';
      legacyAdmin.role = 'ADMIN';
      legacyAdmin.passwordHash = await hashPassword(ADMIN_PASSWORD);
      await legacyAdmin.save();
      return legacyAdmin;
    }

    adminUser = await User.create({
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      name: 'Admin',
      role: 'ADMIN',
    });

    return adminUser;
  }

  let shouldSave = false;
  const hasAdminPassword = await comparePassword(ADMIN_PASSWORD, adminUser.passwordHash);

  if (adminUser.role !== 'ADMIN') {
    adminUser.role = 'ADMIN';
    shouldSave = true;
  }

  if (adminUser.name !== 'Admin') {
    adminUser.name = 'Admin';
    shouldSave = true;
  }

  if (!hasAdminPassword) {
    adminUser.passwordHash = await hashPassword(ADMIN_PASSWORD);
    shouldSave = true;
  }

  if (shouldSave) {
    await adminUser.save();
  }

  return adminUser;
}

export async function signupAction(formData: FormData) {
  const role = formData.get('role') as string;
  const email = normalizeLoginEmail((formData.get('email') as string) || '');
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string;

  if (!email || !password || !firstName) return { error: 'Missing required fields' };
  if (email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL) {
    return { error: 'This email is reserved.' };
  }

  try {
    await dbConnect();
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username: email },
      ],
    });
    if (existingUser) {
      const existingRole =
        existingUser.role === 'EMPLOYER'
          ? 'employer'
          : existingUser.role === 'ADMIN'
            ? 'admin'
            : 'job seeker';
      return { error: `This email is already registered to a ${existingRole} account.` };
    }

    const passwordHash = await hashPassword(password);
    let name = `${firstName} ${lastName}`.trim();
    if (role === 'EMPLOYER' && companyName) {
      name = companyName; // For employers, company name is often more prominent
    }

    const newUser = await User.create({
      email,
      passwordHash,
      name,
      role: role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE',
    });

    await setSession({
      id: newUser.id,
      role: newUser.role,
      email: newUser.email,
      username: newUser.username || undefined,
    });
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to create user' };
  }

  return { success: true, redirectTo: '/' };
}

export async function loginAction(formData: FormData) {
  const identifier = normalizeLoginEmail(
    ((formData.get('identifier') as string) || (formData.get('email') as string) || '')
  );
  const password = formData.get('password') as string;

  if (!identifier || !password) return { error: 'Missing credentials' };

  try {
    await dbConnect();
    if (identifier === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        return { error: 'Invalid credentials' };
      }

      const adminUser = await ensureAdminUser();
      await setSession({
        id: adminUser.id,
        role: adminUser.role,
        email: adminUser.email,
        username: adminUser.username || undefined,
      });
      return { success: true, redirectTo: '/dashboard/admin' };
    }

    const username = normalizeUsername(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username },
      ],
    });
    
    if (!user) return { error: 'Invalid credentials' };

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return { error: 'Invalid credentials' };

    await setSession({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username || undefined,
    });
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to authenticate' };
  }

  return { success: true, redirectTo: '/' };
}

export async function logoutAction() {
  const { clearSession } = await import('@/lib/auth');
  await clearSession();
  const { redirect } = await import('next/navigation');
  redirect('/login');
}

export async function getAuthSession() {
  const { getSession } = await import('@/lib/auth');
  return await getSession();
}
