import { IsNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateSelectedListsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  selectedListIds: string[];
}
