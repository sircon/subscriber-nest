import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { EncryptionService } from '@app/core/encryption/encryption.service';

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportedSubscriber {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  subscribedAt: Date | null;
  unsubscribedAt: Date | null;
  [key: string]: any;
}

@Injectable()
export class SubscriberExportService {
  constructor(private readonly encryptionService: EncryptionService) {}

  private prepareSubscribersForExport(
    subscribers: Subscriber[]
  ): ExportedSubscriber[] {
    return subscribers.map((subscriber) => {
      const decryptedEmail = this.encryptionService.decrypt(
        subscriber.encryptedEmail
      );

      const exported: ExportedSubscriber = {
        email: decryptedEmail,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        status: subscriber.status,
        subscribedAt: subscriber.subscribedAt,
        unsubscribedAt: subscriber.unsubscribedAt,
      };

      if (subscriber.metadata && typeof subscriber.metadata === 'object') {
        for (const [key, value] of Object.entries(subscriber.metadata)) {
          exported[`metadata_${key}`] = value;
        }
      }

      return exported;
    });
  }

  private escapeCSVValue(value: string): string {
    const stringValue = String(value);
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  exportAsCSV(subscribers: Subscriber[]): string {
    const exportedData = this.prepareSubscribersForExport(subscribers);

    if (exportedData.length === 0) {
      return 'email,firstName,lastName,status,subscribedAt,unsubscribedAt\n';
    }

    const allKeys = new Set<string>();
    exportedData.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    const csvRows = [
      headers.map((header) => this.escapeCSVValue(header)).join(','),
    ];

    for (const row of exportedData) {
      const values = headers.map((header) => {
        const value = row[header];
        return this.escapeCSVValue(this.formatValue(value));
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  exportAsJSON(subscribers: Subscriber[]): string {
    const exportedData = this.prepareSubscribersForExport(subscribers);
    return JSON.stringify(exportedData, null, 2);
  }

  async exportAsExcel(subscribers: Subscriber[]): Promise<Buffer> {
    const exportedData = this.prepareSubscribersForExport(subscribers);
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Subscribers');

    if (exportedData.length === 0) {
      worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Subscribed At', key: 'subscribedAt', width: 20 },
        { header: 'Unsubscribed At', key: 'unsubscribedAt', width: 20 },
      ];
    } else {
      const allKeys = new Set<string>();
      exportedData.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys);

      worksheet.columns = headers.map((key) => ({
        header: key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        key,
        width: 20,
      }));

      exportedData.forEach((row) => {
        const formattedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          formattedRow[key] =
            value instanceof Date ? value.toISOString() : value;
        }
        worksheet.addRow(formattedRow);
      });

      worksheet.getRow(1).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
