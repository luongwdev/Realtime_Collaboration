import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TasksModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
