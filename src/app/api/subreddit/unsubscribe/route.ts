import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { SubredditSubscriptionValidator } from '@/lib/validators/subreddit';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    // check first if the session is authorized
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { subredditId } = SubredditSubscriptionValidator.parse(body);

    // check if the user is already subscribed to the subreddit
    const existingSubscription = await db.subscription.findFirst({
      where: {
        subredditId,
        userId: session.user.id,
      },
    });

    if (!existingSubscription) {
      return new Response('User is not subscribed to this subreddit', {
        status: 400,
      });
    }

    // create subreddit and associate it with the user
    await db.subscription.delete({
      where: {
        userId_subredditId: {
          subredditId,
          userId: session.user.id,
        },
      },
    });

    return new Response(subredditId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response(
      'Could not unsubscribe from subreddit at this time. Please try again.',
      { status: 500 }
    );
  }
}
