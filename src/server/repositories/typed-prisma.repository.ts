import type { PrismaClient } from "@prisma/client/index";

import {
  PrismaModelDelegate,
  PrismaRepository,
} from "./prisma.repository";

export abstract class TypedPrismaRepository<
  TDomainEntity,
  TPersistedEntity,
  TWhereUnique,
  TWhere = TWhereUnique,
  TCreateInput = TPersistedEntity,
  TUpdateInput = Partial<TPersistedEntity>,
  TOrderBy = unknown,
> {
  protected readonly repository: PrismaRepository<
    TPersistedEntity,
    TWhereUnique,
    TWhere,
    TCreateInput,
    TUpdateInput,
    TOrderBy
  >;

  protected constructor(
    protected readonly prisma: PrismaClient,
    delegate: PrismaModelDelegate<
      TPersistedEntity,
      TWhereUnique,
      TWhere,
      TCreateInput,
      TUpdateInput,
      TOrderBy
    >
  ) {
    this.repository = new DelegatePrismaRepository(prisma, delegate);
  }

  protected abstract toDomain(row: TPersistedEntity): TDomainEntity;
}

class DelegatePrismaRepository<
  TEntity,
  TWhereUnique,
  TWhere,
  TCreateInput,
  TUpdateInput,
  TOrderBy,
> extends PrismaRepository<
  TEntity,
  TWhereUnique,
  TWhere,
  TCreateInput,
  TUpdateInput,
  TOrderBy
> {
  constructor(
    prisma: PrismaClient,
    delegate: PrismaModelDelegate<
      TEntity,
      TWhereUnique,
      TWhere,
      TCreateInput,
      TUpdateInput,
      TOrderBy
    >
  ) {
    super(prisma, delegate);
  }
}
