import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../models/paginated-result.model.js';
import { PaginationDto } from '../dto/pagination.dto.js';
import { Order } from '../enums/order.enum.js';

const SortParams = {
  name: 'name',
  balance: 'balance',
  walletAge: 'walletAge',
  winrate: 'winrate.value',
  totalPnl: 'totalPnl.value',
};

@Injectable()
export class PaginationNestService {
  static paginate<T>(
    paginationDto: PaginationDto,
    sortBy: string,
    order: Order,
    items: T[],
  ): PaginatedResult<T> {
    const { page, limit } = paginationDto;

    const sortedItems = Boolean(SortParams[sortBy])
      ? items.sort((a, b) => {
          const aValue = a[SortParams[sortBy]];
          const bValue = b[SortParams[sortBy]];

          if (typeof aValue === 'string') {
            return order === Order.ASC
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }

          if (typeof aValue === 'number') {
            return order === Order.ASC ? aValue - bValue : bValue - aValue;
          }

          return 0;
        })
      : items;

    const paginatedItems = sortedItems.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
    };
  }
}
