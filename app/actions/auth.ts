'use server'

import dbConnect from '@/lib/db/mongoose';
import { User } from '@/lib/db/schema';
import { setSession, hashPassword, comparePassword } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function signupAction(formData: FormData) {
  const role = formData.get('role') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string;

  if (!email || !password || !firstName) return { error: 'Missing required fields' };

  try {
    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) return { error: 'Email already in use' };

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

    await setSession({ id: newUser.id, role: newUser.role, email: newUser.email });
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to create user' };
  }

  redirect('/login');
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) return { error: 'Missing credentials' };

  let userRole = '';
  try {
    await dbConnect();
    const user = await User.findOne({ email });
    
    if (!user) return { error: 'Invalid credentials' };

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return { error: 'Invalid credentials' };

    await setSession({ id: user.id, role: user.role, email: user.email });
    userRole = user.role;
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to authenticate' };
  }

  redirect('/');
}

export async function logoutAction() {
  const { clearSession } = await import('@/lib/auth');
  await clearSession();
  redirect('/login');
}

export async function getAuthSession() {
  const { getSession } = await import('@/lib/auth');
  return await getSession();
}
