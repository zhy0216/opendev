import 'reflect-metadata';
import { type DbClient, organization, organizationInvite, organizationMember } from '@repo/db';
import { getInject, IDatabase, ITransaction } from '@repo/di';
import { and, type Column, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { inject, injectable, optional } from 'inversify';
import type { BaseRepository } from './base.repository';

export type Organization = typeof organization.$inferSelect;
export type OrganizationCreate = { name: string; slug: string; logo?: string };
export type OrganizationUpdate = Partial<Omit<OrganizationCreate, 'slug'>>;

export type OrganizationMember = typeof organizationMember.$inferSelect;
export type OrganizationMemberCreate = typeof organizationMember.$inferInsert;

export type OrganizationInvite = typeof organizationInvite.$inferSelect;
export type OrganizationInviteCreate = Omit<typeof organizationInvite.$inferInsert, 'id'>;

export abstract class IOrganizationRepository {
  abstract findById(id: string): Promise<Organization | undefined>;
  abstract findBySlug(slug: string): Promise<Organization | undefined>;
  abstract findAll(): Promise<Organization[]>;
  abstract findByUserId(userId: string): Promise<Organization[]>;
  abstract findOne(filter: Partial<Organization>): Promise<Organization | undefined>;
  abstract create(data: OrganizationCreate): Promise<Organization>;
  abstract update(id: string, data: OrganizationUpdate): Promise<Organization | undefined>;
  abstract delete(id: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
  abstract slugExists(slug: string): Promise<boolean>;
  abstract addMember(data: OrganizationMemberCreate): Promise<OrganizationMember>;
  abstract removeMember(organizationId: string, userId: string): Promise<boolean>;
  abstract findMembership(organizationId: string, userId: string): Promise<OrganizationMember | undefined>;
  abstract getMembers(organizationId: string): Promise<OrganizationMember[]>;
  abstract updateMemberRole(organizationId: string, userId: string, role: string): Promise<OrganizationMember | undefined>;
  abstract createInvite(data: OrganizationInviteCreate): Promise<OrganizationInvite>;
  abstract findInviteByToken(token: string): Promise<OrganizationInvite | undefined>;
  abstract deleteInvite(id: string): Promise<boolean>;
  abstract getPendingInvites(organizationId: string): Promise<OrganizationInvite[]>;
}

@injectable()
export class OrganizationRepository
  implements BaseRepository<Organization, OrganizationCreate, OrganizationUpdate>
{
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findById(id: string): Promise<Organization | undefined> {
    const result = await this.dbClient
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);
    return result[0];
  }

  async findBySlug(slug: string): Promise<Organization | undefined> {
    const result = await this.dbClient
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    return result[0];
  }

  async findAll(): Promise<Organization[]> {
    return await this.dbClient.select().from(organization);
  }

  async findByUserId(userId: string): Promise<Organization[]> {
    const result = await this.dbClient
      .select({ organization })
      .from(organization)
      .innerJoin(organizationMember, eq(organization.id, organizationMember.organizationId))
      .where(eq(organizationMember.userId, userId));
    return result.map((r) => r.organization);
  }

  async findOne(filter: Partial<Organization>): Promise<Organization | undefined> {
    const columns = getTableColumns(organization);
    const conditions: SQL[] = [];
    for (const [key, value] of Object.entries(filter)) {
      const column = columns[key as keyof typeof columns] as Column | undefined;
      if (column) {
        conditions.push(eq(column, value as string));
      }
    }

    if (conditions.length === 0) return undefined;

    const result = await this.dbClient
      .select()
      .from(organization)
      .where(and(...conditions))
      .limit(1);
    return result[0];
  }

  async create(data: OrganizationCreate): Promise<Organization> {
    const result = await this.dbClient
      .insert(organization)
      .values({ name: data.name, slug: data.slug, logo: data.logo })
      .returning();
    return result[0];
  }

  async update(id: string, data: OrganizationUpdate): Promise<Organization | undefined> {
    const result = await this.dbClient
      .update(organization)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organization.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(organization)
      .where(eq(organization.id, id))
      .returning();
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }

  async slugExists(slug: string): Promise<boolean> {
    const result = await this.findBySlug(slug);
    return result !== undefined;
  }

  // Member management
  async addMember(data: OrganizationMemberCreate): Promise<OrganizationMember> {
    const result = await this.dbClient
      .insert(organizationMember)
      .values(data)
      .returning();
    return result[0];
  }

  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | undefined> {
    const result = await this.dbClient
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .limit(1);
    return result[0];
  }

  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    return await this.dbClient
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.organizationId, organizationId));
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: string
  ): Promise<OrganizationMember | undefined> {
    const result = await this.dbClient
      .update(organizationMember)
      .set({ role })
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId)
        )
      )
      .returning();
    return result[0];
  }

  // Invite management
  async createInvite(data: OrganizationInviteCreate): Promise<OrganizationInvite> {
    const result = await this.dbClient
      .insert(organizationInvite)
      .values(data)
      .returning();
    return result[0];
  }

  async findInviteByToken(token: string): Promise<OrganizationInvite | undefined> {
    const result = await this.dbClient
      .select()
      .from(organizationInvite)
      .where(eq(organizationInvite.token, token))
      .limit(1);
    return result[0];
  }

  async deleteInvite(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(organizationInvite)
      .where(eq(organizationInvite.id, id))
      .returning();
    return result.length > 0;
  }

  async getPendingInvites(organizationId: string): Promise<OrganizationInvite[]> {
    return await this.dbClient
      .select()
      .from(organizationInvite)
      .where(eq(organizationInvite.organizationId, organizationId));
  }
}
