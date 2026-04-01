import { ChannelType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ enum: ChannelType, default: ChannelType.GENERAL })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}
