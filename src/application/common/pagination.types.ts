export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}
