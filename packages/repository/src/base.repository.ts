export interface BaseRepository<T, TCreate, TUpdate> {
  findById(id: string): Promise<T | undefined>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  findOne(filter: Partial<T>): Promise<T | undefined>;
  create(data: TCreate): Promise<T>;
  update(id: string, data: TUpdate): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}
