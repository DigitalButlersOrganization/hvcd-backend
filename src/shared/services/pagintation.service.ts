import { Injectable } from '@nestjs/common';
import { FilterQuery, Model, ProjectionType } from 'mongoose';
import { PaginationDto } from '../dto/pagination.dto.js';
import { PaginatedResult } from '../models/paginated-result.model.js';

@Injectable()
export class PaginationService {
  static async paginate<T>(
    model: Model<T>,
    paginationDto: PaginationDto,
    query: FilterQuery<T> = {},
    populate: string | string[] = '',
    projection: ProjectionType<T> = {},
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = paginationDto;

    const skip = (page - 1) * limit;
    const [items, total = 1] = await Promise.all([
      model
        .find(query, projection)
        .skip(skip)
        .limit(limit)
        .populate(populate)
        .exec(),
      model.find(query).countDocuments().exec(),
    ]);

    console.log(items);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
