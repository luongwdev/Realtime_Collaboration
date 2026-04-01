import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Team Alpha Workspace' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;
}
