'use server'

import dbConnect from '@/lib/db/mongoose';
import { User } from '@/lib/db/schema';
import { setSession, hashPassword, comparePassword } from '@/lib/auth';

export async function signupAction(formData: FormData) {
  const role = formData.get('role') as string;
  const email = ((formData.get('email') as string) || '').trim().toLowerCase();
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string;

  if (formData.get('termsAccepted') !== 'true') {
    return { error: 'You must accept the Terms of Service and Privacy Policy.' };
  }

  if (!email || !password || !firstName) return { error: 'Missing required fields' };

  try {
    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existingRole = existingUser.role === 'EMPLOYER' ? 'employer' : 'job seeker';
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

    await setSession({ id: newUser.id, role: newUser.role, email: newUser.email });
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to create user' };
  }

  return { success: true, redirectTo: '/' };
}

export async function loginAction(formData: FormData) {
  const identifier = ((formData.get('email') as string) || '').trim();
  const password = formData.get('password') as string;

  if (!identifier || !password) return { error: 'Missing credentials' };

  try {
    await dbConnect();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { name: identifier }
      ]
    });

    if (!user) return { error: 'Invalid credentials' };

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return { error: 'Invalid credentials' };

    await setSession({ id: user.id, role: user.role, email: user.email });
    return {
      success: true,
      redirectTo: user.role === 'ADMIN' ? '/admin' : '/',
    };
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to authenticate' };
  }
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

export async function getGoogleSignupPendingAction(): Promise<
  { email: string; name: string } | { error: string }
> {
  const { cookies } = await import('next/headers');
  const { verifyGooglePendingToken } = await import('@/lib/google-pending-signup');
  const cookieStore = await cookies();
  const token = cookieStore.get('google_signup_pending')?.value;
  if (!token) return { error: 'no_session' };
  const data = await verifyGooglePendingToken(token);
  if (!data) return { error: 'invalid_or_expired' };
  return { email: data.email, name: data.name };
}

export async function completeGoogleSignupAction(formData: FormData) {
  const { cookies } = await import('next/headers');
  const { verifyGooglePendingToken } = await import('@/lib/google-pending-signup');

  const cookieStore = await cookies();
  const token = cookieStore.get('google_signup_pending')?.value;
  if (!token) {
    return { error: 'Сессия регистрации истекла. Попробуйте войти через Google снова.' };
  }
  const pending = await verifyGooglePendingToken(token);
  if (!pending) {
    return { error: 'Ссылка регистрации недействительна или истекла.' };
  }

  if (formData.get('termsAccepted') !== 'true') {
    return { error: 'Необходимо принять условия Terms of Service и Privacy Policy.' };
  }

  const role = formData.get('role') as string;
  if (role !== 'EMPLOYEE' && role !== 'EMPLOYER') {
    return { error: 'Выберите роль: соискатель или работодатель.' };
  }

  const companyName = ((formData.get('companyName') as string) || '').trim();
  if (role === 'EMPLOYER' && !companyName) {
    return { error: 'Укажите название компании.' };
  }

  try {
    await dbConnect();
    const existingUser = await User.findOne({ email: pending.email });
    if (existingUser) {
      return {
        error:
          'Аккаунт с этим email уже существует. Войдите через логин и пароль или используйте другой Google-аккаунт.',
      };
    }

    const passwordHash = await hashPassword(crypto.randomUUID());
    const displayName =
      role === 'EMPLOYER' && companyName
        ? companyName
        : pending.name || pending.email.split('@')[0] || pending.email;

    const newUser = await User.create({
      email: pending.email,
      passwordHash,
      name: displayName,
      role: role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE',
    });

    cookieStore.delete('google_signup_pending');
    await setSession({ id: newUser.id, role: newUser.role, email: newUser.email });
  } catch (err: any) {
    console.error(err);
    return { error: 'Ошибка при завершении регистрации.' };
  }

  return { success: true, redirectTo: '/' };
}
