import { SortParams } from '../../../wallet/enums/sort-params.enum.js';

export class FindManyQueryDto {
  user?: string;
  _id?: { $in: string[] };
  sort?: {
    by: SortParams;
    order: 'asc' | 'desc';
  };
}
