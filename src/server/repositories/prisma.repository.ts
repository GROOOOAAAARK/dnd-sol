import type { PrismaClient } from "@prisma/client/index";

import { Repository } from "./repository";

export type PrismaModelDelegate<
  TEntity,
  TWhereUnique,
  TWhere,
  TCreateInput,
  TUpdateInput,
  TOrderBy,
> = {
  findUnique(args: { where: TWhereUnique }): Promise<TEntity | null>;
  findMany(args?: { where?: TWhere; orderBy?: TOrderBy }): Promise<TEntity[]>;
  create(args: { data: TCreateInput }): Promise<TEntity>;
  update(args: {
    where: TWhereUnique;
    data: TUpdateInput;
  }): Promise<TEntity>;
  upsert(args: {
    where: TWhereUnique;
    create: TCreateInput;
    update: TUpdateInput;
  }): Promise<TEntity>;
  delete(args: { where: TWhereUnique }): Promise<TEntity>;
};

export abstract class PrismaRepository<
  TEntity,
  TWhereUnique,
  TWhere = TWhereUnique,
  TCreateInput = TEntity,
  TUpdateInput = Partial<TEntity>,
  TOrderBy = unknown,
> extends Repository<
  TEntity,
  TWhereUnique,
  TWhere,
  TCreateInput,
  TUpdateInput,
  TOrderBy
> {
  protected constructor(
    protected readonly prisma: PrismaClient,
    private readonly delegate: PrismaModelDelegate<
      TEntity,
      TWhereUnique,
      TWhere,
      TCreateInput,
      TUpdateInput,
      TOrderBy
    >
  ) {
    super();
  }

  findUnique(where: TWhereUnique) {
    return this.delegate.findUnique({ where });
  }

  findMany(args?: { where?: TWhere; orderBy?: TOrderBy }) {
    return this.delegate.findMany(args);
  }

  create(data: TCreateInput) {
    return this.delegate.create({ data });
  }

  update(where: TWhereUnique, data: TUpdateInput) {
    return this.delegate.update({ where, data });
  }

  upsert(args: {
    where: TWhereUnique;
    create: TCreateInput;
    update: TUpdateInput;
  }) {
    return this.delegate.upsert(args);
  }

  delete(where: TWhereUnique) {
    return this.delegate.delete({ where });
  }
}
