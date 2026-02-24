export type ResponseType<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
};

export * from "./models";
export * from "./sandbox";
export * from "./websocket";
