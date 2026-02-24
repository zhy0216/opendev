import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import { IUserRepository, type UserRepository } from '@repo/repository';
import type { ResponseType } from '@repo/types';

const getProfile = protectedProcedure.handler(async ({ context }): Promise<ResponseType<{ id: string; email: string; name: string | null; emailVerified: boolean }>> => {
  return {
    success: true,
    data: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
      emailVerified: context.user.emailVerified ?? false,
    },
  };
});

const updateProfile = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<{ id: string; email: string; name: string | null }>> => {
    const userRepo = getContainer().get<UserRepository>(IUserRepository);

    const updatedUser = await userRepo.update(context.user.id, {
      name: input.name,
    });

    if (!updatedUser) {
      return { success: false, error: 'Failed to update profile' };
    }

    return {
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    };
  });

export const userRouter = {
  getProfile,
  updateProfile,
};
