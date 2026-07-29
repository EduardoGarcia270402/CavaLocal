import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as amqp from 'amqplib';
import { AuditEvent } from './audit.types';

@Injectable()
export class AuditPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditPublisherService.name);
  private connection: any;
  private channel: any;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;
  private readonly pending: Buffer[] = [];
  private closing = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    void this.connect();
  }

  async onModuleDestroy() {
    this.closing = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try { await this.channel?.close(); } catch {}
    try { await this.connection?.close(); } catch {}
  }

  async publish(event: AuditEvent): Promise<void> {
    const message = Buffer.from(JSON.stringify({
      ...event,
      id: event.id ?? randomUUID(),
      timestamp: event.timestamp ?? new Date().toISOString(),
    }));

    if (!this.trySend(message)) {
      if (this.pending.length >= 1000) this.pending.shift();
      this.pending.push(message);
      void this.connect();
    }
  }

  private trySend(message: Buffer): boolean {
    try {
      if (!this.channel) return false;
      this.channel.publish('audit.events', 'audit.write', message, {
        contentType: 'application/json',
        persistent: true,
      });
      return true;
    } catch (error) {
      this.logger.warn(`RabbitMQ no disponible; evento en buffer: ${(error as Error).message}`);
      return false;
    }
  }

  private async connect(): Promise<void> {
    if (this.closing || this.channel || this.reconnectTimer || this.connecting) return;
    this.connecting = true;
    try {
      const url = this.config.get<string>('rabbitmq.url') ?? 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(url);
      this.connection.on('error', (error: Error) => this.logger.warn(`RabbitMQ: ${error.message}`));
      this.connection.on('close', () => {
        this.channel = undefined;
        this.connection = undefined;
        this.scheduleReconnect();
      });
      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange('audit.events', 'topic', { durable: true });
      this.logger.log('Publicador de auditoria conectado a RabbitMQ');
      while (this.pending.length) {
        const message = this.pending[0];
        if (!this.trySend(message)) break;
        this.pending.shift();
      }
    } catch (error) {
      this.channel = undefined;
      this.connection = undefined;
      this.logger.warn(`Backend continua sin RabbitMQ: ${(error as Error).message}`);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.closing || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 5000);
  }
}
