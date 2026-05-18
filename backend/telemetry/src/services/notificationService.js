import { SMSService } from "./smsService.js";
import { USSDService } from "./ussdService.js";
import { logger } from "../utils/logger.js";
import pg from "pg";

const { Pool } = pg;

export class NotificationService {
  constructor() {
    this.smsService = new SMSService();
    this.ussdService = new USSDService();
    this.pool = null;
  }

  async initialize() {
    await this.smsService.initialize();
    await this.ussdService.initialize();

    // Initialize PostgreSQL for notification logs
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || "micro_courant",
      user: process.env.POSTGRES_USER || "courant_user",
      password: process.env.POSTGRES_PASSWORD || "dev_password_change_in_prod",
      max: 5,
    });

    logger.info("Notification service initialized");
  }

  async sendLowBalanceAlert(householdId, phoneNumber, balance) {
    const result = await this.smsService.sendLowBalanceAlert(
      householdId,
      phoneNumber,
      balance,
    );

    await this.logNotification({
      type: "low_balance",
      household_id: householdId,
      phone_number: phoneNumber,
      status: result.success ? "sent" : "failed",
      message: `Balance: ${balance} XLM`,
    });

    return result;
  }

  async sendOutageAlert(householdId, phoneNumber, estimatedRestoration) {
    const result = await this.smsService.sendOutageAlert(
      householdId,
      phoneNumber,
      estimatedRestoration,
    );

    await this.logNotification({
      type: "outage",
      household_id: householdId,
      phone_number: phoneNumber,
      status: result.success ? "sent" : "failed",
      message: `Restoration: ${estimatedRestoration}`,
    });

    return result;
  }

  async sendBillingAlert(householdId, phoneNumber, amount, dueDate) {
    const result = await this.smsService.sendBillingAlert(
      householdId,
      phoneNumber,
      amount,
      dueDate,
    );

    await this.logNotification({
      type: "billing",
      household_id: householdId,
      phone_number: phoneNumber,
      status: result.success ? "sent" : "failed",
      message: `Amount: ${amount} XLM, Due: ${dueDate}`,
    });

    return result;
  }

  async sendPaymentConfirmation(householdId, phoneNumber, amount, newBalance) {
    const result = await this.smsService.sendPaymentConfirmation(
      householdId,
      phoneNumber,
      amount,
      newBalance,
    );

    await this.logNotification({
      type: "payment_confirmation",
      household_id: householdId,
      phone_number: phoneNumber,
      status: result.success ? "sent" : "failed",
      message: `Amount: ${amount} XLM, New Balance: ${newBalance} XLM`,
    });

    return result;
  }

  async handleUSSDRequest(sessionId, phoneNumber, text, serviceCode) {
    const response = await this.ussdService.handleUSSDRequest(
      sessionId,
      phoneNumber,
      text,
      serviceCode,
    );

    await this.logNotification({
      type: "ussd",
      household_id: phoneNumber,
      phone_number: phoneNumber,
      status: "processed",
      message: `USSD: ${text}`,
    });

    return response;
  }

  async sendBulkAlert(type, recipients, data) {
    let message = "";

    switch (type) {
      case "maintenance":
        message = `Micro-Courant: Scheduled maintenance on ${data.date} from ${data.startTime} to ${data.endTime}. Please save your work.`;
        break;
      case "tariff_change":
        message = `Micro-Courant: Tariff change effective ${data.effectiveDate}. New rate: ${data.newRate} XLM/kWh`;
        break;
      case "emergency":
        message = `Micro-Courant EMERGENCY: ${data.message}. Please take immediate action.`;
        break;
      default:
        message = data.message;
    }

    const result = await this.smsService.sendBulkSMS(recipients, message);

    await this.logNotification({
      type: "bulk_" + type,
      status: result.successful > 0 ? "sent" : "failed",
      message: `Sent to ${result.successful}/${result.total} recipients`,
    });

    return result;
  }

  async logNotification(notification) {
    try {
      const query = `
        INSERT INTO notifications (type, household_id, phone_number, status, message, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await this.pool.query(query, [
        notification.type,
        notification.household_id,
        notification.phone_number,
        notification.status,
        notification.message,
      ]);
    } catch (error) {
      logger.error("Failed to log notification:", error);
    }
  }

  async getNotificationHistory(householdId, limit = 50) {
    try {
      const query = `
        SELECT * FROM notifications
        WHERE household_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [householdId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get notification history:", error);
      return [];
    }
  }

  async shutdown() {
    await this.smsService.shutdown();
    await this.ussdService.shutdown();

    if (this.pool) {
      await this.pool.end();
    }

    logger.info("Notification service shutdown");
  }
}
