import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { PostVoteValidator } from '@/lib/validators/vote';
import { z } from 'zod';
import { CachedPost } from '@/types/redis';
import { redis } from '@/lib/redis';

const CACHE_AFTER_UPVOTES = 1;

export async function PATCH(req: Request) {
  try {
    // Get the user session
    const session = await getAuthSession();

    // Check if the user is authenticated
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { postId, voteType } = PostVoteValidator.parse(body);

    // Check if the user has already voted on this post
    const existingVote = await db.vote.findFirst({
      where: {
        userId: session.user.id,
        postId,
      },
    });

    // Retrieve the post details
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        author: true,
        votes: true,
      },
    });

    // Check if the post exists
    if (!post) {
      return new Response('Post not found', { status: 404 });
    }

    if (existingVote) {
      // if vote type is the same as existing vote ('UP', 'DOWN'), delete the vote
      if (existingVote.type === voteType) {
        await db.vote.delete({
          where: {
            userId_postId: {
              postId,
              userId: session.user.id,
            },
          },
        });

        // Recount the votes
        const votesAmount = post.votes.reduce((acc, vote) => {
          if (vote.type === 'UP') return acc + 1;
          if (vote.type === 'DOWN') return acc - 1;
          return acc;
        }, 0);

        if (votesAmount >= CACHE_AFTER_UPVOTES) {
          const cachedPayload: CachedPost = {
            authorUsername: post.author.username ?? '',
            content: JSON.stringify(post.content),
            id: post.id,
            title: post.title,
            currentVote: null,
            createdAt: post.createdAt,
          };

          await redis.hset(`post:${postId}`, cachedPayload); // store the post as a hash
        }

        return new Response('OK');
      }

      // If the voteType is different, then update the vote
      await db.vote.update({
        where: {
          userId_postId: {
            postId,
            userId: session.user.id,
          },
        },
        data: {
          type: voteType,
        },
      });

      // Recount the votes
      const votesAmount = post.votes.reduce((acc, vote) => {
        if (vote.type === 'UP') return acc + 1;
        if (vote.type === 'DOWN') return acc - 1;
        return acc;
      }, 0);

      if (votesAmount >= CACHE_AFTER_UPVOTES) {
        const cachedPayload: CachedPost = {
          authorUsername: post.author.username ?? '',
          content: JSON.stringify(post.content),
          id: post.id,
          title: post.title,
          currentVote: voteType,
          createdAt: post.createdAt,
        };

        await redis.hset(`post:${postId}`, cachedPayload); // store the post as a hash
      }

      return new Response('OK');
    }

    // If no existing vote, create one
    await db.vote.create({
      data: {
        type: voteType,
        userId: session.user.id,
        postId,
      },
    });

    // Recount the votes
    const votesAmount = post.votes.reduce((acc, vote) => {
      if (vote.type === 'UP') return acc + 1;
      if (vote.type === 'DOWN') return acc - 1;
      return acc;
    }, 0);

    if (votesAmount >= CACHE_AFTER_UPVOTES) {
      const cachedPayload: CachedPost = {
        authorUsername: post.author.username ?? '',
        content: JSON.stringify(post.content),
        id: post.id,
        title: post.title,
        currentVote: voteType,
        createdAt: post.createdAt,
      };

      await redis.hset(`post:${postId}`, cachedPayload); // store the post as a hash
    }

    return new Response('OK');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response(
      'An error occurred while processing the vote. Please try again later.',
      { status: 500 }
    );
  }
}
