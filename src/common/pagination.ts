export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export function calcPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

type PaginationDefaults = {
  page: number;
  limit: number;
  maxLimit: number;
};

export function parsePaginationParams(
  query: any,
  defaults: PaginationDefaults = { page: 1, limit: 20, maxLimit: 100 },
): { page: number; limit: number } {
  let page = Number(query?.page);
  let limit = Number(query?.limit);

  if (!Number.isFinite(page) || page < 1) {
    page = defaults.page;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = defaults.limit;
  }

  if (limit > defaults.maxLimit) {
    limit = defaults.maxLimit;
  }

  page = Math.floor(page);
  limit = Math.floor(limit);

  return { page, limit };
}
