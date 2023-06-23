import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { PostValidator } from '@/lib/validators/post';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    // check if user is authenticated
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse the req.body using PostValidator
    const body = await req.json();
    const { title, content, subredditId } = PostValidator.parse(body);

    // verify if the user is subscribed first to the subreddit
    const existingSubscription = await db.subscription.findFirst({
      where: {
        subredditId,
        userId: session.user.id,
      },
    });

    // if the user is not subscribed, return an error response
    if (!existingSubscription) {
      return new Response('Subscribe to post', { status: 403 });
    }

    // create a new post in the database
    await db.post.create({
      data: {
        title,
        content,
        authorId: session.user.id,
        subredditId,
      },
    });

    return new Response('OK');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response(
      'Unable to post to subreddit right now. Please try again later.',
      { status: 500 }
    );
  }
}
