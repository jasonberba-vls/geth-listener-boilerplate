import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { Request } from 'express';
import { EthereumLogsListenerV2 } from './ethereum-logs-listener-v2';

@Controller('eth-logs')
export class EthereumController {
  constructor(
        private ethereumLogsListenerV2: EthereumLogsListenerV2,
  ) {}

  @Post('add-address')
  async addAddress(@Req() req: Request) {
    const { address } = req.body;

    return await this.ethereumLogsListenerV2.addAddress(address);
  }
}