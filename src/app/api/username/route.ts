import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { UsernameValidator } from '@/lib/validators/username';
import { z } from 'zod';

export async function PATCH(req: Request) {
  try {
    // get the user session
    const session = await getAuthSession();

    // if not authorize, then return an error
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // parse the body
    const body = await req.json();
    const { name } = UsernameValidator.parse(body);

    // check if username is taken
    const username = await db.user.findFirst({
      where: {
        username: name,
      },
    });

    if (username) {
      return new Response('Username is already taken', { status: 409 });
    }

    // update username
    await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        username: name,
      },
    });

    return new Response('OK');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response(
      'Could not update username at this time. Please try again later.',
      {
        status: 500,
      }
    );
  }
}
