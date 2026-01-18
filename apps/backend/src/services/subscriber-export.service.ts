import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Subscriber } from '../entities/subscriber.entity';
import { EncryptionService } from './encryption.service';

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportedSubscriber {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  subscribedAt: Date | null;
  unsubscribedAt: Date | null;
  [key: string]: any; // For flattened metadata fields
}

@Injectable()
export class SubscriberExportService {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Decrypt and prepare subscribers for export
   * @param subscribers - Array of subscribers with encrypted emails
   * @returns Array of subscribers with decrypted emails and flattened metadata
   */
  private prepareSubscribersForExport(
    subscribers: Subscriber[],
  ): ExportedSubscriber[] {
    return subscribers.map((subscriber) => {
      // Decrypt email
      const decryptedEmail = this.encryptionService.decrypt(
        subscriber.encryptedEmail,
      );

      // Flatten metadata into the main object
      const exported: ExportedSubscriber = {
        email: decryptedEmail,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        status: subscriber.status,
        subscribedAt: subscriber.subscribedAt,
        unsubscribedAt: subscriber.unsubscribedAt,
      };

      // Add metadata fields with 'metadata_' prefix
      if (subscriber.metadata && typeof subscriber.metadata === 'object') {
        for (const [key, value] of Object.entries(subscriber.metadata)) {
          exported[`metadata_${key}`] = value;
        }
      }

      return exported;
    });
  }

  /**
   * Export subscribers as CSV format
   * @param subscribers - Array of subscribers
   * @returns CSV string
   */
  exportAsCSV(subscribers: Subscriber[]): string {
    const exportedData = this.prepareSubscribersForExport(subscribers);

    if (exportedData.length === 0) {
      return 'email,firstName,lastName,status,subscribedAt,unsubscribedAt\n';
    }

    // Get all unique keys from all objects (to handle varying metadata fields)
    const allKeys = new Set<string>();
    exportedData.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });

    const headers = Array.from(allKeys);

    // Create CSV header row
    const csvRows: string[] = [
      headers.map((header) => this.escapeCSVValue(header)).join(','),
    ];

    // Create CSV data rows
    for (const row of exportedData) {
      const values = headers.map((header) => {
        const value = row[header];
        return this.escapeCSVValue(this.formatValue(value));
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Escape a CSV value (handle quotes, commas, newlines)
   */
  private escapeCSVValue(value: string): string {
    // Convert to string if not already
    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Format a value for CSV/Excel export
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Export subscribers as JSON format
   * @param subscribers - Array of subscribers
   * @returns JSON string
   */
  exportAsJSON(subscribers: Subscriber[]): string {
    const exportedData = this.prepareSubscribersForExport(subscribers);
    return JSON.stringify(exportedData, null, 2);
  }

  /**
   * Export subscribers as Excel format
   * @param subscribers - Array of subscribers
   * @returns Excel file buffer
   */
  async exportAsExcel(subscribers: Subscriber[]): Promise<Buffer> {
    const exportedData = this.prepareSubscribersForExport(subscribers);

    // Create a new workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Subscribers');

    if (exportedData.length === 0) {
      // Add empty headers
      worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Subscribed At', key: 'subscribedAt', width: 20 },
        { header: 'Unsubscribed At', key: 'unsubscribedAt', width: 20 },
      ];
    } else {
      // Get all unique keys from all objects
      const allKeys = new Set<string>();
      exportedData.forEach((row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
      });

      const headers = Array.from(allKeys);

      // Set up columns with headers
      worksheet.columns = headers.map((key) => ({
        header: this.formatHeaderName(key),
        key: key,
        width: 20,
      }));

      // Add rows
      exportedData.forEach((row) => {
        // Convert dates to ISO strings for Excel
        const formattedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          if (value instanceof Date) {
            formattedRow[key] = value.toISOString();
          } else {
            formattedRow[key] = value;
          }
        }
        worksheet.addRow(formattedRow);
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Format a header name for display (e.g., 'firstName' -> 'First Name')
   */
  private formatHeaderName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
