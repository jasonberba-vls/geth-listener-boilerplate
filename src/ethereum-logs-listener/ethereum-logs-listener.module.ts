import { Module } from '@nestjs/common';
import 'dotenv/config';
import { InternalApiWrapper } from 'src/common/wrapper/internalApiWrapper';
import { EthereumLogsListener } from './ethereum-logs-listener';
import { EthereumLogsListenerV2 } from './ethereum-logs-listener-v2';
import { EthereumController } from './ethereum-logs-controller';

@Module({
  imports: [
  ],
  providers: [
    // EthereumLogsListener
    EthereumLogsListenerV2
  ],
  controllers: [
    EthereumController
  ]
})
export class EthereumLogsListenerModule {}