import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { Response } from '@/lib/db/schema';
import mongoose from 'mongoose';
import { ensureChatForResponseId, listChatsSerialized } from '@/lib/chat/chat-service';
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit';

const ensureLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 30 });

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
    const chats = await listChatsSerialized({
      id: session.user.id,
      role,
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('[chats GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureLimiter(session.user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const applicationId = body.applicationId as string | undefined;
    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return NextResponse.json({ error: 'Invalid applicationId' }, { status: 400 });
    }

    await dbConnect();
    const app = await Response.findById(applicationId).populate('vacancyId').lean() as any;
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const vacancy = app.vacancyId as any;
    if (!vacancy) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 });
    }

    const employerId = vacancy.employerId?.toString();
    const employeeId = app.userId?.toString();

    if (session.user.role === 'EMPLOYEE') {
      if (employeeId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user.role === 'EMPLOYER') {
      if (employerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureChatForResponseId(applicationId);

    const { Chat } = await import('@/lib/db/schema');
    const chat = await Chat.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      vacancyId: vacancy._id,
    }).lean();

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chatId: chat._id.toString() });
  } catch (error) {
    console.error('[chats POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
