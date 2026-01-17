import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { EspType } from '../entities/esp-connection.entity';

export class CreateEspConnectionDto {
  @IsNotEmpty()
  @IsEnum(EspType)
  espType: EspType;

  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @IsNotEmpty()
  @IsString()
  publicationId: string;
}
