export class FindManyQueryDto {
  user?: string;
  _id?: { $in: string[] };
}
