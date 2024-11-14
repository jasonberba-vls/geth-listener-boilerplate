import { Module } from '@nestjs/common';
import 'dotenv/config';
import { InternalApiWrapper } from 'src/common/wrapper/internalApiWrapper';
import { EthereumLogsListener } from './ethereum-logs-listener';

@Module({
  imports: [
  ],
  providers: [
    EthereumLogsListener
  ],
})
export class EthereumLogsListenerModule {}