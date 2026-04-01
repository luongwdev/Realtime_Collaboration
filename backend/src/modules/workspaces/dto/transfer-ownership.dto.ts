import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({ example: '3d2f8fe9-b383-4d7a-a937-6c9e693f57d2' })
  @IsUUID()
  targetUserId: string;
}
