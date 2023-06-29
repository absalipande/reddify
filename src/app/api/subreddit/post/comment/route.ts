import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { CommentValidator } from '@/lib/validators/comment';
import { z } from 'zod';

export async function PATCH(req: Request) {
  try {
    // get the user session
    const session = await getAuthSession();

    // if unauthorized, return an error
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // parse the body
    const body = await req.json();
    const { postId, text, replyToId } = CommentValidator.parse(body);

    // if no exisiting vote, create a new one
    await db.comment.create({
      data: {
        text,
        postId,
        authorId: session.user.id,
        replyToId,
      },
    });

    return new Response('OK');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response('Something went wrong. Please try again later.', {
      status: 500,
    });
  }
}
