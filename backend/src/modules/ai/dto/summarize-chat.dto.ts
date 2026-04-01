import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SummarizeChatDto {
  @ApiProperty()
  @IsString()
  channelId: string;
}
