export abstract class Repository<
  TEntity,
  TWhereUnique,
  TWhere = TWhereUnique,
  TCreateInput = TEntity,
  TUpdateInput = Partial<TEntity>,
  TOrderBy = unknown,
> {
  abstract findUnique(where: TWhereUnique): Promise<TEntity | null>;

  abstract findMany(args?: {
    where?: TWhere;
    orderBy?: TOrderBy;
  }): Promise<TEntity[]>;

  abstract create(data: TCreateInput): Promise<TEntity>;

  abstract update(where: TWhereUnique, data: TUpdateInput): Promise<TEntity>;

  abstract upsert(args: {
    where: TWhereUnique;
    create: TCreateInput;
    update: TUpdateInput;
  }): Promise<TEntity>;

  abstract delete(where: TWhereUnique): Promise<TEntity>;
}
