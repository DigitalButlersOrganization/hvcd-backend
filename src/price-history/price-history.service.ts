import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from './schemas/price-history.schema.js';
import { Model } from 'mongoose';

@Injectable()
export class PriceHistoryService {
  private readonly axiosInstance: AxiosInstance;

  constructor(
    @InjectModel(PriceHistory.name)
    private readonly priceHistoryModel: Model<PriceHistory>,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.binance.com/api/v3',
      timeout: 5000,
    });
  }

  async getPriceByDate(date: Date) {
    const price = await this.priceHistoryModel
      .findOne({
        date: {
          $lte: date,
        },
      })
      .sort({ date: -1 });

    return {
      price: price.price,
      date: price.date,
    };
  }

  async fetchKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<any[]> {
    const response = await this.axiosInstance.get('/klines', {
      params: {
        symbol,
        interval,
        limit,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
      },
    });

    return response.data;
  }
}
