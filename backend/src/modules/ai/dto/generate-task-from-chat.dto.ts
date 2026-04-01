import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateTaskFromChatDto {
  @ApiProperty()
  @IsString()
  workspaceId: string;

  @ApiProperty()
  @IsString()
  content: string;
}
