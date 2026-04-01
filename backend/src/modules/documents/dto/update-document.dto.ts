import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class UpdateDocumentDto {
  @ApiProperty({ description: 'Client-known version for optimistic locking' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiProperty()
  @IsString()
  @MaxLength(50000)
  content: string;
}
