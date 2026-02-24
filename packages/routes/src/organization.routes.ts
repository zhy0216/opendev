import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import { IOrganizationRepository, type OrganizationRepository, type Organization, type OrganizationMember } from '@repo/repository';
import type { ResponseType } from '@repo/types';
import { ORPCError } from '@orpc/server';
import { randomBytes } from 'crypto';

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const list = protectedProcedure.handler(async ({ context }): Promise<ResponseType<Organization[]>> => {
  const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);
  const organizations = await orgRepo.findByUserId(context.user.id);
  return { success: true, data: organizations };
});

const get = protectedProcedure
  .input(z.object({ organizationId: z.string().uuid() }))
  .handler(async ({ input, context }): Promise<ResponseType<Organization>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership) {
      throw new ORPCError('FORBIDDEN', { message: 'You do not have access to this organization' });
    }

    const organization = await orgRepo.findById(input.organizationId);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    return { success: true, data: organization };
  });

const create = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, 'Name is required'),
      slug: z.string().min(1).optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<Organization>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const slug = input.slug || slugify(input.name);

    // Check if slug exists
    if (await orgRepo.slugExists(slug)) {
      return { success: false, error: 'An organization with this slug already exists' };
    }

    const organization = await orgRepo.create({
      name: input.name,
      slug,
    });

    // Add creator as owner
    await orgRepo.addMember({
      organizationId: organization.id,
      userId: context.user.id,
      role: 'owner',
    });

    return { success: true, data: organization };
  });

const update = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid(),
      name: z.string().min(1).optional(),
      logo: z.string().url().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<Organization>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ORPCError('FORBIDDEN', { message: 'Only owners and admins can update the organization' });
    }

    const { organizationId, ...updateData } = input;
    const organization = await orgRepo.update(organizationId, updateData);

    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    return { success: true, data: organization };
  });

const deleteOrganization = protectedProcedure
  .input(z.object({ organizationId: z.string().uuid() }))
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership || membership.role !== 'owner') {
      throw new ORPCError('FORBIDDEN', { message: 'Only owners can delete the organization' });
    }

    const deleted = await orgRepo.delete(input.organizationId);
    if (!deleted) {
      return { success: false, error: 'Organization not found' };
    }

    return { success: true, data: true };
  });

const getMembers = protectedProcedure
  .input(z.object({ organizationId: z.string().uuid() }))
  .handler(async ({ input, context }): Promise<ResponseType<OrganizationMember[]>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership) {
      throw new ORPCError('FORBIDDEN', { message: 'You do not have access to this organization' });
    }

    const members = await orgRepo.getMembers(input.organizationId);
    return { success: true, data: members };
  });

const inviteMember = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(['admin', 'member']).default('member'),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<{ token: string }>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ORPCError('FORBIDDEN', { message: 'Only owners and admins can invite members' });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await orgRepo.createInvite({
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      token,
      expiresAt,
    });

    // TODO: Send invitation email via EmailService

    return { success: true, data: { token } };
  });

const removeMember = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid(),
      userId: z.string(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    const orgRepo = getContainer().get<OrganizationRepository>(IOrganizationRepository);

    const membership = await orgRepo.findMembership(input.organizationId, context.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ORPCError('FORBIDDEN', { message: 'Only owners and admins can remove members' });
    }

    // Prevent removing the last owner
    if (input.userId === context.user.id && membership.role === 'owner') {
      const members = await orgRepo.getMembers(input.organizationId);
      const owners = members.filter(m => m.role === 'owner');
      if (owners.length === 1) {
        return { success: false, error: 'Cannot remove the last owner' };
      }
    }

    const removed = await orgRepo.removeMember(input.organizationId, input.userId);
    return { success: true, data: removed };
  });

export const organizationRouter = {
  list,
  get,
  create,
  update,
  delete: deleteOrganization,
  getMembers,
  inviteMember,
  removeMember,
};
